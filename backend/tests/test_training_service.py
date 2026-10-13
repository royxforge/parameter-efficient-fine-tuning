"""Tests for TrainingService job management."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.schemas import TrainingConfig, TrainingStatus
from services.training_service import JobActiveError, JobNotFoundError, TrainingService


@pytest.fixture
def service():
    return TrainingService()


@pytest.fixture
def config():
    return TrainingConfig(model_id="gpt2", dataset_id="test.jsonl")


def _seed_job(service, config):
    import uuid
    import json
    from datetime import datetime

    job_id = str(uuid.uuid4())
    job_dir = service.output_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    service.active_jobs[job_id] = {
        "job_id": job_id,
        "job_name": "test_job",
        "config": config,
        "status": TrainingStatus.QUEUED,
        "started_at": datetime.now().isoformat(),
        "current_step": 0,
        "total_steps": 0,
        "current_epoch": 0,
        "metrics": [],
        "eval_losses": [],
        "checkpoints": [],
        "output_dir": str(job_dir),
        "gpu_memory_mb": None,
        "gpu_utilization": None,
    }
    return job_id


class TestJobManagement:
    def test_get_progress_unknown_job_raises(self, service):
        with pytest.raises(ValueError):
            service.get_training_progress("nope")

    def test_get_progress_empty_job(self, service, config):
        job_id = _seed_job(service, config)
        progress = service.get_training_progress(job_id)
        assert progress.job_id == job_id
        assert progress.status == TrainingStatus.QUEUED
        assert progress.val_loss is None
        assert progress.best_val_loss is None
        assert progress.gpu_memory_usage is None

    def test_get_progress_with_eval_losses(self, service, config):
        job_id = _seed_job(service, config)
        service.active_jobs[job_id]["eval_losses"] = [2.5, 2.0, 2.2]
        progress = service.get_training_progress(job_id)
        assert progress.val_loss == 2.2
        assert progress.best_val_loss == 2.0

    def test_cancel_queued_job(self, service, config):
        import threading
        job_id = _seed_job(service, config)
        service.cancel_events[job_id] = threading.Event()
        service.cancel_training(job_id)
        assert service.active_jobs[job_id]["status"] == TrainingStatus.CANCELLED
        assert service.cancel_events[job_id].is_set()

    def test_cancel_completed_job_raises(self, service, config):
        job_id = _seed_job(service, config)
        service.active_jobs[job_id]["status"] = TrainingStatus.COMPLETED
        with pytest.raises(ValueError):
            service.cancel_training(job_id)

    def test_get_all_jobs(self, service, config):
        job_id = _seed_job(service, config)
        jobs = service.get_all_jobs()
        assert any(j["job_id"] == job_id for j in jobs)

    def test_cleanup_job(self, service, config):
        import threading
        job_id = _seed_job(service, config)
        service.cancel_events[job_id] = threading.Event()
        service.cleanup_job(job_id)
        assert job_id not in service.active_jobs
        assert job_id not in service.cancel_events

    def test_verify_job_token_enforces_authentication(self, service, config):
        """Token verification must be constant-time and reject wrong/missing tokens."""
        job_id = _seed_job(service, config)
        service.active_jobs[job_id]["access_token"] = "valid_secret_token"

        assert service.verify_job_token(job_id, "valid_secret_token") is True
        assert service.verify_job_token(job_id, "wrong_token") is False
        assert service.verify_job_token(job_id, None) is False
        assert service.verify_job_token(job_id, "") is False
        # Unknown job returns False (prevents probing which jobs exist)
        assert service.verify_job_token("unknown_job_id", "valid_secret_token") is False


class TestJobDeletion:
    """Artifacts pile up on disk; deleting a job must reclaim and forget them."""

    def test_delete_job_removes_state_and_artifacts(self, service, config):
        import threading

        job_id = _seed_job(service, config)
        service.cancel_events[job_id] = threading.Event()
        service.active_jobs[job_id]["status"] = TrainingStatus.COMPLETED

        job_dir = service.output_dir / job_id
        (job_dir / "final_model").mkdir(parents=True, exist_ok=True)
        (job_dir / "final_model" / "adapter.bin").write_bytes(b"x" * 512)
        experiment_dir = service.experiments_dir / job_id
        experiment_dir.mkdir(parents=True, exist_ok=True)
        (experiment_dir / "metrics.json").write_text("{}", encoding="utf-8")

        summary = service.delete_job(job_id)

        assert summary["removed_state"] is True
        assert summary["removed_files"] == 2
        assert summary["freed_bytes"] == 512 + len("{}")
        assert len(summary["removed_dirs"]) == 2
        assert not job_dir.exists()
        assert not experiment_dir.exists()
        assert job_id not in service.active_jobs
        assert job_id not in service.cancel_events

    def test_delete_running_job_is_refused(self, service, config):
        job_id = _seed_job(service, config)
        service.active_jobs[job_id]["status"] = TrainingStatus.RUNNING

        with pytest.raises(JobActiveError):
            service.delete_job(job_id)

        # Refusing must leave both the job record and its files untouched.
        assert job_id in service.active_jobs
        assert (service.output_dir / job_id).exists()

    def test_delete_unknown_job_raises_not_found(self, service):
        with pytest.raises(JobNotFoundError):
            service.delete_job("0f0f0f0f-unknown")

    def test_delete_without_purge_keeps_artifacts(self, service, config):
        job_id = _seed_job(service, config)
        service.active_jobs[job_id]["status"] = TrainingStatus.COMPLETED
        job_dir = service.output_dir / job_id
        (job_dir / "weights.bin").write_bytes(b"x" * 16)

        summary = service.delete_job(job_id, purge_artifacts=False)

        assert summary["removed_state"] is True
        assert summary["removed_dirs"] == []
        assert (job_dir / "weights.bin").exists()
        assert job_id not in service.active_jobs

    def test_delete_orphaned_artifacts_after_restart(self, service):
        """Job state is in-memory, so a restart leaves artifacts with no record."""
        orphan_id = "11111111-2222-3333-4444-555555555555"
        orphan_dir = service.output_dir / orphan_id
        orphan_dir.mkdir(parents=True, exist_ok=True)
        (orphan_dir / "checkpoint.bin").write_bytes(b"y" * 64)

        summary = service.delete_job(orphan_id)

        assert summary["removed_state"] is False
        assert summary["removed_files"] == 1
        assert summary["freed_bytes"] == 64
        assert not orphan_dir.exists()

    @pytest.mark.parametrize("bad_id", ["../..", "..", "", "a/b", "a\\b"])
    def test_delete_rejects_unsafe_job_ids(self, service, bad_id):
        with pytest.raises(ValueError):
            service.delete_job(bad_id)

    def test_delete_cancelled_job_is_allowed(self, service, config):
        job_id = _seed_job(service, config)
        service.active_jobs[job_id]["status"] = TrainingStatus.CANCELLED

        summary = service.delete_job(job_id)

        assert summary["removed_state"] is True
        assert job_id not in service.active_jobs
"""API endpoint tests using FastAPI TestClient."""

import sys
from pathlib import Path
from unittest.mock import patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app

client = TestClient(app)


class TestHealthEndpoints:
    def test_root(self):
        resp = client.get("/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "operational"
        # The root payload must advertise the release version, not a stale one.
        assert body["version"] == app.version
        assert body["version"] not in ("0.8.0", "0.9.0")

    def test_health_check(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


class TestTrainingEndpoints:
    def test_get_progress_unknown_job(self):
        resp = client.get("/api/training-progress/does-not-exist")
        assert resp.status_code == 404
        assert resp.json()["status_code"] == 404

    def test_cancel_unknown_job(self):
        resp = client.post("/api/cancel-training/does-not-exist")
        assert resp.status_code == 404

    def test_list_training_jobs(self):
        resp = client.get("/api/training-jobs")
        assert resp.status_code == 200
        assert "jobs" in resp.json()


class TestDeleteTrainingJob:
    """Deleting a job must reclaim its artifacts and report the amount freed."""

    def test_delete_unknown_job_returns_404(self):
        resp = client.delete("/api/training-jobs/does-not-exist")
        assert resp.status_code == 404

    def test_delete_running_job_returns_409(self):
        from routers.deps import training_service
        from models.schemas import TrainingStatus

        job_id = "test-running-job"
        training_service.active_jobs[job_id] = {
            "job_id": job_id,
            "job_name": "running",
            "config": type("C", (), {"model_id": "gpt2"})(),
            "status": TrainingStatus.RUNNING,
        }
        try:
            resp = client.delete(f"/api/training-jobs/{job_id}")
            assert resp.status_code == 409
            # The app's HTTPException handler reports the message in "error".
            assert "Cancel it first" in resp.json()["error"]
        finally:
            training_service.active_jobs.pop(job_id, None)

    def test_delete_orphaned_artifacts_reclaims_disk_space(self, tmp_path):
        from routers.deps import training_service

        job_id = "orphan-job-for-api-test"
        job_dir = training_service.output_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        (job_dir / "adapter.bin").write_bytes(b"z" * 256)

        try:
            resp = client.delete(f"/api/training-jobs/{job_id}")
            assert resp.status_code == 200
            body = resp.json()
            assert body["job_id"] == job_id
            assert body["removed_state"] is False
            assert body["freed_bytes"] == 256
            assert not job_dir.exists()
        finally:
            if job_dir.exists():
                import shutil

                shutil.rmtree(job_dir, ignore_errors=True)

    def test_delete_without_purge_keeps_files(self):
        from routers.deps import training_service
        from models.schemas import TrainingStatus

        job_id = "keep-artifacts-job"
        job_dir = training_service.output_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        (job_dir / "keep.bin").write_bytes(b"k" * 8)
        training_service.active_jobs[job_id] = {
            "job_id": job_id,
            "job_name": "keep",
            "config": type("C", (), {"model_id": "gpt2"})(),
            "status": TrainingStatus.COMPLETED,
        }

        try:
            resp = client.delete(f"/api/training-jobs/{job_id}", params={"purge_artifacts": False})
            assert resp.status_code == 200
            assert resp.json()["removed_dirs"] == []
            assert (job_dir / "keep.bin").exists()
        finally:
            training_service.active_jobs.pop(job_id, None)
            import shutil

            shutil.rmtree(job_dir, ignore_errors=True)


class TestPathTraversal:
    def test_download_file_traversal_blocked(self):
        resp = client.get("/api/download-file/job1/..%2F..%2Fconfig.py")
        assert resp.status_code in (400, 404)

    def test_experiment_metadata_traversal_blocked(self):
        resp = client.get("/api/experiment/..%2F..%2Fetc/metadata")
        assert resp.status_code in (400, 404)

    def test_download_file_windows_traversal_blocked(self):
        resp = client.get("/api/download-file/job1/..\\config.py")
        assert resp.status_code == 400

    def test_validate_dataset_traversal_blocked(self):
        resp = client.post("/api/validate-dataset", json={"dataset_id": "../../config.py"})
        assert resp.status_code == 400


class TestErrorResponseShape:
    def test_error_response_fields(self):
        resp = client.get("/api/training-progress/does-not-exist")
        body = resp.json()
        assert "error" in body
        assert "status_code" in body


class TestStartTraining:
    def test_start_training_missing_fields(self):
        resp = client.post("/api/start-training", json={})
        assert resp.status_code == 422


class TestUploadValidation:
    def test_upload_dataset_no_input(self):
        resp = client.post("/api/upload-dataset")
        assert resp.status_code == 400
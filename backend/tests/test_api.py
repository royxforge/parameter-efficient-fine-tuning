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
        assert "version" in body

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
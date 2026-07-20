"""Tests for Pydantic schemas used in the PEFT API."""

import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.schemas import (
    ComputeTier,
    DatasetInfo,
    HyperparameterRecommendation,
    JobResponse,
    LoRAConfig,
    ModelAnalyzeRequest,
    ModelInfo,
    QuantizationMethod,
    QuantizationResult,
    StartTrainingRequest,
    TaskType,
    TrainingConfig,
    TrainingProgress,
    TrainingStatus,
)


class TestEnums:
    """Tests for enum types."""

    def test_compute_tier_values(self):
        assert ComputeTier.FREE.value == "free"
        assert ComputeTier.BASIC.value == "basic"
        assert ComputeTier.PRO.value == "pro"
        assert ComputeTier.ENTERPRISE.value == "enterprise"

    def test_task_type_values(self):
        assert TaskType.TEXT_GENERATION.value == "text-generation"

    def test_training_status_values(self):
        assert TrainingStatus.QUEUED.value == "queued"
        assert TrainingStatus.RUNNING.value == "running"
        assert TrainingStatus.COMPLETED.value == "completed"

    def test_quantization_method_values(self):
        assert QuantizationMethod.BITS_4.value == "4bit"
        assert QuantizationMethod.BITS_8.value == "8bit"


class TestModelInfo:
    """Tests for ModelInfo schema."""

    def test_default_values(self):
        info = ModelInfo(model_id="test-model")
        assert info.model_id == "test-model"
        assert info.architecture == "unknown"
        assert info.num_parameters == 0
        assert info.parameter_size == "0"
        assert info.context_length == 2048

    def test_all_fields(self):
        info = ModelInfo(
            model_id="gpt2",
            architecture="gpt2",
            num_parameters=124_000_000,
            parameter_size="124M",
            context_length=1024,
        )
        assert info.architecture == "gpt2"
        assert info.num_parameters == 124_000_000


class TestDatasetInfo:
    """Tests for DatasetInfo schema."""

    def test_required_fields(self):
        info = DatasetInfo(
            dataset_id="test",
            num_samples=100,
            num_train_samples=90,
            num_validation_samples=10,
            avg_tokens=256.0,
            max_tokens=512,
            min_tokens=50,
        )
        assert info.size_mb == 0.0
        assert info.columns == []

    def test_default_preview(self):
        info = DatasetInfo(
            dataset_id="test",
            num_samples=10,
            num_train_samples=9,
            num_validation_samples=1,
            avg_tokens=128.0,
            max_tokens=256,
            min_tokens=32,
        )
        assert info.data_preview == []


class TestTrainingConfig:
    """Tests for TrainingConfig schema."""

    def test_default_values(self):
        config = TrainingConfig(model_id="test-model", dataset_id="test-dataset")
        assert config.learning_rate == 2e-4
        assert config.batch_size == 4
        assert config.num_epochs == 3
        assert config.use_lora is True
        assert config.seed == 42

    def test_lora_config_defaults(self):
        config = TrainingConfig(model_id="test-model", dataset_id="test-dataset")
        assert config.lora_config is None

    def test_custom_values(self):
        config = TrainingConfig(
            model_id="gpt2",
            dataset_id="my-data",
            learning_rate=1e-4,
            batch_size=8,
            num_epochs=10,
            use_lora=False,
        )
        assert config.learning_rate == 1e-4
        assert config.batch_size == 8
        assert config.num_epochs == 10
        assert config.use_lora is False


class TestLoRAConfig:
    """Tests for LoRAConfig schema."""

    def test_default_values(self):
        config = LoRAConfig()
        assert config.r == 8
        assert config.lora_alpha == 16
        assert config.lora_dropout == 0.05
        assert config.target_modules == ["q_proj", "v_proj"]

    def test_custom_values(self):
        config = LoRAConfig(r=16, lora_alpha=32, target_modules=["q_proj", "k_proj", "v_proj", "o_proj"])
        assert config.r == 16
        assert config.lora_alpha == 32
        assert len(config.target_modules) == 4


class TestJobResponse:
    """Tests for JobResponse schema."""

    def test_required_fields(self):
        resp = JobResponse(job_id="abc-123", status="queued", message="Job created")
        assert resp.job_id == "abc-123"
        assert resp.estimated_duration_minutes is None


class TestStartTrainingRequest:
    """Tests for StartTrainingRequest schema."""

    def test_valid_request(self):
        config = TrainingConfig(model_id="test-model", dataset_id="test-data")
        request = StartTrainingRequest(config=config, job_name="My Job")
        assert request.job_name == "My Job"
        assert request.config.model_id == "test-model"

    def test_request_without_job_name(self):
        config = TrainingConfig(model_id="test-model", dataset_id="test-data")
        request = StartTrainingRequest(config=config)
        assert request.job_name is None


class TestTrainingProgress:
    """Tests for TrainingProgress schema."""

    def test_required_fields(self):
        progress = TrainingProgress(
            job_id="abc",
            status=TrainingStatus.RUNNING,
            current_step=10,
            total_steps=100,
            current_epoch=1.0,
            total_epochs=3,
        )
        assert progress.current_step == 10
        assert progress.train_loss is None
        assert progress.gpu_memory_usage is None

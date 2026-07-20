"""Tests for the DatasetProcessor service."""

import json
import tempfile
from pathlib import Path

import pytest

# Add backend to path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.dataset_processor import DatasetProcessor


@pytest.fixture
def processor():
    """Create a DatasetProcessor instance."""
    return DatasetProcessor()


@pytest.fixture
def json_dataset_path():
    """Create a temporary JSON dataset file."""
    data = [
        {"text": "Hello world", "label": 0},
        {"text": "How are you?", "label": 1},
        {"text": "Fine thank you", "label": 0},
        {"text": "Good morning", "label": 1},
        {"text": "Good night", "label": 0},
    ]
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(data, f)
        path = f.name
    yield path
    Path(path).unlink(missing_ok=True)


@pytest.fixture
def jsonl_dataset_path():
    """Create a temporary JSONL dataset file."""
    data = [
        {"text": "Hello world", "label": 0},
        {"text": "How are you?", "label": 1},
    ]
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        for item in data:
            f.write(json.dumps(item) + "\n")
        path = f.name
    yield path
    Path(path).unlink(missing_ok=True)


@pytest.fixture
def instruction_dataset_path():
    """Create a temporary instruction-format JSON dataset file."""
    data = [
        {
            "instruction": "Translate to French",
            "input": "Hello",
            "output": "Bonjour",
        },
        {
            "instruction": "Translate to Spanish",
            "input": "Goodbye",
            "output": "Adiós",
        },
    ]
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(data, f)
        path = f.name
    yield path
    Path(path).unlink(missing_ok=True)


@pytest.mark.asyncio
class TestDatasetProcessor:
    """Tests for DatasetProcessor validation and processing."""

    async def test_validate_json_dataset(self, processor, json_dataset_path):
        """Should correctly validate a JSON dataset."""
        info = await processor.validate_dataset(json_dataset_path, format="json")
        assert info.num_samples == 5
        assert info.format == "json"
        assert "text" in info.columns
        assert len(info.validation_warnings) >= 0

    async def test_validate_jsonl_dataset(self, processor, jsonl_dataset_path):
        """Should correctly validate a JSONL dataset."""
        info = await processor.validate_dataset(jsonl_dataset_path, format="jsonl")
        assert info.num_samples == 2
        assert info.format == "jsonl"

    async def test_validate_instruction_dataset(self, processor, instruction_dataset_path):
        """Should correctly validate an instruction-format dataset."""
        info = await processor.validate_dataset(instruction_dataset_path, format="json")
        assert info.num_samples == 2
        assert info.columns is not None
        assert "instruction" in info.columns

    async def test_dataset_size_mb(self, processor):
        """Should report dataset size in MB for a large enough dataset."""
        import json
        import tempfile
        # 500 items of 1000 chars each → ~0.5 MB → clearly measurable as > 0
        large_data = [{"text": "x" * 1000} for _ in range(500)]
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(large_data, f)
            path = f.name
        try:
            info = await processor.validate_dataset(path, format="json")
            assert isinstance(info.size_mb, float)
            assert info.size_mb > 0, f"Expected size_mb > 0, got {info.size_mb}"
        finally:
            Path(path).unlink(missing_ok=True)

    async def test_train_val_split(self, processor, json_dataset_path):
        """Should create train/val splits."""
        info = await processor.validate_dataset(json_dataset_path, format="json")
        assert info.num_train_samples + info.num_validation_samples == info.num_samples

    async def test_invalid_format_raises_error(self, processor):
        """Should raise error for unsupported formats."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("invalid data")
            path = f.name
        try:
            with pytest.raises(Exception):
                await processor.validate_dataset(path, format="xml")
        finally:
            Path(path).unlink(missing_ok=True)


class TestDatasetPreprocessing:
    """Tests for dataset preprocessing logic."""

    def test_preprocess_json(self, processor, json_dataset_path):
        """Should preprocess JSON datasets correctly."""
        import json
        with open(json_dataset_path) as f:
            data = json.load(f)
        processed = processor.preprocess_for_training(data, task_type="text-generation")
        assert len(processed) == 5
        assert all("text" in item for item in processed)

    def test_preprocess_instruction(self, processor, instruction_dataset_path):
        """Should preprocess instruction-format datasets correctly."""
        import json
        with open(instruction_dataset_path) as f:
            data = json.load(f)
        processed = processor.preprocess_for_training(data, task_type="text-generation")
        assert len(processed) == 2
        for item in processed:
            assert "text" in item
            assert "Instruction:" in item["text"]
            assert "Response:" in item["text"]

    def test_train_val_split(self, processor, json_dataset_path):
        """Should split dataset correctly."""
        import json
        with open(json_dataset_path) as f:
            data = json.load(f)
        train, val = processor.create_train_val_split(data, split_ratio=0.2)
        assert len(train) + len(val) == len(data)
        assert len(val) > 0
        assert len(train) > 0

    @pytest.mark.asyncio
    async def test_save_and_load_roundtrip(self, processor, json_dataset_path):
        """Should save and load datasets correctly."""
        import json
        with open(json_dataset_path) as f:
            data = json.load(f)
        saved_path = await processor.save_dataset(data, "test_roundtrip.json")
        assert Path(saved_path).exists()
        with open(saved_path) as f:
            loaded = json.load(f)
        assert len(loaded) == len(data)
        Path(saved_path).unlink(missing_ok=True)

    def test_calculate_statistics(self, processor, json_dataset_path):
        """Should calculate token statistics correctly."""
        import json
        with open(json_dataset_path) as f:
            data = json.load(f)
        stats = processor.calculate_statistics(data)
        assert stats["avg_tokens"] > 0
        assert stats["max_tokens"] >= stats["min_tokens"]
        assert stats["min_tokens"] >= 0

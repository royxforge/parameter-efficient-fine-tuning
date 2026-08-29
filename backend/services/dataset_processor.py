import json
import csv
import pandas as pd
from typing import Dict, Any, List, Optional, Iterator, Tuple
from pathlib import Path
from models.schemas import DatasetInfo
from utils.logger import get_logger
from config import settings

logger = get_logger(__name__)

MAX_VALIDATION_SAMPLES = 1000


class DatasetProcessor:
    def __init__(self):
        self.datasets_dir = Path(settings.datasets_dir)
        self.datasets_dir.mkdir(parents=True, exist_ok=True)

    async def validate_dataset(
        self,
        dataset_path: str,
        format: str = "json",
        dataset_id: Optional[str] = None
    ) -> DatasetInfo:
        logger.info(f"Validating dataset: {dataset_path}")

        try:
            sample, num_samples = self._load_sample(dataset_path, format)

            validation_warnings = self.validate_structure(sample)
            stats = self.calculate_statistics(sample)
            preview = sample[:5]
            columns = list(sample[0].keys()) if sample else []

            file_path = Path(dataset_path)
            size_mb = file_path.stat().st_size / (1024 * 1024) if file_path.exists() else 0

            num_train = int(num_samples * 0.9)
            num_val = num_samples - num_train

            dataset_info = DatasetInfo(
                dataset_id=dataset_id or file_path.stem,
                num_samples=num_samples,
                num_train_samples=num_train,
                num_validation_samples=num_val,
                avg_tokens=stats["avg_tokens"],
                max_tokens=stats["max_tokens"],
                min_tokens=stats["min_tokens"],
                data_preview=preview,
                columns=columns,
                validation_warnings=validation_warnings,
                format=format,
                size_mb=round(size_mb, 2)
            )

            logger.info(f"Dataset validated: {num_samples} samples, avg {stats['avg_tokens']:.0f} tokens")
            return dataset_info

        except Exception as e:
            logger.error(f"Dataset validation failed: {e}")
            raise Exception(f"Dataset validation error: {str(e)}")

    def _iter_records(self, dataset_path: str, format: str) -> Iterator[Dict[str, Any]]:
        if format == "jsonl":
            with open(dataset_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        yield json.loads(line)
        elif format == "csv":
            with open(dataset_path, 'r', encoding='utf-8', newline='') as f:
                for row in csv.DictReader(f):
                    yield dict(row)
        elif format == "json":
            yield from self.load_json(dataset_path)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def _load_sample(self, dataset_path: str, format: str) -> Tuple[List[Dict[str, Any]], int]:
        sample: List[Dict[str, Any]] = []
        count = 0
        for record in self._iter_records(dataset_path, format):
            count += 1
            if len(sample) < MAX_VALIDATION_SAMPLES:
                sample.append(record)
        return sample, count

    def load_json(self, file_path: str) -> List[Dict[str, Any]]:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if isinstance(data, dict):
            for key in ['data', 'examples', 'train', 'samples']:
                if key in data:
                    data = data[key]
                    break

        if not isinstance(data, list):
            raise ValueError("JSON must contain a list of examples")

        return data

    def load_jsonl(self, file_path: str) -> List[Dict[str, Any]]:
        data = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
        return data

    def load_csv(self, file_path: str) -> List[Dict[str, Any]]:
        df = pd.read_csv(file_path)
        return df.to_dict('records')

    def validate_structure(self, data: List[Dict[str, Any]]) -> List[str]:
        warnings = []

        if not data:
            warnings.append("Dataset is empty")
            return warnings

        first_item = data[0]
        has_text_field = any(
            key in first_item
            for key in ['text', 'prompt', 'instruction', 'input', 'question', 'content']
        )

        if not has_text_field:
            warnings.append("No standard text field found (text, prompt, instruction, etc.)")

        text_fields = [k for k in first_item.keys() if isinstance(first_item.get(k), str)]
        if text_fields:
            short_count = 0
            for item in data[:min(100, len(data))]:
                for field in text_fields:
                    text = str(item.get(field, ''))
                    if len(text) < 10:
                        short_count += 1
                        break

            if short_count > len(data[:min(100, len(data))]) * 0.1:
                warnings.append(f"Many examples are very short (<10 chars) - {short_count} found in sample")

        keys_set = set(first_item.keys())
        inconsistent_count = 0
        for item in data[:min(100, len(data))]:
            if set(item.keys()) != keys_set:
                inconsistent_count += 1

        if inconsistent_count > 0:
            warnings.append(f"Inconsistent fields across examples - {inconsistent_count} items differ")

        null_count = 0
        for item in data[:min(100, len(data))]:
            if any(v is None or v == '' for v in item.values()):
                null_count += 1

        if null_count > 0:
            warnings.append(f"Found {null_count} examples with null/empty values in sample")

        return warnings

    def calculate_statistics(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not data:
            return {
                "avg_tokens": 0,
                "max_tokens": 0,
                "min_tokens": 0
            }

        token_counts = []

        for item in data:
            text = ' '.join(str(v) for v in item.values() if isinstance(v, (str, int, float)))
            word_count = len(text.split())
            token_count = int(word_count * 1.3)
            token_counts.append(token_count)

        return {
            "avg_tokens": sum(token_counts) / len(token_counts) if token_counts else 0,
            "max_tokens": max(token_counts) if token_counts else 0,
            "min_tokens": min(token_counts) if token_counts else 0
        }

    def preprocess_for_training(
        self,
        data: List[Dict[str, Any]],
        task_type: str,
        text_field: str = "text",
        label_field: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        processed = []

        for item in data:
            processed_item = {}

            if text_field in item:
                processed_item['text'] = item[text_field]
            elif 'prompt' in item and 'completion' in item:
                processed_item['text'] = f"{item['prompt']}\n\n{item['completion']}"
            elif 'instruction' in item:
                instruction = item['instruction']
                input_text = item.get('input', '')
                output = item.get('output', '')

                if input_text:
                    processed_item['text'] = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output}"
                else:
                    processed_item['text'] = f"### Instruction:\n{instruction}\n\n### Response:\n{output}"
            else:
                text_fields = [k for k, v in item.items() if isinstance(v, str)]
                if text_fields:
                    processed_item['text'] = item[text_fields[0]]

            if label_field and label_field in item:
                processed_item['label'] = item[label_field]

            if 'text' in processed_item:
                processed.append(processed_item)

        return processed

    def create_train_val_split(
        self,
        data: List[Dict[str, Any]],
        split_ratio: float = 0.1
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        import random
        random.shuffle(data)

        split_idx = int(len(data) * (1 - split_ratio))
        train_data = data[:split_idx]
        val_data = data[split_idx:]

        logger.info(f"Split dataset: {len(train_data)} train, {len(val_data)} validation")
        return train_data, val_data

    async def save_dataset(
        self,
        data: List[Dict[str, Any]],
        filename: str,
        format: str = "json"
    ) -> str:
        output_path = self.datasets_dir / filename

        if format == "json":
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        elif format == "jsonl":
            with open(output_path, 'w', encoding='utf-8') as f:
                for item in data:
                    f.write(json.dumps(item, ensure_ascii=False) + '\n')
        else:
            raise ValueError(f"Unsupported save format: {format}")

        logger.info(f"Dataset saved to {output_path}")
        return str(output_path)

    async def get_tokenized_dataset(
        self,
        dataset_path: str,
        tokenizer_name: str,
        max_seq_length: int,
        validation_split: float = 0.1,
        seed: int = 42
    ):
        import hashlib
        from datasets import load_dataset, load_from_disk
        from transformers import AutoTokenizer

        full_path = Path(dataset_path)
        if not full_path.exists():
            full_path = self.datasets_dir / dataset_path
            if not full_path.exists():
                raise FileNotFoundError(f"Dataset not found at {dataset_path} or {full_path}")

        dataset_path_str = str(full_path)

        cache_key = hashlib.md5(
            f"{dataset_path_str}_{tokenizer_name}_{max_seq_length}_{validation_split}_{seed}".encode()
        ).hexdigest()

        cache_dir = self.datasets_dir / "tokenized" / cache_key

        if cache_dir.exists():
            logger.info(f"Loading tokenized dataset from cache: {cache_dir}")
            try:
                return load_from_disk(str(cache_dir))
            except Exception as e:
                logger.warning(f"Failed to load cached dataset: {e}. Re-tokenizing.")

        logger.info(f"Tokenizing dataset {dataset_path_str} for {tokenizer_name}")

        # Detect format from file extension
        file_path_obj = Path(dataset_path_str)
        if file_path_obj.suffix.lower() == ".csv":
            dataset = load_dataset("csv", data_files=dataset_path_str, split="train")
        elif file_path_obj.suffix.lower() == ".jsonl":
            dataset = load_dataset("json", data_files=dataset_path_str, split="train")
        else:
            dataset = load_dataset("json", data_files=dataset_path_str, split="train")

        if "text" not in dataset.column_names:
            logger.info("Column 'text' not found in dataset. Attempting to generate it from other fields.")

            def generate_text_field(example):
                if "prompt" in example and "completion" in example:
                    text = f"{example['prompt']}\n\n{example['completion']}"
                elif "instruction" in example:
                    instruction = example["instruction"]
                    input_text = example.get("input", "")
                    output = example.get("output", "")
                    if input_text:
                        text = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output}"
                    else:
                        text = f"### Instruction:\n{instruction}\n\n### Response:\n{output}"
                else:
                    text = json.dumps(dict(example))

                return {"text": text}

            dataset = dataset.map(generate_text_field)

        if validation_split > 0:
            split_dataset = dataset.train_test_split(
                test_size=validation_split,
                seed=seed
            )
            dataset = split_dataset

        tokenizer = AutoTokenizer.from_pretrained(tokenizer_name, token=settings.hf_token)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        pad_token_id = tokenizer.pad_token_id if tokenizer.pad_token_id is not None else 0

        def tokenize_function(examples):
            tokenized = tokenizer(
                examples["text"],
                truncation=True,
                max_length=max_seq_length,
                padding="max_length"
            )
            tokenized["labels"] = [
                [token_id if token_id != pad_token_id else -100 for token_id in input_ids]
                for input_ids in tokenized["input_ids"]
            ]
            return tokenized

        if isinstance(dataset, dict):
            columns_to_remove = dataset["train"].column_names
        else:
            columns_to_remove = dataset.column_names

        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=columns_to_remove,
            desc="Tokenizing dataset"
        )

        try:
            tokenized_dataset.save_to_disk(str(cache_dir))
            logger.info(f"Saved tokenized dataset to cache: {cache_dir}")
        except Exception as e:
            logger.warning(f"Failed to save dataset to cache: {e}")

        return tokenized_dataset
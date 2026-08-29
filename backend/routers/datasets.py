import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File

from models.schemas import DatasetUploadRequest, DatasetInfo
from routers.deps import dataset_processor
from utils.logger import get_logger
from utils.security import safe_child_path
from config import settings

logger = get_logger(__name__)

router = APIRouter()


@router.post("/api/upload-dataset", response_model=DatasetInfo)
async def upload_dataset(
    file: UploadFile = File(None),
    dataset_id: str = None,
    format: str = None
):
    try:
        if file:
            filename = Path(file.filename).name
            if not filename or filename.startswith('.'):
                raise HTTPException(status_code=400, detail="Invalid filename")

            if not format:
                if filename.endswith('.csv'):
                    format = 'csv'
                elif filename.endswith('.jsonl'):
                    format = 'jsonl'
                elif filename.endswith('.json'):
                    format = 'json'
                else:
                    format = 'json'

            file_path = safe_child_path(Path(settings.datasets_dir), filename)
            with open(file_path, 'wb') as f:
                content = await file.read()
                f.write(content)

            logger.info(f"Dataset uploaded: {filename} (format: {format})")

            dataset_info = await dataset_processor.validate_dataset(
                str(file_path),
                format=format,
                dataset_id=filename
            )
            return dataset_info

        elif dataset_id:
            try:
                from datasets import load_dataset
                logger.info(f"Loading HuggingFace dataset: {dataset_id}")

                hf_dataset = load_dataset(dataset_id, split="train", trust_remote_code=True)

                local_path = safe_child_path(
                    Path(settings.datasets_dir),
                    f"{dataset_id.replace('/', '_')}.jsonl"
                )
                local_path.parent.mkdir(parents=True, exist_ok=True)

                with open(local_path, 'w', encoding='utf-8') as f:
                    for example in hf_dataset:
                        f.write(json.dumps({k: str(v) for k, v in example.items()}) + '\n')

                logger.info(f"Saved HF dataset to {local_path} ({len(hf_dataset)} samples)")

                dataset_info = await dataset_processor.validate_dataset(
                    str(local_path),
                    format="jsonl",
                    dataset_id=dataset_id
                )
                return dataset_info

            except ImportError:
                raise HTTPException(
                    status_code=400,
                    detail="HuggingFace datasets library not installed. Run: pip install datasets"
                )
            except Exception as e:
                logger.error(f"HF dataset loading failed: {e}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to load HuggingFace dataset: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Either file or dataset_id must be provided"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dataset upload failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/validate-dataset", response_model=DatasetInfo)
async def validate_dataset(request: DatasetUploadRequest):
    try:
        dataset_id = request.dataset_id
        fmt = request.format or "json"

        if not dataset_id:
            datasets_dir = Path(settings.datasets_dir)
            if not datasets_dir.exists() or not any(datasets_dir.iterdir()):
                raise HTTPException(
                    status_code=400,
                    detail="No dataset_id provided and no datasets found in storage. Upload a file first via /api/upload-dataset."
                )
            candidates = sorted(datasets_dir.glob("*.json")) + sorted(datasets_dir.glob("*.jsonl")) + sorted(datasets_dir.glob("*.csv"))
            if not candidates:
                raise HTTPException(
                    status_code=400,
                    detail="No dataset files found in storage. Upload a file first via /api/upload-dataset."
                )
            dataset_id = candidates[0].name

        dataset_path = safe_child_path(Path(settings.datasets_dir), dataset_id)
        if not dataset_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Dataset '{dataset_id}' not found in {settings.datasets_dir}"
            )

        logger.info(f"Validating dataset: {dataset_path} (format: {fmt})")
        dataset_info = await dataset_processor.validate_dataset(
            str(dataset_path),
            format=fmt,
            dataset_id=dataset_id
        )
        return dataset_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dataset validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
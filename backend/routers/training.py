import asyncio
import io
import zipfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse

from models.schemas import (
    StartTrainingRequest, JobResponse, TrainingProgress,
    HyperparameterRequest, HyperparameterRecommendation,
    DatasetInfo, ComputeTier, TaskType
)
from routers.deps import training_service, model_analyzer, hyperparameter_optimizer, dataset_processor
from utils.logger import get_logger
from utils.security import safe_child_path
from config import settings

logger = get_logger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
        logger.info(f"WebSocket connected for job: {job_id}")

    def disconnect(self, job_id: str, websocket: WebSocket):
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        logger.info(f"WebSocket disconnected for job: {job_id}")


manager = ConnectionManager()


@router.post("/api/start-training", response_model=JobResponse)
async def start_training(request: StartTrainingRequest, background_tasks: BackgroundTasks):
    try:
        logger.info("=" * 60)
        logger.info(f"STARTING TRAINING JOB")
        logger.info(f"Model: {request.config.model_id}")
        logger.info(f"Dataset: {request.config.dataset_id}")
        logger.info(f"Epochs: {request.config.num_epochs}")
        logger.info(f"Learning Rate: {request.config.learning_rate}")
        logger.info(f"Use LoRA: {request.config.use_lora}")
        if request.config.use_lora and request.config.lora_config:
            logger.info(f"LoRA Config: r={request.config.lora_config.r}, alpha={request.config.lora_config.lora_alpha}")
            logger.info(f"Target Modules: {request.config.lora_config.target_modules}")
        logger.info(f"Job Name: {request.job_name}")
        logger.info("=" * 60)

        job_id = await training_service.start_training(
            config=request.config,
            job_name=request.job_name
        )

        logger.info(f"Training job created successfully: {job_id}")

        return JobResponse(
            job_id=job_id,
            status="queued",
            message="Training job created successfully",
            estimated_duration_minutes=30
        )

    except Exception as e:
        logger.error(f"Failed to start training: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/training-progress/{job_id}", response_model=TrainingProgress)
async def get_training_progress(job_id: str):
    try:
        progress = training_service.get_training_progress(job_id)
        return progress
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/cancel-training/{job_id}")
async def cancel_training(job_id: str):
    try:
        training_service.cancel_training(job_id)
        return {"message": f"Training job {job_id} cancelled"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/training-jobs")
async def list_training_jobs():
    try:
        jobs = training_service.get_all_jobs()
        return {"jobs": jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/recommend-hyperparameters", response_model=HyperparameterRecommendation)
async def recommend_hyperparameters(request: HyperparameterRequest):
    try:
        logger.info(f"Generating recommendations for {request.model_id}")

        model_info = await model_analyzer.analyze_model(request.model_id)

        dataset_info = None
        dataset_path = safe_child_path(Path(settings.datasets_dir), request.dataset_id)
        if dataset_path.exists():
            fmt = "jsonl" if request.dataset_id.endswith(".jsonl") else "json" if request.dataset_id.endswith(".json") else "csv" if request.dataset_id.endswith(".csv") else "json"
            dataset_info = await dataset_processor.validate_dataset(
                str(dataset_path),
                format=fmt,
                dataset_id=request.dataset_id
            )

        if dataset_info is None:
            dataset_info = DatasetInfo(
                dataset_id=request.dataset_id,
                num_samples=1000,
                num_train_samples=900,
                num_validation_samples=100,
                avg_tokens=256,
                max_tokens=512,
                min_tokens=50,
                data_preview=[],
                columns=["text"],
                validation_warnings=["Dataset not found on disk - using estimated statistics"],
                format="json",
                size_mb=10.0
            )

        recommendations = hyperparameter_optimizer.recommend_hyperparameters(
            model_info=model_info,
            dataset_info=dataset_info,
            compute_tier=ComputeTier(request.compute_tier),
            task_type=TaskType(request.task_type)
        )

        return recommendations

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Hyperparameter recommendation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/download-model/{job_id}")
async def download_model(job_id: str):
    try:
        logger.info(f"Preparing model download for job: {job_id}")

        output_dir = safe_child_path(Path(settings.outputs_dir), job_id) / "final_model"

        if not output_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Model not found for job {job_id}. Training may not be complete."
            )

        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_path in output_dir.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(output_dir)
                    zip_file.write(file_path, arcname)
                    logger.info(f"Added to ZIP: {arcname}")

            job_dir = safe_child_path(Path(settings.outputs_dir), job_id)
            config_file = job_dir / "config.json"
            metrics_file = job_dir / "training_metrics.json"

            if config_file.exists():
                zip_file.write(config_file, "config.json")
            if metrics_file.exists():
                zip_file.write(metrics_file, "training_metrics.json")

        zip_buffer.seek(0)

        logger.info(f"Model package created for job: {job_id}")

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=model-{job_id[:8]}.zip"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download model: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/download-package/{job_id}")
async def download_package(job_id: str):
    try:
        logger.info(f"Creating download package for job: {job_id}")

        job_dir = safe_child_path(Path(settings.outputs_dir), job_id)
        if not job_dir.exists():
            raise HTTPException(status_code=404, detail="Job not found")

        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_path in job_dir.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(job_dir)
                    zip_file.write(file_path, arcname)

        zip_buffer.seek(0)

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=model_{job_id}.zip"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Package download failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/download-file/{job_id}/{filename}")
async def download_file(job_id: str, filename: str):
    try:
        job_dir = safe_child_path(Path(settings.outputs_dir), job_id)
        file_path = safe_child_path(job_dir, filename)

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/octet-stream"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File download failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.websocket("/ws/training/{job_id}")
async def training_websocket(websocket: WebSocket, job_id: str):
    await manager.connect(job_id, websocket)

    try:
        try:
            progress = training_service.get_training_progress(job_id)
            await websocket.send_json({
                "type": "progress",
                "data": progress.model_dump()
            })
        except ValueError:
            await websocket.send_json({
                "type": "error",
                "message": "Job not found"
            })
            return

        while True:
            try:
                progress = training_service.get_training_progress(job_id)

                await websocket.send_json({
                    "type": "progress",
                    "data": progress.model_dump()
                })

                if progress.status in ["completed", "failed", "cancelled"]:
                    await websocket.send_json({
                        "type": "complete",
                        "status": progress.status
                    })
                    break

                await asyncio.sleep(1)

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break

    finally:
        manager.disconnect(job_id, websocket)
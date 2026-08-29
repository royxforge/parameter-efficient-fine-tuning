import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from routers.deps import training_service
from utils.logger import get_logger
from utils.security import safe_child_path
from config import settings

logger = get_logger(__name__)

router = APIRouter()


@router.get("/api/experiment/{job_id}/eval")
async def get_experiment_eval(job_id: str):
    """Get evaluation metrics and model card for a training job"""
    try:
        experiment_dir = safe_child_path(Path(settings.experiments_dir), job_id)
        job_dir = safe_child_path(Path(settings.outputs_dir), job_id)

        result = {"job_id": job_id, "metrics": None, "model_card": None}

        metrics_file = experiment_dir / "metrics.json"
        if not metrics_file.exists():
            metrics_file = job_dir / "training_metrics.json"

        if metrics_file.exists():
            with open(metrics_file, 'r') as f:
                metrics_data = json.load(f)

            training_logs = metrics_data.get("training_logs", [])
            if training_logs:
                last_log = training_logs[-1]
                result["metrics"] = {
                    "perplexity": metrics_data.get("perplexity"),
                    "final_loss": last_log.get("loss"),
                    "training_time_seconds": metrics_data.get("training_time"),
                    "peak_memory_mb": max(
                        (log.get("gpu_memory_mb", 0) for log in training_logs),
                        default=None
                    ),
                    "total_steps": len(training_logs),
                }

        model_card_file = experiment_dir / "model_card.json"
        if not model_card_file.exists():
            model_card_file = job_dir / "model_card.json"

        if model_card_file.exists():
            with open(model_card_file, 'r') as f:
                result["model_card"] = json.load(f)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get experiment eval: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/experiment/{job_id}/metadata")
async def get_experiment_metadata(job_id: str):
    """Get experiment metadata including config and artifacts list"""
    try:
        experiment_dir = safe_child_path(Path(settings.experiments_dir), job_id)
        job_dir = safe_child_path(Path(settings.outputs_dir), job_id)

        result = {
            "experiment_id": job_id,
            "seed": None,
            "config": None,
            "artifacts": {}
        }

        config_file = experiment_dir / "config.json"
        if not config_file.exists():
            config_file = job_dir / "config.json"

        if config_file.exists():
            with open(config_file, 'r') as f:
                config_data = json.load(f)
                result["config"] = config_data
                result["seed"] = config_data.get("seed", 42)

        artifacts_to_check = [
            ("metrics.json", "Metrics JSON"),
            ("training_metrics.json", "Training Metrics"),
            ("loss.png", "Loss Graph"),
            ("config.json", "Config"),
            ("model_card.json", "Model Card"),
        ]

        for filename, display_name in artifacts_to_check:
            file_path = experiment_dir / filename
            if not file_path.exists():
                file_path = job_dir / filename
            if file_path.exists():
                result["artifacts"][display_name] = str(file_path)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get experiment metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/experiment/{job_id}/artifact/{artifact_name}")
async def download_experiment_artifact(job_id: str, artifact_name: str):
    """Download a specific experiment artifact"""
    try:
        experiment_dir = safe_child_path(Path(settings.experiments_dir), job_id)
        job_dir = safe_child_path(Path(settings.outputs_dir), job_id)

        artifact_map = {
            "Metrics JSON": "metrics.json",
            "Training Metrics": "training_metrics.json",
            "Loss Graph": "loss.png",
            "Config": "config.json",
            "Model Card": "model_card.json",
        }

        filename = artifact_map.get(artifact_name, artifact_name)

        file_path = experiment_dir / filename
        if not file_path.exists():
            file_path = job_dir / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Artifact not found: {artifact_name}")

        media_type = "application/json"
        if filename.endswith(".png"):
            media_type = "image/png"
        elif filename.endswith(".pdf"):
            media_type = "application/pdf"

        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download artifact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/experiment/{job_id}/evaluate")
async def run_evaluation(job_id: str):
    """Run evaluation on a completed training job"""
    try:
        from services.eval_service import EvalService

        model_path = safe_child_path(Path(settings.outputs_dir), job_id) / "final_model"
        if not model_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Model not found. Training may not be complete."
            )

        eval_service = EvalService()

        config_file = safe_child_path(Path(settings.outputs_dir), job_id) / "config.json"
        config = {}
        dataset_path = ""
        if config_file.exists():
            with open(config_file, 'r') as f:
                config = json.load(f)
            dataset_id = config.get("dataset_id", "")
            dataset_path = str(Path(settings.datasets_dir) / dataset_id)
            if not Path(dataset_path).exists():
                dataset_path = dataset_id

        metrics = await eval_service.evaluate_model(
            model_path=str(model_path),
            dataset_path=dataset_path or str(model_path),
            config=config,
            split="test"
        )

        model_card = await eval_service.generate_model_card(
            job_id=job_id,
            training_args=config,
            dataset_stats={"path": dataset_path, "samples": metrics.get("eval_samples", 0)},
            eval_metrics=metrics,
            ablations={
                "use_lora": config.get("use_lora", True),
                "qlora": config.get("qlora", True),
                "use_gradient_checkpointing": config.get("gradient_checkpointing", True),
                "use_double_quant": config.get("bnb_4bit_use_double_quant", True),
                "use_paged_optimizers": config.get("use_paged_optimizers", True),
            },
            environment={
                "gpu_available": False,
                "pytorch_version": "2.x",
            }
        )

        experiment_dir = safe_child_path(Path(settings.experiments_dir), job_id)
        experiment_dir.mkdir(parents=True, exist_ok=True)

        with open(experiment_dir / "eval_metrics.json", 'w') as f:
            json.dump(metrics, f, indent=2)

        with open(experiment_dir / "model_card.json", 'w') as f:
            json.dump(model_card, f, indent=2)

        return {
            "status": "success",
            "metrics": metrics,
            "model_card": model_card
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
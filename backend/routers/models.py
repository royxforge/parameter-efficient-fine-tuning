from typing import List

from fastapi import APIRouter, HTTPException

from models.schemas import ModelAnalyzeRequest, ModelInfo
from routers.deps import model_analyzer
from utils.logger import get_logger
from config import POPULAR_MODELS

logger = get_logger(__name__)

router = APIRouter()


@router.post("/api/analyze-model", response_model=ModelInfo)
async def analyze_model(request: ModelAnalyzeRequest):
    try:
        logger.info(f"Analyzing model: {request.model_id}")
        model_info = await model_analyzer.analyze_model(request.model_id)
        return model_info
    except Exception as e:
        logger.error(f"Model analysis failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/models/popular", response_model=List[dict])
async def get_popular_models():
    try:
        models = []
        for model_id in POPULAR_MODELS[:10]:
            try:
                info = await model_analyzer.analyze_model(model_id)
                models.append({
                    "model_id": info.model_id,
                    "parameter_size": info.parameter_size,
                    "architecture": info.architecture,
                    "supported_tasks": info.supported_tasks,
                    "vram_inference": info.vram_requirements.get("inference_fp16", 0),
                    "vram_training": info.vram_requirements.get("training_lora_fp16", 0)
                })
            except Exception as e:
                logger.warning(f"Skipping model {model_id}: {e}")
                continue

        return models
    except Exception as e:
        logger.error(f"Failed to fetch popular models: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch models")
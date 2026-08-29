from fastapi import APIRouter, HTTPException

from models.schemas import QuantizationRequest, QuantizationResult
from routers.deps import quantization_service
from utils.logger import get_logger
from config import settings

logger = get_logger(__name__)

router = APIRouter()


@router.post("/api/quantize", response_model=QuantizationResult)
async def quantize_model(request: QuantizationRequest):
    try:
        logger.info(f"Quantizing model at {request.model_path}")

        result = await quantization_service.quantize_model(
            model_path=request.model_path,
            method=request.method,
            bits=request.bits
        )

        return result

    except Exception as e:
        logger.error(f"Quantization failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/quantization-comparison/{job_id}")
async def compare_quantization_methods(job_id: str):
    try:
        model_path = f"{settings.outputs_dir}/{job_id}/final_model"

        comparison = await quantization_service.compare_quantization_methods(model_path)
        return comparison

    except Exception as e:
        logger.error(f"Quantization comparison failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
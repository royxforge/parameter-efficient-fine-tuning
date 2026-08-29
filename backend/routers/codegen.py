from fastapi import APIRouter, HTTPException

from models.schemas import CodeGenerationRequest, GeneratedCode
from routers.deps import code_generator
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post("/api/generate-code", response_model=GeneratedCode)
async def generate_code(request: CodeGenerationRequest):
    try:
        logger.info(f"Generating {request.code_type} code")

        if request.code_type == "inference":
            code = code_generator.generate_inference_script(
                request.model_info,
                request.config
            )
        elif request.code_type == "gradio":
            code = code_generator.generate_gradio_app(
                request.model_info,
                request.config
            )
        elif request.code_type == "api":
            code = code_generator.generate_api_wrapper(
                request.model_info,
                request.config
            )
        elif request.code_type == "readme":
            code = code_generator.generate_readme(
                request.model_info,
                request.config,
                training_summary=request.config
            )
        elif request.code_type == "finetuning":
            code = code_generator.generate_finetuning_script(
                request.model_info,
                request.config
            )
        else:
            raise HTTPException(status_code=400, detail=f"Invalid code_type: {request.code_type}")

        return code

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Code generation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
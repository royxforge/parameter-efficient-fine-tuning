import os
os.environ["TORCH_COMPILE_DISABLE"] = "1"
os.environ["TORCHDYNAMO_DISABLE"] = "1"

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from models.schemas import ErrorResponse
from routers import models, datasets, training, quantization, codegen, experiments
from utils.logger import get_logger
from config import settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting LLM Fine-Tuning Pipeline API")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Allowed origins: {settings.allowed_origins}")

    yield

    logger.info("Shutting down API")

app = FastAPI(
    title="LLM Fine-Tuning Pipeline API",
    description="Production-ready API for automated LLM fine-tuning",
    version="0.8.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router)
app.include_router(datasets.router)
app.include_router(training.router)
app.include_router(quantization.router)
app.include_router(codegen.router)
app.include_router(experiments.router)


@app.get("/")
async def root():
    return {
        "message": "LLM Fine-Tuning Pipeline API",
        "version": "0.8.0",
        "docs": "/docs",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
        "services": {
            "model_analyzer": "operational",
            "training": "operational",
            "quantization": "operational"
        }
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    error_response = ErrorResponse(
        error=str(exc.detail),
        detail=None,
        status_code=exc.status_code
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    error_response = ErrorResponse(
        error="Internal server error",
        detail=str(exc),
        status_code=500
    )
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
        log_level=settings.log_level.lower()
    )
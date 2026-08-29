"""Configuration management for the LLM Fine-Tuning Pipeline."""

from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True
    environment: str = "development"
    
    # CORS Settings
    allowed_origins: Union[str, List[str]] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Hugging Face
    hf_token: str | None = None
    hf_cache_dir: str = "./cache/huggingface"
    
    # Storage Paths
    models_dir: str = "./storage/models"
    datasets_dir: str = "./storage/datasets"
    outputs_dir: str = "./storage/outputs"
    experiments_dir: str = "./storage/experiments"
    temp_dir: str = "./storage/temp"
    
    # Training Configuration (QLoRA defaults)
    max_concurrent_trainings: int = 2
    default_device: str = "cuda"
    mixed_precision: str = "fp16"
    use_qlora_by_default: bool = True
    default_quantization: str = "4bit"  # QLoRA uses 4-bit by default
    global_seed: int = 42
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "./logs/app.log"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        env_parse_none_str='none'
    )
    
    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    def ensure_directories(self):
        """Create necessary directories if they don't exist."""
        directories = [
            self.models_dir,
            self.datasets_dir,
            self.outputs_dir,
            self.experiments_dir,
            self.temp_dir,
            Path(self.log_file).parent,
            self.hf_cache_dir
        ]
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
settings.ensure_directories()


# Constants
SUPPORTED_MODEL_ARCHITECTURES = [
    "llama", "mistral", "gpt2", "gpt-neo", "gpt-j", "bloom", 
    "opt", "t5", "bart", "roberta", "bert", "albert", "electra"
]

SUPPORTED_TASKS = [
    "text-generation",
    "text-classification", 
    "token-classification",
    "question-answering",
    "summarization",
    "translation"
]

QUANTIZATION_METHODS = ["4bit", "8bit", "gptq", "gguf"]

# QLoRA Configuration
QLORA_CONFIG = {
    "default_quantization": "4bit",
    "quant_type": "nf4",  # NormalFloat 4-bit
    "compute_dtype": "float16",
    "use_double_quant": True,  # Nested quantization
    "optimizer": "paged_adamw_8bit"  # Memory-efficient optimizer
}

COMPUTE_TIERS = {
    "free": {"vram_gb": 15, "batch_size": 1},
    "basic": {"vram_gb": 24, "batch_size": 2},
    "pro": {"vram_gb": 40, "batch_size": 4},
    "enterprise": {"vram_gb": 80, "batch_size": 8}
}

POPULAR_MODELS = [
    "meta-llama/Llama-2-7b-hf",
    "meta-llama/Llama-2-13b-hf",
    "mistralai/Mistral-7B-v0.1",
    "tiiuae/falcon-7b",
    "gpt2",
    "gpt2-medium",
    "EleutherAI/gpt-neo-2.7B",
    "bigscience/bloom-1b7",
    "facebook/opt-1.3b",
    "google/flan-t5-base",
    "google/flan-t5-large"
]

"""Shared Pydantic schemas and enums for the backend API."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ComputeTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class TaskType(str, Enum):
    TEXT_GENERATION = "text-generation"
    TEXT_CLASSIFICATION = "text-classification"
    TOKEN_CLASSIFICATION = "token-classification"
    QUESTION_ANSWERING = "question-answering"
    SUMMARIZATION = "summarization"
    TRANSLATION = "translation"


class TrainingStatus(str, Enum):
    QUEUED = "queued"
    INITIALIZING = "initializing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class QuantizationMethod(str, Enum):
    BITS_4 = "4bit"
    BITS_8 = "8bit"
    GPTQ = "gptq"
    GGUF = "gguf"


class ModelAnalyzeRequest(BaseModel):
    model_id: str


class ModelInfo(BaseModel):
    model_id: str
    architecture: str = "unknown"
    num_parameters: int = 0
    parameter_size: str = "0"
    supported_tasks: List[str] = Field(default_factory=list)
    tokenizer_type: str = "unknown"
    context_length: int = 2048
    vram_requirements: Dict[str, float] = Field(default_factory=dict)
    license: str = "unknown"
    model_type: str = "unknown"
    hidden_size: int = 0
    num_layers: int = 0
    num_attention_heads: int = 0
    vocab_size: int = 0
    has_bias: bool = True
    activation_function: str = "unknown"


class DatasetUploadRequest(BaseModel):
    dataset_id: Optional[str] = None
    format: Optional[str] = None


class DatasetInfo(BaseModel):
    dataset_id: str
    num_samples: int
    num_train_samples: int
    num_validation_samples: int
    avg_tokens: float
    max_tokens: int
    min_tokens: int
    data_preview: List[Dict[str, Any]] = Field(default_factory=list)
    columns: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    format: str = "json"
    size_mb: float = 0.0


class LoRAConfig(BaseModel):
    r: int = 8
    lora_alpha: int = 16
    lora_dropout: float = 0.05
    target_modules: List[str] = Field(default_factory=lambda: ["q_proj", "v_proj"])
    bias: str = "none"
    task_type: str = "CAUSAL_LM"


class TrainingConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    model_id: str
    dataset_id: str
    task_type: TaskType | str = TaskType.TEXT_GENERATION
    learning_rate: float = 2e-4
    batch_size: int = 4
    gradient_accumulation_steps: int = 1
    num_epochs: int = 3
    warmup_steps: int = 50
    optimizer: str = "paged_adamw_8bit"
    scheduler: str = "cosine"
    weight_decay: float = 0.01
    max_grad_norm: float = 1.0
    use_lora: bool = True
    lora_config: Optional[LoRAConfig] = None
    quantization: Optional[str] = "4bit"
    load_in_4bit: bool = True
    load_in_8bit: bool = False
    fp16: bool = True
    bf16: bool = False
    gradient_checkpointing: bool = True
    max_seq_length: int = 512
    validation_split: float = 0.1
    logging_steps: int = 10
    save_steps: int = 100
    eval_steps: int = 100

    seed: int = 42
    qlora: bool = True
    bnb_4bit_compute_dtype: str = "float16"
    bnb_4bit_quant_type: str = "nf4"
    bnb_4bit_use_double_quant: bool = True
    use_paged_optimizers: bool = True
    save_total_limit: int = 3
    group_by_length: bool = True
    report_to: List[str] = Field(default_factory=list)


class HyperparameterRequest(BaseModel):
    model_id: str
    dataset_id: str
    compute_tier: str = ComputeTier.FREE.value
    task_type: str = TaskType.TEXT_GENERATION.value


class HyperparameterRecommendation(BaseModel):
    config: TrainingConfig
    explanations: Dict[str, str] = Field(default_factory=dict)
    estimated_vram_gb: float
    estimated_training_time_hours: float
    estimated_cost_usd: float = 0.0
    confidence_score: float
    warnings: List[str] = Field(default_factory=list)


class StartTrainingRequest(BaseModel):
    config: TrainingConfig
    job_name: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str
    estimated_duration_minutes: Optional[int] = None


class TrainingMetrics(BaseModel):
    step: int
    epoch: float
    train_loss: float
    learning_rate: float
    grad_norm: float = 0.0
    samples_per_second: float = 0.0
    steps_per_second: float = 0.0


class TrainingProgress(BaseModel):
    job_id: str
    status: TrainingStatus
    current_step: int
    total_steps: int
    current_epoch: float
    total_epochs: int
    train_loss: Optional[float] = None
    val_loss: Optional[float] = None
    best_val_loss: Optional[float] = None
    learning_rate: float = 0.0
    samples_per_second: float = 0.0
    eta_seconds: int = 0
    gpu_memory_usage: Optional[float] = None
    gpu_utilization: Optional[float] = None
    latest_metrics: Optional[TrainingMetrics] = None
    checkpoints: List[str] = Field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    progress_message: Optional[str] = None


class QuantizationRequest(BaseModel):
    model_path: str
    method: QuantizationMethod
    bits: int = 4


class QuantizationResult(BaseModel):
    original_size_mb: float
    quantized_size_mb: float
    compression_ratio: float
    method: str
    bits: int
    output_path: str
    estimated_speedup: float
    estimated_memory_reduction: float


class CodeGenerationRequest(BaseModel):
    model_info: Dict[str, Any] = Field(default_factory=dict)
    config: Dict[str, Any] = Field(default_factory=dict)
    code_type: str


class GeneratedCode(BaseModel):
    code: str
    filename: str
    language: str
    description: str


class ErrorResponse(BaseModel):
    detail: str

"""Shared Pydantic schemas and enums for the backend API."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    # extra="forbid": unknown fields are almost always typos or a client
    # sending a stale schema; silently ignoring them let misconfigured runs
    # proceed with defaults. extra="allow" also let arbitrary payloads into
    # the config dict that is persisted with the job.
    model_config = ConfigDict(extra="forbid")

    model_id: str = Field(..., min_length=1, pattern=r"^[A-Za-z0-9._/\-]+$")
    dataset_id: str = Field(..., min_length=1)
    task_type: TaskType = TaskType.TEXT_GENERATION
    learning_rate: float = Field(default=2e-4, gt=0, le=1.0)
    batch_size: int = Field(default=4, ge=1, le=1024)
    gradient_accumulation_steps: int = Field(default=1, ge=1, le=1024)
    num_epochs: int = Field(default=3, ge=1, le=1000)
    warmup_steps: int = Field(default=50, ge=0)
    optimizer: str = "paged_adamw_8bit"
    scheduler: str = "cosine"
    weight_decay: float = Field(default=0.01, ge=0.0, le=1.0)
    max_grad_norm: float = Field(default=1.0, gt=0)
    use_lora: bool = True
    lora_config: Optional[LoRAConfig] = None
    quantization: Optional[QuantizationMethod] = QuantizationMethod.BITS_4
    load_in_4bit: bool = True
    load_in_8bit: bool = False
    fp16: bool = True
    bf16: bool = False
    gradient_checkpointing: bool = True
    max_seq_length: int = Field(default=512, ge=1, le=1_000_000)
    validation_split: float = Field(default=0.1, ge=0.0, lt=1.0)
    logging_steps: int = Field(default=10, ge=1)
    save_steps: int = Field(default=100, ge=1)
    eval_steps: int = Field(default=100, ge=1)

    seed: int = 42
    qlora: bool = True
    bnb_4bit_compute_dtype: str = "float16"
    bnb_4bit_quant_type: str = "nf4"
    bnb_4bit_use_double_quant: bool = True
    use_paged_optimizers: bool = True
    save_total_limit: int = Field(default=3, ge=1)
    group_by_length: bool = True
    report_to: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_quantization_consistency(self) -> "TrainingConfig":
        """Reject combinations that bitsandbytes/transformers cannot apply."""
        if self.load_in_4bit and self.load_in_8bit:
            raise ValueError(
                "load_in_4bit and load_in_8bit are mutually exclusive."
            )
        if self.fp16 and self.bf16:
            raise ValueError("fp16 and bf16 are mutually exclusive.")
        if self.quantization is None and (self.load_in_4bit or self.load_in_8bit):
            # load_in_4bit defaults to True, so a None quantization step with
            # the default flags still asks bitsandbytes to load quantized;
            # require the pair to agree instead of silently ignoring one.
            if self.qlora:
                raise ValueError(
                    "quantization=None is inconsistent with qlora=True and "
                    "load_in_4bit=True; set quantization or disable both."
                )
        return self


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
    # Required to subscribe to /ws/training/{job_id}; returned only from the
    # creation call so the stream is not open to anyone who guesses a job id.
    access_token: Optional[str] = None


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
    error: str
    detail: Optional[str] = None
    status_code: int

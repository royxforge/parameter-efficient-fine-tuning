"""Training service for fine-tuning models."""

import os
os.environ["TORCH_COMPILE_DISABLE"] = "1"
os.environ["TORCHDYNAMO_DISABLE"] = "1"

import asyncio
import secrets
import uuid
import threading
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import json
import random
import numpy as np
import matplotlib.pyplot as plt

import torch
import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()

from models.schemas import TrainingConfig, TrainingProgress, TrainingStatus, TrainingMetrics
from utils.logger import get_logger
from config import settings
from services.dataset_processor import DatasetProcessor

logger = get_logger(__name__)


class TrainingCancelledError(Exception):
    pass


class TrainingService:
    """Service for managing model training jobs."""

    def __init__(self):
        self.output_dir = Path(settings.outputs_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.experiments_dir = Path(settings.experiments_dir)
        self.experiments_dir.mkdir(parents=True, exist_ok=True)
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.cancel_events: Dict[str, threading.Event] = {}
        self.dataset_processor = DatasetProcessor()

    def _set_seed(self, seed: int):
        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

    def get_job_access_token(self, job_id: str) -> Optional[str]:
        """Return the job's WebSocket access token, or None if unknown."""
        job_state = self.active_jobs.get(job_id)
        if job_state is None:
            return None
        return job_state.get("access_token")

    def verify_job_token(self, job_id: str, token: Optional[str]) -> bool:
        """Constant-time check that *token* is allowed to stream *job_id*.

        Unknown jobs return False as well, so an unauthorised caller cannot
        probe which job ids exist.
        """
        expected = self.get_job_access_token(job_id)
        if not expected or not token:
            return False
        return secrets.compare_digest(str(token), str(expected))

    async def start_training(
        self,
        config: TrainingConfig,
        job_name: Optional[str] = None
    ) -> str:
        job_id = str(uuid.uuid4())

        job_dir = self.output_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        config_path = job_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(config.model_dump(), f, indent=2)

        job_state = {
            "job_id": job_id,
            "job_name": job_name or f"training_{job_id[:8]}",
            "config": config,
            "status": TrainingStatus.QUEUED,
            "started_at": datetime.now().isoformat(),
            "current_step": 0,
            "total_steps": 0,
            "current_epoch": 0,
            "metrics": [],
            "eval_losses": [],
            "checkpoints": [],
            "output_dir": str(job_dir),
            "gpu_memory_mb": None,
            "gpu_utilization": None,
            # Per-job bearer token for the progress WebSocket. Job ids alone
            # are guessable enough for a local API that progress (loss curves,
            # checkpoint paths, GPU stats) must not stream to anyone who asks.
            "access_token": secrets.token_urlsafe(32),
        }

        self.active_jobs[job_id] = job_state
        self.cancel_events[job_id] = threading.Event()
        logger.info(f"Training job created: {job_id}")

        asyncio.create_task(self._run_training(job_id))

        return job_id

    async def _run_training(self, job_id: str):
        job_state = self.active_jobs[job_id]

        try:
            job_state["status"] = TrainingStatus.INITIALIZING
            logger.info(f"Initializing training job: {job_id}")

            await asyncio.to_thread(self._run_actual_training, job_id)

            if job_state["status"] not in (TrainingStatus.FAILED, TrainingStatus.CANCELLED):
                job_state["status"] = TrainingStatus.COMPLETED
                job_state["completed_at"] = datetime.now().isoformat()
                logger.info(f"Training job completed: {job_id}")

        except TrainingCancelledError:
            logger.info(f"Training job cancelled: {job_id}")
        except Exception as e:
            logger.error(f"Training job failed: {job_id} - {e}")
            if job_state["status"] != TrainingStatus.CANCELLED:
                job_state["status"] = TrainingStatus.FAILED
                job_state["error_message"] = str(e)
            job_state["completed_at"] = datetime.now().isoformat()

    def get_training_progress(self, job_id: str) -> TrainingProgress:
        if job_id not in self.active_jobs:
            raise ValueError(f"Job not found: {job_id}")

        job_state = self.active_jobs[job_id]

        latest_metrics = None
        if job_state["metrics"]:
            latest_metrics = TrainingMetrics(**job_state["metrics"][-1])

        if job_state["status"] == TrainingStatus.RUNNING and latest_metrics:
            remaining_steps = job_state["total_steps"] - job_state["current_step"]
            eta_seconds = int(remaining_steps / latest_metrics.steps_per_second) if latest_metrics.steps_per_second > 0 else 0
        else:
            eta_seconds = 0

        eval_losses = job_state.get("eval_losses", [])
        val_loss = eval_losses[-1] if eval_losses else None
        best_val_loss = min(eval_losses) if eval_losses else None

        current_step = job_state.get("current_step", 0)
        total_steps = max(job_state.get("total_steps", 1), 1)

        return TrainingProgress(
            job_id=job_id,
            status=job_state["status"],
            current_step=current_step,
            total_steps=total_steps,
            current_epoch=job_state.get("current_epoch", 0),
            total_epochs=job_state["config"].num_epochs,
            train_loss=latest_metrics.train_loss if latest_metrics else None,
            val_loss=val_loss,
            best_val_loss=best_val_loss,
            learning_rate=latest_metrics.learning_rate if latest_metrics else 0.0,
            samples_per_second=latest_metrics.samples_per_second if latest_metrics else 0.0,
            eta_seconds=eta_seconds,
            gpu_memory_usage=job_state.get("gpu_memory_mb"),
            gpu_utilization=job_state.get("gpu_utilization"),
            latest_metrics=latest_metrics,
            checkpoints=job_state.get("checkpoints", []),
            started_at=job_state.get("started_at"),
            completed_at=job_state.get("completed_at"),
            error_message=job_state.get("error_message"),
            progress_message=job_state.get("progress_message", "Initializing...")
        )

    def cancel_training(self, job_id: str):
        if job_id not in self.active_jobs:
            raise ValueError(f"Job not found: {job_id}")

        job_state = self.active_jobs[job_id]
        if job_state["status"] in [TrainingStatus.QUEUED, TrainingStatus.INITIALIZING, TrainingStatus.RUNNING]:
            job_state["status"] = TrainingStatus.CANCELLED
            job_state["completed_at"] = datetime.now().isoformat()
            self.cancel_events[job_id].set()
            logger.info(f"Training job cancelled: {job_id}")
        else:
            raise ValueError(f"Cannot cancel job in status: {job_state['status']}")

    def get_all_jobs(self) -> list[Dict[str, Any]]:
        return [
            {
                "job_id": job_id,
                "job_name": state["job_name"],
                "status": state["status"],
                "model_id": state["config"].model_id,
                "started_at": state.get("started_at"),
                "completed_at": state.get("completed_at")
            }
            for job_id, state in self.active_jobs.items()
        ]

    def cleanup_job(self, job_id: str):
        if job_id in self.active_jobs:
            del self.active_jobs[job_id]
            self.cancel_events.pop(job_id, None)
            logger.info(f"Job cleaned up: {job_id}")

    def _run_actual_training(self, job_id: str):
        if hasattr(torch, 'compile'):
            def no_op_compile(model, *args, **kwargs):
                return model
            torch.compile = no_op_compile

        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            TrainingArguments,
            Trainer,
            BitsAndBytesConfig,
            TrainerCallback
        )
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

        job_state = self.active_jobs[job_id]
        cancel_event = self.cancel_events[job_id]
        config: TrainingConfig = job_state["config"]
        output_dir = Path(job_state["output_dir"])
        experiment_dir = self.experiments_dir / job_id
        experiment_dir.mkdir(parents=True, exist_ok=True)

        try:
            job_state["status"] = TrainingStatus.RUNNING
            job_state["progress_message"] = "Initializing training job..."
            logger.info(f"Initializing training for job: {job_id}")

            self._set_seed(config.seed)

            gpu_available = torch.cuda.is_available()
            logger.info(f"GPU available: {gpu_available}")

            if not gpu_available:
                logger.warning("No GPU detected - disabling quantization for CPU training")
                job_state["progress_message"] = "No GPU detected - using CPU mode (slower but compatible)"
                config.load_in_4bit = False
                config.load_in_8bit = False
                config.fp16 = False
                config.bf16 = False

            job_state["progress_message"] = "Downloading tokenizer..."
            logger.info(f"Loading tokenizer from {config.model_id}")

            tokenizer = AutoTokenizer.from_pretrained(
                config.model_id,
                token=settings.hf_token
            )
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            job_state["progress_message"] = "Tokenizer loaded successfully"

            model_kwargs = {
                "trust_remote_code": True,
                "token": settings.hf_token,
                "use_cache": False if config.gradient_checkpointing else True
            }

            if gpu_available and config.qlora and (config.load_in_4bit or config.load_in_8bit):
                job_state["progress_message"] = "Configuring quantization..."

                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=config.load_in_4bit,
                    load_in_8bit=config.load_in_8bit,
                    bnb_4bit_compute_dtype=torch.float16 if config.bnb_4bit_compute_dtype == "float16" else torch.bfloat16,
                    bnb_4bit_quant_type=config.bnb_4bit_quant_type,
                    bnb_4bit_use_double_quant=config.bnb_4bit_use_double_quant,
                )
                model_kwargs["quantization_config"] = bnb_config
                model_kwargs["device_map"] = "auto"
                model_kwargs["torch_dtype"] = torch.float16

                logger.info(f"Loading model {config.model_id} with quantization...")
            else:
                job_state["progress_message"] = f"Downloading model {config.model_id} (Standard Mode)..."
                logger.info(f"Loading model {config.model_id} without quantization...")
                model_kwargs["torch_dtype"] = torch.float32

            model = AutoModelForCausalLM.from_pretrained(config.model_id, **model_kwargs)

            if config.gradient_checkpointing:
                model.gradient_checkpointing_enable()

            if config.use_lora:
                if gpu_available and config.qlora and (config.load_in_4bit or config.load_in_8bit):
                    model = prepare_model_for_kbit_training(
                        model,
                        use_gradient_checkpointing=config.gradient_checkpointing
                    )

                job_state["progress_message"] = "Configuring LoRA adapters..."

                if not config.lora_config:
                    from models.schemas import LoRAConfig
                    config.lora_config = LoRAConfig()

                target_modules = config.lora_config.target_modules
                if config.model_id.lower().startswith('gpt2') or 'gpt2' in config.model_id.lower():
                    target_modules = ["c_attn"]

                peft_config = LoraConfig(
                    r=config.lora_config.r,
                    lora_alpha=config.lora_config.lora_alpha,
                    lora_dropout=config.lora_config.lora_dropout,
                    target_modules=target_modules,
                    bias=config.lora_config.bias,
                    task_type=config.lora_config.task_type,
                    inference_mode=False
                )

                model = get_peft_model(model, peft_config)
                model.print_trainable_parameters()

            job_state["progress_message"] = "Loading and tokenizing dataset..."

            try:
                tokenized_dataset = asyncio.run(self.dataset_processor.get_tokenized_dataset(
                    dataset_path=config.dataset_id,
                    tokenizer_name=config.model_id,
                    max_seq_length=config.max_seq_length,
                    validation_split=config.validation_split,
                    seed=config.seed
                ))

                if config.validation_split > 0:
                    train_dataset = tokenized_dataset["train"]
                    eval_dataset = tokenized_dataset["test"]
                else:
                    train_dataset = tokenized_dataset
                    eval_dataset = None

            except Exception as e:
                logger.error(f"Dataset processing failed: {e}")
                raise ValueError(f"Failed to process dataset: {str(e)}")

            class ExperimentCallback(TrainerCallback):
                def __init__(self, job_state, experiment_dir, cancel_event):
                    self.job_state = job_state
                    self.experiment_dir = experiment_dir
                    self.cancel_event = cancel_event
                    self.loss_history = []
                    self.steps_history = []

                def on_step_end(self, args, state, control, **kwargs):
                    if self.cancel_event.is_set():
                        raise TrainingCancelledError(f"Training job {self.job_state['job_id']} cancelled")
                    self.job_state["current_step"] = state.global_step
                    self.job_state["current_epoch"] = state.epoch

                def on_log(self, args, state, control, logs=None, **kwargs):
                    if logs:
                        if torch.cuda.is_available():
                            logs["gpu_mem_allocated"] = torch.cuda.memory_allocated()
                            logs["gpu_mem_reserved"] = torch.cuda.memory_reserved()
                            self.job_state["gpu_memory_mb"] = round(torch.cuda.memory_allocated() / (1024 * 1024), 1)

                        eval_loss = logs.get("eval_loss")
                        if eval_loss is not None:
                            self.job_state["eval_losses"].append(eval_loss)

                        log_entry = {
                            "step": state.global_step,
                            "timestamp": datetime.now().isoformat(),
                            **logs
                        }

                        with open(self.experiment_dir / "metrics.jsonl", "a") as f:
                            f.write(json.dumps(log_entry) + "\n")

                        loss = logs.get("loss")
                        if loss is not None:
                            self.loss_history.append(loss)
                            self.steps_history.append(state.global_step)

                            metrics = TrainingMetrics(
                                step=state.global_step,
                                epoch=state.epoch,
                                train_loss=loss,
                                learning_rate=logs.get("learning_rate", args.learning_rate),
                                grad_norm=logs.get("grad_norm", 0.0),
                                samples_per_second=logs.get("samples_per_second", 0.0),
                                steps_per_second=logs.get("steps_per_second", 0.0)
                            )
                            self.job_state["metrics"].append(metrics.model_dump())
                            self.job_state["progress_message"] = f"Step {state.global_step}/{state.max_steps} | Loss: {loss:.4f}"

                            if len(self.steps_history) > 1:
                                try:
                                    plt.figure(figsize=(10, 6))
                                    plt.plot(self.steps_history, self.loss_history, label="Training Loss")
                                    plt.xlabel("Steps")
                                    plt.ylabel("Loss")
                                    plt.title(f"Training Loss - {self.job_state['job_name']}")
                                    plt.legend()
                                    plt.grid(True)
                                    plt.savefig(self.experiment_dir / "loss.png")
                                    plt.close()
                                except Exception as plot_err:
                                    logger.warning(f"Failed to save loss plot: {plot_err}")

                def on_train_begin(self, args, state, control, **kwargs):
                    self.job_state["total_steps"] = state.max_steps
                    self.job_state["status"] = TrainingStatus.RUNNING

                    metadata = {
                        "config": self.job_state["config"].model_dump(),
                        "ablations": {
                            "use_gradient_checkpointing": config.gradient_checkpointing,
                            "use_double_quant": config.bnb_4bit_use_double_quant,
                            "use_paged_optimizers": config.use_paged_optimizers,
                            "qlora": config.qlora
                        },
                        "environment": {
                            "gpu_available": torch.cuda.is_available(),
                            "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
                            "torch_version": torch.__version__
                        }
                    }
                    with open(self.experiment_dir / "metadata.json", "w") as f:
                        json.dump(metadata, f, indent=2)

            optim_type = "paged_adamw_8bit" if (gpu_available and config.use_paged_optimizers) else "adamw_torch"

            training_args = TrainingArguments(
                output_dir=str(output_dir),
                num_train_epochs=config.num_epochs,
                per_device_train_batch_size=config.batch_size,
                gradient_accumulation_steps=config.gradient_accumulation_steps,
                gradient_checkpointing=config.gradient_checkpointing,
                optim=optim_type,
                learning_rate=config.learning_rate,
                weight_decay=config.weight_decay,
                max_grad_norm=config.max_grad_norm,
                lr_scheduler_type=config.scheduler,
                warmup_steps=config.warmup_steps,
                fp16=(config.fp16 and not config.bf16) if gpu_available else False,
                bf16=config.bf16 if gpu_available else False,
                logging_steps=1,
                save_steps=config.save_steps,
                eval_steps=config.eval_steps if eval_dataset else None,
                save_total_limit=config.save_total_limit,
                eval_strategy="steps" if eval_dataset else "no",
                seed=config.seed,

                report_to=config.report_to,
                ddp_find_unused_parameters=False,
                remove_unused_columns=False,
                torch_compile=False,
            )

            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=eval_dataset,
                callbacks=[ExperimentCallback(job_state, experiment_dir, cancel_event)]
            )
            trainer.tokenizer = tokenizer

            job_state["progress_message"] = "Starting training loop..."
            logger.info(f"Starting training for job: {job_id}")

            train_result = trainer.train()

            job_state["progress_message"] = "Saving fine-tuned model..."
            trainer.save_model(str(output_dir / "final_model"))
            tokenizer.save_pretrained(str(output_dir / "final_model"))

            metrics_file = output_dir / "training_metrics.json"
            with open(metrics_file, 'w') as f:
                json.dump(train_result.metrics, f, indent=2)

            job_state["status"] = TrainingStatus.COMPLETED
            job_state["progress_message"] = "Training completed successfully"
            job_state["completed_at"] = datetime.now().isoformat()
            logger.info(f"Training completed successfully: {job_id}")

        except TrainingCancelledError:
            logger.info(f"Training cancelled for job {job_id}")
            raise
        except Exception as e:
            logger.error(f"Training failed for job {job_id}: {e}", exc_info=True)
            job_state["status"] = TrainingStatus.FAILED
            job_state["error_message"] = str(e)
            job_state["completed_at"] = datetime.now().isoformat()
            raise
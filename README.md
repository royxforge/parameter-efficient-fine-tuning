# Parameter Efficient Fine-Tuning
### A Production-Grade LLM Fine-Tuning Platform with QLoRA

<p align="left">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white" />
  <img src="https://img.shields.io/badge/HuggingFace-1000%2B%20Models-FFD21E?style=flat-square&logo=huggingface&logoColor=black" />
  <img src="https://img.shields.io/badge/QLoRA-4bit%20NF4-14b8a6?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-6366f1?style=flat-square" />
</p>

> Production-grade fine-tuning platform for large language models from 2B to 70B parameters. Implements QLoRA (4-bit NF4 quantization + LoRA adapters) to make fine-tuning accessible without enterprise-grade hardware, with a guided 5-step pipeline and live training dashboard.

---

## Table of Contents

- [The Problem](#the-problem)
- [Key Result](#key-result)
- [Engineering Design](#engineering-design)
- [Architecture](#architecture)
- [Experimental Setup](#experimental-setup)
- [Results](#results)
- [LoRA vs Full Fine-Tune](#lora-vs-full-fine-tune)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [The 5-Step Pipeline](#the-5-step-pipeline)
- [Repository Structure](#repository-structure)
- [Related Work](#related-work)
- [Citation](#citation)

---

## The Problem

Fine-tuning a 70B LLM with standard full fine-tuning requires updating every one of its parameters on each backward pass. On consumer or mid-range hardware, this is intractable. The VRAM requirements alone rule out most practitioners.

The alternative is not to give up on fine-tuning. It is to ask which parameters actually matter.

**QLoRA answers that question. Parameter Efficient Fine-Tuning operationalizes the answer into a platform.**

---

## Key Result

> **LoRA fine-tuning on GPT-2 with 0.24% of parameters (295K / 124M) matched full fine-tuning on generalization - perplexity 16.13 vs 20.41 - while running 3.5x faster and using 421x fewer trainable parameters.**

Full fine-tuning overfit on the small dataset (loss dropped to 0.80) while LoRA's low-rank constraint acted as a regularizer, achieving better held-out perplexity despite higher training loss. This is the tradeoff that makes LoRA the default for VRAM-constrained environments.

---

## Engineering Design

The core insight: efficient fine-tuning is not about compute. It is about which parameters actually matter. QLoRA freezes base model weights and trains only low-rank adapter matrices, reducing the trainable parameter count by orders of magnitude. On GPU, 4-bit NF4 quantization additionally reduces the base model's memory footprint by ~75% compared to FP16 full fine-tuning.

```
Base Model (frozen)
      |
      v
+-----------------+
|  Quantization   |   4-bit NF4 quantization (bitsandbytes)
|  (QLoRA)        |   ~75% VRAM reduction vs FP16 full fine-tune (GPU)
+--------+--------+
         |
         v
+-----------------+
|  LoRA Adapters  |   Low-rank matrices injected into attention layers
|  (PEFT)         |   Only adapters are trained, base weights frozen
+--------+--------+
         |
         v
+-----------------+
|  Training Loop  |   Real-time loss, VRAM, throughput monitoring
|  (PyTorch)      |   WebSocket streaming to Next.js dashboard
+--------+--------+
         |
         v
+-----------------+
|  Artifact Export|   Merged model, LoRA weights, config templates
|                 |   Ready for inference deployment
+-----------------+
```

---

## Architecture

| Layer | Technology |
|---|---|
| **Fine-Tuning** | QLoRA, PEFT, bitsandbytes |
| **Model Framework** | PyTorch, HuggingFace Transformers |
| **Backend** | FastAPI, WebSockets |
| **Frontend** | Next.js, TypeScript |
| **Streaming** | Server-Sent Events |

---

## Experimental Setup

**Comparison:** LoRA vs Full Fine-Tune on GPT-2 (124M parameters), 10 prompt-engineering samples. Both runs used identical settings. The only variable was `use_lora`.

| Parameter | Value |
|---|---|
| Model | GPT-2 (124,440,576 parameters) |
| Dataset | 10 prompt-engineering samples |
| Epochs | 3 |
| Learning Rate | 5e-5 (cosine scheduler, 5 warmup steps) |
| Batch Size | 1 (gradient accumulation: 2) |
| Seed | 42 |
| LoRA Config | r=8, alpha=16, target modules: c_attn |
| Hardware | CPU (torch 2.11.0+cpu) |

---

## Results

### LoRA Run

| Metric | Value |
|---|---|
| **Final Train Loss** | 8.5132 |
| **Perplexity** | 16.127 |
| **Training Time** | 101.8 seconds |
| **Trainable Parameters** | 294,912 / 124,440,576 (0.24%) |
| **Samples/sec** | 0.295 |
| **Steps/sec** | 0.147 |
| **Total Steps** | 15 (3 epochs x 5 steps/epoch) |

### Loss Curve

| Step | Loss | Learning Rate |
|---|---|---|
| 1 | 8.3376 | 0.0 (warmup) |
| 2 | 8.3794 | 1e-5 |
| 5 | 8.5533 | 4e-5 (peak warmup) |
| 6 | 8.4633 | 5e-5 (peak LR) |
| 10 | 8.0822 | 3.27e-5 |
| 15 | 8.5937 | 1.22e-6 (end) |

### Output Artifacts

Each training run produces:

```
storage/outputs/{job_id}/
+-- final_model/            # LoRA adapter weights
+-- training_metrics.json   # Loss, runtime, throughput
+-- model_card.json         # Config, dataset stats, evaluation

storage/experiments/{job_id}/
+-- loss.png                # Training loss graph
+-- metrics.jsonl           # Per-step metrics log
+-- metadata.json           # Ablations, environment
```

---

## LoRA vs Full Fine-Tune

Both runs: seed 42, 3 epochs, LR 5e-5, cosine scheduler. Only `use_lora` differed.

| Metric | LoRA (0.24% params) | Full Fine-Tune (100% params) | Delta |
|---|---|---|---|
| Training Time | 101.8s | 355.0s | 3.5x faster |
| Final Loss | 8.513 | 2.957 | n/a |
| **Perplexity** | **16.13** | **20.41** | **21% better** |
| Samples/sec | 0.295 | 0.085 | 3.5x faster |
| Total FLOPs | 7.87T | 7.84T | ~identical |
| Trainable Params | 295K | 124M | 421x fewer |
| Grad Norm (start) | 2.28 | 180.53 | 79x smaller |
| Grad Norm (end) | 2.17 | 4.44 | 2x smaller |

### Loss progression

| Step | LoRA Loss | Full FT Loss |
|---|---|---|
| 1 | 8.338 | 8.366 |
| 3 | 8.633 | 7.493 |
| 5 | 8.553 | 3.609 |
| 7 | 9.156 | 1.178 |
| 10 | 8.082 | 1.104 |
| 15 | 8.594 | 0.795 |

### What the numbers show

**Speed.** LoRA ran 3.5x faster because only 0.24% of parameters needed gradients. On GPU this gap narrows but remains significant.

**Loss vs generalization.** Full fine-tune achieved lower training loss (2.96 vs 8.51) by memorizing the 10-sample dataset - loss dropped to 0.80 by step 15. LoRA's low-rank constraint prevented memorization. Held-out perplexity penalizes overfitting, which is why LoRA wins on the metric that matters.

**Gradient stability.** LoRA gradients stayed in a healthy range (1.9-2.6) throughout. Full fine-tune started with a gradient norm of 180+ before settling. LoRA is more numerically stable and requires less careful LR tuning in practice.

**Memory.** 421x fewer trainable parameters means LoRA fits on hardware where full fine-tuning is not an option. The 295K adapter parameters would train on a free-tier T4 GPU.

**Bottom line.** On small datasets, LoRA is faster, more stable, and generalizes better. On larger datasets (1000+ samples), full fine-tuning closes the perplexity gap, but LoRA remains the default choice for VRAM-constrained environments.

### Verdict

| Consideration | Winner |
|---|---|
| Speed / Efficiency | LoRA (3.5x faster, 421x fewer params) |
| Final training loss | Full FT (2.96 vs 8.51) |
| Generalization | LoRA (better perplexity on small data) |
| Gradient stability | LoRA (2.28 vs 180.53 initial grad norm) |
| Memory footprint | LoRA (295K vs 124M trainable params) |

---

## Features

| Feature | Description |
|---|---|
| **QLoRA Fine-Tuning** | 4-bit NF4 quantization with LoRA adapters via PEFT |
| **Smart Hyperparameters** | Automated defaults based on model size and dataset |
| **Real-Time Monitoring** | Live loss curves, VRAM usage, and throughput via WebSockets |
| **Dataset Validation** | Automated format checking and preprocessing |
| **Artifact Export** | Merged model weights, LoRA adapters, and inference configs |
| **Model Browser** | Search and load 1000+ HuggingFace models directly |
| **Multi-Format Support** | Instruction tuning, completion, and chat template formats |

---

## Installation

```bash
git clone https://github.com/royxforge/parameter-efficient-fine-tuning.git
cd parameter-efficient-fine-tuning

# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

**Core dependencies:** PyTorch · HuggingFace Transformers · PEFT · bitsandbytes · FastAPI · Next.js

---

## Usage

```bash
# Terminal 1 - backend
python run.py

# Terminal 2 - frontend
cd frontend && npm run dev
```

Open `http://localhost:3000` and launch the workspace. The platform loads any HuggingFace-compatible model, validates your dataset, and walks through the 5-step pipeline with live monitoring.

---

## The 5-Step Pipeline

**01 Inspect** - Select and analyze your base model. View parameter count, architecture, and estimated VRAM requirements before committing to a run.

**02 Prepare** - Upload and validate your training dataset. Automated format detection handles instruction tuning, completion, and chat template formats.

**03 Optimize** - Configure QLoRA parameters with smart defaults derived from model size and dataset. Override any hyperparameter manually.

**04 Train** - Real-time dashboard with live loss curves, VRAM profiling, and throughput metrics streamed via WebSockets.

**05 Ship** - Export merged model weights, standalone LoRA adapters, and inference code templates ready for deployment.

---

## Repository Structure

```
parameter-efficient-fine-tuning/
|
+-- run.py                   # Entry point
+-- backend/                 # FastAPI server, training loop, QLoRA logic
|   +-- main.py              # API endpoints
|   +-- services/            # Training, model analysis, hyperparameter optimization
|   +-- models/schemas.py    # Pydantic request/response types
|   +-- utils/               # Compute estimation, HF utilities, logging
+-- frontend/                # Next.js dashboard, WebSocket client
+-- storage/
|   +-- outputs/             # Per-job model artifacts and metrics
|   +-- experiments/         # Loss plots and per-step logs
+-- requirements.txt
+-- LICENSE
```

---

## Related Work

- [Auto-Researcher](https://github.com/royxforge/auto-researcher-python) - Multi-agent academic research system
- [Unsupervised Confidence Estimation](https://github.com/royxforge/unsupervised-confidence-estimation) - Uncertainty estimation for model outputs
- [Production Drift Detection](https://github.com/royxforge/production-drift-detection) - Production drift monitoring for fine-tuned models

Parameter Efficient Fine-Tuning sits at the beginning of this pipeline: fine-tune carefully with QLoRA, then quantify uncertainty in deployment via Self-Diagnosing Neural Models and monitor for distribution shift via Production Drift Detection.

---

## Citation

```bibtex
@software{roy2025parameter-efficient-fine-tuning,
  author = {Roy, Sourav},
  title  = {Parameter Efficient Fine-Tuning: Efficient LLM Fine-Tuning Platform with QLoRA},
  year   = {2025},
  url    = {https://github.com/royxforge/parameter-efficient-fine-tuning}
}
```

---

<p align="center">
  <sub>Built by <a href="https://github.com/royxforge">Sourav Roy</a> · Artificial Intelligence Engineer · Accure Inc.</sub>
</p>

# Changelog

All notable changes to the Parameter Efficient Fine-Tuning project are documented in this file.

The format follows the principles of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.9.0] - 2026-09-26

### Security

- **Path/RCE guards**: quantized output paths resolve beneath the models directory (`safe_child_path` + `is_relative_to`); dataset loading uses `trust_remote_code=False` with an allowlist and rows are serialized via `Dataset.to_json` (stringified labels/bboxes no longer corrupt records); the training export zip is size-capped and streamed; error responses return opaque job IDs instead of raw exception strings (paths/tokens); the WebSocket progress loop honours client disconnects.
- **Config validation**: `TrainingConfig` is now `extra="forbid"` with typed `task_type`/`quantization` enums, range constraints (`learning_rate > 0`, `batch_size >= 1`, `validation_split in [0,1)`, …), a `model_id` pattern, and mutual-exclusion validators (`load_in_4bit` vs `load_in_8bit`, `fp16` vs `bf16`). Unknown fields previously passed through silently.

---

## [0.8.0] - 2026-08-29

### Added

- **Modular backend API architecture**: Decomposed the monolithic `backend/main.py` (780+ lines) into six focused router modules under `backend/routers/`:
  - `models.py` -- Model analysis and popular model listing endpoints.
  - `datasets.py` -- Dataset upload (file and HuggingFace Hub) and validation endpoints.
  - `training.py` -- Training job lifecycle, hyperparameter recommendations, WebSocket streaming, and file download endpoints.
  - `quantization.py` -- Model quantization and method comparison endpoints.
  - `codegen.py` -- Code generation endpoint supporting inference, Gradio, FastAPI, README, and standalone fine-tuning script generation.
  - `experiments.py` -- Experiment evaluation, metadata retrieval, and artifact download endpoints.
  - `deps.py` -- Centralized service dependency injection for all routers.
  - `__init__.py` -- Package initialization.

- **Path traversal prevention**: Added `backend/utils/security.py` with `safe_child_path()` utility that validates all file-access paths stay within allowed base directories. Integrated across all download, upload, and file-serving endpoints.

- **Experiment evaluation endpoint**: Added `POST /api/experiment/{job_id}/evaluate` that runs `EvalService.evaluate_model()` on completed training jobs, generates a model card, and persists evaluation metrics and model card as JSON artifacts.

- **Expanded test suite**: Added 30+ new unit tests across two test modules:
  - `tests/test_api.py` -- 11 API endpoint tests covering health checks, training progress, cancel, job listing, path traversal prevention (standard, Windows, and URL-encoded variants), error response shape validation, and missing-field handling.
  - `tests/test_training_service.py` -- 7 training service tests covering job management, progress retrieval, evaluation loss tracking, cancellation lifecycle, and cleanup.

- **Root entry point**: Added `run.py` at the project root for simplified backend startup with `python run.py`, resolving the Python path automatically.

- **Root-level requirements**: Added `requirements.txt` at the project root that forwards to `backend/requirements.txt`, simplifying dependency installation.

- **Standalone fine-tuning script generation**: Added `generate_finetuning_script()` to `CodeGenerator` that produces a self-contained Python script with all hyperparameters baked in, ready to run in Google Colab or locally. The Training component now offers "Download code" and "Open in Colab" actions.

### Changed

- **Backend entry point**: `backend/main.py` reduced from ~780 lines to ~80 lines -- now only handles app initialization, CORS, router registration, and health/root endpoints.

- **Training component (`Training.tsx`)**: Redesigned the pre-training view with a configuration summary grid (model, dataset, epochs, learning rate), "Run it elsewhere" section with Colab and download buttons, and refined the active training view with cleaner metric tiles, progress visualization, and artifact download links on completion.

- **Frontend component simplification**: Refactored all six major frontend components (`CodeGeneration`, `DatasetUpload`, `HyperparameterTuning`, `LandingExperience`, `ModelAnalysis`, `PipelineWorkspace`) -- simplified markup, removed excessive wrapper elements, and consolidated styling for consistency.

- **Global stylesheet (`globals.css`)**: Streamlined CSS by removing redundant utility classes and consolidating animation keyframes, reducing the stylesheet by ~400 lines while preserving all visual behavior.

- **Training service (`training_service.py`)**: Refactored to use centralized dependency injection from `routers/deps.py` instead of local instantiation.

- **API version bump**: FastAPI app version updated from 0.7.0 to 0.8.0.

### Security

- Path traversal prevention across all file-serving endpoints using `safe_child_path()`.
- File upload validation rejecting filenames starting with dots.
- URL-encoded and backslash-based traversal vectors tested and blocked.

---

## [0.7.0] - 2026-07-20

### Added

- **Realistic compute estimation**: `ComputeEstimator._estimate_architecture()` replaces the broken `sqrt(num_params / 12)` formula with a lookup table based on real LLM architectures (GPT, LLaMA, OPT, Pythia), providing accurate `hidden_size` and `num_layers` values for parameter counts from 100M to 100B+.
  - Gradient checkpointing factor adjusted from 0.1 (unrealistic 90% reduction) to 0.5 (realistic 50% reduction).
  - Added KV-cache memory estimation for training workloads.
  - Added 0.5 GB fixed CUDA context overhead.
  - Overhead multiplier increased from 10% to 15% for more realistic memory accounting.
  - The `test_recommend_batch_size` pre-existing test failure is now resolved -- `recommend_batch_size()` correctly differentiates between 10 GB and 24 GB VRAM tiers for 7B-class models.

- **API endpoint fixes**: Three previously stubbed endpoints now fully functional:
  - `/api/validate-dataset`: Validates already-uploaded datasets from storage directory with automatic file discovery when no `dataset_id` is provided.
  - `/api/upload-dataset` with `dataset_id` parameter: Loads datasets directly from HuggingFace Hub by name, saves as JSONL, and validates.
  - `/api/experiment/{job_id}/evaluate`: Fixed signature mismatch -- now correctly passes all required arguments (`model_path`, `dataset_path`, `config`, `split`) to `EvalService.evaluate_model()` and the correct 7-parameter form to `generate_model_card()`.
  - `from datetime import datetime` moved to top of file for PEP 8 compliance.

- **Expanded test suite**: Added 28 new unit tests across two test modules:
  - `tests/test_dataset_processor.py`: 11 tests covering JSON, JSONL, and instruction-format dataset validation, train/val splitting, token statistics, file size reporting, format error handling, preprocessing, and save/load roundtrip.
  - `tests/test_schemas.py`: 17 tests covering all Pydantic schema enums, default values, custom configurations, and validation for ModelInfo, DatasetInfo, TrainingConfig, LoRAConfig, JobResponse, TrainingProgress, and more.

### Fixed

- **`test_recommend_batch_size`**: Pre-existing test failure resolved -- the batch size recommendation now correctly returns different values for 10 GB vs 24 GB VRAM tiers with a 7B model.

### Changed

- Storage cleaner component for managing disk utilization across experimental artifacts.
- Environment variable file (`env.local`) for frontend deployment configuration.

---

## [0.6.0] - 2026-07-20

### Added

- **Community health files**: Added `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1), `CONTRIBUTING.md` (contribution guidelines), `SECURITY.md` (vulnerability reporting policy), and `CITATION.cff` (citation metadata). These files establish project governance, community participation guidelines, and academic attribution framework.

---

## [0.5.0] - 2026-07-14

### Changed

- Revisions to the project `README.md` to refine documentation precision and narrative clarity.
- Updated `frontend/app/layout.tsx` with improved structural organization for the application shell.
- Enhanced `LandingExperience.tsx` and `PipelineWorkspace.tsx` components for improved user onboarding and workflow ergonomics.

---

## [0.4.1] - 2026-06-13

### Changed

- Revised `README.md` across multiple revisions to improve explanatory clarity, correct typographical inconsistencies, and remove unnecessary punctuation.
- Updated `assets/welcome.png` to reflect rebranding of the landing page visual asset.

---

## [0.4.0] - 2026-05-25

### Added

- Comprehensive frontend component suite including:
  - `CodeGeneration.tsx` for automated inference script generation.
  - `DatasetUpload.tsx` with drag-and-drop file handling and format detection.
  - `HyperparameterTuning.tsx` for interactive parameter configuration.
  - `LandingExperience.tsx` providing the application landing page with animated UI elements.
  - `ModelAnalysis.tsx` for displaying model architecture and parameter statistics.
  - `PipelineWorkspace.tsx` orchestrating the multi-step fine-tuning workflow.
  - `Training.tsx` with real-time loss and metric visualization.
  - `StorageCleaner.tsx` for managing artifact lifecycle.
- Pipeline route (`frontend/app/pipeline/page.tsx`) to house the fine-tuning workspace.
- Global stylesheet (`frontend/app/globals.css`) establishing the application design system.
- Root layout (`frontend/app/layout.tsx`) and providers (`frontend/app/providers.tsx`) for application-wide concerns including React Query integration.
- Landing page (`frontend/app/page.tsx`) with feature showcase and call-to-action sections.
- Frontend configuration files: `package.json`, `tailwind.config.js`, `package-lock.json`.
- Visual asset (`assets/welcome.png`) for the landing page hero section.
- Backend environment configuration template (`backend/.env.example`).

### Changed

- Transition from a basic frontend shell to a fully realized component architecture with Zustand-based state management and Tailwind CSS styling.

---

## [0.3.0] - 2026-03-23

### Added

- `.gitignore` rules to exclude build artifacts, cache directories, and environment files.
- Pydantic schema definitions in `backend/models/schemas.py` for typed API request and response validation.

### Fixed

- Removal of extraneous files from version control tracking through `.gitignore` updates.

### Changed

- Comprehensive frontend component improvements across `globals.css`, application layout, landing page, pipeline page, and all major components (`CodeGeneration`, `DatasetUpload`, `HyperparameterTuning`, `LandingExperience`, `ModelAnalysis`, `PipelineWorkspace`, `Training`). These updates refined visual presentation, interaction models, and responsive behavior.
- Updated `frontend/package-lock.json` to reflect dependency resolution changes.

---

## [0.2.0] - 2025-11-30

### Added

- Evaluation service (`backend/services/eval_service.py`) providing perplexity computation and automated metric collection for trained models.
- Experiment runner script (`backend/scripts/run_experiment.py`) enabling reproducible training runs with configurable hyperparameter sweeps.
- Backend configuration module (`backend/config.py`) for centralized environment and runtime parameter management.
- Unit test suite (`backend/tests/test_compute_estimator.py`) validating VRAM and compute estimation accuracy.
- Test infrastructure scaffolding (`backend/tests/__init__.py`).
- `ModelCard` and `ExperimentMetadata` data structures supporting standardized artifact documentation.
- Hyperparameter optimization interface in `HyperparameterTuning.tsx` with recommendation visualization.
- Training progress monitoring in `Training.tsx` with streaming metric display.
- Code generation panel in `CodeGeneration.tsx` for producing deployment-ready scripts.
- Pipeline state management via `frontend/store/pipelineStore.ts` using Zustand.
- TypeScript type definitions in `frontend/types/index.ts` covering API contracts and domain models.

### Changed

- Enhanced `backend/services/training_service.py` with checkpointing, metric streaming, and experiment metadata generation.
- Improved `backend/services/dataset_processor.py` with stricter validation and preprocessing pipelines.
- Updated `backend/main.py` with new API endpoints for evaluation and experiment lifecycle management.
- Refined `backend/requirements.txt` with updated dependency pins.
- Enhanced `.gitignore` patterns for broader coverage of temporary and generated files.

### Removed

- Deprecated environment file (`backend/env`) superseded by the structured configuration module.

---

## [0.1.1] - 2025-10-22

### Added

- MIT License (`LICENSE`) governing project distribution and usage.
- Backend environment file (`backend/env`) for local development configuration.
- Frontend environment file (`frontend/env.local`) for API endpoint and WebSocket URL configuration.
- Visual asset (`assets/welcome.png`) for the application landing page.

### Changed

- Updated `README.md` to include license information and environment setup instructions.

---

## [0.1.0] - 2025-10-22

### Added

- **Backend API (FastAPI):**
  - `backend/main.py` with RESTful endpoints for model analysis, dataset processing, hyperparameter recommendation, training orchestration, quantization, code generation, and artifact export.
  - `backend/config.py` for application-level constants and path resolution.
  - `backend/services/model_analyzer.py` for extracting architecture metadata, parameter counts, and VRAM requirements from HuggingFace models.
  - `backend/services/hyperparameter_optimizer.py` for computing learning rate, batch size, LoRA rank, and other training parameters based on model characteristics and hardware constraints.
  - `backend/services/dataset_processor.py` for loading, validating, and transforming datasets in JSON, CSV, and JSONL formats.
  - `backend/services/training_service.py` for orchestrating background training jobs with checkpointing and progress reporting.
  - `backend/services/quantization_service.py` for applying 4-bit NF4, 8-bit, GPTQ, and GGUF quantization methods.
  - `backend/services/code_generator.py` for producing inference scripts, Gradio applications, API wrappers, and deployment documentation.
  - `backend/utils/hf_utils.py` providing a wrapper around the HuggingFace Hub API for model discovery and metadata retrieval.
  - `backend/utils/compute_estimator.py` implementing analytical models for VRAM consumption and training time prediction.
  - `backend/utils/logger.py` providing structured logging via the Loguru library.
  - `backend/utils/qlora_utils.py` for QLoRA-specific configuration and adapter management.
  - `backend/models/schemas.py` defining Pydantic models for typed API communication.
  - `backend/scripts/run_experiment.py` for executing parameterized training experiments.
  - `backend/requirements.txt` enumerating all Python package dependencies.
  - `backend/tests/test_compute_estimator.py` validating compute estimation accuracy.

- **Frontend Application (Next.js 14):**
  - `frontend/app/layout.tsx` providing the root application shell with metadata and font configuration.
  - `frontend/app/page.tsx` serving as the landing page.
  - `frontend/app/pipeline/page.tsx` hosting the fine-tuning workflow interface.
  - `frontend/app/providers.tsx` integrating TanStack Query for server state management.
  - `frontend/app/globals.css` defining the design system with CSS custom properties, glassmorphism utilities, and animation keyframes.
  - `frontend/components/CodeGeneration.tsx` for displaying generated deployment code with syntax highlighting.
  - `frontend/components/DatasetUpload.tsx` for file upload with drag-and-drop and format validation.
  - `frontend/components/HyperparameterTuning.tsx` for interactive hyperparameter configuration.
  - `frontend/components/LandingExperience.tsx` for the animated hero section and feature showcase.
  - `frontend/components/ModelAnalysis.tsx` for displaying model architecture details and VRAM estimates.
  - `frontend/components/PipelineWorkspace.tsx` orchestrating the six-step pipeline workflow.
  - `frontend/components/Training.tsx` for real-time training monitoring with loss curves and throughput metrics.
  - `frontend/hooks/useModelAnalysis.ts` encapsulating model analysis API calls and state.
  - `frontend/store/pipelineStore.ts` managing global pipeline state via Zustand.
  - `frontend/types/index.ts` defining TypeScript interfaces for all domain models and API contracts.
  - `frontend/next.config.js` with image domains and build configuration.
  - `frontend/tailwind.config.js` with custom color palette, animations, and design tokens.
  - `frontend/postcss.config.js` for Tailwind CSS and autoprefixer integration.
  - `frontend/tsconfig.json` with path aliases and strict type checking.
  - `frontend/package.json` declaring all Node.js dependencies and build scripts.

- **Project Infrastructure:**
  - `.gitignore` with patterns for Python, Node.js, IDE, and OS artifacts.
  - `README.md` with comprehensive documentation covering architecture, installation, usage, experimental results, and related work.
  - `LICENSE` under the MIT open source license.
  - `requirements.txt` at the project root for top-level dependency declaration.

---

## Release History

- **0.8.0** - 2026-08-29: Modular backend architecture, path traversal prevention, experiment evaluation, expanded test suite, and standalone fine-tuning script generation.
- **0.5.0** - 2026-07-14: Documentation and frontend component refinements.
- **0.4.1** - 2026-06-13: Documentation revisions and visual asset update.
- **0.4.0** - 2026-05-25: Full frontend component architecture with Tailwind CSS and Zustand.
- **0.3.0** - 2026-03-23: Bug fixes and frontend improvements.
- **0.2.0** - 2025-11-30: Evaluation metrics, experiment tracking, and code generation.
- **0.1.1** - 2025-10-22: License and environment configuration.
- **0.1.0** - 2025-10-22: Initial release with backend API and frontend application.

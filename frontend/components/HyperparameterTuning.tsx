"use client";

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Info,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';

export default function HyperparameterTuning() {
  const {
    modelInfo,
    datasetInfo,
    setRecommendations,
    setTrainingConfig,
    setCurrentStep,
    recommendations,
  } = usePipelineStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState({
    learning_rate: 0.0002,
    batch_size: 4,
    gradient_accumulation_steps: 4,
    num_epochs: 3,
    max_seq_length: 512,
    warmup_steps: 100,
    save_steps: 500,
    eval_steps: 500,
    logging_steps: 10,
    seed: 42,
    validation_split: 0.1,
    qlora: true,
    use_gradient_checkpointing: true,
    use_double_quant: true,
    use_paged_optimizers: true,
  });

  const parseNumber = (value: string, fallback: number): number => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseInteger = (value: string, fallback: number): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const handleGetRecommendations = async () => {
    if (!modelInfo || !datasetInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/recommend-hyperparameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelInfo.model_id,
          dataset_id: datasetInfo.dataset_id,
          compute_tier: 'basic',
          task_type: 'text-generation',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.status}`);
      }

      const data = await response.json();
      setRecommendations(data);

      setConfig({
        learning_rate: data.config.learning_rate ?? 0.0002,
        batch_size: data.config.batch_size ?? 4,
        gradient_accumulation_steps: data.config.gradient_accumulation_steps ?? 4,
        num_epochs: data.config.num_epochs ?? 3,
        max_seq_length: data.config.max_seq_length ?? 512,
        warmup_steps: data.config.warmup_steps ?? 100,
        save_steps: data.config.save_steps ?? 500,
        eval_steps: data.config.eval_steps ?? 500,
        logging_steps: data.config.logging_steps ?? 10,
        seed: data.config.seed ?? 42,
        validation_split: data.config.validation_split ?? 0.1,
        qlora: data.config.qlora ?? true,
        use_gradient_checkpointing: data.config.gradient_checkpointing ?? true,
        use_double_quant: data.config.bnb_4bit_use_double_quant ?? true,
        use_paged_optimizers: data.config.use_paged_optimizers ?? true,
      });
    } catch (recommendationError: any) {
      setError(recommendationError.message || 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    if (!modelInfo || !datasetInfo) return;

    const trainingConfig = {
      model_id: modelInfo.model_id,
      dataset_id: datasetInfo.dataset_id,
      task_type: 'text-generation',
      learning_rate: config.learning_rate,
      batch_size: config.batch_size,
      gradient_accumulation_steps: config.gradient_accumulation_steps,
      num_epochs: config.num_epochs,
      max_seq_length: config.max_seq_length,
      warmup_steps: config.warmup_steps,
      save_steps: config.save_steps,
      eval_steps: config.eval_steps,
      logging_steps: config.logging_steps,
      seed: config.seed,
      validation_split: config.validation_split,
      use_lora: true,
      lora_config: {
        r: 8,
        lora_alpha: 16,
        lora_dropout: 0.05,
        target_modules: ['q_proj', 'v_proj'],
        bias: 'none',
        task_type: 'CAUSAL_LM',
      },
      qlora: config.qlora,
      load_in_4bit: config.qlora,
      load_in_8bit: false,
      quantization: config.qlora ? '4bit' : null,
      bnb_4bit_quant_type: 'nf4',
      bnb_4bit_use_double_quant: config.use_double_quant,
      bnb_4bit_compute_dtype: 'float16',
      gradient_checkpointing: config.use_gradient_checkpointing,
      use_paged_optimizers: config.use_paged_optimizers,
      optimizer: config.use_paged_optimizers ? 'paged_adamw_8bit' : 'adamw_torch',
    };

    setTrainingConfig(trainingConfig as any);
    setCurrentStep('training');
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <section className="text-center">
        <span className="badge-pill">Step 3 of 5</span>
        <h2 className="section-title mt-4">Hyperparameter Tuning</h2>
        <p className="section-description mx-auto mt-3 max-w-3xl">
          Start with AI recommendations, then fine-tune the training profile for your model, data size, and GPU limits.
        </p>
      </section>

      {!recommendations && (
        <section className="surface-card-strong">
          <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <div className="rounded-2xl bg-slate-900 p-3 text-teal-300">
              <Wand2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Generate AI recommendations</h3>
              <p className="mt-1 text-sm text-slate-600">
                Auto-tune baseline settings using model architecture, dataset profile, and compute assumptions.
              </p>
            </div>
            <button
              onClick={handleGetRecommendations}
              disabled={isLoading || !modelInfo || !datasetInfo}
              className="primary-button px-6 py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Recommend
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {recommendations && (
        <section className="surface-tint">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-teal-700" />
            <div>
              <p className="text-sm font-semibold text-teal-800">Recommendations applied</p>
              <p className="mt-1 text-sm text-slate-700">
                Suggested defaults are loaded. Review, adjust, and continue when you are ready.
              </p>
            </div>
          </div>
        </section>
      )}

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Could not fetch recommendations</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </section>
      )}

      <section className="surface-card-strong space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-semibold text-slate-900">Training configuration</h3>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-teal-300">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Editable controls
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="field-label">Learning rate</span>
            <input
              type="number"
              step="0.00001"
              value={config.learning_rate}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  learning_rate: parseNumber(event.target.value, previous.learning_rate),
                }))
              }
              className="text-input"
            />
          </label>

          <label className="block">
            <span className="field-label">Batch size</span>
            <input
              type="number"
              min="1"
              value={config.batch_size}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  batch_size: parseInteger(event.target.value, previous.batch_size),
                }))
              }
              className="text-input"
            />
          </label>

          <label className="block">
            <span className="field-label">Gradient accumulation</span>
            <input
              type="number"
              min="1"
              value={config.gradient_accumulation_steps}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  gradient_accumulation_steps: parseInteger(
                    event.target.value,
                    previous.gradient_accumulation_steps
                  ),
                }))
              }
              className="text-input"
            />
            <p className="mt-1 text-xs text-slate-500">
              Effective batch size: {config.batch_size * config.gradient_accumulation_steps}
            </p>
          </label>

          <label className="block">
            <span className="field-label">Epochs</span>
            <input
              type="number"
              min="1"
              value={config.num_epochs}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  num_epochs: parseInteger(event.target.value, previous.num_epochs),
                }))
              }
              className="text-input"
            />
          </label>

          <label className="block">
            <span className="field-label">Max sequence length</span>
            <input
              type="number"
              min="128"
              step="128"
              value={config.max_seq_length}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  max_seq_length: parseInteger(event.target.value, previous.max_seq_length),
                }))
              }
              className="text-input"
            />
          </label>

          <label className="block">
            <span className="field-label">Warmup steps</span>
            <input
              type="number"
              min="0"
              value={config.warmup_steps}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  warmup_steps: parseInteger(event.target.value, previous.warmup_steps),
                }))
              }
              className="text-input"
            />
          </label>

          <label className="block">
            <span className="field-label">Random seed</span>
            <input
              type="number"
              value={config.seed}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  seed: parseInteger(event.target.value, previous.seed),
                }))
              }
              className="text-input"
            />
          </label>

          <label className="block">
            <span className="field-label">Validation split</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="0.5"
              value={config.validation_split}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  validation_split: parseNumber(event.target.value, previous.validation_split),
                }))
              }
              className="text-input"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-teal-700" />
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Default quantization profile</p>
              <p>4-bit NF4 quantization with optional double quantization and paged optimizers.</p>
              <p>Recommended for lower VRAM usage while preserving training quality.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Advanced toggles</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <input
                type="checkbox"
                checked={config.qlora}
                onChange={(event) =>
                  setConfig((previous) => ({
                    ...previous,
                    qlora: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">QLoRA (4-bit)</p>
                <p className="text-xs text-slate-600">Turn off only when testing non-quantized baselines.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <input
                type="checkbox"
                checked={config.use_gradient_checkpointing}
                onChange={(event) =>
                  setConfig((previous) => ({
                    ...previous,
                    use_gradient_checkpointing: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Gradient checkpointing</p>
                <p className="text-xs text-slate-600">Lower memory use with slight compute overhead.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <input
                type="checkbox"
                checked={config.use_double_quant}
                onChange={(event) =>
                  setConfig((previous) => ({
                    ...previous,
                    use_double_quant: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Double quantization</p>
                <p className="text-xs text-slate-600">Extra compression for VRAM-constrained hardware.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <input
                type="checkbox"
                checked={config.use_paged_optimizers}
                onChange={(event) =>
                  setConfig((previous) => ({
                    ...previous,
                    use_paged_optimizers: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Paged optimizers</p>
                <p className="text-xs text-slate-600">Memory-efficient optimizer implementation for large runs.</p>
              </div>
            </label>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => setCurrentStep('dataset')} className="secondary-button">
          <ArrowLeft className="h-4 w-4" />
          Back to Dataset
        </button>

        <button onClick={handleSaveConfig} className="primary-button px-6 py-3">
          Continue to Training
          <ArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}

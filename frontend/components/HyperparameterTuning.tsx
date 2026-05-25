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

    const trainingConfig: Record<string, unknown> = {
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
      {/* Header */}
      <div className="section-header">
        <div className="badge-primary inline-flex">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Step 3 of 5
        </div>
        <h2>Hyperparameter Tuning</h2>
        <p>
          Start with AI recommendations, then fine-tune the training profile for your model, data, and GPU limits.
        </p>
      </div>

      {/* Recommendations section */}
      {!recommendations && (
        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Generate AI recommendations</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Auto-tune baseline settings using model architecture, dataset profile, and compute assumptions.
              </p>
            </div>
            <button
              onClick={handleGetRecommendations}
              disabled={isLoading || !modelInfo || !datasetInfo}
              className="btn-primary w-full sm:w-auto shrink-0"
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
        </div>
      )}

      {recommendations && (
        <div className="card border-emerald-500/20 bg-emerald-500/[0.02] p-4 animate-scale-in">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Recommendations applied
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Suggested defaults loaded. Review, adjust, and continue when ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card border-destructive/20 bg-destructive/[0.03] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Could not fetch recommendations</p>
              <p className="mt-1 text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration form */}
      <div className="card card-shadow-lg p-4 sm:p-6 space-y-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Training configuration</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Editable
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label-text">Learning rate</label>
            <input
              type="number"
              step="0.00001"
              value={config.learning_rate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, learning_rate: parseNumber(e.target.value, prev.learning_rate) }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Batch size</label>
            <input
              type="number"
              min="1"
              value={config.batch_size}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, batch_size: parseInteger(e.target.value, prev.batch_size) }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Gradient accumulation</label>
            <input
              type="number"
              min="1"
              value={config.gradient_accumulation_steps}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  gradient_accumulation_steps: parseInteger(e.target.value, prev.gradient_accumulation_steps),
                }))
              }
              className="input-field"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Effective batch size: {config.batch_size * config.gradient_accumulation_steps}
            </p>
          </div>
          <div>
            <label className="label-text">Epochs</label>
            <input
              type="number"
              min="1"
              value={config.num_epochs}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, num_epochs: parseInteger(e.target.value, prev.num_epochs) }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Max sequence length</label>
            <input
              type="number"
              min="128"
              step="128"
              value={config.max_seq_length}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, max_seq_length: parseInteger(e.target.value, prev.max_seq_length) }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Warmup steps</label>
            <input
              type="number"
              min="0"
              value={config.warmup_steps}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, warmup_steps: parseInteger(e.target.value, prev.warmup_steps) }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Random seed</label>
            <input
              type="number"
              value={config.seed}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, seed: parseInteger(e.target.value, prev.seed) }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Validation split</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="0.5"
              value={config.validation_split}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, validation_split: parseNumber(e.target.value, prev.validation_split) }))
              }
              className="input-field"
            />
          </div>
        </div>

        {/* Quantization info */}
        <div className="rounded-xl border bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Default quantization profile</p>
              <p>4-bit NF4 quantization with optional double quantization and paged optimizers.</p>
              <p>Recommended for lower VRAM usage while preserving training quality.</p>
            </div>
          </div>
        </div>

        {/* Advanced toggles */}
        <div className="rounded-xl border bg-card/50 p-4 sm:p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Advanced toggles
          </h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card/50 p-3 py-3.5 sm:py-3 transition hover:border-primary/20 hover:bg-card touch-target">
              <input
                type="checkbox"
                checked={config.qlora}
                onChange={(e) => setConfig((prev) => ({ ...prev, qlora: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-semibold">QLoRA (4-bit)</p>
                <p className="text-xs text-muted-foreground">Turn off only when testing non-quantized baselines.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card/50 p-3 transition hover:border-primary/20 hover:bg-card">
              <input
                type="checkbox"
                checked={config.use_gradient_checkpointing}
                onChange={(e) => setConfig((prev) => ({ ...prev, use_gradient_checkpointing: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-semibold">Gradient checkpointing</p>
                <p className="text-xs text-muted-foreground">Lower memory use with slight compute overhead.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card/50 p-3 transition hover:border-primary/20 hover:bg-card">
              <input
                type="checkbox"
                checked={config.use_double_quant}
                onChange={(e) => setConfig((prev) => ({ ...prev, use_double_quant: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-semibold">Double quantization</p>
                <p className="text-xs text-muted-foreground">Extra compression for VRAM-constrained hardware.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card/50 p-3 transition hover:border-primary/20 hover:bg-card">
              <input
                type="checkbox"
                checked={config.use_paged_optimizers}
                onChange={(e) => setConfig((prev) => ({ ...prev, use_paged_optimizers: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-semibold">Paged optimizers</p>
                <p className="text-xs text-muted-foreground">Memory-efficient optimizer for large runs.</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3">            <button onClick={() => setCurrentStep('dataset')} className="btn-secondary justify-center">
          <ArrowLeft className="h-4 w-4" />
          Back to Dataset
        </button>
        <button onClick={handleSaveConfig} className="btn-primary px-6 py-2.5 justify-center">
          Continue to Training
          <ArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}

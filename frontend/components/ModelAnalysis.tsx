"use client";

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Cpu,
  Loader2,
  Search,
  Database,
  Layers,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { useModelAnalysis } from '@/hooks/useModelAnalysis';
import { formatNumber } from '@/lib/utils';

const popularModels = [
  { id: 'meta-llama/Llama-2-7b-hf', name: 'Llama 2 7B', size: '7B', vram: '~7 GB QLoRA' },
  { id: 'meta-llama/Llama-2-13b-hf', name: 'Llama 2 13B', size: '13B', vram: '~13 GB QLoRA' },
  { id: 'mistralai/Mistral-7B-v0.1', name: 'Mistral 7B', size: '7B', vram: '~7 GB QLoRA' },
  { id: 'tiiuae/falcon-7b', name: 'Falcon 7B', size: '7B', vram: '~7 GB QLoRA' },
  { id: 'gpt2', name: 'GPT-2', size: '124M', vram: '~1 GB' },
  { id: 'gpt2-medium', name: 'GPT-2 Medium', size: '355M', vram: '~2 GB' },
];

export default function ModelAnalysis() {
  const [modelId, setModelId] = useState('');
  const { setModelInfo, setCurrentStep, modelInfo } = usePipelineStore();
  const { analyzeModel, isLoading, error } = useModelAnalysis();

  const handleAnalyze = async () => {
    if (!modelId.trim()) return;
    const result = await analyzeModel(modelId.trim());
    if (result) {
      setModelInfo(result);
    }
  };

  const handleNext = () => {
    if (!modelInfo) return;
    setCurrentStep('dataset');
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="section-header">
        <div className="badge-primary inline-flex">
          <Brain className="h-3.5 w-3.5" />
          Step 1 of 5
        </div>
        <h2>Model Analysis</h2>
        <p>
          Enter a Hugging Face model ID and get architecture details, memory expectations, and compute guidance.
        </p>
      </div>

      {/* Search */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="model-id" className="label-text">
              Hugging Face model ID
            </label>
            <input
              id="model-id"
              type="text"
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAnalyze();
              }}
              placeholder="meta-llama/Llama-2-7b-hf"
              className="input-field"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !modelId.trim()}
            className="btn-primary h-10 w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Analyze
              </>
            )}
          </button>
        </div>

        <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-primary">Tip</p>
          <p className="mt-1">
            Run analysis first to estimate practical VRAM usage and choose safe defaults before tuning.
          </p>
        </div>
      </div>

      {/* Popular models */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Popular starting models</h3>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Click to select
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularModels.map((model) => (
            <button
              key={model.id}
              onClick={() => setModelId(model.id)}
              disabled={isLoading}
              className="card-hover p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{model.name}</p>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {model.size}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{model.vram}</p>
              <p className="mt-2 truncate rounded-lg bg-muted/50 px-2 py-1 text-[11px] font-mono text-muted-foreground">
                {model.id}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-destructive/20 bg-destructive/[0.03] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Analysis failed</p>
              <p className="mt-1 text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {modelInfo && (
        <div className="card card-shadow-lg border-primary/10 p-4 sm:p-6 space-y-6 animate-scale-in">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="badge-emerald inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Analysis complete
              </div>
              <h3 className="mt-3 text-lg sm:text-xl font-bold break-all">{modelInfo.model_id}</h3>
              <p className="mt-1 text-sm text-muted-foreground break-all">
                Architecture: {modelInfo.architecture}
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 px-4 sm:px-5 py-3 text-right shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary whitespace-nowrap">
                Estimated QLoRA VRAM
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold">~{Math.ceil((modelInfo.num_parameters * 0.55) / 1e9)} GB</p>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="metric-tile">
              <p className="label-text flex items-center gap-1.5">
                <Database className="h-3 w-3" /> Parameters
              </p>
              <p className="mt-1.5 text-2xl font-bold">{formatNumber(modelInfo.num_parameters)}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Hidden size
              </p>
              <p className="mt-1.5 text-2xl font-bold">{modelInfo.hidden_size.toLocaleString()}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Layers
              </p>
              <p className="mt-1.5 text-2xl font-bold">{modelInfo.num_layers}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text flex items-center gap-1.5">
                <Brain className="h-3 w-3" /> Attention heads
              </p>
              <p className="mt-1.5 text-2xl font-bold">{modelInfo.num_attention_heads}</p>
            </div>
          </div>

          {/* Compute requirements */}
          {modelInfo.compute_requirements && (
            <div className="grid gap-3 rounded-xl border bg-card/50 p-4 sm:grid-cols-3">
              <div>
                <p className="label-text">Minimum VRAM</p>
                <p className="mt-1 text-lg font-bold">{modelInfo.compute_requirements.min_vram_gb} GB</p>
              </div>
              <div>
                <p className="label-text">Recommended VRAM</p>
                <p className="mt-1 text-lg font-bold">
                  {modelInfo.compute_requirements.recommended_vram_gb} GB
                </p>
              </div>
              <div>
                <p className="label-text">Max batch size</p>
                <p className="mt-1 text-lg font-bold">{modelInfo.compute_requirements.max_batch_size}</p>
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex justify-end pt-2">
            <button onClick={handleNext} className="btn-primary px-6 py-2.5">
              Continue to Dataset
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!modelInfo && (
        <div className="card p-5 flex items-center gap-3 text-sm text-muted-foreground">
          <Cpu className="h-4 w-4 text-primary" />
          Analyze a base model to unlock memory planning and smart hyperparameter recommendations.
        </div>
      )}
    </div>
  );
}

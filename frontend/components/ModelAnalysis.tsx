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
  Sparkles,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { useModelAnalysis } from '@/hooks/useModelAnalysis';

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
      <section className="text-center">
        <span className="badge-pill">Step 1 of 5</span>
        <h2 className="section-title mt-4">Model Analysis</h2>
        <p className="section-description mx-auto mt-3 max-w-3xl">
          Enter a Hugging Face model ID and get architecture details, memory expectations, and compute guidance before training.
        </p>
      </section>

      <section className="surface-card-strong space-y-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label htmlFor="model-id" className="field-label">
              Hugging Face model ID
            </label>
            <input
              id="model-id"
              type="text"
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleAnalyze();
                }
              }}
              placeholder="Example: meta-llama/Llama-2-7b-hf"
              className="text-input"
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading || !modelId.trim()}
            className="primary-button h-11 px-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Analyze Model
              </>
            )}
          </button>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-slate-700">
          <p className="font-semibold text-teal-800">Tip</p>
          <p className="mt-1">
            Run analysis first to estimate practical VRAM usage and choose safe defaults before upload and tuning.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Popular starting models</h3>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">One-click fill</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {popularModels.map((model, index) => (
            <button
              key={model.id}
              onClick={() => setModelId(model.id)}
              disabled={isLoading}
              className="group rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{model.name}</p>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-teal-300">{model.size}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">{model.vram}</p>
              <p className="mt-3 truncate rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">{model.id}</p>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Model analysis failed</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </section>
      )}

      {modelInfo && (
        <section className="surface-card-strong space-y-6 border-teal-200/70 bg-gradient-to-br from-teal-50 to-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="badge-pill">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Analysis complete
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">{modelInfo.model_id}</h3>
              <p className="mt-1 text-sm text-slate-600">Architecture: {modelInfo.architecture}</p>
            </div>
            <div className="rounded-xl bg-slate-900 px-4 py-3 text-right text-teal-300">
              <p className="text-[11px] uppercase tracking-[0.14em]">Estimated QLoRA VRAM</p>
              <p className="mt-1 text-xl font-semibold">~{Math.ceil((modelInfo.num_parameters * 0.55) / 1e9)} GB</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Parameters</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{(modelInfo.num_parameters / 1e9).toFixed(1)}B</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Hidden size</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{modelInfo.hidden_size}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Layers</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{modelInfo.num_layers}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Attention heads</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{modelInfo.num_attention_heads}</p>
            </article>
          </div>

          {modelInfo.compute_requirements && (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Minimum VRAM</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{modelInfo.compute_requirements.min_vram_gb} GB</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Recommended VRAM</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {modelInfo.compute_requirements.recommended_vram_gb} GB
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Max batch size</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{modelInfo.compute_requirements.max_batch_size}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleNext} className="primary-button px-6 py-3">
              Continue to Dataset
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {!modelInfo && (
        <section className="surface-card flex items-center gap-3 text-sm text-slate-600">
          <Cpu className="h-4 w-4 text-teal-700" />
          Analyze a base model to unlock memory planning and smart hyperparameter recommendations.
        </section>
      )}
    </div>
  );
}

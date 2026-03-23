"use client";

import { useMemo } from 'react';
import {
  Brain,
  BarChart3,
  Check,
  CircleDot,
  Database,
  FileCode2,
  Gauge,
  RefreshCcw,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import type { PipelineStep } from '@/types';
import type { LucideIcon } from 'lucide-react';
import ModelAnalysis from '@/components/ModelAnalysis';
import DatasetUpload from '@/components/DatasetUpload';
import HyperparameterTuning from '@/components/HyperparameterTuning';
import Training from '@/components/Training';
import CodeGeneration from '@/components/CodeGeneration';

interface PipelineWorkspaceProps {
  compactHeader?: boolean;
}

const steps: Array<{
  id: PipelineStep;
  label: string;
  subtitle: string;
  icon: LucideIcon;
}> = [
  {
    id: 'model',
    label: 'Model',
    subtitle: 'Analyze architecture and compute profile',
    icon: Brain,
  },
  {
    id: 'dataset',
    label: 'Dataset',
    subtitle: 'Upload and validate training data',
    icon: Database,
  },
  {
    id: 'hyperparameters',
    label: 'Tuning',
    subtitle: 'Configure and optimize training settings',
    icon: Gauge,
  },
  {
    id: 'training',
    label: 'Training',
    subtitle: 'Run jobs and track live metrics',
    icon: BarChart3,
  },
  {
    id: 'export',
    label: 'Export',
    subtitle: 'Download artifacts and code templates',
    icon: FileCode2,
  },
];

export default function PipelineWorkspace({ compactHeader = false }: PipelineWorkspaceProps) {
  const {
    currentStep,
    setCurrentStep,
    reset,
    modelInfo,
    datasetInfo,
    trainingConfig,
    trainingJobId,
    trainingProgress,
    evalMetrics,
  } = usePipelineStore();

  const currentStepIndex = Math.max(steps.findIndex((step) => step.id === currentStep), 0);

  const completion = useMemo(
    () => ({
      model: Boolean(modelInfo),
      dataset: Boolean(datasetInfo),
      hyperparameters: Boolean(trainingConfig),
      training: trainingProgress?.status === 'completed',
      export: trainingProgress?.status === 'completed',
    }),
    [modelInfo, datasetInfo, trainingConfig, trainingProgress]
  );

  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  const canNavigateTo = (index: number): boolean => {
    if (index <= currentStepIndex) return true;
    if (index === 0) return true;

    const previousStep = steps[index - 1]?.id;
    if (!previousStep) return false;

    if (previousStep === 'model') return completion.model;
    if (previousStep === 'dataset') return completion.dataset;
    if (previousStep === 'hyperparameters') return completion.hyperparameters;
    if (previousStep === 'training') return completion.training;

    return false;
  };

  const renderStep = () => {
    if (currentStep === 'model') return <ModelAnalysis />;
    if (currentStep === 'dataset') return <DatasetUpload />;
    if (currentStep === 'hyperparameters') return <HyperparameterTuning />;
    if (currentStep === 'training') return <Training />;
    return <CodeGeneration />;
  };

  const estimatedVram = modelInfo ? Math.ceil((modelInfo.num_parameters * 0.55) / 1e9) : null;

  return (
    <main className="relative overflow-hidden pb-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-4 top-24 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl" />
      </div>

      <div className="app-shell relative space-y-6 md:space-y-8">
        <header className="surface-card-strong animate-fade-in-up">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="badge-pill mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Fine-Tuning Studio
              </p>
              <h1 className="section-title text-slate-900">
                {compactHeader ? 'Pipeline Workspace' : 'AutoLLM Forge Training Workspace'}
              </h1>
              <p className="section-description mt-3 max-w-3xl">
                Navigate each stage with clear progress, richer context, and faster decisions while keeping full control.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Current stage</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{steps[currentStepIndex].label}</p>
              </div>
              <button
                onClick={() => {
                  reset();
                  setCurrentStep('model');
                }}
                className="secondary-button"
              >
                <RefreshCcw className="h-4 w-4" />
                New Session
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="h-2 rounded-full bg-slate-200/70">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const active = currentStep === step.id;
                const available = canNavigateTo(index);
                const done =
                  step.id === 'model'
                    ? completion.model
                    : step.id === 'dataset'
                      ? completion.dataset
                      : step.id === 'hyperparameters'
                        ? completion.hyperparameters
                        : step.id === 'training'
                          ? completion.training
                          : completion.export;

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setCurrentStep(step.id)}
                    className={`group rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-teal-400 bg-teal-50 shadow-glow-soft'
                        : done
                          ? 'border-teal-200 bg-white/90 hover:border-teal-300'
                          : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    } ${!available ? 'cursor-not-allowed opacity-55' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                          active
                            ? 'bg-teal-700 text-white'
                            : done
                              ? 'bg-teal-100 text-teal-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <CircleDot
                        className={`h-4 w-4 ${active ? 'text-teal-600' : done ? 'text-teal-400' : 'text-slate-300'}`}
                      />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-900">{step.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="surface-card-strong min-h-[680px] animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            {renderStep()}
          </div>

          <aside className="space-y-4 animate-fade-in-up" style={{ animationDelay: '140ms' }}>
            <div className="surface-card">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Session Snapshot</p>
              <div className="soft-divider" />
              <ul className="space-y-3 text-sm">
                <li className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Model</span>
                  <span className="max-w-[170px] text-right font-medium text-slate-900">
                    {modelInfo?.model_id ?? 'Not selected'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Dataset</span>
                  <span className="max-w-[170px] text-right font-medium text-slate-900">
                    {datasetInfo?.dataset_id ?? 'Not uploaded'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Training job</span>
                  <span className="max-w-[170px] text-right font-medium text-slate-900">
                    {trainingJobId ? `${trainingJobId.slice(0, 14)}...` : 'Not started'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      trainingProgress?.status === 'completed'
                        ? 'bg-teal-100 text-teal-700'
                        : trainingProgress?.status === 'running'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {trainingProgress?.status ?? 'idle'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="surface-tint">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">Resource Planner</p>
              <div className="soft-divider" />
              <p className="text-sm leading-relaxed text-slate-700">
                {estimatedVram
                  ? `Estimated QLoRA memory requirement for this model: about ${estimatedVram} GB VRAM.`
                  : 'Run model analysis to unlock VRAM estimates and training hardware guidance.'}
              </p>
              {evalMetrics?.perplexity != null && (
                <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-slate-700">
                  Latest perplexity: {evalMetrics.perplexity.toFixed(2)}
                </p>
              )}
            </div>

            <div className="surface-card">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Guidance</p>
              <div className="soft-divider" />
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <TerminalSquare className="mt-0.5 h-4 w-4 text-teal-600" />
                  Analyze model and dataset before tuning to avoid wasted training runs.
                </li>
                <li className="flex items-start gap-2">
                  <TerminalSquare className="mt-0.5 h-4 w-4 text-teal-600" />
                  Keep batch size conservative until you confirm real GPU headroom.
                </li>
                <li className="flex items-start gap-2">
                  <TerminalSquare className="mt-0.5 h-4 w-4 text-teal-600" />
                  Export both inference and API templates for quicker deployment handoff.
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

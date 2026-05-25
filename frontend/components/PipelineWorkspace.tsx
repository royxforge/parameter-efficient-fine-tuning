"use client";

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  BarChart3,
  Check,
  Database,
  FileCode2,
  Gauge,
  RefreshCcw,
  Sparkles,
  TerminalSquare,
  Bot,
  Moon,
  Sun,
  ChevronRight,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { useTheme } from '@/lib/theme-provider';
import type { PipelineStep } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { stepTransition, fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
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
    subtitle: 'Analyze architecture and compute',
    icon: Brain,
  },
  {
    id: 'dataset',
    label: 'Dataset',
    subtitle: 'Upload and validate data',
    icon: Database,
  },
  {
    id: 'hyperparameters',
    label: 'Tuning',
    subtitle: 'Optimize training settings',
    icon: Gauge,
  },
  {
    id: 'training',
    label: 'Training',
    subtitle: 'Run jobs and track metrics',
    icon: BarChart3,
  },
  {
    id: 'export',
    label: 'Export',
    subtitle: 'Download artifacts and code',
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
  const { theme, toggleTheme } = useTheme();

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
    const stepContent = (() => {
      if (currentStep === 'model') return <ModelAnalysis />;
      if (currentStep === 'dataset') return <DatasetUpload />;
      if (currentStep === 'hyperparameters') return <HyperparameterTuning />;
      if (currentStep === 'training') return <Training />;
      return <CodeGeneration />;
    })();

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={stepTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {stepContent}
        </motion.div>
      </AnimatePresence>
    );
  };

  const estimatedVram = modelInfo ? Math.ceil((modelInfo.num_parameters * 0.55) / 1e9) : null;

  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-4 top-24 h-72 w-72 rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-emerald-500/6 blur-[100px]" />
      </div>

      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">AutoLLM Forge</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="text-sm text-muted-foreground">
              {compactHeader ? 'Pipeline' : 'Training Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {steps[currentStepIndex].label}
            </div>
            <button
              onClick={toggleTheme}
              className="btn-ghost h-9 w-9 p-0 shrink-0"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                reset();
                setCurrentStep('model');
              }}
              className="btn-secondary h-9 text-xs"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">New Session</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-10 pt-4 sm:pt-6">
        {/* Pipeline Steps Nav */}
        <motion.div
          className="card card-shadow-lg p-4 md:p-6"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {compactHeader ? 'Pipeline Workspace' : 'Training Workspace'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Navigate each stage with clear progress and full control.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Progress
              </p>
              <p className="text-lg font-bold">{progressPercent}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar mb-5">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Step buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0 snap-x snap-mandatory scrollbar-none">
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
                  className={`group relative rounded-xl border p-3 text-left transition-all duration-200 min-w-[160px] sm:min-w-0 shrink-0 snap-start ${
                    active
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : done
                        ? 'border-border bg-card/50 hover:border-primary/20 hover:bg-card'
                        : 'border-border/60 bg-card/30 hover:border-border'
                  } ${!available ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-glow'
                          : done
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done && !active ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold">{step.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{step.subtitle}</p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Main content area */}
        <motion.section
          className="mt-6 flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_300px]"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="card card-shadow-lg min-h-[600px] p-6 md:p-8"
            variants={staggerItem}
          >
            {renderStep()}
          </motion.div>

          {/* Sidebar */}
          <motion.aside className="space-y-4 w-full" variants={staggerItem}>
            <div className="card p-4">
              <p className="label-text">Session Snapshot</p>
              <div className="divider-subtle my-3" />
              <ul className="space-y-3 text-sm">
                <li className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Model</span>
                  <span className="text-right font-medium truncate max-w-[140px]">
                    {modelInfo?.model_id ? modelInfo.model_id.split('/').pop() : 'Not selected'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Dataset</span>
                  <span className="text-right font-medium truncate max-w-[140px]">
                    {datasetInfo?.dataset_id ?? 'Not uploaded'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Training</span>
                  <span className="text-right font-medium truncate max-w-[140px]">
                    {trainingJobId ? `${trainingJobId.slice(0, 12)}...` : 'Not started'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Status</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      trainingProgress?.status === 'completed'
                        ? 'badge-emerald'
                        : trainingProgress?.status === 'running'
                          ? 'badge-amber'
                          : 'badge'
                    }`}
                  >
                    {trainingProgress?.status ?? 'idle'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="card p-4 border-primary/10 bg-primary/[0.02]">
              <p className="label-text text-primary">Resource Planner</p>
              <div className="divider-subtle my-3" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {estimatedVram
                  ? `Estimated QLoRA memory requirement for this model: about ${estimatedVram} GB VRAM.`
                  : 'Run model analysis to unlock VRAM estimates and training hardware guidance.'}
              </p>
              {evalMetrics?.perplexity != null && (
                <p className="mt-3 rounded-lg border bg-card/50 px-3 py-2 text-xs font-medium">
                  Latest perplexity: {evalMetrics.perplexity.toFixed(2)}
                </p>
              )}
            </div>

            <div className="card p-4">
              <p className="label-text">Guidance</p>
              <div className="divider-subtle my-3" />
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Analyze model and dataset before tuning.
                </li>
                <li className="flex items-start gap-2">
                  <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Keep batch size conservative.
                </li>
                <li className="flex items-start gap-2">
                  <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Export both inference and API templates.
                </li>
              </ul>
            </div>
          </motion.aside>
        </motion.section>
      </div>
    </main>
  );
}

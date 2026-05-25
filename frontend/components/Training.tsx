"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Cpu,
  Download,
  Play,
  Zap,
  Gauge,
  Layers,
  Brain,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import type { TrainingProgress } from '@/types';

export default function Training() {
  const {
    trainingConfig,
    setTrainingJobId,
    setTrainingProgress,
    setCurrentStep,
    trainingJobId,
    trainingProgress,
  } = usePipelineStore();

  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trainingJobId) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/training-progress/${trainingJobId}`);
        if (!response.ok) return;

        const progress: TrainingProgress = await response.json();
        setTrainingProgress(progress);
      } catch {
        // Ignore polling errors
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, 2000);
    return () => clearInterval(interval);
  }, [trainingJobId, setTrainingProgress]);

  const handleStartTraining = async () => {
    if (!trainingConfig) return;

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/start-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: trainingConfig,
          job_name: `Training-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start training: ${response.status}`);
      }

      const data = await response.json();
      setTrainingJobId(data.job_id);
    } catch (startError: any) {
      setError(startError.message || 'Failed to start training job');
    } finally {
      setIsStarting(false);
    }
  };

  const status = trainingProgress?.status ?? 'idle';
  const isRunning = status === 'running' || status === 'queued' || status === 'initializing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const progressPercent = useMemo(() => {
    if (!trainingProgress) return 0;
    const total = Math.max(trainingProgress.total_steps, 1);
    return Math.min(100, Math.round((trainingProgress.current_step / total) * 100));
  }, [trainingProgress]);

  const trainingTimeLabel = trainingProgress?.eta_seconds
    ? `${Math.max(0, Math.floor(trainingProgress.eta_seconds / 60))} min remaining`
    : 'ETA pending';

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="section-header">
        <div className="badge-primary inline-flex">
          <Zap className="h-3.5 w-3.5" />
          Step 4 of 5
        </div>
        <h2>Training Execution</h2>
        <p>Launch the run, track real-time metrics, and monitor memory usage with clear progress visibility.</p>
      </div>

      {/* Pre-training overview */}
      {!trainingJobId && (
        <div className="card card-shadow-lg p-4 sm:p-6 space-y-6 animate-scale-in">
          <div className="flex flex-col sm:flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Ready to start training</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Confirm settings and begin the fine-tuning job using your configured QLoRA profile.
              </p>
            </div>
            <button
              onClick={handleStartTraining}
              disabled={isStarting || !trainingConfig}
              className="btn-primary px-6 py-2.5 w-full sm:w-auto justify-center"
            >
              {isStarting ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  Starting job
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Training
                </>
              )}
            </button>
          </div>

          {/* Config summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="metric-tile">
              <p className="label-text flex items-center gap-1.5">
                <Brain className="h-3 w-3" /> Model
              </p>
              <p className="mt-1.5 text-sm font-semibold truncate">
                {trainingConfig?.model_id?.split('/').pop() ?? 'Not configured'}
              </p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Dataset</p>
              <p className="mt-1.5 text-sm font-semibold truncate">
                {trainingConfig?.dataset_id ?? 'Not configured'}
              </p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Epochs</p>
              <p className="mt-1.5 text-2xl font-bold">{trainingConfig?.num_epochs ?? '-'}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Learning rate</p>
              <p className="mt-1.5 text-2xl font-bold">{trainingConfig?.learning_rate ?? '-'}</p>
            </div>
          </div>

          {!trainingConfig && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 text-sm text-amber-600 dark:text-amber-400">
              Configure hyperparameters before starting training.
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="card border-destructive/20 bg-destructive/[0.03] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Training failed to start</p>
              <p className="mt-1 text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active training */}
      {trainingJobId && trainingProgress && (
        <div
          className={`card card-shadow-lg p-4 sm:p-6 space-y-6 animate-scale-in ${
            isCompleted ? 'border-emerald-500/20' : isFailed ? 'border-destructive/20' : ''
          }`}
        >
          {/* Status header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  isCompleted
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : isFailed
                      ? 'border-destructive/25 bg-destructive/10 text-destructive'
                      : 'border-primary/25 bg-primary/10 text-primary'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                Status: {status}
              </div>
              <h3 className="mt-3 text-xl font-bold">Training job in progress</h3>
              <p className="mt-1 text-sm text-muted-foreground font-mono text-xs">Job: {trainingJobId}</p>
            </div>
            <div className="rounded-xl bg-primary/10 px-5 py-3.5 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Progress</p>
              <p className="mt-1 text-2xl font-bold">{progressPercent}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                Step {trainingProgress.current_step} of {Math.max(trainingProgress.total_steps, 1)}
              </span>
              <span>{trainingTimeLabel}</span>
            </div>
            <div className="progress-bar h-3">
              <div
                className={`progress-bar-fill h-full ${
                  isFailed ? '!bg-gradient-to-r from-destructive to-destructive/80' : ''
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {trainingProgress.progress_message && (
            <div className="rounded-xl border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
              {trainingProgress.progress_message}
            </div>
          )}

          {isFailed && trainingProgress.error_message && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] px-4 py-3 text-sm text-destructive/80">
              {trainingProgress.error_message}
            </div>
          )}

          {/* Metrics grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="metric-tile">
              <p className="label-text flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Epoch
              </p>
              <p className="mt-1.5 text-2xl font-bold">{trainingProgress.current_epoch ?? '-'}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Train loss</p>
              <p className="mt-1.5 text-2xl font-bold font-mono">
                {trainingProgress.train_loss != null ? trainingProgress.train_loss.toFixed(4) : 'N/A'}
              </p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Validation loss</p>
              <p className="mt-1.5 text-2xl font-bold font-mono">
                {trainingProgress.val_loss != null ? trainingProgress.val_loss.toFixed(4) : 'N/A'}
              </p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Learning rate</p>
              <p className="mt-1.5 text-2xl font-bold font-mono">
                {trainingProgress.learning_rate != null
                  ? trainingProgress.learning_rate.toExponential(2)
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* GPU & throughput */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="metric-tile">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" /> GPU memory
              </p>
              <p className="mt-1.5 text-xl font-bold">
                {trainingProgress.gpu_memory_usage != null
                  ? `${trainingProgress.gpu_memory_usage.toFixed(1)} GB`
                  : 'N/A'}
              </p>
            </div>
            <div className="metric-tile">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" /> Throughput
              </p>
              <p className="mt-1.5 text-xl font-bold">
                {trainingProgress.samples_per_second != null
                  ? `${trainingProgress.samples_per_second.toFixed(1)} samples/s`
                  : 'N/A'}
              </p>
            </div>
            <div className="metric-tile">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> ETA
              </p>
              <p className="mt-1.5 text-xl font-bold">{trainingTimeLabel}</p>
            </div>
          </div>

          {/* Artifacts on completion */}
          {isCompleted && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5 animate-scale-in">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Training complete — download artifacts
              </h4>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href={`http://localhost:8000/api/download-model/${trainingJobId}`}
                  className="btn-primary justify-center"
                >
                  <Download className="h-4 w-4" />
                  Download model package
                </a>
                <a
                  href={`http://localhost:8000/api/download-file/${trainingJobId}/training_metrics.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary justify-start"
                >
                  <Download className="h-4 w-4" />
                  Metrics JSON
                </a>
                <a
                  href={`http://localhost:8000/storage/experiments/${trainingJobId}/loss.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary justify-start"
                >
                  <Download className="h-4 w-4" />
                  Loss chart
                </a>
                <a
                  href={`http://localhost:8000/storage/experiments/${trainingJobId}/metadata.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary justify-start"
                >
                  <Download className="h-4 w-4" />
                  Experiment metadata
                </a>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3">
        <button
          onClick={() => setCurrentStep('hyperparameters')}
          disabled={isRunning}
          className="btn-secondary disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hyperparameters
        </button>
        {isCompleted && (
          <button onClick={() => setCurrentStep('export')} className="btn-primary px-6 py-2.5">
            Continue to Export
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

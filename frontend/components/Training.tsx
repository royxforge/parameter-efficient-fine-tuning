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
        // Ignore polling errors to keep UI stable during transient failures.
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
      <section className="text-center">
        <span className="badge-pill">Step 4 of 5</span>
        <h2 className="section-title mt-4">Training Execution</h2>
        <p className="section-description mx-auto mt-3 max-w-3xl">
          Launch the run, track real-time metrics, and monitor memory usage with clear progress visibility.
        </p>
      </section>

      {!trainingJobId && (
        <section className="surface-card-strong space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">Ready to start training</h3>
              <p className="mt-2 text-sm text-slate-600">
                Confirm settings and begin the fine-tuning job using your configured QLoRA profile.
              </p>
            </div>
            <button
              onClick={handleStartTraining}
              disabled={isStarting || !trainingConfig}
              className="primary-button px-6 py-3"
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Model</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {trainingConfig?.model_id?.split('/').pop() ?? 'Not configured'}
              </p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Dataset</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {trainingConfig?.dataset_id ?? 'Not configured'}
              </p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Epochs</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{trainingConfig?.num_epochs ?? '-'}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Learning rate</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{trainingConfig?.learning_rate ?? '-'}</p>
            </article>
          </div>

          {!trainingConfig && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Configure hyperparameters before starting training.
            </div>
          )}
        </section>
      )}

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Training failed to start</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </section>
      )}

      {trainingJobId && trainingProgress && (
        <section
          className={`surface-card-strong space-y-6 ${
            isCompleted
              ? 'border-teal-200 bg-gradient-to-br from-teal-50 to-white'
              : isFailed
                ? 'border-red-200 bg-red-50/60'
                : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="badge-pill">
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                Status: {status}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">Training job in progress</h3>
              <p className="mt-1 text-sm text-slate-600">Job ID: {trainingJobId}</p>
            </div>
            <div className="rounded-xl bg-slate-900 px-4 py-3 text-right text-teal-300">
              <p className="text-[11px] uppercase tracking-[0.14em]">Progress</p>
              <p className="mt-1 text-xl font-semibold">{progressPercent}%</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              <span>
                Step {trainingProgress.current_step} of {Math.max(trainingProgress.total_steps, 1)}
              </span>
              <span>{trainingTimeLabel}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-200">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-teal-600 to-cyan-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {trainingProgress.progress_message && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              {trainingProgress.progress_message}
            </div>
          )}

          {isFailed && trainingProgress.error_message && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {trainingProgress.error_message}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Epoch</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{trainingProgress.current_epoch ?? '-'}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Train loss</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {trainingProgress.train_loss != null ? trainingProgress.train_loss.toFixed(4) : 'N/A'}
              </p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Validation loss</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {trainingProgress.val_loss != null ? trainingProgress.val_loss.toFixed(4) : 'N/A'}
              </p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Learning rate</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {trainingProgress.learning_rate != null
                  ? trainingProgress.learning_rate.toExponential(2)
                  : 'N/A'}
              </p>
            </article>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="metric-tile">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                <Cpu className="h-3.5 w-3.5" /> GPU memory
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {trainingProgress.gpu_memory_usage != null ? `${trainingProgress.gpu_memory_usage.toFixed(1)} GB` : 'N/A'}
              </p>
            </article>
            <article className="metric-tile">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                <BarChart3 className="h-3.5 w-3.5" /> Throughput
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {trainingProgress.samples_per_second != null
                  ? `${trainingProgress.samples_per_second.toFixed(1)} samples/sec`
                  : 'N/A'}
              </p>
            </article>
            <article className="metric-tile">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                <Clock3 className="h-3.5 w-3.5" /> Runtime signal
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{trainingTimeLabel}</p>
            </article>
          </div>

          {isCompleted && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
              <h4 className="text-sm font-semibold text-teal-800">Training artifacts</h4>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <a
                  href={`http://localhost:8000/api/download-file/${trainingJobId}/training_metrics.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-button justify-start"
                >
                  <Download className="h-4 w-4" />
                  Metrics JSON
                </a>
                <a
                  href={`http://localhost:8000/storage/experiments/${trainingJobId}/loss.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-button justify-start"
                >
                  <Download className="h-4 w-4" />
                  Loss chart
                </a>
                <a
                  href={`http://localhost:8000/storage/experiments/${trainingJobId}/metadata.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-button justify-start"
                >
                  <Download className="h-4 w-4" />
                  Experiment metadata
                </a>
                <a href={`http://localhost:8000/api/download-model/${trainingJobId}`} className="primary-button justify-start">
                  <Download className="h-4 w-4" />
                  Download model package
                </a>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setCurrentStep('hyperparameters')}
          disabled={isRunning}
          className="secondary-button disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hyperparameters
        </button>

        {isCompleted && (
          <button onClick={() => setCurrentStep('export')} className="primary-button px-6 py-3">
            Continue to Export
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

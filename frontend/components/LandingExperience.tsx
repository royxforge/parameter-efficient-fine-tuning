"use client";

import {
  ArrowRight,
  Bot,
  Brain,
  Database,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';

interface LandingExperienceProps {
  onStart: () => void;
}

const highlights = [
  {
    icon: Brain,
    title: 'Context-aware model analysis',
    description: 'Inspect architecture, memory footprint, and realistic compute expectations before training starts.',
  },
  {
    icon: Database,
    title: 'Dataset quality workflow',
    description: 'Validate and profile training sets with clear quality signals and warnings that are easy to act on.',
  },
  {
    icon: Gauge,
    title: 'Adaptive training control',
    description: 'Balance speed, quality, and memory with practical presets and manual controls in one place.',
  },
  {
    icon: ShieldCheck,
    title: 'Deployment-ready output',
    description: 'Generate clean handoff artifacts, model packaging, and starter integration code for production teams.',
  },
];

const phases = [
  {
    step: '01',
    name: 'Inspect',
    detail: 'Pick the base model and review architecture-level constraints.',
  },
  {
    step: '02',
    name: 'Prepare',
    detail: 'Upload data, validate structure, and catch quality issues early.',
  },
  {
    step: '03',
    name: 'Optimize',
    detail: 'Apply smart hyperparameter defaults, then tune for your target.',
  },
  {
    step: '04',
    name: 'Train',
    detail: 'Track real-time progress, metrics, memory, and checkpoints.',
  },
  {
    step: '05',
    name: 'Ship',
    detail: 'Export model artifacts and runnable code templates instantly.',
  },
];

const stats = [
  { label: 'Setup time', value: '< 5 min' },
  { label: 'Workflow steps', value: '5 stages' },
  { label: 'Memory profile', value: 'QLoRA ready' },
];

export default function LandingExperience({ onStart }: LandingExperienceProps) {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute right-0 top-44 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="app-shell relative space-y-16 pb-16 pt-10 md:space-y-20 md:pt-14">
        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
          <div className="space-y-7 animate-fade-in-up">
            <span className="badge-pill">
              <Sparkles className="h-3.5 w-3.5" />
              AutoLLM Forge Studio
            </span>

            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
              Build a specialized model pipeline with a UI that feels like a modern control room.
            </h1>

            <p className="max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
              Move from model selection to deployable artifacts in one guided flow, with sharp visual feedback,
              practical defaults, and full control when you need it.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={onStart} className="primary-button px-7 py-3.5 text-base">
                Launch Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-600">
                <span className="status-dot" />
                Live progress and artifact exports included
              </span>
            </div>

            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              {stats.map((item, index) => (
                <div
                  key={item.label}
                  className="metric-tile animate-slide-stagger"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card-strong glass-outline relative animate-fade-in-up overflow-hidden lg:ml-4" style={{ animationDelay: '120ms' }}>
            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-teal-200/45 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-orange-200/35 blur-3xl" />

            <div className="relative space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Workflow Preview</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">Fine-Tuning Control Deck</h2>
                </div>
                <div className="rounded-xl bg-slate-900 p-3 text-teal-300 shadow-glow-soft">
                  <Wand2 className="h-6 w-6" />
                </div>
              </div>

              <div className="space-y-3">
                {phases.map((phase, index) => (
                  <div
                    key={phase.step}
                    className="rounded-xl border border-slate-200 bg-white/80 p-4 transition hover:border-teal-300 hover:shadow-sm"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-teal-300">
                        {phase.step}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{phase.name}</p>
                        <p className="text-xs text-slate-600">{phase.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="surface-card animate-slide-stagger group"
                style={{ animationDelay: `${index * 110}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-slate-900 p-3 text-cyan-300 transition group-hover:scale-105 group-hover:text-teal-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="surface-card-strong animate-fade-in-up overflow-hidden" style={{ animationDelay: '200ms' }}>
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="badge-pill mb-4">Ready to redesign your workflow</p>
              <h2 className="section-title max-w-2xl text-slate-900">
                Launch the full studio and run your model training journey from one polished interface.
              </h2>
              <p className="section-description mt-3 max-w-2xl">
                This experience is built for fast iteration, clear decision points, and smooth handoff to deployment.
              </p>
            </div>

            <button onClick={onStart} className="primary-button px-8 py-3.5 text-base md:justify-self-end">
              Start Building
              <Bot className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

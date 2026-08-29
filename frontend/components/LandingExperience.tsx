"use client";

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Brain,
  Database,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wand2,
  Layers,
  Cpu,
  BarChart3,
  FileCode2,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import {
  fadeInUp,
  fadeIn,
  slideInRight,
  scaleIn,
  staggerContainer,
  staggerItem,
  ScrollReveal,
  StaggerReveal,
} from '@/lib/animations';

interface LandingExperienceProps {
  onStart: () => void;
}

const highlights = [
  {
    icon: Brain,
    title: 'Context-aware analysis',
    description: 'Inspect architecture, memory footprint, and compute expectations before training starts.',
  },
  {
    icon: Database,
    title: 'Dataset quality workflow',
    description: 'Validate and profile training sets with clear quality signals and actionable warnings.',
  },
  {
    icon: Gauge,
    title: 'Adaptive training control',
    description: 'Balance speed, quality, and memory with practical presets and full manual controls.',
  },
  {
    icon: ShieldCheck,
    title: 'Deployment-ready output',
    description: 'Generate clean handoff artifacts, model packaging, and integration code for production.',
  },
];

const phases = [
  { step: '01', name: 'Inspect', detail: 'Pick & analyze your base model', icon: Brain },
  { step: '02', name: 'Prepare', detail: 'Upload and validate training data', icon: Database },
  { step: '03', name: 'Optimize', detail: 'Apply smart hyperparameter defaults', icon: Gauge },
  { step: '04', name: 'Train', detail: 'Track real-time metrics and memory', icon: Cpu },
  { step: '05', name: 'Ship', detail: 'Export artifacts and code templates', icon: Layers },
];

const stats = [
  { label: 'Setup time', value: '< 5 min' },
  { label: 'Pipeline stages', value: '5 steps' },
  { label: 'Memory profile', value: 'QLoRA ready' },
];

export default function LandingExperience({ onStart }: LandingExperienceProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.main
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-orange-50/30 to-white dark:from-orange-950/10 dark:to-gray-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-20 h-[500px] w-[500px] rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-orange-400/8 dark:bg-orange-400/4 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-orange-300/6 dark:bg-orange-300/3 blur-[80px]" />
      </div>

      {/* Nav */}
      <motion.nav
        className="sticky top-0 z-50 border-b bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 shadow-lg shadow-orange-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              Parameter Efficient Fine-Tuning
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onStart}
              className="hidden sm:inline-flex btn-ghost text-sm"
            >
              Launch Studio
            </button>
            <button
              onClick={onStart}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              <span className="hidden xs:inline">Get Started</span>
              <span className="xs:hidden">Start</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-12 md:pt-20">
        {/* Hero */}
        <motion.section
          className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-center"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="space-y-8" variants={staggerItem}>
            <div className="badge-primary inline-flex">
              <Sparkles className="h-3.5 w-3.5" />
              Parameter Efficient Fine-Tuning Studio
            </div>

            <h1 className="max-w-3xl text-3xl sm:text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Build specialized{' '}
              <span className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">language models</span>
              {' '}with a modern control room.
            </h1>

            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Move from model selection to deployable artifacts in one guided flow — with sharp visual feedback,
              practical defaults, and full control when you need it.
            </p>

            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
              <button onClick={onStart} className="btn-primary px-7 py-3.5 text-base justify-center">
                Launch Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="inline-flex items-center justify-center gap-2.5 rounded-xl border bg-card/50 px-4 py-2.5 text-sm font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-emerald-500/20 shadow-lg" />
                Live progress & artifact exports
              </span>
            </div>

            <div className="grid max-w-lg gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="metric-tile">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Workflow preview card */}
          <motion.div
            className="card gradient-border bg-white dark:bg-gray-900 p-1 shadow-xl shadow-orange-500/5"
            variants={slideInRight}
            transition={{ delay: 0.3 }}
          >
            <div className="relative space-y-5 p-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label-text">Workflow Preview</p>
                  <h2 className="text-xl font-bold">Fine-Tuning Pipeline</h2>
                </div>
                <div className="rounded-xl bg-orange-100 dark:bg-orange-900/30 p-3 text-orange-600 dark:text-orange-400">
                  <Wand2 className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-2.5">
                {phases.map((phase) => {
                  const Icon = phase.icon;
                  return (
                    <div
                      key={phase.step}
                      className="group flex items-center gap-3 rounded-xl border bg-card/50 p-3.5 transition-all hover:border-orange-200 dark:hover:border-orange-800 hover:bg-card hover:shadow-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 text-xs font-bold text-orange-700 dark:text-orange-300">
                        {phase.step}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{phase.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{phase.detail}</p>
                      </div>
                      <Icon className="h-4 w-4 text-muted-foreground/40 group-hover:text-orange-500 transition-colors" />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Features */}
        <ScrollReveal className="mt-20 md:mt-28">
          <div className="text-center space-y-3 mb-10">
            <motion.div
              className="badge-primary inline-flex"
              variants={staggerItem}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              Why Parameter Efficient Fine-Tuning
            </motion.div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need for fine-tuning
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete pipeline from model analysis to deployment-ready artifacts.
            </p>
          </div>

          <StaggerReveal className="grid gap-4 md:grid-cols-2">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  className="card-hover relative overflow-hidden p-5 border border-orange-100 dark:border-orange-800/30 bg-white dark:bg-gray-900"
                  variants={staggerItem}
                  whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
                >
                  <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-400/5" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </StaggerReveal>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal variants={scaleIn}>
          <section className="mt-20 md:mt-28 card gradient-border overflow-hidden bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/20">
            <div className="relative p-8 md:p-12">
              <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-orange-400/5 blur-3xl" />

              <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <motion.div
                  variants={staggerItem}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="badge-primary mb-4 inline-flex">Ready to transform your workflow</div>
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                    Launch the full studio and start training.
                  </h2>
                  <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
                    Built for fast iteration, clear decision points, and smooth handoff to deployment.
                  </p>
                </motion.div>

                <motion.button
                  onClick={onStart}
                  className="btn-primary px-8 py-3.5 text-base w-full sm:w-auto justify-center md:justify-self-end"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start Building
                  <Bot className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Footer */}
        <ScrollReveal variants={fadeIn}>
          <footer className="mt-20 border-t border-border/50 pt-8 pb-4">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Bot className="h-4 w-4 text-orange-500" />
                <span>Parameter Efficient Fine-Tuning v1.0</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Build specialized models with confidence.
              </p>
            </div>
          </footer>
        </ScrollReveal>
      </div>
    </motion.main>
  );
}
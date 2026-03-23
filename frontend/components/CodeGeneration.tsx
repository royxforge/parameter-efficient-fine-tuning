"use client";

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code,
  Download,
  FileCheck2,
  FileCode2,
  FileText,
  PackageOpen,
  Rocket,
  Sparkles,
  Tag,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';

export default function CodeGeneration() {
  const {
    modelInfo,
    trainingConfig,
    trainingJobId,
    evalMetrics,
    modelCard,
    experimentMetadata,
    setEvalMetrics,
    setModelCard,
    setExperimentMetadata,
  } = usePipelineStore();

  const [selectedType, setSelectedType] = useState<'inference' | 'gradio' | 'api' | 'readme'>('inference');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);

  useEffect(() => {
    const fetchEvaluationData = async () => {
      if (!trainingJobId) return;

      setIsLoadingEval(true);

      try {
        const evalResponse = await fetch(`http://localhost:8000/api/experiment/${trainingJobId}/eval`);
        if (evalResponse.ok) {
          const evalData = await evalResponse.json();
          setEvalMetrics(evalData.metrics);
          if (evalData.model_card) {
            setModelCard(evalData.model_card);
          }
        }

        const metadataResponse = await fetch(`http://localhost:8000/api/experiment/${trainingJobId}/metadata`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          setExperimentMetadata(metadata);
        }
      } catch {
        // Keep UI functional even when metadata endpoints are unavailable.
      } finally {
        setIsLoadingEval(false);
      }
    };

    fetchEvaluationData();
  }, [trainingJobId, setEvalMetrics, setModelCard, setExperimentMetadata]);

  const codeTypes = [
    { id: 'inference' as const, label: 'Inference script', icon: Code, description: 'Minimal local inference runner' },
    { id: 'gradio' as const, label: 'Gradio app', icon: Rocket, description: 'Interactive demo application' },
    { id: 'api' as const, label: 'FastAPI service', icon: FileCode2, description: 'Production-style REST endpoint' },
    { id: 'readme' as const, label: 'README', icon: FileText, description: 'Quick-start deployment notes' },
  ];

  const generateSampleCode = (type: string) => {
    const modelId = modelInfo?.model_id || 'your-base-model';
    const adapterPath = './checkpoint-final';

    if (type === 'inference') {
      return `"""
Inference script for QLoRA fine-tuned model
"""
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

MODEL_ID = "${modelId}"
ADAPTER_PATH = "${adapterPath}"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)

base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)

model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

def generate(prompt: str, max_new_tokens: int = 160) -> str:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.pad_token_id,
        )
    return tokenizer.decode(output[0], skip_special_tokens=True)

if __name__ == "__main__":
    prompt = "Write a concise summary about model fine-tuning."
    print(generate(prompt))
`;
    }

    if (type === 'gradio') {
      return `"""
Gradio demo for fine-tuned model
"""
import gradio as gr
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

MODEL_ID = "${modelId}"
ADAPTER_PATH = "${adapterPath}"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)

base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

def run_generation(prompt, max_tokens, temperature):
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=int(max_tokens),
            temperature=float(temperature),
            top_p=0.9,
            do_sample=True,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.pad_token_id,
        )
    return tokenizer.decode(output[0], skip_special_tokens=True)

with gr.Blocks() as app:
    gr.Markdown("# Fine-tuned model demo")
    prompt = gr.Textbox(label="Prompt", lines=4)
    max_tokens = gr.Slider(minimum=32, maximum=512, value=160, step=16, label="Max new tokens")
    temperature = gr.Slider(minimum=0.1, maximum=1.5, value=0.7, step=0.1, label="Temperature")
    output = gr.Textbox(label="Output", lines=10)
    run_btn = gr.Button("Generate")

    run_btn.click(run_generation, [prompt, max_tokens, temperature], output)

if __name__ == "__main__":
    app.launch(server_port=7860)
`;
    }

    if (type === 'api') {
      return `"""
FastAPI endpoint for fine-tuned model inference
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

MODEL_ID = "${modelId}"
ADAPTER_PATH = "${adapterPath}"

app = FastAPI(title="Fine-tuned Model API", version="1.0.0")

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    max_new_tokens: int = Field(180, ge=1, le=1024)
    temperature: float = Field(0.7, ge=0.1, le=2.0)

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)

base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_ID}

@app.post("/generate")
def generate(payload: GenerateRequest):
    try:
        inputs = tokenizer(payload.prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            output = model.generate(
                **inputs,
                max_new_tokens=payload.max_new_tokens,
                temperature=payload.temperature,
                top_p=0.9,
                do_sample=True,
                repetition_penalty=1.1,
                pad_token_id=tokenizer.pad_token_id,
            )
        text = tokenizer.decode(output[0], skip_special_tokens=True)
        return {"result": text}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
`;
    }

    return `# Fine-tuned model package

## Base Model
- ${modelId}

## Training Highlights
- Method: QLoRA (4-bit)
- Learning rate: ${trainingConfig?.learning_rate ?? '2e-4'}
- Batch size: ${trainingConfig?.batch_size ?? 4}
- Epochs: ${trainingConfig?.num_epochs ?? 3}

## Files in this package
- adapter_model.bin
- adapter_config.json
- config.json
- tokenizer files
- training_metrics.json

## Quick start
1. Install dependencies:
   \`\`\`bash
   pip install torch transformers peft bitsandbytes accelerate
   \`\`\`
2. Run the generated inference script.
3. Validate output quality against your test prompts.
`;
  };

  const handleGenerate = () => {
    setGeneratedCode(generateSampleCode(selectedType));
  };

  const handleDownloadGeneratedFile = () => {
    const extension = selectedType === 'readme' ? 'md' : 'py';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedType}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadModel = async () => {
    if (!trainingJobId) {
      setDownloadError('No training job found. Complete training first.');
      return;
    }

    setIsDownloadingModel(true);
    setDownloadError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/download-model/${trainingJobId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.status} - ${errorText}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `model-${trainingJobId}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadIssue: any) {
      setDownloadError(downloadIssue.message || 'Failed to download model package');
    } finally {
      setIsDownloadingModel(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <section className="text-center">
        <span className="badge-pill">Step 5 of 5</span>
        <h2 className="section-title mt-4">Export and Deployment</h2>
        <p className="section-description mx-auto mt-3 max-w-3xl">
          Download model artifacts, inspect evaluation outputs, and generate deployment-ready code templates.
        </p>
      </section>

      <section className="surface-card-strong space-y-5 border-teal-200/70 bg-gradient-to-br from-teal-50 to-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="badge-pill">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Package your trained output
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Model artifact bundle</h3>
            <p className="mt-1 text-sm text-slate-600">
              Includes adapter weights, config files, tokenizer assets, and training metrics for reproducible deployment.
            </p>
          </div>
          <button
            onClick={handleDownloadModel}
            disabled={isDownloadingModel || !trainingJobId}
            className="primary-button px-6 py-3"
          >
            <Download className="h-4 w-4" />
            {isDownloadingModel ? 'Downloading...' : 'Download model package'}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Base model</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{modelInfo?.model_id ?? 'N/A'}</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Training job</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{trainingJobId ?? 'N/A'}</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Learning rate</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{trainingConfig?.learning_rate ?? '-'}</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Epochs</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{trainingConfig?.num_epochs ?? '-'}</p>
          </article>
        </div>

        {downloadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{downloadError}</div>
        )}
      </section>

      {(evalMetrics || isLoadingEval) && (
        <section className="surface-card space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Evaluation snapshot</h3>

          {isLoadingEval ? (
            <p className="text-sm text-slate-600">Loading evaluation metrics...</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <article className="metric-tile">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Perplexity</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {evalMetrics?.perplexity != null ? evalMetrics.perplexity.toFixed(2) : 'N/A'}
                </p>
              </article>
              <article className="metric-tile">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Final loss</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {evalMetrics?.final_loss != null ? evalMetrics.final_loss.toFixed(4) : 'N/A'}
                </p>
              </article>
              <article className="metric-tile">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Train time</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {evalMetrics?.training_time_seconds != null
                    ? `${Math.floor(evalMetrics.training_time_seconds / 60)}m`
                    : 'N/A'}
                </p>
              </article>
              <article className="metric-tile">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Peak memory</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {evalMetrics?.peak_memory_mb != null
                    ? `${(evalMetrics.peak_memory_mb / 1024).toFixed(2)} GB`
                    : 'N/A'}
                </p>
              </article>
            </div>
          )}
        </section>
      )}

      {modelCard && (
        <section className="surface-card space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileCheck2 className="h-5 w-5 text-teal-700" />
            Model card
          </h3>

          <div className="grid gap-3 md:grid-cols-2">
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Model name</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{modelCard.model_name ?? 'N/A'}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Base model</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{modelCard.base_model ?? 'N/A'}</p>
            </article>
          </div>

          {modelCard.tags && modelCard.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {modelCard.tags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-teal-300">
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {modelCard.description && <p className="text-sm leading-relaxed text-slate-600">{modelCard.description}</p>}
        </section>
      )}

      {experimentMetadata && (
        <section className="surface-card space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <PackageOpen className="h-5 w-5 text-teal-700" />
            Experiment metadata
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Experiment ID</p>
              <p className="mt-2 break-all text-xs font-semibold text-slate-800">
                {experimentMetadata.experiment_id ?? trainingJobId}
              </p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Seed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{experimentMetadata.seed ?? '-'}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Artifacts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {experimentMetadata.artifacts ? Object.keys(experimentMetadata.artifacts).length : 0}
              </p>
            </article>
          </div>
        </section>
      )}

      <section className="surface-card-strong space-y-5">
        <h3 className="text-xl font-semibold text-slate-900">Generate code templates</h3>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {codeTypes.map((type) => {
            const Icon = type.icon;
            const active = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-teal-300 bg-teal-50 shadow-glow-soft'
                    : 'border-slate-200 bg-white/80 hover:border-teal-200'
                }`}
              >
                <span className={`inline-flex rounded-xl p-2 ${active ? 'bg-slate-900 text-teal-300' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900">{type.label}</p>
                <p className="mt-1 text-xs text-slate-600">{type.description}</p>
              </button>
            );
          })}
        </div>

        <button onClick={handleGenerate} className="primary-button w-full py-3.5">
          <Sparkles className="h-4 w-4" />
          Generate {codeTypes.find((item) => item.id === selectedType)?.label}
        </button>

        {generatedCode && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                {selectedType}.{selectedType === 'readme' ? 'md' : 'py'}
              </p>
              <button onClick={handleDownloadGeneratedFile} className="secondary-button border-slate-700 bg-slate-900 text-slate-100">
                <Download className="h-4 w-4" />
                Download file
              </button>
            </div>
            <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed">
              <code>{generatedCode}</code>
            </pre>
          </div>
        )}
      </section>

      <section className="surface-tint">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Rocket className="h-5 w-5 text-teal-700" />
          Next actions
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600" />
            Download the model package and verify inference locally.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600" />
            Start with the generated inference script, then deploy API or Gradio app.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600" />
            Track evaluation metrics and iterate on hyperparameters for improved quality.
          </li>
        </ul>
      </section>

      {!trainingJobId && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span>No completed training job found. Finish training before exporting final artifacts.</span>
          </div>
        </section>
      )}
    </div>
  );
}

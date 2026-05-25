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
  Copy,
  Check,
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
  const [copied, setCopied] = useState(false);

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
        // Keep UI functional
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

    if (type === 'inference') {
      return `"""\nInference script for QLoRA fine-tuned model\n"""\nimport torch\nfrom transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\nfrom peft import PeftModel\n\nMODEL_ID = "${modelId}"\nADAPTER_PATH = "./checkpoint-final"\n\nbnb_config = BitsAndBytesConfig(\n    load_in_4bit=True,\n    bnb_4bit_quant_type="nf4",\n    bnb_4bit_use_double_quant=True,\n    bnb_4bit_compute_dtype=torch.float16,\n)\n\nbase_model = AutoModelForCausalLM.from_pretrained(\n    MODEL_ID,\n    quantization_config=bnb_config,\n    device_map="auto",\n    trust_remote_code=True,\n)\n\nmodel = PeftModel.from_pretrained(base_model, ADAPTER_PATH)\nmodel.eval()\n\ntokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)\nif tokenizer.pad_token is None:\n    tokenizer.pad_token = tokenizer.eos_token\n\ndef generate(prompt: str, max_new_tokens: int = 160) -> str:\n    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)\n    with torch.no_grad():\n        output = model.generate(\n            **inputs,\n            max_new_tokens=max_new_tokens,\n            do_sample=True,\n            temperature=0.7,\n            top_p=0.9,\n            repetition_penalty=1.1,\n            pad_token_id=tokenizer.pad_token_id,\n        )\n    return tokenizer.decode(output[0], skip_special_tokens=True)\n\nif __name__ == "__main__":\n    prompt = "Write a concise summary about model fine-tuning."\n    print(generate(prompt))`;
    }

    if (type === 'gradio') {
      return `"""\nGradio demo for fine-tuned model\n"""\nimport gradio as gr\nimport torch\nfrom transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\nfrom peft import PeftModel\n\nMODEL_ID = "${modelId}"\nADAPTER_PATH = "./checkpoint-final"\n\n# ... (setup same as inference)\n\ndef run_generation(prompt, max_tokens, temperature):\n    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)\n    with torch.no_grad():\n        output = model.generate(\n            **inputs,\n            max_new_tokens=int(max_tokens),\n            temperature=float(temperature),\n            top_p=0.9,\n            do_sample=True,\n            repetition_penalty=1.1,\n            pad_token_id=tokenizer.pad_token_id,\n        )\n    return tokenizer.decode(output[0], skip_special_tokens=True)\n\nwith gr.Blocks() as app:\n    gr.Markdown("# Fine-tuned model demo")\n    prompt = gr.Textbox(label="Prompt", lines=4)\n    max_tokens = gr.Slider(minimum=32, maximum=512, value=160, step=16, label="Max new tokens")\n    temperature = gr.Slider(minimum=0.1, maximum=1.5, value=0.7, step=0.1, label="Temperature")\n    output = gr.Textbox(label="Output", lines=10)\n    run_btn = gr.Button("Generate")\n    run_btn.click(run_generation, [prompt, max_tokens, temperature], output)\n\nif __name__ == "__main__":\n    app.launch(server_port=7860)`;
    }

    if (type === 'api') {
      return `"""\nFastAPI endpoint for fine-tuned model inference\n"""\nfrom fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel, Field\nimport torch\nfrom transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\nfrom peft import PeftModel\n\nMODEL_ID = "${modelId}"\nADAPTER_PATH = "./checkpoint-final"\n\napp = FastAPI(title="Fine-tuned Model API", version="1.0.0")\n\nclass GenerateRequest(BaseModel):\n    prompt: str = Field(..., min_length=1)\n    max_new_tokens: int = Field(180, ge=1, le=1024)\n    temperature: float = Field(0.7, ge=0.1, le=2.0)\n\n# ... (model setup)\n\n@app.get("/health")\ndef health():\n    return {"status": "ok", "model": MODEL_ID}\n\n@app.post("/generate")\ndef generate(payload: GenerateRequest):\n    try:\n        inputs = tokenizer(payload.prompt, return_tensors="pt").to(model.device)\n        with torch.no_grad():\n            output = model.generate(**inputs, max_new_tokens=payload.max_new_tokens, temperature=payload.temperature)\n        return {"result": tokenizer.decode(output[0], skip_special_tokens=True)}\n    except Exception as exc:\n        raise HTTPException(status_code=500, detail=str(exc))`;
    }

    return `# Fine-tuned model package\n\n## Base Model\n- ${modelId}\n\n## Training Highlights\n- Method: QLoRA (4-bit)\n- Learning rate: ${trainingConfig?.learning_rate ?? '2e-4'}\n- Batch size: ${trainingConfig?.batch_size ?? 4}\n- Epochs: ${trainingConfig?.num_epochs ?? 3}\n\n## Files\n- adapter_model.bin\n- adapter_config.json\n- config.json\n- tokenizer files\n- training_metrics.json\n\n## Quick start\n1. Install: \`pip install torch transformers peft bitsandbytes accelerate\`\n2. Run the inference script.\n3. Validate output quality.`;
  };

  const handleGenerate = () => {
    setGeneratedCode(generateSampleCode(selectedType));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        if (match) filename = match[1];
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
      {/* Header */}
      <div className="section-header">
        <div className="badge-primary inline-flex">
          <Rocket className="h-3.5 w-3.5" />
          Step 5 of 5
        </div>
        <h2>Export & Deployment</h2>
        <p>Download model artifacts, inspect evaluation outputs, and generate deployment-ready code templates.</p>
      </div>

      {/* Model artifact download */}
      <div className="card card-shadow-lg border-emerald-500/20 p-4 sm:p-6 space-y-5 animate-scale-in">
        <div className="flex flex-col sm:flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <div className="badge-emerald inline-flex">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Package your trained output
            </div>
            <h3 className="mt-3 text-lg sm:text-xl font-bold">Model artifact bundle</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Includes adapter weights, configs, tokenizer assets, and training metrics.
            </p>
          </div>
          <button
            onClick={handleDownloadModel}
            disabled={isDownloadingModel || !trainingJobId}
            className="btn-primary w-full sm:w-auto justify-center"
          >
            <Download className="h-4 w-4" />
            {isDownloadingModel ? 'Downloading...' : 'Download package'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="metric-tile">
            <p className="label-text">Base model</p>
            <p className="mt-1.5 text-sm font-semibold truncate">{modelInfo?.model_id ?? 'N/A'}</p>
          </div>
          <div className="metric-tile">
            <p className="label-text">Training job</p>
            <p className="mt-1.5 text-sm font-semibold font-mono truncate">{trainingJobId ?? 'N/A'}</p>
          </div>
          <div className="metric-tile">
            <p className="label-text">Learning rate</p>
            <p className="mt-1.5 text-2xl font-bold">{trainingConfig?.learning_rate ?? '-'}</p>
          </div>
          <div className="metric-tile">
            <p className="label-text">Epochs</p>
            <p className="mt-1.5 text-2xl font-bold">{trainingConfig?.num_epochs ?? '-'}</p>
          </div>
        </div>

        {downloadError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-3 text-sm text-destructive">
            {downloadError}
          </div>
        )}
      </div>

      {/* Evaluation metrics */}
      {(evalMetrics || isLoadingEval) && (
        <div className="card p-5 space-y-4 animate-fade-in-up">
          <h3 className="text-base font-semibold">Evaluation snapshot</h3>

          {isLoadingEval ? (
            <p className="text-sm text-muted-foreground animate-pulse-soft">Loading evaluation metrics...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="metric-tile">
                <p className="label-text">Perplexity</p>
                <p className="mt-1.5 text-2xl font-bold font-mono">
                  {evalMetrics?.perplexity != null ? evalMetrics.perplexity.toFixed(2) : 'N/A'}
                </p>
              </div>
              <div className="metric-tile">
                <p className="label-text">Final loss</p>
                <p className="mt-1.5 text-2xl font-bold font-mono">
                  {evalMetrics?.final_loss != null ? evalMetrics.final_loss.toFixed(4) : 'N/A'}
                </p>
              </div>
              <div className="metric-tile">
                <p className="label-text">Train time</p>
                <p className="mt-1.5 text-2xl font-bold">
                  {evalMetrics?.training_time_seconds != null
                    ? `${Math.floor(evalMetrics.training_time_seconds / 60)}m`
                    : 'N/A'}
                </p>
              </div>
              <div className="metric-tile">
                <p className="label-text">Peak memory</p>
                <p className="mt-1.5 text-2xl font-bold">
                  {evalMetrics?.peak_memory_mb != null
                    ? `${(evalMetrics.peak_memory_mb / 1024).toFixed(2)} GB`
                    : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model card */}
      {modelCard && (
        <div className="card p-5 space-y-4 animate-fade-in-up">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Model card
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="metric-tile">
              <p className="label-text">Model name</p>
              <p className="mt-1.5 text-sm font-semibold">{modelCard.model_name ?? 'N/A'}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Base model</p>
              <p className="mt-1.5 text-sm font-semibold">{modelCard.base_model ?? 'N/A'}</p>
            </div>
          </div>
          {modelCard.tags && modelCard.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {modelCard.tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
          {modelCard.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{modelCard.description}</p>
          )}
        </div>
      )}

      {/* Experiment metadata */}
      {experimentMetadata && (
        <div className="card p-5 space-y-4 animate-fade-in-up">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <PackageOpen className="h-5 w-5 text-primary" />
            Experiment metadata
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="metric-tile">
              <p className="label-text">Experiment ID</p>
              <p className="mt-1.5 break-all text-xs font-semibold font-mono">
                {experimentMetadata.experiment_id ?? trainingJobId}
              </p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Seed</p>
              <p className="mt-1.5 text-2xl font-bold">{experimentMetadata.seed ?? '-'}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Artifacts</p>
              <p className="mt-1.5 text-2xl font-bold">
                {experimentMetadata.artifacts ? Object.keys(experimentMetadata.artifacts).length : 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Code generation */}
      <div className="card card-shadow-lg p-4 sm:p-6 space-y-5">
        <h3 className="text-lg sm:text-xl font-bold">Generate code templates</h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {codeTypes.map((type) => {
            const Icon = type.icon;
            const active = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`card-hover p-4 text-left ${
                  active ? 'border-primary/30 bg-primary/[0.03]' : ''
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-semibold">{type.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
              </button>
            );
          })}
        </div>

        <button onClick={handleGenerate} className="btn-primary w-full justify-center">
          <Sparkles className="h-4 w-4" />
          Generate {codeTypes.find((t) => t.id === selectedType)?.label}
        </button>

        {generatedCode && (
          <div className="code-block animate-scale-in">
            <div className="code-block-header">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {selectedType}.{selectedType === 'readme' ? 'md' : 'py'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-white/5"
                >
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
                  )}
                </button>
                <button
                  onClick={handleDownloadGeneratedFile}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-white/5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
            <pre className="code-block-content">
              <code>{generatedCode}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Next actions */}
      <div className="card border-primary/10 bg-primary/[0.02] p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold mb-3">
          <Rocket className="h-5 w-5 text-primary" />
          Next actions
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            'Download the model package and verify inference locally.',
            'Start with the generated inference script, then deploy API or Gradio app.',
            'Track evaluation metrics and iterate on hyperparameters for improved quality.',
          ].map((action, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {action}
            </li>
          ))}
        </ul>
      </div>

      {/* Empty state */}
      {!trainingJobId && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 text-sm text-amber-600 dark:text-amber-400">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No completed training job found. Finish training before exporting final artifacts.</span>
          </div>
        </div>
      )}
    </div>
  );
}

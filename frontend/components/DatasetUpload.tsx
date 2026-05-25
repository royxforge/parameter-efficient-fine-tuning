"use client";

import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  File,
  Info,
  Loader2,
  Upload,
  Table,
  Layers,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';

export default function DatasetUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setDatasetInfo, setCurrentStep, datasetInfo, modelInfo } = usePipelineStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json', '.jsonl'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', file.name.endsWith('.csv') ? 'csv' : 'json');

      const response = await fetch('http://localhost:8000/api/upload-dataset', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setDatasetInfo(data);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload dataset');
    } finally {
      setIsUploading(false);
    }
  };

  const previewColumns = useMemo(() => datasetInfo?.columns?.slice(0, 5) ?? [], [datasetInfo]);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="section-header">
        <div className="badge-primary inline-flex">
          <Upload className="h-3.5 w-3.5" />
          Step 2 of 5
        </div>
        <h2>Dataset Upload</h2>
        <p>
          Upload training data in JSON, JSONL, or CSV format. We validate structure, profile token lengths, and prepare it for fine-tuning.
        </p>
      </div>

      {/* Context banner */}
      {modelInfo && (
        <div className="card border-primary/10 bg-primary/[0.02] p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Current model</p>
              <p className="mt-0.5 text-sm font-medium">{modelInfo.model_id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dropzone */}
      {!datasetInfo && (
        <div
          {...getRootProps()}
          className={`card cursor-pointer border-2 border-dashed p-10 text-center transition-all duration-200 md:p-14 ${
            isDragActive
              ? 'border-primary bg-primary/5 shadow-glow'
              : 'border-border hover:border-primary/40 hover:bg-card/80'
          }`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold">
            {isDragActive ? 'Drop your dataset here' : 'Drag & drop your dataset'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">or click to browse local files</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 sm:px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <File className="h-3.5 w-3.5" />
            JSON, JSONL, CSV | Max 100 MB
          </div>
        </div>
      )}

      {/* File selected */}
      {file && !datasetInfo && (
        <div className="card card-shadow-lg p-5 animate-scale-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <File className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={handleUpload} disabled={isUploading} className="btn-primary">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload & Analyze
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-destructive/20 bg-destructive/[0.03] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Upload failed</p>
              <p className="mt-1 text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {datasetInfo && (
        <div className="card card-shadow-lg border-emerald-500/20 p-6 space-y-6 animate-scale-in">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="badge-emerald inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Dataset ready
              </div>
              <h3 className="mt-3 text-xl font-bold">{datasetInfo.dataset_id}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Format: {datasetInfo.format.toUpperCase()}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 px-5 py-3.5 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Size
              </p>
              <p className="mt-1 text-2xl font-bold">{datasetInfo.size_mb.toFixed(2)} MB</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="metric-tile">
              <p className="label-text flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Total samples
              </p>
              <p className="mt-1.5 text-2xl font-bold">{datasetInfo.num_samples.toLocaleString()}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Training samples</p>
              <p className="mt-1.5 text-2xl font-bold">{datasetInfo.num_train_samples.toLocaleString()}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Avg tokens</p>
              <p className="mt-1.5 text-2xl font-bold">{datasetInfo.avg_tokens}</p>
            </div>
            <div className="metric-tile">
              <p className="label-text">Max tokens</p>
              <p className="mt-1.5 text-2xl font-bold">{datasetInfo.max_tokens}</p>
            </div>
          </div>

          {/* Warnings */}
          {datasetInfo.validation_warnings?.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Validation warnings</p>
              <ul className="mt-2 space-y-1.5">
                {datasetInfo.validation_warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview table */}
          {datasetInfo.data_preview?.length > 0 && previewColumns.length > 0 && (
            <div className="overflow-hidden rounded-xl border">
              <div className="border-b bg-muted/30 px-3 sm:px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Table className="h-4 w-4 text-primary" />
                  Dataset preview
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted/20 text-muted-foreground">
                    <tr>
                      {previewColumns.map((col) => (
                        <th key={col} className="px-3 sm:px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datasetInfo.data_preview.slice(0, 4).map((row, i) => (
                      <tr key={i} className="border-t border-border/50 align-top">
                        {previewColumns.map((col) => (
                          <td key={`${col}-${i}`} className="max-w-[160px] sm:max-w-[220px] px-3 sm:px-4 py-3">
                            <div className="line-clamp-2 font-mono text-xs break-all">
                              {String(row[col] ?? '-')}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 pt-2">
        <button onClick={() => setCurrentStep('model')} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to Model
        </button>
        {datasetInfo && (
          <button onClick={() => setCurrentStep('hyperparameters')} className="btn-primary px-6 py-2.5">
            Continue to Hyperparameters
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

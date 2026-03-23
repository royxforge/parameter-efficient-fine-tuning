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

  const previewColumns = useMemo(() => datasetInfo?.columns?.slice(0, 4) ?? [], [datasetInfo]);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <section className="text-center">
        <span className="badge-pill">Step 2 of 5</span>
        <h2 className="section-title mt-4">Dataset Upload</h2>
        <p className="section-description mx-auto mt-3 max-w-3xl">
          Upload training data in JSON, JSONL, or CSV format. We validate structure, profile token lengths, and prepare it for fine-tuning.
        </p>
      </section>

      {modelInfo && (
        <section className="surface-tint">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-teal-700" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">Current model context</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{modelInfo.model_id}</p>
            </div>
          </div>
        </section>
      )}

      {!datasetInfo && (
        <section
          {...getRootProps()}
          className={`surface-card-strong cursor-pointer border-2 border-dashed p-10 text-center transition md:p-14 ${
            isDragActive
              ? 'border-teal-400 bg-teal-50/80 shadow-glow-soft'
              : 'border-slate-300 hover:border-teal-300 hover:bg-white'
          }`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-teal-300">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">
            {isDragActive ? 'Drop your dataset file here' : 'Drag and drop your dataset'}
          </h3>
          <p className="mt-3 text-sm text-slate-600">or click to browse local files</p>
          <p className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600">
            Supported formats: JSON, JSONL, CSV | Max size: 100 MB
          </p>
        </section>
      )}

      {file && !datasetInfo && (
        <section className="surface-card-strong">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-slate-900 p-3 text-teal-300">
                <File className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="mt-1 text-xs text-slate-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>

            <button onClick={handleUpload} disabled={isUploading} className="primary-button px-6 py-3">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload and Analyze
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Dataset upload failed</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </section>
      )}

      {datasetInfo && (
        <section className="surface-card-strong space-y-6 border-teal-200/70 bg-gradient-to-br from-teal-50 to-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="badge-pill">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Dataset ready
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">{datasetInfo.dataset_id}</h3>
              <p className="mt-1 text-sm text-slate-600">Format: {datasetInfo.format.toUpperCase()}</p>
            </div>
            <div className="rounded-xl bg-slate-900 px-4 py-3 text-right text-teal-300">
              <p className="text-[11px] uppercase tracking-[0.14em]">Dataset Size</p>
              <p className="mt-1 text-xl font-semibold">{datasetInfo.size_mb.toFixed(2)} MB</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total samples</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{datasetInfo.num_samples.toLocaleString()}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Training samples</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{datasetInfo.num_train_samples.toLocaleString()}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Average tokens</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{datasetInfo.avg_tokens}</p>
            </article>
            <article className="metric-tile">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Max tokens</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{datasetInfo.max_tokens}</p>
            </article>
          </div>

          {datasetInfo.validation_warnings?.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Validation warnings</p>
              <ul className="mt-2 space-y-2 text-sm text-amber-700">
                {datasetInfo.validation_warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {datasetInfo.data_preview && datasetInfo.data_preview.length > 0 && previewColumns.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/85">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Dataset preview</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={column} className="px-4 py-3 font-semibold uppercase tracking-[0.1em]">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datasetInfo.data_preview.slice(0, 3).map((row, index) => (
                      <tr key={index} className="border-t border-slate-100 align-top">
                        {previewColumns.map((column) => (
                          <td key={`${column}-${index}`} className="max-w-[260px] px-4 py-3 text-slate-700">
                            <div className="line-clamp-3">{String(row[column] ?? '-')}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button onClick={() => setCurrentStep('model')} className="secondary-button">
          <ArrowLeft className="h-4 w-4" />
          Back to Model
        </button>

        {datasetInfo && (
          <button onClick={() => setCurrentStep('hyperparameters')} className="primary-button px-6 py-3">
            Continue to Hyperparameters
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

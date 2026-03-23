"use client";

import { useEffect } from 'react';
import PipelineWorkspace from '@/components/PipelineWorkspace';
import { usePipelineStore } from '@/store/pipelineStore';

export default function PipelinePage() {
  const { reset } = usePipelineStore();

  useEffect(() => {
    reset();
  }, [reset]);

  return <PipelineWorkspace compactHeader />;
}

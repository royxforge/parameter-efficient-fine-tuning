"use client";

import { useEffect, useState } from 'react';
import LandingExperience from '@/components/LandingExperience';
import PipelineWorkspace from '@/components/PipelineWorkspace';
import { usePipelineStore } from '@/store/pipelineStore';

export default function Home() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const { reset } = usePipelineStore();

  useEffect(() => {
    reset();
  }, [reset]);

  if (!workspaceOpen) {
    return <LandingExperience onStart={() => setWorkspaceOpen(true)} />;
  }

  return <PipelineWorkspace />;
}

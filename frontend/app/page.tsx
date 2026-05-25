"use client";

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingExperience from '@/components/LandingExperience';
import PipelineWorkspace from '@/components/PipelineWorkspace';
import { usePipelineStore } from '@/store/pipelineStore';
import { pageTransition } from '@/lib/animations';

export default function Home() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const { reset } = usePipelineStore();

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <AnimatePresence mode="wait">
      {!workspaceOpen ? (
        <motion.div
          key="landing"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <LandingExperience onStart={() => setWorkspaceOpen(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="workspace"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <PipelineWorkspace />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

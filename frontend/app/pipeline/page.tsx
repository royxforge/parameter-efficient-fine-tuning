"use client";

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PipelineWorkspace from '@/components/PipelineWorkspace';
import { usePipelineStore } from '@/store/pipelineStore';
import { pageTransition } from '@/lib/animations';

export default function PipelinePage() {
  const { reset } = usePipelineStore();

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="pipeline"
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <PipelineWorkspace compactHeader />
      </motion.div>
    </AnimatePresence>
  );
}

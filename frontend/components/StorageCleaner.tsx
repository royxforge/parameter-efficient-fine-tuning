"use client";

import { useEffect } from 'react';

/**
 * Clears persisted storage on app mount for a fresh session.
 */
export default function StorageCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pipeline-storage');

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('pipeline') || key?.includes('training') || key?.includes('model')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  }, []);

  return null;
}

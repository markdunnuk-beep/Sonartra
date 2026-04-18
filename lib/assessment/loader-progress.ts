'use client';

import { useEffect, useRef, useState } from 'react';

export type AssessmentLoaderVariant = 'initialising' | 'processing';
export type AssessmentLoaderProgressMode = 'simulated' | 'controlled';

type UseAssessmentLoaderProgressParams = {
  variant: AssessmentLoaderVariant;
  progressMode: AssessmentLoaderProgressMode;
  isComplete?: boolean;
};

type AssessmentLoaderProgressState = {
  progress: number;
  isReducedMotion: boolean;
  isSimulated: boolean;
};

type LoaderProgressConfig = {
  initialProgress: number;
  driftCap: number;
  tickMs: number;
  reducedMotionTickMs: number;
  minimumVisibleMs: number;
  completionTickMs: number;
  reducedMotionCompletionTickMs: number;
};

const LOADER_PROGRESS_CONFIG: Record<AssessmentLoaderVariant, LoaderProgressConfig> = {
  initialising: {
    initialProgress: 16,
    driftCap: 64,
    tickMs: 180,
    reducedMotionTickMs: 280,
    minimumVisibleMs: 800,
    completionTickMs: 90,
    reducedMotionCompletionTickMs: 140,
  },
  processing: {
    initialProgress: 14,
    driftCap: 72,
    tickMs: 220,
    reducedMotionTickMs: 320,
    minimumVisibleMs: 1200,
    completionTickMs: 100,
    reducedMotionCompletionTickMs: 150,
  },
};

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function getInitialProgress(
  variant: AssessmentLoaderVariant,
  progressMode: AssessmentLoaderProgressMode,
): number {
  return LOADER_PROGRESS_CONFIG[variant].initialProgress;
}

function getDriftStep(current: number, cap: number): number {
  const remaining = Math.max(0, cap - current);

  if (remaining <= 0) {
    return cap;
  }

  const next = current + Math.max(0.65, remaining * 0.16);
  return Math.min(cap, Number(next.toFixed(2)));
}

function getCompletionStep(current: number): number {
  const remaining = Math.max(0, 100 - current);

  if (remaining <= 0) {
    return 100;
  }

  const next = current + Math.max(1.8, remaining * 0.34);
  return Math.min(100, Number(next.toFixed(2)));
}

export function useAssessmentLoaderProgress({
  variant,
  progressMode,
  isComplete = false,
}: UseAssessmentLoaderProgressParams): AssessmentLoaderProgressState {
  const [progress, setProgress] = useState(() =>
    getInitialProgress(variant, progressMode),
  );
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => {
      setIsReducedMotion(mediaQueryList.matches);
    };

    updateReducedMotion();
    mediaQueryList.addEventListener('change', updateReducedMotion);

    return () => {
      mediaQueryList.removeEventListener('change', updateReducedMotion);
    };
  }, []);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      startedAtRef.current = Date.now();
      setProgress(getInitialProgress(variant, progressMode));
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);
    };
  }, [variant, progressMode]);

  useEffect(() => {
    if (progressMode !== 'simulated') {
      return;
    }

    const config = LOADER_PROGRESS_CONFIG[variant];
    const now = Date.now();
    const startedAt = startedAtRef.current ?? now;
    const elapsedMs = now - startedAt;
    const tickMs = isReducedMotion ? config.reducedMotionTickMs : config.tickMs;
    const completionTickMs = isReducedMotion
      ? config.reducedMotionCompletionTickMs
      : config.completionTickMs;

    if (isComplete) {
      if (elapsedMs < config.minimumVisibleMs) {
        const waitMs = Math.min(tickMs, config.minimumVisibleMs - elapsedMs);
        const waitTimer = window.setTimeout(() => {
          setProgress((current) => getDriftStep(current, config.driftCap));
        }, waitMs);

        return () => {
          window.clearTimeout(waitTimer);
        };
      }

      if (progress >= 100) {
        return;
      }

      const completionTimer = window.setTimeout(() => {
        setProgress((current) => getCompletionStep(current));
      }, completionTickMs);

      return () => {
        window.clearTimeout(completionTimer);
      };
    }

    if (progress >= config.driftCap) {
      return;
    }

    const driftTimer = window.setTimeout(() => {
      setProgress((current) => getDriftStep(current, config.driftCap));
    }, tickMs);

    return () => {
      window.clearTimeout(driftTimer);
    };
  }, [isComplete, isReducedMotion, progress, progressMode, variant]);

  return {
    progress,
    isReducedMotion,
    isSimulated: progressMode === 'simulated',
  };
}

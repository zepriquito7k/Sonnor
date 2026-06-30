import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type SharedMediaProgressValue = {
  duration: number;
  progress: number;
  currentTime: number;
  remainingTime: number;
  isPlaying: boolean;
  setProgress: (value: number) => void;
  setIsPlaying: (value: boolean) => void;
  togglePlayback: () => void;
};

const DEFAULT_DURATION = 175;

const SharedMediaProgressContext =
  createContext<SharedMediaProgressValue | null>(null);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatMediaTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function SharedMediaProgressProvider({ children }: PropsWithChildren) {
  const [duration] = useState(DEFAULT_DURATION);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frameId = 0;
    let previousTime = Date.now();

    const updateProgress = () => {
      const now = Date.now();
      const deltaSeconds = (now - previousTime) / 1000;

      previousTime = now;

      setCurrentTime((current) => {
        const next = current + deltaSeconds;
        return next >= duration ? 0 : next;
      });

      frameId = requestAnimationFrame(updateProgress);
    };

    frameId = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(frameId);
  }, [duration, isPlaying]);

  const setProgress = useCallback((value: number) => {
    setCurrentTime(clamp(value, 0, 1) * duration);
  }, [duration]);

  const progress = duration === 0 ? 0 : currentTime / duration;
  const remainingTime = Math.max(duration - currentTime, 0);

  const value = useMemo(
    () => ({
      duration,
      progress,
      currentTime,
      remainingTime,
      isPlaying,
      setProgress,
      setIsPlaying,
      togglePlayback: () => setIsPlaying((current) => !current),
    }),
    [currentTime, duration, isPlaying, progress, remainingTime, setProgress],
  );

  return (
    <SharedMediaProgressContext.Provider value={value}>
      {children}
    </SharedMediaProgressContext.Provider>
  );
}

export function useSharedMediaProgress() {
  const context = useContext(SharedMediaProgressContext);

  if (!context) {
    throw new Error(
      "useSharedMediaProgress must be used within SharedMediaProgressProvider",
    );
  }

  return context;
}

export default function SharedMediaProgressRoute() {
  return null;
}

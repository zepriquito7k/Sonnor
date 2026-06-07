import type { AVPlaybackStatus } from "expo-av";
import React, { createContext, useContext, useRef, useState } from "react";

import { auth } from "../firebase/config";
import { getRecommendedTracks } from "../firebase/contentClient";
import { createRecentPlay } from "../firebase/contentMutations";

export type Track = {
  id: string;
  uri: string;
  title?: string;
  artist?: string;
  cover?: string;
  shortVideo?: string;
  lyrics?: string;
  albumId?: string;
  genre?: string;
  source?: "home" | "search" | "profile" | "release" | "library";
};

type PlayerContextType = {
  track: Track | null;
  status: AVPlaybackStatus | null;
  playTrack: (track: Track) => Promise<void>;
  playQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (millis: number) => Promise<void>;
  stop: () => Promise<void>;
};

const PlayerContext = createContext<PlayerContextType>({} as PlayerContextType);

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const soundRef = useRef<{
    getStatusAsync: () => Promise<AVPlaybackStatus>;
    pauseAsync: () => Promise<AVPlaybackStatus>;
    stopAsync: () => Promise<AVPlaybackStatus>;
    playAsync: () => Promise<AVPlaybackStatus>;
    setPositionAsync: (millis: number) => Promise<AVPlaybackStatus>;
    unloadAsync: () => Promise<AVPlaybackStatus>;
  } | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const seekingRef = useRef(false);
  const audioModeReadyRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const queueRef = useRef<Track[]>([]);
  const queueIndexRef = useRef(-1);
  const historyRef = useRef<Track[]>([]);
  const historyIndexRef = useRef(-1);
  const recommendationGenreRef = useRef<string | undefined>(undefined);
  const playQueuedTrackRef = useRef<(index: number) => Promise<void>>(async () => {});
  const playNextRef = useRef<() => Promise<void>>(async () => {});

  async function ensureAudioMode(Audio: typeof import("expo-av").Audio) {
    if (audioModeReadyRef.current) {
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      audioModeReadyRef.current = true;
    } catch (error) {
      console.log("AUDIO MODE ERROR:", error);
    }
  }

  async function loadTrack(newTrack: Track, recordHistory = true) {
    const requestId = playRequestIdRef.current + 1;
    playRequestIdRef.current = requestId;

    if (track?.id === newTrack.id && soundRef.current) {
      const currentStatus = await soundRef.current.getStatusAsync();

      if (currentStatus.isLoaded) {
        const nextStatus = await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
        setStatus(nextStatus);
        return;
      }
    }

    const { Audio } = await import("expo-av");
    await ensureAudioMode(Audio);

    const previousSound = soundRef.current;
    soundRef.current = null;

    if (previousSound) {
      await previousSound.stopAsync().catch(() => null);
      await previousSound.unloadAsync().catch(() => null);
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: newTrack.uri },
      {
        shouldPlay: true,
        progressUpdateIntervalMillis: 250,
        volume: 1,
      },
      (s) => {
        setStatus(s);

        if (s.isLoaded && s.didJustFinish) {
          void playNextRef.current();
        }
      },
    );

    if (playRequestIdRef.current !== requestId) {
      await sound.stopAsync().catch(() => null);
      await sound.unloadAsync().catch(() => null);
      return;
    }

    soundRef.current = sound;
    setTrack(newTrack);

    if (recordHistory) {
      const currentHistory = historyRef.current.slice(
        0,
        historyIndexRef.current + 1,
      );
      if (currentHistory.at(-1)?.id !== newTrack.id) {
        currentHistory.push(newTrack);
      }
      historyRef.current = currentHistory;
      historyIndexRef.current = currentHistory.length - 1;
    }

    if (auth.currentUser?.uid) {
      createRecentPlay({
        userId: auth.currentUser.uid,
        trackId: newTrack.id,
        albumId: newTrack.albumId,
        source: newTrack.source,
      }).catch((error) => console.log("CREATE RECENT PLAY ERROR:", error));
    }
  }

  async function playTrack(newTrack: Track) {
    queueRef.current = [];
    queueIndexRef.current = -1;
    recommendationGenreRef.current = newTrack.genre;
    await loadTrack(newTrack);
  }

  async function playQueuedTrack(index: number) {
    const nextTrack = queueRef.current[index];

    if (!nextTrack) {
      return;
    }

    queueIndexRef.current = index;
    await loadTrack(nextTrack);
  }

  playQueuedTrackRef.current = playQueuedTrack;

  async function playQueue(tracks: Track[], startIndex = 0) {
    const playableTracks = tracks.filter((item) => item.uri.trim());

    if (playableTracks.length === 0) {
      return;
    }

    queueRef.current = playableTracks;
    recommendationGenreRef.current = playableTracks[startIndex]?.genre;
    await playQueuedTrack(Math.min(Math.max(startIndex, 0), playableTracks.length - 1));
  }

  async function playPrevious() {
    if (soundRef.current) {
      const currentStatus = await soundRef.current.getStatusAsync();

      if (currentStatus.isLoaded && currentStatus.positionMillis > 5000) {
        const nextStatus = await soundRef.current.setPositionAsync(0);
        setStatus(nextStatus);
        return;
      }
    }

    if (historyIndexRef.current <= 0) {
      if (soundRef.current) {
        const nextStatus = await soundRef.current.setPositionAsync(0);
        setStatus(nextStatus);
      }
      return;
    }

    historyIndexRef.current -= 1;
    const previousTrack = historyRef.current[historyIndexRef.current];
    queueIndexRef.current = queueRef.current.findIndex(
      (item) => item.id === previousTrack.id,
    );
    await loadTrack(previousTrack, false);
  }

  async function playNext() {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextHistoryTrack = historyRef.current[historyIndexRef.current];
      queueIndexRef.current = queueRef.current.findIndex(
        (item) => item.id === nextHistoryTrack.id,
      );
      await loadTrack(nextHistoryTrack, false);
      return;
    }

    const nextIndex = queueIndexRef.current + 1;
    if (nextIndex >= 0 && nextIndex < queueRef.current.length) {
      await playQueuedTrack(nextIndex);
      return;
    }

    const recommendations = await getRecommendedTracks(
      recommendationGenreRef.current ?? track?.genre,
      historyRef.current.map((item) => item.id),
    );
    const recommendedQueue: Track[] = recommendations.map((item) => ({
      albumId: item.albumId,
      artist: item.artistName || "Artista",
      cover: item.coverUrl || "",
      genre: item.genre || "",
      id: item.id,
      lyrics: item.lyrics || "",
      shortVideo: item.shortVideoUrl || "",
      source: "home",
      title: item.title || "Música",
      uri: item.audioUrl,
    }));

    if (recommendedQueue.length > 0) {
      queueRef.current = recommendedQueue;
      await playQueuedTrack(0);
    }
  }

  playNextRef.current = playNext;

  const togglePlay = async () => {
    if (!soundRef.current) return;
    const s = await soundRef.current.getStatusAsync();

    if (!s.isLoaded) return;

    const nextStatus = s.isPlaying
      ? await soundRef.current.pauseAsync()
      : await soundRef.current.playAsync();

    setStatus(nextStatus);
  };

  const seek = async (millis: number) => {
    if (!soundRef.current) return;

    if (seekingRef.current) {
      return;
    }

    try {
      seekingRef.current = true;
      const nextStatus = await soundRef.current.setPositionAsync(millis);
      setStatus(nextStatus);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (!message.includes("Seeking interrupted")) {
        throw error;
      }
    } finally {
      seekingRef.current = false;
    }
  };

  const stop = async () => {
    if (!soundRef.current) return;

    const nextStatus = await soundRef.current.pauseAsync();

    setStatus(nextStatus);
  };

  return (
    <PlayerContext.Provider
      value={{
        track,
        status,
        playTrack,
        playQueue,
        playNext,
        playPrevious,
        togglePlay,
        seek,
        stop,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);

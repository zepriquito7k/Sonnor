import type { AVPlaybackStatus } from "expo-av";
import { onAuthStateChanged } from "firebase/auth";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { auth } from "../firebase/config";
import {
  canPlayAlbumTrack,
  getRecommendedTracks,
} from "../firebase/contentClient";
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
  folderTitle?: string;
  genre?: string;
  source?: "home" | "search" | "profile" | "release" | "library";
};

type PlayerContextType = {
  autoRecommendations: boolean;
  track: Track | null;
  status: AVPlaybackStatus | null;
  playTrack: (track: Track) => Promise<void>;
  playQueue: (
    tracks: Track[],
    startIndex?: number,
    options?: PlayQueueOptions,
  ) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setAutoRecommendations: (enabled: boolean) => void;
  togglePlay: () => Promise<void>;
  seek: (millis: number) => Promise<void>;
  stop: () => Promise<void>;
};

type PlayQueueOptions = {
  autoRecommendations?: boolean;
};

type SoundHandle = {
  getStatusAsync: () => Promise<AVPlaybackStatus>;
  pauseAsync: () => Promise<AVPlaybackStatus>;
  stopAsync: () => Promise<AVPlaybackStatus>;
  playAsync: () => Promise<AVPlaybackStatus>;
  setPositionAsync: (millis: number) => Promise<AVPlaybackStatus>;
  unloadAsync: () => Promise<AVPlaybackStatus>;
  setOnPlaybackStatusUpdate: (
    callback: ((status: AVPlaybackStatus) => void) | null,
  ) => void;
};

const PlayerContext = createContext<PlayerContextType>({} as PlayerContextType);

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const soundRef = useRef<SoundHandle | null>(null);
  const preparedSoundRef = useRef<{
    sound: SoundHandle;
    trackId: string;
    uri: string;
  } | null>(null);
  const prepareSoundRequestRef = useRef(0);
  const [track, setTrack] = useState<Track | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [autoRecommendations, setAutoRecommendationsState] = useState(false);
  const seekingRef = useRef(false);
  const audioModeReadyRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const queueRef = useRef<Track[]>([]);
  const queueIndexRef = useRef(-1);
  const historyRef = useRef<Track[]>([]);
  const historyIndexRef = useRef(-1);
  const recommendationGenreRef = useRef<string | undefined>(undefined);
  const recommendationPromiseRef = useRef<Promise<Track[]> | null>(null);
  const recommendationKeyRef = useRef("");
  const autoRecommendationsRef = useRef(false);
  const queueEndedRef = useRef(false);
  const finishHandlingRef = useRef(false);
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

  useEffect(() => {
    void import("expo-av").then(({ Audio }) => ensureAudioMode(Audio));

    return () => {
      void soundRef.current?.unloadAsync().catch(() => null);
      void preparedSoundRef.current?.sound.unloadAsync().catch(() => null);
    };
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        return;
      }

      playRequestIdRef.current += 1;
      prepareSoundRequestRef.current += 1;

      const currentSound = soundRef.current;
      const preparedSound = preparedSoundRef.current?.sound;
      soundRef.current = null;
      preparedSoundRef.current = null;

      currentSound?.setOnPlaybackStatusUpdate(null);
      void currentSound
        ?.stopAsync()
        .catch(() => null)
        .then(() => currentSound.unloadAsync().catch(() => null));
      void preparedSound
        ?.stopAsync()
        .catch(() => null)
        .then(() => preparedSound.unloadAsync().catch(() => null));

      queueRef.current = [];
      queueIndexRef.current = -1;
      historyRef.current = [];
      historyIndexRef.current = -1;
      recommendationGenreRef.current = undefined;
      recommendationPromiseRef.current = null;
      recommendationKeyRef.current = "";
      autoRecommendationsRef.current = false;
      setAutoRecommendationsState(false);
      queueEndedRef.current = false;
      setTrack(null);
      setStatus(null);
    });
  }, []);

  function handlePlaybackStatus(nextStatus: AVPlaybackStatus) {
    setStatus(nextStatus);

    if (nextStatus.isLoaded && nextStatus.didJustFinish && !finishHandlingRef.current) {
      finishHandlingRef.current = true;
      void playNextRef.current().finally(() => {
        finishHandlingRef.current = false;
      });
    }
  }

  async function prepareSound(nextTrack?: Track) {
    if (!nextTrack?.uri.trim()) {
      return;
    }

    if (!(await canPlayAlbumTrack(nextTrack.albumId))) {
      return;
    }

    if (
      preparedSoundRef.current?.trackId === nextTrack.id &&
      preparedSoundRef.current.uri === nextTrack.uri
    ) {
      return;
    }

    const requestId = prepareSoundRequestRef.current + 1;
    prepareSoundRequestRef.current = requestId;
    const { Audio } = await import("expo-av");
    await ensureAudioMode(Audio);
    const { sound } = await Audio.Sound.createAsync(
      { uri: nextTrack.uri },
      {
        shouldPlay: false,
        progressUpdateIntervalMillis: 250,
        volume: 1,
      },
      null,
      false,
    );

    if (prepareSoundRequestRef.current !== requestId) {
      await sound.unloadAsync().catch(() => null);
      return;
    }

    const previousPreparedSound = preparedSoundRef.current?.sound;
    preparedSoundRef.current = {
      sound,
      trackId: nextTrack.id,
      uri: nextTrack.uri,
    };
    void previousPreparedSound?.unloadAsync().catch(() => null);
  }

  function prepareFollowingTrack() {
    const nextQueuedTrack = queueRef.current[queueIndexRef.current + 1];

    if (nextQueuedTrack) {
      void prepareSound(nextQueuedTrack).catch(() => null);
      return;
    }

    void prepareRecommendations(recommendationGenreRef.current ?? track?.genre)
      .then((tracks) => prepareSound(tracks[0]))
      .catch(() => null);
  }

  function prepareRecommendations(genre?: string) {
    const excludedIds = historyRef.current.map((item) => item.id);
    const key = `${genre ?? ""}:${excludedIds.join(",")}`;

    if (recommendationPromiseRef.current && recommendationKeyRef.current === key) {
      return recommendationPromiseRef.current;
    }

    recommendationKeyRef.current = key;
    recommendationPromiseRef.current = getRecommendedTracks(genre, excludedIds).then(
      (recommendations) =>
        recommendations.map((item) => ({
          albumId: item.albumId,
          artist: item.artistName || "Artist",
          cover: item.coverUrl || "",
          genre: item.genre || "",
          id: item.id,
          lyrics: item.lyrics || "",
          shortVideo: item.shortVideoUrl || "",
          source: "home",
          title: item.title || "Music",
          uri: item.audioUrl,
        })),
    );

    return recommendationPromiseRef.current;
  }

  async function loadTrack(newTrack: Track, recordHistory = true) {
    if (!(await canPlayAlbumTrack(newTrack.albumId))) {
      Alert.alert(
        "Pre-release",
        "This track will be available when the countdown ends.",
      );
      return;
    }

    const requestId = playRequestIdRef.current + 1;
    playRequestIdRef.current = requestId;
    queueEndedRef.current = false;

    if (track?.id === newTrack.id && soundRef.current) {
      const currentStatus = await soundRef.current.getStatusAsync();

      if (currentStatus.isLoaded) {
        const nextStatus = await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
        setStatus(nextStatus);
        return;
      }
    }

    setTrack(newTrack);
    setStatus(null);

    const { Audio } = await import("expo-av");
    await ensureAudioMode(Audio);

    const previousSound = soundRef.current;
    soundRef.current = null;

    if (previousSound) {
      void previousSound
        .stopAsync()
        .catch(() => null)
        .then(() => previousSound.unloadAsync().catch(() => null));
    }

    const preparedSound =
      preparedSoundRef.current?.trackId === newTrack.id &&
      preparedSoundRef.current.uri === newTrack.uri
        ? preparedSoundRef.current.sound
        : null;
    let sound: SoundHandle;

    if (preparedSound) {
      preparedSoundRef.current = null;
      preparedSound.setOnPlaybackStatusUpdate(handlePlaybackStatus);
      sound = preparedSound;
      await sound.playAsync();
    } else {
      const created = await Audio.Sound.createAsync(
        { uri: newTrack.uri },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 250,
          volume: 1,
        },
        handlePlaybackStatus,
        false,
      );
      sound = created.sound;
    }

    if (playRequestIdRef.current !== requestId) {
      await sound.stopAsync().catch(() => null);
      await sound.unloadAsync().catch(() => null);
      return;
    }

    soundRef.current = sound;
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

    void prepareRecommendations(newTrack.genre);
    prepareFollowingTrack();

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
    autoRecommendationsRef.current = false;
    setAutoRecommendationsState(false);
    recommendationGenreRef.current = newTrack.genre;
    await loadTrack(newTrack);
  }

  function setAutoRecommendations(enabled: boolean) {
    autoRecommendationsRef.current = enabled;
    setAutoRecommendationsState(enabled);
  }

  async function playQueuedTrack(index: number) {
    const nextTrack = queueRef.current[index];

    if (!nextTrack) {
      return;
    }

    queueIndexRef.current = index;
    queueEndedRef.current = false;
    await loadTrack(nextTrack);
  }

  playQueuedTrackRef.current = playQueuedTrack;

  async function playQueue(
    tracks: Track[],
    startIndex = 0,
    options: PlayQueueOptions = {},
  ) {
    const playableTracks = tracks.filter((item) => item.uri.trim());

    if (playableTracks.length === 0) {
      return;
    }

    queueRef.current = playableTracks;
    setAutoRecommendations(Boolean(options.autoRecommendations));
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

    if (autoRecommendationsRef.current) {
      const recommendedQueue = await prepareRecommendations(
        recommendationGenreRef.current ?? track?.genre,
      );
      recommendationPromiseRef.current = null;
      recommendationKeyRef.current = "";

      if (recommendedQueue.length > 0) {
        queueRef.current = recommendedQueue;
        queueIndexRef.current = -1;
        await playQueuedTrack(0);
        return;
      }
    }

    queueEndedRef.current = true;
  }

  playNextRef.current = playNext;

  const togglePlay = async () => {
    if (!soundRef.current) return;
    const s = await soundRef.current.getStatusAsync();

    if (!s.isLoaded) return;

    const finishedTrack =
      s.didJustFinish ||
      queueEndedRef.current ||
      (typeof s.durationMillis === "number" &&
        s.durationMillis > 0 &&
        s.positionMillis >= s.durationMillis - 350);

    if (!s.isPlaying && finishedTrack) {
      if (queueRef.current.length > 0) {
        await playQueuedTrack(0);
        return;
      }

      const resetStatus = await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
      queueEndedRef.current = false;
      setStatus(resetStatus);
      return;
    }

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
        autoRecommendations,
        track,
        status,
        playTrack,
        playQueue,
        playNext,
        playPrevious,
        setAutoRecommendations,
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

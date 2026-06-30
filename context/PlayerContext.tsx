import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioMetadata,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import {
  addRemoteControlListener,
  configureRemoteControls,
} from "../modules/sonnor-remote-controls";
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

type LoadedPlaybackStatus = {
  didJustFinish: boolean;
  durationMillis?: number;
  isBuffering: boolean;
  isLoaded: true;
  isPlaying: boolean;
  positionMillis: number;
  rate: number;
};

type UnloadedPlaybackStatus = {
  error?: string;
  isLoaded: false;
};

export type PlaybackStatusCompat =
  | LoadedPlaybackStatus
  | UnloadedPlaybackStatus;

type PlayerContextType = {
  autoRecommendations: boolean;
  track: Track | null;
  status: PlaybackStatusCompat | null;
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

type PreparedPlayer = {
  player: AudioPlayer;
  trackId: string;
  uri: string;
};

type ListenerSubscription = {
  remove: () => void;
};

const PlayerContext = createContext<PlayerContextType>({} as PlayerContextType);

function toCompatStatus(nextStatus: AudioStatus): PlaybackStatusCompat {
  if (!nextStatus.isLoaded) {
    return { isLoaded: false };
  }

  return {
    didJustFinish: Boolean(nextStatus.didJustFinish),
    durationMillis:
      nextStatus.duration > 0
        ? Math.round(nextStatus.duration * 1000)
        : undefined,
    isBuffering: Boolean(nextStatus.isBuffering),
    isLoaded: true,
    isPlaying: Boolean(nextStatus.playing),
    positionMillis: Math.max(0, Math.round(nextStatus.currentTime * 1000)),
    rate: nextStatus.playbackRate || 1,
  };
}

function getPlayerStatus(player: AudioPlayer): PlaybackStatusCompat {
  return toCompatStatus(player.currentStatus);
}

function getTrackMetadata(nextTrack: Track): AudioMetadata {
  return {
    albumTitle: nextTrack.folderTitle || undefined,
    artist: nextTrack.artist || "Sonnor",
    artworkUrl: nextTrack.cover || undefined,
    title: nextTrack.title || "Music",
  };
}

function removePlayer(player?: AudioPlayer | null) {
  try {
    player?.clearLockScreenControls();
  } catch {}

  try {
    player?.pause();
  } catch {}

  try {
    player?.remove();
  } catch {}
}

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerSubscriptionRef = useRef<ListenerSubscription | null>(null);
  const preparedPlayerRef = useRef<PreparedPlayer | null>(null);
  const preparePlayerRequestRef = useRef(0);
  const [track, setTrack] = useState<Track | null>(null);
  const trackRef = useRef<Track | null>(null);
  const [status, setStatus] = useState<PlaybackStatusCompat | null>(null);
  const [autoRecommendations, setAutoRecommendationsState] = useState(false);
  const audioModeReadyRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const seekRequestIdRef = useRef(0);
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
  const playPreviousRef = useRef<() => Promise<void>>(async () => {});

  async function ensureAudioMode() {
    if (audioModeReadyRef.current) {
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: "doNotMix",
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: false,
      });
      await setIsAudioActiveAsync(true);
      audioModeReadyRef.current = true;
    } catch (error) {
      console.log("AUDIO MODE ERROR:", error);
    }
  }

  function setCurrentTrack(nextTrack: Track | null) {
    trackRef.current = nextTrack;
    setTrack(nextTrack);
  }

  function detachCurrentPlayer() {
    playerSubscriptionRef.current?.remove();
    playerSubscriptionRef.current = null;
  }

  function attachPlayerStatus(player: AudioPlayer) {
    detachCurrentPlayer();
    playerSubscriptionRef.current = player.addListener(
      "playbackStatusUpdate",
      (nextStatus: AudioStatus) => {
        const compatStatus = toCompatStatus(nextStatus);
        setStatus(compatStatus);

        if (
          compatStatus.isLoaded &&
          compatStatus.didJustFinish &&
          !finishHandlingRef.current
        ) {
          finishHandlingRef.current = true;
          void playNextRef.current().finally(() => {
            finishHandlingRef.current = false;
          });
        }
      },
    );
  }

  function activateLockScreen(player: AudioPlayer, nextTrack: Track) {
    try {
      player.setActiveForLockScreen(true, getTrackMetadata(nextTrack), {
        showSeekBackward: false,
        showSeekForward: false,
      });
      player.updateLockScreenMetadata(getTrackMetadata(nextTrack));
      configureRemoteControls();
    } catch (error) {
      console.log("LOCK SCREEN ERROR:", error);
    }
  }

  useEffect(() => {
    void ensureAudioMode();

    const nextSubscription = addRemoteControlListener("onRemoteNext", () => {
      void playNextRef.current();
    });
    const previousSubscription = addRemoteControlListener("onRemotePrevious", () => {
      void playPreviousRef.current();
    });

    return () => {
      nextSubscription.remove();
      previousSubscription.remove();
      detachCurrentPlayer();
      removePlayer(playerRef.current);
      removePlayer(preparedPlayerRef.current?.player);
      playerRef.current = null;
      preparedPlayerRef.current = null;
    };
  }, []);

  async function preparePlayer(nextTrack?: Track) {
    if (!nextTrack?.uri.trim()) {
      return;
    }

    if (!(await canPlayAlbumTrack(nextTrack.albumId))) {
      return;
    }

    if (
      preparedPlayerRef.current?.trackId === nextTrack.id &&
      preparedPlayerRef.current.uri === nextTrack.uri
    ) {
      return;
    }

    const requestId = preparePlayerRequestRef.current + 1;
    preparePlayerRequestRef.current = requestId;
    await ensureAudioMode();

    const player = createAudioPlayer(
      { uri: nextTrack.uri },
      { keepAudioSessionActive: true, updateInterval: 250 },
    );
    player.volume = 1;

    if (preparePlayerRequestRef.current !== requestId) {
      removePlayer(player);
      return;
    }

    const previousPreparedPlayer = preparedPlayerRef.current?.player;
    preparedPlayerRef.current = {
      player,
      trackId: nextTrack.id,
      uri: nextTrack.uri,
    };
    removePlayer(previousPreparedPlayer);
  }

  function prepareFollowingTrack() {
    const nextQueuedTrack = queueRef.current[queueIndexRef.current + 1];

    if (nextQueuedTrack) {
      void preparePlayer(nextQueuedTrack).catch(() => null);
      return;
    }

    void prepareRecommendations(recommendationGenreRef.current ?? trackRef.current?.genre)
      .then((tracks) => preparePlayer(tracks[0]))
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

    if (trackRef.current?.id === newTrack.id && playerRef.current) {
      await playerRef.current.seekTo(0, 0, 0);
      playerRef.current.play();
      activateLockScreen(playerRef.current, newTrack);
      setStatus(getPlayerStatus(playerRef.current));
      return;
    }

    setCurrentTrack(newTrack);
    setStatus(null);
    await ensureAudioMode();

    const previousPlayer = playerRef.current;
    detachCurrentPlayer();
    playerRef.current = null;

    const preparedPlayer =
      preparedPlayerRef.current?.trackId === newTrack.id &&
      preparedPlayerRef.current.uri === newTrack.uri
        ? preparedPlayerRef.current.player
        : null;
    let player: AudioPlayer;

    if (preparedPlayer) {
      preparedPlayerRef.current = null;
      player = preparedPlayer;
    } else {
      player = createAudioPlayer(
        { uri: newTrack.uri },
        { keepAudioSessionActive: true, updateInterval: 250 },
      );
    }

    player.volume = 1;
    if (playRequestIdRef.current !== requestId) {
      removePlayer(player);
      return;
    }

    removePlayer(previousPlayer);
    playerRef.current = player;
    activateLockScreen(player, newTrack);
    attachPlayerStatus(player);
    player.play();
    setStatus(getPlayerStatus(player));

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
    if (playerRef.current) {
      const currentStatus = getPlayerStatus(playerRef.current);

      if (currentStatus.isLoaded && currentStatus.positionMillis > 5000) {
        await playerRef.current.seekTo(0, 0, 0);
        setStatus(getPlayerStatus(playerRef.current));
        return;
      }
    }

    if (historyIndexRef.current <= 0) {
      if (playerRef.current) {
        await playerRef.current.seekTo(0, 0, 0);
        setStatus(getPlayerStatus(playerRef.current));
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

  playPreviousRef.current = playPrevious;

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
        recommendationGenreRef.current ?? trackRef.current?.genre,
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
    if (!playerRef.current) return;

    const currentStatus = getPlayerStatus(playerRef.current);

    if (!currentStatus.isLoaded) return;

    const finishedTrack =
      currentStatus.didJustFinish ||
      queueEndedRef.current ||
      (typeof currentStatus.durationMillis === "number" &&
        currentStatus.durationMillis > 0 &&
        currentStatus.positionMillis >= currentStatus.durationMillis - 350);

    if (!currentStatus.isPlaying && finishedTrack) {
      if (queueRef.current.length > 0) {
        await playQueuedTrack(0);
        return;
      }

      await playerRef.current.seekTo(0, 0, 0);
      playerRef.current.play();
      queueEndedRef.current = false;
      setStatus(getPlayerStatus(playerRef.current));
      return;
    }

    if (currentStatus.isPlaying) {
      const player = playerRef.current;
      const startVolume = player.volume;
      for (let step = 4; step >= 0; step -= 1) {
        if (playerRef.current !== player) {
          return;
        }
        player.volume = (startVolume * step) / 4;
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      player.pause();
      player.volume = startVolume;
    } else {
      await setIsAudioActiveAsync(true);
      playerRef.current.play();
    }

    setStatus(getPlayerStatus(playerRef.current));
  };

  const seek = async (millis: number) => {
    if (!playerRef.current) return;

    const requestId = seekRequestIdRef.current + 1;
    seekRequestIdRef.current = requestId;
    const seconds = Math.max(0, millis / 1000);
    const currentStatus = getPlayerStatus(playerRef.current);

    if (currentStatus.isLoaded) {
      setStatus({
        ...currentStatus,
        didJustFinish: false,
        positionMillis: Math.round(seconds * 1000),
      });
    }

    await playerRef.current.seekTo(seconds, 0, 0);

    if (seekRequestIdRef.current === requestId) {
      setStatus(getPlayerStatus(playerRef.current));
    }
  };

  const stop = async () => {
    if (!playerRef.current) return;

    playRequestIdRef.current += 1;
    preparePlayerRequestRef.current += 1;
    detachCurrentPlayer();

    const currentPlayer = playerRef.current;
    const preparedPlayer = preparedPlayerRef.current?.player;
    playerRef.current = null;
    preparedPlayerRef.current = null;

    removePlayer(currentPlayer);
    removePlayer(preparedPlayer);

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
    setCurrentTrack(null);
    setStatus(null);
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

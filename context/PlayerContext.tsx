import { Audio, AVPlaybackStatus } from "expo-av";
import React, { createContext, useContext, useRef, useState } from "react";

type Track = {
  id: string;
  uri: string;
  title?: string;
  artist?: string;
};

type PlayerContextType = {
  track: Track | null;
  status: AVPlaybackStatus | null;
  playTrack: (track: Track) => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (millis: number) => Promise<void>;
};

const PlayerContext = createContext<PlayerContextType>({} as PlayerContextType);

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  async function playTrack(newTrack: Track) {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: newTrack.uri },
      { shouldPlay: true, progressUpdateIntervalMillis: 500 },
      (s) => setStatus(s),
    );

    soundRef.current = sound;
    setTrack(newTrack);
  }

  const togglePlay = async () => {
    if (!soundRef.current) return;
    const s = await soundRef.current.getStatusAsync();

    if (!s.isLoaded) return;

    if (s.isPlaying) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  };

  const seek = async (millis: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(millis);
  };

  return (
    <PlayerContext.Provider
      value={{ track, status, playTrack, togglePlay, seek }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);

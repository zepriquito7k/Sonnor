import AppScreen from "../../../components/AppScreen";
import { usePlayer } from "../../../context/PlayerContext";

export default function FullPlayerScreen() {
  const { track, status } = usePlayer();
  const isLoaded = status?.isLoaded === true;

  return (
    <AppScreen
      title="Full Player"
      subtitle="Full music playback screen opened from the mini player."
      actions={[
        { label: "Play", icon: "play-circle-outline" },
        { label: "Like", icon: "heart-outline" },
        { label: "Share", icon: "share-outline" },
      ]}
      sections={[
        {
          title: "Playback",
          description: "Main controls for current track playback.",
          items: [
            track?.title ?? "No track selected",
            track?.artist ?? "No artist selected",
            isLoaded ? "Audio loaded" : "Waiting for Firebase track audio",
          ],
        },
        {
          title: "Shortcuts",
          description: "Player links for deeper music context.",
          items: ["queue", "lyrics", "credits", "related tracks"],
        },
      ]}
    />
  );
}

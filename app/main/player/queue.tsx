import AppScreen from "../../../components/AppScreen";

export default function PlayerQueueScreen() {
  return (
    <AppScreen
      title="Queue"
      subtitle="Upcoming tracks, current playback order and recently played songs."
      sections={[
        {
          title: "Now playing",
          description: "The active track and its source.",
          items: ["trackId", "albumId", "source", "startedAt"],
        },
        {
          title: "Next tracks",
          description: "Tracks that will play next.",
          items: ["reorder", "remove from queue", "play next"],
        },
      ]}
    />
  );
}

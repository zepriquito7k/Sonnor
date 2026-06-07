import AppScreen from "../../components/AppScreen";

export default function SettingsScreen() {
  return (
    <AppScreen
      title="Settings"
      subtitle="Account, privacy, notifications, language, theme, playback and help."
      sections={[
        {
          title: "Settings groups",
          description: "Top-level settings prepared for real account controls.",
          items: ["account", "privacy", "notifications", "language", "theme", "playback", "storage"],
        },
      ]}
    />
  );
}

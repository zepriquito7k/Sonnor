import AppScreen from "../../../components/AppScreen";

export default function LyricsScreen() {
  return (
    <AppScreen
      title="Lyrics"
      subtitle="Lyrics view for the selected track."
      sections={[
        {
          title: "Lyrics data",
          description: "Can support plain lyrics first and synced lyrics later.",
          items: ["lyrics", "synced lines", "language", "credits"],
        },
      ]}
    />
  );
}

import AppScreen from "../../../components/AppScreen";

export default function EditTracksScreen() {
  return (
    <AppScreen
      title="Edit Tracks"
      subtitle="Manage uploaded tracks and their metadata."
      sections={[
        {
          title: "Track controls",
          description: "Edit song data without changing account type.",
          items: ["title", "audio file", "cover image", "lyrics", "status"],
        },
      ]}
    />
  );
}

import AppScreen from "../../../components/AppScreen";

export default function RelatedTracksScreen() {
  return (
    <AppScreen
      title="Related Tracks"
      subtitle="Tracks suggested from the current song, artist, genre or user history."
      sections={[
        {
          title: "Recommendation signals",
          description: "Prepared for future personalized recommendations.",
          items: ["genre", "artist", "recent plays", "liked tracks"],
        },
      ]}
    />
  );
}

import AppScreen from "../../../components/AppScreen";

export default function PlayerCreditsScreen() {
  return (
    <AppScreen
      title="Credits"
      subtitle="People and teams behind the track."
      sections={[
        {
          title: "Music credits",
          description: "Production, writing, mixing and visual direction.",
          items: ["producer", "writer", "mixing", "mastering", "visual team"],
        },
      ]}
    />
  );
}

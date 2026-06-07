import AppScreen from "../../../components/AppScreen";

export default function PrivacySettingsScreen() {
  return (
    <AppScreen
      title="Privacy"
      subtitle="Profile visibility, messages, follows and data controls."
      sections={[
        {
          title: "Firestore-ready privacy flags",
          description: "These fields can live under users/{uid}/settings/privacy later.",
          items: ["public profile", "allow messages", "allow follows", "show listening activity", "blocked users"],
        },
      ]}
    />
  );
}

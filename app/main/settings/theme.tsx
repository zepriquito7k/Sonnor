import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { updateUserSettings } from "../../../firebase/settingsClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function ThemeSettingsScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Theme"
      subtitle="Visual appearance options."
      submitLabel="Save theme"
      fields={[
        { key: "mode", label: "Mode", defaultValue: "dark" },
        { key: "accent", label: "Accent", defaultValue: "white" },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        await updateUserSettings(user.uid, "theme", values);
      }}
    />
  );
}

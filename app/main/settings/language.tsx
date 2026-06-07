import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { updateUserSettings } from "../../../firebase/settingsClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function LanguageSettingsScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Language"
      subtitle="App language and regional formatting."
      submitLabel="Save language"
      fields={[
        { key: "language", label: "Language", defaultValue: "pt" },
        { key: "region", label: "Region", defaultValue: "PT" },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        await updateUserSettings(user.uid, "language", values);
      }}
    />
  );
}

import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { updateUserSettings } from "../../../firebase/settingsClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function PlaybackSettingsScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Playback"
      subtitle="Audio quality, autoplay and explicit content controls."
      submitLabel="Save playback"
      fields={[
        { key: "audioQuality", label: "Audio quality", defaultValue: "auto" },
        { key: "autoplay", label: "Autoplay", defaultValue: "on" },
        { key: "explicitContent", label: "Explicit content", defaultValue: "on" },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        await updateUserSettings(user.uid, "playback", values);
      }}
    />
  );
}

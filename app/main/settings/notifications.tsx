import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { updateUserSettings } from "../../../firebase/settingsClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function NotificationSettingsScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Notifications"
      subtitle="Push and in-app notification preferences."
      submitLabel="Save notifications"
      fields={[
        { key: "likes", label: "Likes", defaultValue: "on" },
        { key: "comments", label: "Comments", defaultValue: "on" },
        { key: "followers", label: "Followers", defaultValue: "on" },
        { key: "newReleases", label: "New releases", defaultValue: "on" },
        { key: "system", label: "System notices", defaultValue: "on" },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        await updateUserSettings(user.uid, "notifications", values);
      }}
    />
  );
}

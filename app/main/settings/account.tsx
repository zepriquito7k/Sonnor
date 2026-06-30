import AppScreen from "../../../components/AppScreen";
import { auth } from "../../../firebase/config";

export default function AccountSettingsScreen() {
  const email = auth.currentUser?.email ?? "No signed-in email";

  return (
    <AppScreen
      title="Account"
      subtitle="Email, password, phone and account deletion."
      sections={[
        {
          title: "Sign-in details",
          description: "Manage your email, password, and account security.",
          items: [email, "Password reset uses a secure email code", "Account deletion requires confirmation"],
        },
      ]}
    />
  );
}

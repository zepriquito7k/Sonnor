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
          title: "Firebase Auth",
          description: "Sensitive account changes stay in Firebase Auth and Cloud Functions.",
          items: [email, "password reset uses OTP Cloud Function", "delete account requires protected function"],
        },
      ]}
    />
  );
}

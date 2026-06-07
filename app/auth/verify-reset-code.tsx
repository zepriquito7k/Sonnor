import AppScreen from "../../components/AppScreen";

export default function VerifyResetCodeScreen() {
  return (
    <AppScreen
      title="Verify Reset Code"
      subtitle="Screen reserved for confirming the password reset code before creating a new password."
      sections={[
        {
          title: "Firebase Auth",
          description: "This step will validate the OTP session before password update.",
          items: ["email", "otp code", "reset token"],
        },
      ]}
    />
  );
}

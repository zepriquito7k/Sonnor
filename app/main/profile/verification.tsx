import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { createVerificationRequest } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function VerificationScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Verification Badge"
      subtitle="Request or display verified status without changing account type."
      submitLabel="Send request"
      fields={[
        { key: "legalName", label: "Legal name" },
        { key: "proofLinks", label: "Proof links", placeholder: "https://..., https://..." },
        { key: "message", label: "Message", multiline: true },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        await createVerificationRequest({
          userId: user.uid,
          legalName: values.legalName.trim(),
          proofLinks: values.proofLinks.split(",").map((item) => item.trim()).filter(Boolean),
          message: values.message.trim(),
        });
      }}
    />
  );
}

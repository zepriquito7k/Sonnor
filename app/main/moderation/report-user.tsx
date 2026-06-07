import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { createReport } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function ReportUserScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Report User"
      subtitle="Report a user profile or behavior."
      submitLabel="Send user report"
      fields={[
        { key: "targetId", label: "Reported user ID" },
        { key: "reason", label: "Reason" },
        { key: "details", label: "Details / evidence", multiline: true },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        await createReport({
          reporterId: user.uid,
          targetType: "user",
          targetId: values.targetId.trim(),
          reason: values.reason.trim(),
          details: values.details.trim(),
        });
      }}
    />
  );
}

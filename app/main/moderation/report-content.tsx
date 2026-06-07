import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { createReport } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function ReportContentScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Report Content"
      subtitle="Report posts, tracks, albums or comments."
      submitLabel="Send report"
      fields={[
        { key: "targetType", label: "Target type", placeholder: "post, track, album or comment" },
        { key: "targetId", label: "Target ID" },
        { key: "reason", label: "Reason" },
        { key: "details", label: "Details", multiline: true },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        const targetType = values.targetType.trim().toLowerCase();

        await createReport({
          reporterId: user.uid,
          targetType:
            targetType === "track" ||
            targetType === "album" ||
            targetType === "comment"
              ? targetType
              : "post",
          targetId: values.targetId.trim(),
          reason: values.reason.trim(),
          details: values.details.trim(),
        });
      }}
    />
  );
}

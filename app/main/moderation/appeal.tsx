import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { createReport } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function AppealRemovedContentScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Appeal Removed Content"
      subtitle="Appeal a moderation action."
      submitLabel="Send appeal"
      fields={[
        { key: "targetType", label: "Target type", placeholder: "post, track, album or comment" },
        { key: "targetId", label: "Target ID" },
        { key: "message", label: "Message", multiline: true },
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
          reason: "appeal",
          details: values.message.trim(),
        });
      }}
    />
  );
}

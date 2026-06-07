import AppScreen from "../../../components/AppScreen";
import { getMessageThreads } from "../../../firebase/messagesClient";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useCallback, useMemo } from "react";

export default function InboxScreen() {
  const { user } = useCurrentUser();
  const fallback = useMemo(() => [], []);
  const loadThreads = useCallback(() => getMessageThreads(user?.uid), [user?.uid]);
  const { data } = useAsyncData(loadThreads, fallback);

  return (
    <AppScreen
      title="Inbox"
      subtitle="Conversation list for the signed-in user."
      sections={[
        {
          title: "Threads",
          description: "Firestore messageThreads filtered by participant.",
          items: data.length > 0 ? data.map((thread) => thread.id) : ["No threads yet"],
        },
      ]}
    />
  );
}

import AppScreen from "../../components/AppScreen";
import { getMessageThreads } from "../../firebase/messagesClient";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useCallback, useMemo } from "react";

export default function MessagesScreen() {
  const { user } = useCurrentUser();
  const fallback = useMemo(() => [], []);
  const loadThreads = useCallback(() => getMessageThreads(user?.uid), [user?.uid]);
  const { data } = useAsyncData(loadThreads, fallback);

  return (
    <AppScreen
      title="Messages"
      subtitle="Inbox, chats, message requests and shared tracks or posts."
      sections={[
        {
          title: "Messaging",
          description: "Prepared for private conversations between users.",
          items: data.length > 0 ? data.map((thread) => thread.id) : ["inbox", "chat", "requests", "shared tracks/posts"],
        },
      ]}
    />
  );
}

import AppScreen from "../../components/AppScreen";
import { getNotifications } from "../../firebase/socialClient";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useCallback, useMemo } from "react";

export default function NotificationsScreen() {
  const { user } = useCurrentUser();
  const fallback = useMemo(() => [], []);
  const loadNotifications = useCallback(() => getNotifications(user?.uid), [user?.uid]);
  const { data } = useAsyncData(loadNotifications, fallback);

  return (
    <AppScreen
      title="Notifications"
      subtitle="Likes, comments, followers, mentions, releases and system notices."
      sections={[
        {
          title: "Notification feed",
          description: "Unread and recent notifications for the signed-in user.",
          items:
            data.length > 0
              ? data.map((item) => {
                  const title = typeof item.title === "string" ? item.title : "Notificação";
                  const body = typeof item.body === "string" ? item.body : "";
                  return body ? `${title} — ${body}` : title;
                })
              : ["Ainda não tens notificações."],
        },
      ]}
    />
  );
}

import AppScreen from "../../components/AppScreen";
import { getAdminOverview } from "../../firebase/socialClient";
import { useAsyncData } from "../../hooks/useAsyncData";

export default function AdminDashboardScreen() {
  const { data } = useAsyncData(getAdminOverview, {
    usersCount: 1,
    postsCount: 0,
    tracksCount: 0,
    albumsCount: 0,
    reportsCount: 0,
    verificationRequestsCount: 0,
  });

  return (
    <AppScreen
      title="Dashboard"
      subtitle="Admin overview for moderation and platform activity."
      sections={[
        {
          title: "Platform overview",
          description: "Live counts from Firestore when available.",
          items: [
            `${data.usersCount} users`,
            `${data.tracksCount} tracks`,
            `${data.albumsCount} releases`,
            `${data.postsCount} posts`,
            `${data.reportsCount} reports`,
            `${data.verificationRequestsCount} verification requests`,
          ],
        },
      ]}
    />
  );
}

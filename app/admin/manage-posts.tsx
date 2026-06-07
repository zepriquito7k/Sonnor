import AppScreen from "../../components/AppScreen";
import { listAdminPosts } from "../../firebase/adminClient";
import { useAsyncData } from "../../hooks/useAsyncData";

export default function ManagePostsScreen() {
  const { data } = useAsyncData(listAdminPosts, ["No posts loaded"]);

  return (
    <AppScreen
      title="Manage Posts"
      subtitle="Review posts and hidden content."
      sections={[
        {
          title: "Posts",
          description: "Client-side Firestore list for review.",
          items: data,
        },
      ]}
    />
  );
}

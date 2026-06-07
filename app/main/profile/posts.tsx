import AppScreen from "../../../components/AppScreen";
import { getProfileContent } from "../../../firebase/contentClient";
import { defaultUser } from "../../../firebase/defaultContent";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useCallback } from "react";

export default function UserPostsScreen() {
  const { user } = useCurrentUser();
  const loadProfile = useCallback(() => getProfileContent(user?.uid), [user?.uid]);
  const { data } = useAsyncData(loadProfile, {
    user: defaultUser,
    tracks: [],
    albums: [],
    posts: [],
  });

  return (
    <AppScreen
      title="User Posts"
      subtitle="Public image and video posts."
      sections={[
        {
          title: "Post grid",
          description: "Posts filtered by userId and status.",
          items:
            data.posts.length > 0
              ? data.posts.map((post) =>
                  "caption" in post && typeof post.caption === "string"
                    ? post.caption
                    : post.id,
                )
              : ["published posts", "linked tracks", "saved count"],
        },
      ]}
    />
  );
}

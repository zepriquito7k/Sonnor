import AppScreen from "../../../components/AppScreen";
import { getProfileContent } from "../../../firebase/contentClient";
import { defaultUser } from "../../../firebase/defaultContent";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useCallback } from "react";

export default function UserAlbumsScreen() {
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
      title="User Albums"
      subtitle="Public releases created by this user."
      sections={[
        {
          title: "Release grid",
          description: "Albums, singles and EPs filtered by userId.",
          items:
            data.albums.length > 0
              ? data.albums.map((album) =>
                  "title" in album && typeof album.title === "string"
                    ? album.title
                    : album.id,
                )
              : ["albums", "singles", "eps"],
        },
      ]}
    />
  );
}

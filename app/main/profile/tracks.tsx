import AppScreen from "../../../components/AppScreen";
import { getProfileContent } from "../../../firebase/contentClient";
import { defaultUser } from "../../../firebase/defaultContent";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useCallback } from "react";

export default function UserTracksScreen() {
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
      title="User Tracks"
      subtitle="Public tracks created by this user."
      sections={[
        {
          title: "Track list",
          description: "Tracks filtered by userId and publication status.",
          items:
            data.tracks.length > 0
              ? data.tracks.map((track) =>
                  "title" in track && typeof track.title === "string"
                    ? track.title
                    : track.id,
                )
              : ["published tracks", "plays", "likes"],
        },
      ]}
    />
  );
}

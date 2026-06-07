import AppScreen from "../../../components/AppScreen";

export default function FollowingScreen() {
  return (
    <AppScreen
      title="Following"
      subtitle="Profiles followed by this user."
      sections={[
        {
          title: "Following list",
          description: "People and creators this user follows.",
          items: ["followingId", "followedAt", "displayName", "avatarUrl"],
        },
      ]}
    />
  );
}

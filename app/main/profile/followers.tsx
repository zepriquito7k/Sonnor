import AppScreen from "../../../components/AppScreen";

export default function FollowersScreen() {
  return (
    <AppScreen
      title="Followers"
      subtitle="Users following this profile."
      sections={[
        {
          title: "Follower list",
          description: "Backed by follows and users collections.",
          items: ["followerId", "followedAt", "displayName", "avatarUrl"],
        },
      ]}
    />
  );
}

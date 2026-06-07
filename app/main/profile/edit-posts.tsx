import AppScreen from "../../../components/AppScreen";

export default function EditPostsScreen() {
  return (
    <AppScreen
      title="Edit Posts"
      subtitle="Manage user posts and linked releases."
      sections={[
        {
          title: "Post controls",
          description: "Edit captions, remove posts and update linked music.",
          items: ["caption", "post image/video", "linkedTrackId", "linkedAlbumId", "status"],
        },
      ]}
    />
  );
}

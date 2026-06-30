import { Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";

import AppScreen from "../../../components/AppScreen";
import { useSuccessFeedback } from "../../../components/SuccessFeedback";
import { createComment, createLike } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useCurrentUser();
  const { showSuccess } = useSuccessFeedback();
  const postId = id ?? "unknown-post";

  return (
    <AppScreen
      title="Post Detail"
      subtitle="Detailed view for image or video posts."
      actions={[
        {
          label: "Like",
          icon: "heart-outline",
          onPress: async () => {
            if (!user) {
              Alert.alert("Login required", "Sign in to like posts.");
              return;
            }

            await createLike(user.uid, "post", postId);
            showSuccess({ message: "Guardado" });
          },
        },
        {
          label: "Comment",
          icon: "chatbubble-outline",
          onPress: async () => {
            if (!user) {
              Alert.alert("Login required", "Sign in to comment.");
              return;
            }

            await createComment(user.uid, "post", postId, "Default comment");
            showSuccess({ message: "Guardado" });
          },
        },
      ]}
      sections={[
        {
          title: "Post content",
          description: "Media, caption and linked music context.",
          items: [postId, "media", "caption", "linkedTrackId", "linkedAlbumId"],
        },
        {
          title: "Social",
          description: "User interactions on the post.",
          items: ["likes", "comments", "share", "report"],
        },
      ]}
    />
  );
}

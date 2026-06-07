import { Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";

import AppScreen from "../../../components/AppScreen";
import { createComment, createLike } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useCurrentUser();
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
              Alert.alert("Login necessario", "Entra para gostar de posts.");
              return;
            }

            await createLike(user.uid, "post", postId);
            Alert.alert("Guardado", "Like registado no Firestore.");
          },
        },
        {
          label: "Comment",
          icon: "chatbubble-outline",
          onPress: async () => {
            if (!user) {
              Alert.alert("Login necessario", "Entra para comentar.");
              return;
            }

            await createComment(user.uid, "post", postId, "Default comment");
            Alert.alert("Guardado", "Comentario default criado no Firestore.");
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

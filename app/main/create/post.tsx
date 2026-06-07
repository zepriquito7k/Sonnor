import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { createPost, updatePostMedia } from "../../../firebase/contentMutations";
import { uploadUriToStorage } from "../../../firebase/storageClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function CreatePostScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Create Post"
      subtitle="Publish image or video content and optionally link it to a track or album."
      submitLabel="Save post draft"
      fields={[
        { key: "caption", label: "Caption", multiline: true },
        { key: "mediaType", label: "Media type", placeholder: "image or video" },
        { key: "mediaImage", label: "Post image", type: "image" },
        { key: "category", label: "Category" },
        { key: "linkedTrackId", label: "Linked track ID" },
        { key: "linkedAlbumId", label: "Linked album ID" },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        const postId = await createPost({
          userId: user.uid,
          caption: values.caption.trim(),
          mediaUrl: "",
          mediaType: values.mediaType.trim().toLowerCase() === "video" ? "video" : "image",
          thumbnailUrl: "",
          category: values.category.trim(),
          linkedTrackId: values.linkedTrackId.trim(),
          linkedAlbumId: values.linkedAlbumId.trim(),
          status: "draft",
        });

        if (values.mediaImage) {
          const media = await uploadUriToStorage(
            { kind: "postMedia", postId, extension: "jpg" },
            values.mediaImage,
          );

          await updatePostMedia(postId, {
            mediaUrl: media.downloadUrl,
            thumbnailUrl: media.downloadUrl,
          });
        }
      }}
    />
  );
}

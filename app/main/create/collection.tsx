import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import {
  createCollection,
  updateCollectionCover,
} from "../../../firebase/contentMutations";
import { uploadUriToStorage } from "../../../firebase/storageClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function CreateCollectionScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Create Collection"
      subtitle="Curated group of tracks, posts or releases."
      submitLabel="Save collection"
      fields={[
        { key: "name", label: "Name" },
        { key: "coverImage", label: "Cover image", type: "image" },
        { key: "description", label: "Description", multiline: true },
        { key: "trackIds", label: "Track IDs", placeholder: "id1, id2" },
        { key: "postIds", label: "Post IDs", placeholder: "id1, id2" },
        { key: "albumIds", label: "Album IDs", placeholder: "id1, id2" },
      ]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        const parseIds = (value: string) =>
          value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

        const collectionId = await createCollection({
          userId: user.uid,
          name: values.name.trim() || "Untitled collection",
          coverUrl: "",
          description: values.description.trim(),
          trackIds: parseIds(values.trackIds),
          postIds: parseIds(values.postIds),
          albumIds: parseIds(values.albumIds),
          isPublic: true,
        });

        if (values.coverImage) {
          const cover = await uploadUriToStorage(
            {
              kind: "temp",
              userId: user.uid,
              uploadId: `collection-${collectionId}`,
            },
            values.coverImage,
          );

          await updateCollectionCover(collectionId, cover.downloadUrl);
        }
      }}
    />
  );
}

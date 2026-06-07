import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { uploadUriToStorage } from "../../../firebase/storageClient";
import { updateUserProfile } from "../../../firebase/userProfile";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function EditBackgroundScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Edit Background"
      subtitle="Optional profile background image."
      submitLabel="Update background"
      fields={[{ key: "backgroundImage", label: "Background image", type: "image" }]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        if (!values.backgroundImage) {
          return;
        }

        const upload = await uploadUriToStorage(
          { kind: "background", userId: user.uid },
          values.backgroundImage,
        );

        await updateUserProfile(user.uid, {
          backgroundUrl: upload.downloadUrl,
        });
      }}
    />
  );
}

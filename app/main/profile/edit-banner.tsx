import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { uploadUriToStorage, withCacheBust } from "../../../firebase/storageClient";
import { updateUserProfile } from "../../../firebase/userProfile";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function EditBannerScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Edit Banner"
      subtitle="Upload or replace the profile banner."
      submitLabel="Update banner"
      fields={[{ key: "bannerImage", label: "Banner image", type: "image" }]}
      onSubmit={async (values) => {
        if (!user) {
          return;
        }

        if (!values.bannerImage) {
          return;
        }

        const upload = await uploadUriToStorage(
          { kind: "banner", userId: user.uid },
          values.bannerImage,
        );

        await updateUserProfile(user.uid, {
          bannerUrl: withCacheBust(upload.downloadUrl),
        });
      }}
    />
  );
}

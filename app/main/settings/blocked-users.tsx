import FirebaseFormScreen from "../../../components/FirebaseFormScreen";
import { blockUser } from "../../../firebase/settingsClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export default function BlockedUsersScreen() {
  const { user } = useCurrentUser();

  return (
    <FirebaseFormScreen
      title="Blocked Users"
      subtitle="Manage users blocked by the signed-in account."
      submitLabel="Block user"
      fields={[{ key: "blockedUserId", label: "User ID to block" }]}
      onSubmit={async (values) => {
        if (!user || !values.blockedUserId.trim()) {
          return;
        }

        await blockUser(user.uid, values.blockedUserId.trim());
      }}
    />
  );
}

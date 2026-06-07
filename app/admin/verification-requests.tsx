import AppScreen from "../../components/AppScreen";
import { listAdminVerificationRequests } from "../../firebase/adminClient";
import { useAsyncData } from "../../hooks/useAsyncData";

export default function VerificationRequestsScreen() {
  const { data } = useAsyncData(listAdminVerificationRequests, [
    "No verification requests loaded",
  ]);

  return (
    <AppScreen
      title="Verification Requests"
      subtitle="Review badge requests."
      sections={[
        {
          title: "Requests",
          description: "Client-side Firestore list of badge requests.",
          items: data,
        },
      ]}
    />
  );
}

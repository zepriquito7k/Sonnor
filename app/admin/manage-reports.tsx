import AppScreen from "../../components/AppScreen";
import { listAdminReports } from "../../firebase/adminClient";
import { useAsyncData } from "../../hooks/useAsyncData";

export default function ManageReportsScreen() {
  const { data } = useAsyncData(listAdminReports, ["Loading reports..."]);

  return (
    <AppScreen
      title="Manage Reports"
      subtitle="Review open, dismissed and actioned reports."
      sections={[
        {
          title: "Reports queue",
          description: "Real reports from Firestore for review.",
          items: data,
        },
      ]}
    />
  );
}

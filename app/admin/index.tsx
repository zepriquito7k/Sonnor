import AppScreen from "../../components/AppScreen";
import { sonnorScreenTree } from "../../constants/screenTree";

export default function AdminIndexScreen() {
  const adminTree = sonnorScreenTree.find((group) => group.title === "Admin");

  return (
    <AppScreen
      title="Admin"
      subtitle="Internal moderation and featured content area."
      actions={[
        {
          label: "Revisao de musicas",
          icon: "musical-notes-outline",
          route: "/admin/music-reviews",
        },
        {
          label: "Dashboard",
          icon: "grid-outline",
          route: "/admin/dashboard",
        },
        {
          label: "Reports",
          icon: "flag-outline",
          route: "/admin/manage-reports",
        },
        {
          label: "Pedidos",
          icon: "file-tray-full-outline",
          route: "/admin/user-requests",
        },
        {
          label: "Utilizadores",
          icon: "people-outline",
          route: "/admin/manage-users",
        },
      ]}
      sections={[
        {
          title: "Admin modules",
          description: "Reserved for trusted accounts with admin permission.",
          items:
            adminTree?.children?.map((item) => `${item.title}: ${item.route}`) ??
            ["dashboard", "reports", "users", "releases", "posts", "verification", "featured content"],
        },
      ]}
    />
  );
}

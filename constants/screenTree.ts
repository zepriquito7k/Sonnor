export type ScreenTreeNode = {
  title: string;
  route?: string;
  firebase?: string[];
  children?: ScreenTreeNode[];
};

export const sonnorScreenTree: ScreenTreeNode[] = [
  {
    title: "Entrada",
    children: [
      { title: "Landing", route: "/" },
      { title: "Login", route: "/auth/login", firebase: ["auth", "users"] },
      { title: "Criar conta", route: "/auth/new-account", firebase: ["auth", "users"] },
      { title: "Recuperar password", route: "/auth/forgot-password", firebase: ["functions"] },
      { title: "Criar perfil", route: "/onboarding/create-profile", firebase: ["users", "storage/users"] },
    ],
  },
  {
    title: "App Principal",
    children: [
      { title: "Home", route: "/main/home", firebase: ["tracks", "albums", "posts", "appConfig"] },
      { title: "Pesquisa", route: "/main/search", firebase: ["users", "tracks", "albums", "posts"] },
      { title: "Biblioteca", route: "/main/library", firebase: ["likes", "playlists", "recentPlays"] },
      { title: "Perfil", route: "/main/profile", firebase: ["users", "tracks", "albums", "posts", "follows"] },
      { title: "Criar", route: "/main/create/track", firebase: ["tracks", "albums", "posts", "storage"] },
      { title: "Player", route: "/main/player/full", firebase: ["tracks", "recentPlays"] },
      { title: "Mensagens", route: "/main/messages", firebase: ["messageThreads", "messages", "storage/messages"] },
      { title: "Notificacoes", route: "/main/notifications", firebase: ["notifications"] },
      { title: "Definicoes", route: "/main/settings", firebase: ["users", "appConfig"] },
      { title: "Moderacao", route: "/main/moderation/report-content", firebase: ["reports"] },
    ],
  },
  {
    title: "Admin",
    children: [
      { title: "Dashboard", route: "/admin/dashboard", firebase: ["appConfig", "reports"] },
      { title: "Utilizadores", route: "/admin/manage-users", firebase: ["users"] },
      { title: "Posts", route: "/admin/manage-posts", firebase: ["posts", "reports"] },
      { title: "Pedidos", route: "/admin/user-requests", firebase: ["profileRequests"] },
      { title: "Revisao de musicas", route: "/admin/music-reviews", firebase: ["musicSubmissions"] },
      { title: "Lancamentos", route: "/admin/manage-releases", firebase: ["tracks", "albums"] },
      { title: "Verificacoes", route: "/admin/verification-requests", firebase: ["verificationRequests"] },
      { title: "Destaques", route: "/admin/featured-content", firebase: ["appConfig"] },
    ],
  },
];

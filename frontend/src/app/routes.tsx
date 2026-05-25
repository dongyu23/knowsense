import { Navigate } from "react-router";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/AuthPage";
import { ManualsPage } from "./pages/ManualsPage";
import { ManualDetailPage } from "./pages/ManualDetailPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShowcasePage } from "./pages/ShowcasePage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      { index: true, Component: ManualsPage },
      { path: "manuals/:id", Component: ManualDetailPage },
      { path: "chat", Component: ChatPage },
      { path: "chat/:id", Component: ChatPage },
      { path: "settings", Component: SettingsPage },
      { path: "settings/:tab", Component: SettingsPage },
    ],
  },
  {
    path: "/showcase",
    Component: ShowcasePage,
  },
  {
    path: "/auth",
    element: (
      <GuestGuard>
        <AuthPage />
      </GuestGuard>
    ),
  },
]);

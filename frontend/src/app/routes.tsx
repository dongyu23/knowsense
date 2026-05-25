import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/AuthPage";
import { ManualsPage } from "./pages/ManualsPage";
import { ManualDetailPage } from "./pages/ManualDetailPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShowcasePage } from "./pages/ShowcasePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
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
    Component: AuthPage,
  },
]);

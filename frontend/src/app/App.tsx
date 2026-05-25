import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <RouterProvider router={router} />
      <Toaster position="top-right" theme="dark" />
    </div>
  );
}
import React, { useEffect } from "react";
import AppRoutes from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";

const App: React.FC = () => {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken") {
        const publicUrl = (import.meta.env.VITE_PUBLIC_URL || "").replace(/\/$/, "");
        const loginUrl = `${publicUrl}/login`;
        const homeUrl = publicUrl ? `${publicUrl}/` : "/";

        if (e.newValue) {
          // Logged in from another tab: redirect away from login page if open
          if (window.location.pathname.endsWith("/login")) {
            window.location.href = homeUrl;
          }
        } else {
          // Logged out from another tab: redirect to login page
          if (!window.location.pathname.endsWith("/login")) {
            window.location.href = loginUrl;
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <AppRoutes />
    </ThemeProvider>
  );
};

export default App;

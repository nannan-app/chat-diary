import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "./stores/authStore";
import LoginScreen from "./components/auth/LoginScreen";
import SetupScreen from "./components/auth/SetupScreen";
import AppShell from "./components/layout/AppShell";
import QuickCapture from "./components/quick-capture/QuickCapture";

export default function App() {
  const { t } = useTranslation();
  const { isLoggedIn, isFirstTime, loading, checkSetup } = useAuthStore();

  // Quick capture window — render only the input, skip auth
  if (window.location.hash === "#/quick-capture") {
    return <QuickCapture />;
  }

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-warm-50">
        <div className="text-text-hint text-sm">{t("app.loading")}</div>
      </div>
    );
  }

  if (isFirstTime) {
    return <SetupScreen />;
  }

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return <AppShell />;
}

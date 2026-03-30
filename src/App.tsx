import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";
import LoginScreen from "./components/auth/LoginScreen";
import SetupScreen from "./components/auth/SetupScreen";
import AppShell from "./components/layout/AppShell";

export default function App() {
  const { isLoggedIn, isFirstTime, loading, checkSetup } = useAuthStore();

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-warm-50">
        <div className="text-text-hint text-sm">加载中...</div>
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

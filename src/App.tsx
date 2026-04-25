import { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RouteGuard } from "@/components/common/RouteGuard";
import { routes } from "@/routes";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <RouteGuard>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-6">
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-pulse text-primary font-bold">小猫正在努力加载中... 🐾</div></div>}>
                    <Routes>
                      {routes.map((route) => (
                        <Route key={route.path} path={route.path} element={route.element} />
                      ))}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
              <Toaster position="top-center" richColors />
            </RouteGuard>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

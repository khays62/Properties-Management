import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./app/AuthProvider";
import { AppShell } from "./layouts/AppShell";
import { DashboardRoute } from "./features/dashboard/routes/DashboardRoute";
import { LoginPage } from "./pages/LoginPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import {
  AuthenticatedRoute,
  GuestRoute,
  RoleRoute,
} from "./routes";
import { USER_ROLES } from "./types/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response) {
          return error.response.status >= 500 && failureCount < 1;
        }

        return failureCount < 1;
      },
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/dashboard"
              element={
                <AuthenticatedRoute>
                  <RoleRoute allowedRoles={USER_ROLES}>
                    <AppShell>
                      <DashboardRoute />
                    </AppShell>
                  </RoleRoute>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

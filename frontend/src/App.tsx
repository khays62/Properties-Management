import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./app/AuthProvider";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import {
  AuthenticatedRoute,
  GuestRoute,
  RoleRoute,
} from "./routes";
import { USER_ROLES } from "./types/auth";

export default function App() {
  return (
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
          <Route element={<AuthenticatedRoute />}>
            <Route
              index
              element={
                <RoleRoute allowedRoles={USER_ROLES}>
                  <AppShell>{null}</AppShell>
                </RoleRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

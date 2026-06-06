import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";
import { ScrollToTop } from "./components/common/ScrollToTop";

import SignIn from "./pages/AuthPages/SignIn";
import ResetPassword from "./pages/AuthPages/ResetPassword.tsx";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import Dashboard from "./pages/Dashboard/Home";
import PublicRoute from "./components/auth/PublicRoute.tsx";
import ResetPasswordConfirm from "./pages/AuthPages/ResetPasswordConfirm.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

export default function App() {
  return (
      <>
        <Toaster
            position="top-right"
            containerStyle={{
              zIndex: 99999999, // Mayor que z-[9999] del header
            }}
            toastOptions={{
              duration: 3000,
              style: {
                zIndex: 99999999,
              },
              success: {
                style: {
                  zIndex: 99999999,
                },
              },
              error: {
                style: {
                  zIndex: 99999999,
                },
              },
            }}
        />

        <Router>
          <ScrollToTop />

          <Routes>
            {/* RUTAS PÚBLICAS (login) */}
            <Route element={<PublicRoute />}>
              <Route path="/" element={<SignIn />} />
              <Route path="/reset-password" element={<ResetPassword/>} />
              <Route path="/admin/reset-password" element={<ResetPasswordConfirm/>} />

            </Route>

            {/* RUTAS PROTEGIDAS */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />






              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </>
  );
}

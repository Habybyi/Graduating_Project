import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { CustomersPage } from "./pages/CustomersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { DeliveryNotesPage } from "./pages/DeliveryNotesPage";
import { DeliveryNoteDetailPage } from "./pages/DeliveryNoteDetailPage";
import { ScanPage } from "./pages/ScanPage";
import { ProductScanPage } from "./pages/ProductScanPage";
import { ActivityLogPage } from "./pages/ActivityLogPage";

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Public — the session token in the URL is the authorization */}
          <Route path="/scan/:token" element={<ScanPage />} />
          <Route path="/product-scan/:token" element={<ProductScanPage />} />

          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowPendingPasswordChange>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requireRole="manager">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute>
                <ProductDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-log"
            element={
              <ProtectedRoute requireRole="manager">
                <ActivityLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-notes"
            element={
              <ProtectedRoute>
                <DeliveryNotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-notes/:id"
            element={
              <ProtectedRoute>
                <DeliveryNoteDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

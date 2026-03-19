import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ForecastProvider } from "@/contexts/ForecastContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import ProtectedRoute from "@/components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const RosterPage = lazy(() => import("./pages/RosterPage"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const ExtraHoursPage = lazy(() => import("./pages/ExtraHoursPage"));
const ExtraStaffPage = lazy(() => import("./pages/ExtraStaffPage"));
const ForecastPage = lazy(() => import("./pages/ForecastPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const RecognitionPage = lazy(() => import("./pages/RecognitionPage"));
const LeaveRequestsPage = lazy(() => import("./pages/LeaveRequestsPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <SettingsProvider>
          <ForecastProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/roster" element={<ProtectedRoute><RosterPage /></ProtectedRoute>} />
                  <Route path="/staff" element={<ProtectedRoute requiredRole="manager"><StaffPage /></ProtectedRoute>} />
                  <Route path="/extra-hours" element={<ProtectedRoute><ExtraHoursPage /></ProtectedRoute>} />
                  <Route path="/extra-staff" element={<ProtectedRoute requiredRole="manager"><ExtraStaffPage /></ProtectedRoute>} />
                  <Route path="/forecast" element={<ProtectedRoute><ForecastPage /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute requiredRole="manager"><ReportsPage /></ProtectedRoute>} />
                  <Route path="/recognition" element={<ProtectedRoute><RecognitionPage /></ProtectedRoute>} />
                  <Route path="/leave-requests" element={<ProtectedRoute requiredRole="manager"><LeaveRequestsPage /></ProtectedRoute>} />
                  
                  <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ForecastProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

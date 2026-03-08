import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ForecastProvider } from "@/contexts/ForecastContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import RosterPage from "./pages/RosterPage";
import StaffPage from "./pages/StaffPage";
import ExtraHoursPage from "./pages/ExtraHoursPage";
import ExtraStaffPage from "./pages/ExtraStaffPage";
import ForecastPage from "./pages/ForecastPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ForecastProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/roster" element={<ProtectedRoute><RosterPage /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
              <Route path="/extra-hours" element={<ProtectedRoute><ExtraHoursPage /></ProtectedRoute>} />
              <Route path="/extra-staff" element={<ProtectedRoute><ExtraStaffPage /></ProtectedRoute>} />
              <Route path="/forecast" element={<ProtectedRoute><ForecastPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ForecastProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

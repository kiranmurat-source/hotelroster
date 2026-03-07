import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import RosterPage from "./pages/RosterPage";
import StaffPage from "./pages/StaffPage";
import ExtraHoursPage from "./pages/ExtraHoursPage";
import ExtraStaffPage from "./pages/ExtraStaffPage";
import ForecastPage from "./pages/ForecastPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/extra-hours" element={<ExtraHoursPage />} />
          <Route path="/extra-staff" element={<ExtraStaffPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

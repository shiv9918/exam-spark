import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardTeacher from "./pages/DashboardTeacher";
import DashboardStudent from "./pages/DashboardStudent";
import GeneratePaper from "./pages/GeneratePaper";
import SolvePaper from "./pages/SolvePaper";
import ViewSubmissions from "./pages/ViewSubmissions";
import NotFound from "./pages/NotFound";
import PerformanceAnalytics from "./pages/PerformanceAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard-teacher" element={<DashboardTeacher />} />
            <Route path="/dashboard-student" element={<DashboardStudent />} />
            <Route path="/generate-paper" element={<GeneratePaper />} />
            <Route path="/solve-paper/:paperId" element={<SolvePaper />} />
            <Route path="/view-submissions/:paperId" element={<ViewSubmissions />} />
            <Route path="/performance-analytics" element={<PerformanceAnalytics />} />
            <Route path="/performance-analytics/:submissionId" element={<PerformanceAnalytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

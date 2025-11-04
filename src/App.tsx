import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardOverview from "./pages/DashboardOverview";
import AlertasSugerenciasPage from "./pages/AlertasSugerencias";
import CreatorsList from "./pages/CreatorsList";
import Reclutamiento from "./pages/Reclutamiento";
import SupervisionLive from "./pages/SupervisionLive";
import Batallas from "./pages/Batallas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="feedback/*" element={<DashboardOverview />} />
                <Route path="alertas" element={<AlertasSugerenciasPage />} />
                <Route path="creators" element={<CreatorsList />} />
                <Route path="reclutamiento" element={<Reclutamiento />} />
                <Route path="supervision" element={<SupervisionLive />} />
                <Route path="batallas" element={<Batallas />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;

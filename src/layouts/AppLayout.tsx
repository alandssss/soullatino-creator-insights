import { Routes, Route, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DashboardOverview from "@/pages/DashboardOverview";
import NotFound from "@/pages/NotFound";
import logo from "@/assets/logo.png";

const AppLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass-panel sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Soullatino" className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Soullatino Analytics
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard/pending" replace />} />
          <Route path="/dashboard/*" element={<DashboardOverview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

export default AppLayout;

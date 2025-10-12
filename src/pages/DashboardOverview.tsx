import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FeedbackPending from "./FeedbackPending";
import FeedbackHistory from "./FeedbackHistory";
import CreatorsList from "./CreatorsList";

const PATH_TO_TAB = {
  "/dashboard/pending": "pending",
  "/dashboard/history": "history",
  "/dashboard/creators": "creators",
};

const DashboardOverview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const activeTab = PATH_TO_TAB[location.pathname as keyof typeof PATH_TO_TAB] || "pending";

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setUserRole(roleData?.role || null);
  };

  const handleTabChange = (value: string) => {
    navigate(`/dashboard/${value}`);
  };

  const canAccessReclutamiento = userRole === 'admin' || userRole === 'reclutador';
  const canAccessSupervision = userRole === 'admin' || userRole === 'manager' || userRole === 'supervisor';

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Gestión de feedback y creadores</p>
        </div>
        <div className="flex gap-2">
          {canAccessSupervision && (
            <Button
              onClick={() => navigate("/supervision")}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Shield className="h-4 w-4 mr-2" />
              Supervisión Live
            </Button>
          )}
          {canAccessReclutamiento && (
            <Button
              onClick={() => navigate("/reclutamiento")}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Users className="h-4 w-4 mr-2" />
              Reclutamiento
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 glass-panel p-1 rounded-lg">
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:rounded-md data-[state=active]:font-bold data-[state=active]:scale-[1.02] transition-all duration-300 text-muted-foreground hover:text-foreground"
          >
            Creadores que necesitan Feedback
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:rounded-md data-[state=active]:font-bold data-[state=active]:scale-[1.02] transition-all duration-300 text-muted-foreground hover:text-foreground"
          >
            Mi Histórico de Feedback
          </TabsTrigger>
          <TabsTrigger 
            value="creators"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:rounded-md data-[state=active]:font-bold data-[state=active]:scale-[1.02] transition-all duration-300 text-muted-foreground hover:text-foreground"
          >
            Creadores
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-0">
          <FeedbackPending />
        </TabsContent>
        
        <TabsContent value="history" className="mt-0">
          <FeedbackHistory />
        </TabsContent>
        
        <TabsContent value="creators" className="mt-0">
          <CreatorsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardOverview;

import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FeedbackPending from "./FeedbackPending";
import FeedbackHistory from "./FeedbackHistory";

const PATH_TO_TAB = {
  "/dashboard/pending": "pending",
  "/dashboard/history": "history",
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

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-full overflow-x-hidden">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Dashboard de Feedback</h1>
        <p className="text-sm md:text-base text-muted-foreground">Revisa pendientes o consulta tu histórico</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 neo-card p-1 rounded-lg">
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:neo-card-sm data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all px-3 py-2"
          >
            <span className="text-xs sm:text-sm md:text-base">📋 Pendientes</span>
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:neo-card-sm data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all px-3 py-2"
          >
            <span className="text-xs sm:text-sm md:text-base">📊 Histórico</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-0">
          <FeedbackPending />
        </TabsContent>
        
        <TabsContent value="history" className="mt-0">
          <FeedbackHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardOverview;

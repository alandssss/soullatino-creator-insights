import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  
  const activeTab = PATH_TO_TAB[location.pathname as keyof typeof PATH_TO_TAB] || "pending";

  const handleTabChange = (value: string) => {
    navigate(`/dashboard/${value}`);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Gestión de feedback y creadores</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 glass-panel p-1">
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            Creadores que necesitan Feedback
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            Mi Histórico de Feedback
          </TabsTrigger>
          <TabsTrigger 
            value="creators"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
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

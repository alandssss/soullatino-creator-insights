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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Gestión de feedback y creadores</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pending">
            Creadores que necesitan Feedback
          </TabsTrigger>
          <TabsTrigger value="history">
            Mi Histórico de Feedback
          </TabsTrigger>
          <TabsTrigger value="creators">
            Creadores
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <FeedbackPending />
        </TabsContent>
        
        <TabsContent value="history">
          <FeedbackHistory />
        </TabsContent>
        
        <TabsContent value="creators">
          <CreatorsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardOverview;

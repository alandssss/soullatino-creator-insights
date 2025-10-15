import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { History } from "lucide-react";
import { MonthlyFeedbackCalendar } from "@/components/MonthlyFeedbackCalendar";
import { FeedbackImpactChart } from "@/components/FeedbackImpactChart";
import { WorkTimeTracker } from "@/components/WorkTimeTracker";

const FeedbackHistory = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    } else {
      setUser(user);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WorkTimeTracker userEmail={user?.email} />
      
      {/* Hitos de la Agencia */}
      <Card className="neo-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            🎯 Hitos de la Agencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="neo-card-sm p-4 rounded-lg border-l-4 border-green-500/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🥉</span>
                <h3 className="font-semibold text-sm">Bronce</h3>
              </div>
              <p className="text-xs text-muted-foreground">12 días / 40 horas</p>
            </div>
            
            <div className="neo-card-sm p-4 rounded-lg border-l-4 border-blue-500/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🥈</span>
                <h3 className="font-semibold text-sm">Plata</h3>
              </div>
              <p className="text-xs text-muted-foreground">20 días / 60 horas</p>
            </div>
            
            <div className="neo-card-sm p-4 rounded-lg border-l-4 border-yellow-500/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🥇</span>
                <h3 className="font-semibold text-sm">Oro</h3>
              </div>
              <p className="text-xs text-muted-foreground">22 días / 80 horas</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Actividad de Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Visualiza tu actividad de feedback y el impacto en el rendimiento de los creadores
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyFeedbackCalendar />
            <FeedbackImpactChart />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackHistory;

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Activity, MessageSquare, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface WhatsAppActivity {
  id: string;
  creator_id: string;
  user_email: string;
  action_type: string;
  timestamp: string;
  creator_name: string | null;
  message_preview: string | null;
}

export const AdminActivityPanel = () => {
  const [activities, setActivities] = useState<WhatsAppActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
    subscribeToActivities();
  }, []);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("whatsapp_activity")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades",
        variant: "destructive",
      });
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  };

  const subscribeToActivities = () => {
    const channel = supabase
      .channel("whatsapp-activity-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_activity",
        },
        (payload) => {
          const newActivity = payload.new as WhatsAppActivity;
          setActivities((prev) => [newActivity, ...prev].slice(0, 50));
          
          // Mostrar notificación
          toast({
            title: "Nueva actividad",
            description: `${newActivity.user_email} contactó a ${newActivity.creator_name}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "whatsapp_click":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Actividad en Tiempo Real - Panel Admin
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay actividad reciente
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-full bg-primary/10">
                      {getActionIcon(activity.action_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold text-sm">
                          {activity.user_email}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        Contactó a{" "}
                        <span className="font-semibold text-primary">
                          {activity.creator_name || "Creador"}
                        </span>{" "}
                        por WhatsApp
                      </p>
                      {activity.message_preview && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          "{activity.message_preview.substring(0, 100)}..."
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(activity.timestamp), "PPp", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
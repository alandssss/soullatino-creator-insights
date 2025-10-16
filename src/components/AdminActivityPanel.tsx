import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

  useEffect(() => {
    fetchActivities();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('whatsapp-activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_activity'
        },
        (payload) => {
          console.log('Nueva actividad:', payload);
          setActivities(prev => [payload.new as WhatsAppActivity, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_activity")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (!error && data) {
      setActivities(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Actividad en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
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
          <MessageSquare className="h-5 w-5 text-primary" />
          Actividad de Mensajes WhatsApp
          {activities.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {activities.length} interacciones recientes
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay mensajes enviados recientemente
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-foreground">
                      {activity.creator_name || 'Creador Desconocido'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{activity.user_email}</span>
                </div>
                {activity.message_preview && (
                  <div className="mt-2 p-2 bg-background/80 rounded text-xs text-muted-foreground border-l-2 border-green-500">
                    {activity.message_preview.substring(0, 150)}
                    {activity.message_preview.length > 150 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
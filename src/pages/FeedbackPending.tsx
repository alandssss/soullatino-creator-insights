import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Calendar } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { CreatorDetailDialog } from "@/components/CreatorDetailDialog";
import { WorkTimeTracker } from "@/components/WorkTimeTracker";

type Creator = Tables<"creators">;

const FeedbackPending = () => {
  const [user, setUser] = useState<any>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUserAndFetchCreators();
  }, []);

  const checkUserAndFetchCreators = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    
    setUser(user);
    await fetchPendingCreators();
  };

  const fetchPendingCreators = async () => {
    // Obtener creadores que necesitan feedback (ejemplo: sin última retroalimentación o con actividad reciente)
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .order("diamantes", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los creadores pendientes",
        variant: "destructive",
      });
    } else {
      setCreators(data || []);
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
      
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Creadores Pendientes de Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay creadores pendientes de feedback
            </p>
          ) : (
            <div className="space-y-4">
              {creators.map((creator, index) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-all border border-border/30 hover:border-primary/30 cursor-pointer"
                  onClick={() => {
                    setSelectedCreator(creator);
                    setDialogOpen(true);
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{creator.nombre}</h3>
                        {creator.telefono && (
                          <a
                            href={`https://wa.me/${creator.telefono.replace(/[^0-9]/g, '').length === 10 ? '52' : ''}${creator.telefono.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-green-500 hover:text-green-600 transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{creator.categoria || "Sin categoría"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">{(creator.diamantes || 0).toLocaleString()} 💎</p>
                    <p className="text-sm text-muted-foreground">Hito: {((creator.hito_diamantes || 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatorDetailDialog
        creator={selectedCreator}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default FeedbackPending;

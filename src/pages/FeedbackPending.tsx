import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { CreatorDetailDialog } from "@/components/CreatorDetailDialog";
import { WorkTimeTracker } from "@/components/WorkTimeTracker";
import { LowActivityPanel } from "@/components/LowActivityPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Creator = Tables<"creators">;
type CreatorInteraction = Tables<"creator_interactions">;

interface CreatorWithLastFeedback extends Creator {
  lastFeedbackDate?: string;
  daysSinceLastFeedback?: number;
}

const FeedbackPending = () => {
  const [user, setUser] = useState<any>(null);
  const [creators, setCreators] = useState<CreatorWithLastFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    // Obtener creadores ordenados por diamantes
    const { data: creatorsData, error: creatorsError } = await supabase
      .from("creators")
      .select("*")
      .order("diamantes", { ascending: false });

    if (creatorsError) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los creadores pendientes",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Obtener el último feedback de cada creador
    const { data: interactions } = await supabase
      .from("creator_interactions")
      .select("creator_id, fecha")
      .eq("tipo_interaccion", "feedback")
      .order("fecha", { ascending: false });

    // Crear un mapa con la última fecha de feedback por creador
    const lastFeedbackMap = new Map<string, string>();
    interactions?.forEach((interaction) => {
      if (!lastFeedbackMap.has(interaction.creator_id)) {
        lastFeedbackMap.set(interaction.creator_id, interaction.fecha);
      }
    });

    // Combinar datos y calcular días desde el último feedback
    const creatorsWithFeedback: CreatorWithLastFeedback[] = (creatorsData || []).map((creator) => {
      const lastFeedback = lastFeedbackMap.get(creator.id);
      let daysSinceLastFeedback: number | undefined;

      if (lastFeedback) {
        const lastDate = new Date(lastFeedback);
        const now = new Date();
        daysSinceLastFeedback = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        ...creator,
        lastFeedbackDate: lastFeedback,
        daysSinceLastFeedback,
      };
    });

    // Ordenar por prioridad: primero los que nunca han recibido feedback, luego por días desde último feedback
    creatorsWithFeedback.sort((a, b) => {
      if (!a.lastFeedbackDate && !b.lastFeedbackDate) return 0;
      if (!a.lastFeedbackDate) return -1;
      if (!b.lastFeedbackDate) return 1;
      return (b.daysSinceLastFeedback || 0) - (a.daysSinceLastFeedback || 0);
    });

    setCreators(creatorsWithFeedback);
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
      
      <LowActivityPanel />
      
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Creadores Pendientes de Feedback ({creators.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Colapsar
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expandir
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {creators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay creadores pendientes de feedback
            </p>
          ) : (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              {/* Vista previa - Primeros 3 creadores */}
              <div className="space-y-4">
                {creators.slice(0, 3).map((creator, index) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-300 border border-border/50 hover:border-primary/30 cursor-pointer"
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
                        {creator.lastFeedbackDate ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Último feedback: hace {creator.daysSinceLastFeedback} días
                            </span>
                          </div>
                        ) : (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            Sin feedback registrado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent">{(creator.diamantes || 0).toLocaleString()} 💎</p>
                      <p className="text-sm text-muted-foreground">Hito: {((creator.hito_diamantes || 0) / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resto de creadores - Colapsables */}
              {creators.length > 3 && (
                <CollapsibleContent className="mt-4 space-y-4">
                  {creators.slice(3).map((creator, index) => (
                    <div
                      key={creator.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-300 border border-border/50 hover:border-primary/30 cursor-pointer animate-fade-in"
                      onClick={() => {
                        setSelectedCreator(creator);
                        setDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                          {index + 4}
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
                          {creator.lastFeedbackDate ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Último feedback: hace {creator.daysSinceLastFeedback} días
                              </span>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Sin feedback registrado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-accent">{(creator.diamantes || 0).toLocaleString()} 💎</p>
                        <p className="text-sm text-muted-foreground">Hito: {((creator.hito_diamantes || 0) / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              )}
            </Collapsible>
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

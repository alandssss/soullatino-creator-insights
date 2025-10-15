import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Calendar, Clock, ChevronDown, ChevronUp, Search } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filtrar creadores por búsqueda
  const filteredCreators = creators.filter(creator =>
    creator.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.telefono?.includes(searchTerm)
  );

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
      
      <LowActivityPanel />
      
      <Card className="neo-card">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Creadores Pendientes de Feedback ({filteredCreators.length})
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
          
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, categoría o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 neo-input"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCreators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? "No se encontraron creadores" : "No hay creadores pendientes de feedback"}
            </p>
          ) : (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              {/* Vista previa - Primeros 3 creadores */}
              <div className="grid gap-4">
                {filteredCreators.slice(0, 3).map((creator, index) => (
                  <Card
                    key={creator.id}
                    className="neo-card hover:neo-card-pressed cursor-pointer transition-all overflow-hidden"
                    onClick={() => {
                      setSelectedCreator(creator);
                      setDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Número de prioridad */}
                        <div className="flex items-center justify-center w-12 h-12 rounded-full neo-card-sm bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0">
                          <span className="text-lg font-bold text-primary">{index + 1}</span>
                        </div>
                        
                        {/* Info del creador */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{creator.nombre}</h3>
                            {creator.telefono && (
                              <a
                                href={`https://wa.me/${creator.telefono.replace(/[^0-9]/g, '').length === 10 ? '52' : ''}${creator.telefono.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-green-500 hover:text-green-600 transition-colors flex-shrink-0"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{creator.categoria || "Sin categoría"}</p>
                          
                          {creator.lastFeedbackDate ? (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                Hace {creator.daysSinceLastFeedback} días
                              </span>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Sin feedback
                            </Badge>
                          )}
                        </div>
                        
                        {/* Estadísticas */}
                        <div className="text-right flex-shrink-0">
                          <div className="neo-card-sm px-3 py-2 rounded-lg">
                            <p className="font-bold text-accent text-lg">{(creator.diamantes || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">💎 diamantes</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Meta: {((creator.hito_diamantes || 0) / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Resto de creadores - Colapsables */}
              {filteredCreators.length > 3 && (
                <CollapsibleContent className="mt-4 grid gap-4">
                  {filteredCreators.slice(3).map((creator, index) => (
                    <Card
                      key={creator.id}
                      className="neo-card hover:neo-card-pressed cursor-pointer transition-all overflow-hidden animate-fade-in"
                      onClick={() => {
                        setSelectedCreator(creator);
                        setDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          {/* Número de prioridad */}
                          <div className="flex items-center justify-center w-12 h-12 rounded-full neo-card-sm bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0">
                            <span className="text-lg font-bold text-primary">{index + 4}</span>
                          </div>
                          
                          {/* Info del creador */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground truncate">{creator.nombre}</h3>
                              {creator.telefono && (
                                <a
                                  href={`https://wa.me/${creator.telefono.replace(/[^0-9]/g, '').length === 10 ? '52' : ''}${creator.telefono.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-green-500 hover:text-green-600 transition-colors flex-shrink-0"
                                  title="Abrir WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">{creator.categoria || "Sin categoría"}</p>
                            
                            {creator.lastFeedbackDate ? (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  Hace {creator.daysSinceLastFeedback} días
                                </span>
                              </div>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Sin feedback
                              </Badge>
                            )}
                          </div>
                          
                          {/* Estadísticas */}
                          <div className="text-right flex-shrink-0">
                            <div className="neo-card-sm px-3 py-2 rounded-lg">
                              <p className="font-bold text-accent text-lg">{(creator.diamantes || 0).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">💎 diamantes</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Meta: {((creator.hito_diamantes || 0) / 1000).toFixed(0)}K</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

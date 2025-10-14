import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Phone, Calendar, TrendingUp, Target, Sparkles, Loader2, Clock, Award, ArrowUp, ArrowDown, Minus, Eye } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { z } from "zod";
import { BonificacionesPanel } from "./BonificacionesPanel";
import { interactionService } from "@/services/interactionService";
import { AsignarMetaDialog } from "./AsignarMetaDialog";

const interactionSchema = z.object({
  tipo_interaccion: z.string().trim().min(1, "Tipo de interacción requerido").max(100, "Máximo 100 caracteres"),
  notas: z.string().trim().min(1, "Notas requeridas").max(2000, "Máximo 2000 caracteres"),
  admin_nombre: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
});

type Creator = Tables<"creators">;
type Interaction = Tables<"creator_interactions">;

interface CreatorDetailDialogProps {
  creator: Creator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreatorDetailDialog = ({ creator, open, onOpenChange }: CreatorDetailDialogProps) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newInteraction, setNewInteraction] = useState({
    tipo_interaccion: "",
    notas: "",
    admin_nombre: "",
  });
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [milestone, setMilestone] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setUserRole(data?.role || null);
  };

  // Cargar recomendación al abrir modal y suscribirse a cambios en tiempo real
  useEffect(() => {
    if (open && creator) {
      fetchInteractions();
      loadLatestRecommendation();
      
      // Suscribirse a cambios en tiempo real de interacciones
      const channel = supabase
        .channel('creator-interactions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'creator_interactions',
            filter: `creator_id=eq.${creator.id}`
          },
          () => {
            fetchInteractions(); // Recargar cuando haya cambios
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Limpiar al cerrar
      setAiAdvice("");
      setMilestone("");
    }
  }, [open, creator]);

  const fetchInteractions = async () => {
    if (!creator) return;

    try {
      const data = await interactionService.getInteractions(creator.id);
      setInteractions(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las interacciones",
        variant: "destructive",
      });
    }
  };

  // Cargar la recomendación más reciente de la base de datos
  const loadLatestRecommendation = async () => {
    if (!creator) return;

    setLoadingAdvice(true);
    try {
      const data = await interactionService.getLatestRecommendation(creator.id);
      
      if (data) {
        setAiAdvice(data.advice);
        setMilestone(data.milestone);
      }
    } catch (error: any) {
      console.error('Error cargando recomendación:', error);
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Generar NUEVA recomendación inteligente
  const generateAIAdvice = async () => {
    if (!creator) return;
    
    console.log('[CreatorDetailDialog] Generando consejo para creator:', creator.id, creator.nombre);
    setLoadingAdvice(true);
    try {
      const response = await interactionService.generateAdvice(creator.id);
      
      console.log('[CreatorDetailDialog] Consejo recibido:', response);
      setAiAdvice(response.advice);
      setMilestone(response.milestone || '');
      
      toast({
        title: "✨ Recomendación generada",
        description: response.milestoneDescription 
          ? `Hito: ${response.milestoneDescription}` 
          : "Recomendación creada exitosamente",
      });
    } catch (error: any) {
      console.error('[CreatorDetailDialog] Error completo al generar consejo:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo generar la recomendación. Verifica que existan datos históricos.",
        variant: "destructive",
      });
    } finally {
      setLoadingAdvice(false);
    }
  };

  const addInteraction = async () => {
    if (!creator) return;

    try {
      const validated = interactionSchema.parse(newInteraction);

      await interactionService.recordInteraction(creator.id, {
        tipo_interaccion: validated.tipo_interaccion,
        notas: validated.notas,
        admin_nombre: validated.admin_nombre,
      });

      toast({
        title: "✅ Éxito",
        description: "Interacción guardada correctamente",
      });
      
      setNewInteraction({ tipo_interaccion: "", notas: "", admin_nombre: "" });
      fetchInteractions();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo guardar la interacción",
          variant: "destructive",
        });
      }
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!creator) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.email?.split('@')[0] || "el equipo";
      const message = interactionService.generateWhatsAppMessage(creator, userName);
      
      await interactionService.sendWhatsAppMessage(creator, message, 'seguimiento');
      
      toast({
        title: "✅ WhatsApp abierto",
        description: "Mensaje listo para enviar"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateWhatsAppSummary = (userName: string = "el equipo") => {
    if (!creator) return "";
    return interactionService.generateWhatsAppMessage(creator, userName);
  };

  const getMonthlyGrowth = () => {
    if (!creator) return { diamantes: 0, views: 0, engagement: 0 };
    
    const currentDiamantes = creator.diamantes || 0;
    const lastMonthDiamantes = creator.last_month_diamantes || 0;
    const currentViews = creator.views || 0;
    const lastMonthViews = creator.last_month_views || 0;
    const currentEngagement = creator.engagement_rate || 0;
    const lastMonthEngagement = creator.last_month_engagement || 0;
    
    const diamantesGrowth = lastMonthDiamantes > 0 
      ? ((currentDiamantes - lastMonthDiamantes) / lastMonthDiamantes) * 100 
      : 0;
    const viewsGrowth = lastMonthViews > 0 
      ? ((currentViews - lastMonthViews) / lastMonthViews) * 100 
      : 0;
    const engagementGrowth = lastMonthEngagement > 0 
      ? ((currentEngagement - lastMonthEngagement) / lastMonthEngagement) * 100 
      : 0;
    
    return {
      diamantes: diamantesGrowth,
      views: viewsGrowth,
      engagement: engagementGrowth,
    };
  };

  const getMilestones = () => {
    if (!creator) return [];
    
    const diamantes = creator.diamantes || 0;
    const diasLive = creator.dias_live || 0;
    const horasLive = creator.horas_live || 0;
    
    const diamantesMilestones = [
      { value: 10000, label: "10K Diamantes", type: "diamantes" },
      { value: 50000, label: "50K Diamantes", type: "diamantes" },
      { value: 100000, label: "100K Diamantes", type: "diamantes" },
      { value: 500000, label: "500K Diamantes", type: "diamantes" },
      { value: 1000000, label: "1M Diamantes", type: "diamantes" },
    ];

    const diasMilestones = [
      { value: 30, label: "30 Días en Live", type: "dias" },
      { value: 60, label: "60 Días en Live", type: "dias" },
      { value: 90, label: "90 Días en Live", type: "dias" },
      { value: 180, label: "180 Días en Live", type: "dias" },
      { value: 365, label: "1 Año en Live", type: "dias" },
    ];

    const horasMilestones = [
      { value: 50, label: "50 Horas en Live", type: "horas" },
      { value: 100, label: "100 Horas en Live", type: "horas" },
      { value: 250, label: "250 Horas en Live", type: "horas" },
      { value: 500, label: "500 Horas en Live", type: "horas" },
      { value: 1000, label: "1000 Horas en Live", type: "horas" },
    ];

    const nextDiamantesMilestones = diamantesMilestones
      .filter(m => m.value > diamantes)
      .map(m => ({
        ...m,
        remaining: m.value - diamantes,
        progress: (diamantes / m.value) * 100,
        icon: "💎",
      }));

    const nextDiasMilestones = diasMilestones
      .filter(m => m.value > diasLive)
      .map(m => ({
        ...m,
        remaining: m.value - diasLive,
        progress: (diasLive / m.value) * 100,
        icon: "📅",
      }));

    const nextHorasMilestones = horasMilestones
      .filter(m => m.value > horasLive)
      .map(m => ({
        ...m,
        remaining: m.value - horasLive,
        progress: (horasLive / m.value) * 100,
        icon: "⏰",
      }));

    return [...nextDiamantesMilestones.slice(0, 2), ...nextDiasMilestones.slice(0, 1), ...nextHorasMilestones.slice(0, 1)];
  };

  if (!creator) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[85vh] overflow-y-auto p-3 sm:p-6 neo-card">
        <DialogHeader className="pb-4 border-b border-border/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <DialogTitle className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent flex flex-wrap items-center gap-2 sm:gap-3">
              {creator.nombre}
              {milestone && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground neo-card-sm px-2 sm:px-3 py-1 rounded-full">
                  {milestone}
                </span>
              )}
            </DialogTitle>
            
            {/* Botón de IA prominente en header */}
            <Button 
              onClick={generateAIAdvice}
              disabled={loadingAdvice}
              variant="default"
              size="sm"
              className="gap-2 w-full sm:w-auto shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              {loadingAdvice ? "Generando..." : "Generar Consejos IA"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <Card className="neo-card-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                Información del Creador
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
              <div className="p-4 rounded-lg neo-card-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-medium">Usuario TikTok</p>
                <p className="font-semibold text-base">@{creator.tiktok_username || "No especificado"}</p>
              </div>
              <div className="p-4 rounded-lg neo-card-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-medium">Teléfono</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">{creator.telefono || "No especificado"}</p>
                  {creator.telefono && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="success"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Vista Previa
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Mensaje de WhatsApp</h4>
                            <div className="p-3 neo-card-sm rounded-lg border border-border">
                              <p className="text-sm whitespace-pre-wrap font-display">
                                {generateWhatsAppSummary(user?.email?.split('@')[0] || "el equipo")}
                              </p>
                            </div>
                          </div>
                          <Button 
                            className="w-full"
                            variant="success"
                            onClick={handleOpenWhatsApp}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Enviar por WhatsApp
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg neo-card-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-medium">Categoría</p>
                <p className="font-semibold text-base">{creator.categoria || "No especificada"}</p>
              </div>
              <div className="p-4 rounded-lg neo-card-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-medium">Manager</p>
                <p className="font-semibold text-base">{creator.manager || "No asignado"}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20">
                <p className="text-xs uppercase tracking-wider text-primary mb-1 font-medium">Días en Live</p>
                <p className="font-bold text-xl text-primary">{creator.dias_live || 0} días</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20">
                <p className="text-xs uppercase tracking-wider text-primary mb-1 font-medium">Horas en Live</p>
                <p className="font-bold text-xl text-primary">{creator.horas_live || 0} horas</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 backdrop-blur-sm border border-accent/20">
                <p className="text-xs uppercase tracking-wider text-accent mb-1 font-medium">Diamantes</p>
                <p className="font-bold text-2xl text-accent">{(creator.diamantes || 0).toLocaleString()} 💎</p>
              </div>
              <div className="p-4 rounded-lg neo-card-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-medium">Engagement</p>
                <p className="font-bold text-xl">{(creator.engagement_rate || 0).toFixed(1)}%</p>
              </div>
              <div className="col-span-2 pt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="success"
                      disabled={!creator.telefono}
                      size="lg"
                      className="w-full text-base font-semibold"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      Vista Previa del Mensaje
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Mensaje que se enviará</h4>
                        <div className="p-4 neo-card-sm rounded-lg border border-border max-h-60 overflow-y-auto">
                          <p className="text-sm whitespace-pre-wrap font-display">
                            {generateWhatsAppSummary(user?.email?.split('@')[0] || "el equipo")}
                          </p>
                        </div>
                      </div>
                      <Button 
                        className="w-full"
                        variant="success"
                        onClick={handleOpenWhatsApp}
                      >
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Enviar por WhatsApp
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                {!creator.telefono && (
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    No hay número de teléfono registrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="bonificaciones" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-2">
              <TabsTrigger value="bonificaciones" className="gap-2">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Bonificaciones</span>
                <span className="sm:hidden">💎</span>
              </TabsTrigger>
              <TabsTrigger value="metas" className="gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Metas</span>
                <span className="sm:hidden">🎯</span>
              </TabsTrigger>
              <TabsTrigger value="advice" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Consejos IA</span>
                <span className="sm:hidden">IA</span>
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Hitos</span>
              </TabsTrigger>
              <TabsTrigger value="growth" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Crecimiento</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bonificaciones" className="space-y-4 mt-6">
              <BonificacionesPanel creatorId={creator.id} creatorName={creator.nombre} />
            </TabsContent>

            <TabsContent value="metas" className="space-y-4 mt-6">
              <Card className="neo-card-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      Metas Asignadas
                    </CardTitle>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <Button
                        onClick={() => setMetaDialogOpen(true)}
                        variant="default"
                        size="sm"
                        className="gap-2"
                      >
                        <Target className="h-4 w-4" />
                        Asignar Meta
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Las metas asignadas aparecerán aquí próximamente.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advice" className="space-y-4 mt-6">
              <Card className="neo-card-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      Recomendación Inteligente
                    </CardTitle>
                    <Button
                      onClick={generateAIAdvice}
                      disabled={loadingAdvice}
                      variant="outline"
                      size="sm"
                    >
                      {loadingAdvice ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generar Nueva
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={loadingAdvice ? "Cargando recomendación..." : aiAdvice}
                    onChange={(e) => setAiAdvice(e.target.value)}
                    placeholder="Haz clic en 'Generar Nueva' para obtener una recomendación personalizada basada en datos históricos..."
                    className="min-h-[180px] text-base neo-input focus:border-primary/50 transition-colors leading-relaxed"
                    disabled={loadingAdvice}
                  />
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-primary/5 backdrop-blur-sm border border-primary/10">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      La recomendación se genera basándose en los datos históricos del creador y sus hitos de rendimiento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones" className="space-y-4 mt-6">
              <Card className="neo-card-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 backdrop-blur-sm">
                      <Target className="h-5 w-5 text-accent" />
                    </div>
                    Próximos Hitos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {getMilestones().map((milestone, idx) => (
                    <div key={idx} className="p-4 rounded-lg neo-card-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-base flex items-center gap-2">
                          <span className="text-xl">{milestone.icon}</span>
                          {milestone.label}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground neo-card-sm px-3 py-1 rounded-full">
                          Faltan {milestone.remaining.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 neo-input rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-500"
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {milestone.progress.toFixed(1)}% completado
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4 mt-6">
              <Card className="neo-card-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    Comparación Mensual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(() => {
                    const growth = getMonthlyGrowth();
                    const metrics = [
                      { label: "Diamantes", value: growth.diamantes, current: creator.diamantes || 0, last: creator.last_month_diamantes || 0 },
                      { label: "Vistas", value: growth.views, current: creator.views || 0, last: creator.last_month_views || 0 },
                      { label: "Engagement", value: growth.engagement, current: creator.engagement_rate || 0, last: creator.last_month_engagement || 0, isPercentage: true },
                    ];

                    return metrics.map((metric, idx) => (
                      <div key={idx} className="p-5 rounded-lg neo-card-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-base">{metric.label}</span>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-sm">
                            {metric.value > 0 ? (
                              <ArrowUp className="h-4 w-4 text-green-500" />
                            ) : metric.value < 0 ? (
                              <ArrowDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`font-bold ${metric.value > 0 ? "text-green-500" : metric.value < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                              {metric.value > 0 ? "+" : ""}{metric.value.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span className="font-medium">Actual: <span className="text-foreground">{metric.isPercentage ? `${metric.current.toFixed(1)}%` : metric.current.toLocaleString()}</span></span>
                          <span className="font-medium">Mes pasado: <span className="text-foreground/70">{metric.isPercentage ? `${metric.last.toFixed(1)}%` : metric.last.toLocaleString()}</span></span>
                        </div>
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agenda" className="space-y-4 mt-6">
              <Card className="neo-card-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    Historial de Interacciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {(userRole === "admin" || userRole === "manager") && (
                      <div className="space-y-4 p-5 neo-card-sm rounded-lg border border-border">
                        <div className="space-y-2">
                          <Label>Tipo de Interacción</Label>
                          <Input
                            value={newInteraction.tipo_interaccion}
                            onChange={(e) =>
                              setNewInteraction({ ...newInteraction, tipo_interaccion: e.target.value })
                            }
                            placeholder="Ej: Llamada, Email, Reunión"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notas</Label>
                          <Textarea
                            value={newInteraction.notas}
                            onChange={(e) =>
                              setNewInteraction({ ...newInteraction, notas: e.target.value })
                            }
                            placeholder="Detalles de la interacción..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nombre del Admin/Manager</Label>
                          <Input
                            value={newInteraction.admin_nombre}
                            onChange={(e) =>
                              setNewInteraction({ ...newInteraction, admin_nombre: e.target.value })
                            }
                            placeholder="Tu nombre"
                          />
                        </div>
                        <Button onClick={addInteraction} variant="default" size="lg" className="w-full font-semibold">
                          Agregar Interacción
                        </Button>
                      </div>
                    )}
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                      {interactions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No hay interacciones registradas
                        </p>
                      ) : (
                        interactions.map((interaction) => (
                          <div
                            key={interaction.id}
                            className="p-4 rounded-lg neo-card-sm hover:neo-card-pressed transition-all cursor-pointer"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-base">{interaction.tipo_interaccion}</span>
                              <span className="text-xs font-medium text-muted-foreground neo-card-sm px-2 py-1 rounded-full">
                                {new Date(interaction.fecha).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                              {interaction.notas}
                            </p>
                            {interaction.admin_nombre && (
                              <p className="text-xs text-muted-foreground font-medium">
                                Por: {interaction.admin_nombre}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
      
      {/* Dialog para asignar meta */}
      <AsignarMetaDialog
        open={metaDialogOpen}
        onOpenChange={setMetaDialogOpen}
        creatorId={creator.id}
        creatorName={creator.nombre}
        onMetaAsignada={() => {
          // Aquí podrías recargar las metas si las estuvieras mostrando
          toast({
            title: "Meta asignada correctamente",
            description: `Se ha asignado una nueva meta a ${creator.nombre}`,
          });
        }}
      />
    </Dialog>
  );
};

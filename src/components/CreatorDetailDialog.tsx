import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Phone, Calendar, TrendingUp, Target, Sparkles, Loader2, Clock, Award, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { z } from "zod";

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
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

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

  useEffect(() => {
    if (creator) {
      fetchInteractions();
    }
  }, [creator]);

  const fetchInteractions = async () => {
    if (!creator) return;

    const { data, error } = await supabase
      .from("creator_interactions")
      .select("*")
      .eq("creator_id", creator.id)
      .order("fecha", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las interacciones",
        variant: "destructive",
      });
    } else {
      setInteractions(data || []);
    }
  };

  const generateAIAdvice = async () => {
    if (!creator) return;
    
    setLoadingAdvice(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creator-advice", {
        body: { creatorData: creator },
      });

      if (error) throw error;

      setAiAdvice(data.advice);
      toast({
        title: "Consejos generados",
        description: "La IA ha generado nuevos consejos personalizados",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron generar los consejos",
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

      const { error } = await supabase.from("creator_interactions").insert({
        creator_id: creator.id,
        tipo_interaccion: validated.tipo_interaccion,
        notas: validated.notas,
        admin_nombre: validated.admin_nombre || "Admin",
      });

      if (error) throw error;

      toast({
        title: "Éxito",
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
          description: "No se pudo guardar la interacción",
          variant: "destructive",
        });
      }
    }
  };

  const openWhatsApp = async () => {
    if (!creator?.telefono) {
      toast({
        title: "Error",
        description: "Este creador no tiene número de teléfono registrado",
        variant: "destructive",
      });
      return;
    }
    
    const cleanPhone = creator.telefono.replace(/\D/g, "");
    const summary = generateWhatsAppSummary();
    
    // Registrar la actividad en la base de datos
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("whatsapp_activity").insert({
        creator_id: creator.id,
        user_email: user.email || "Unknown",
        action_type: "whatsapp_click",
        creator_name: creator.nombre,
        message_preview: summary,
      });
    }
    
    const encodedMessage = encodeURIComponent(summary);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, "_blank");
    
    toast({
      title: "WhatsApp abierto",
      description: "Se ha abierto WhatsApp con el mensaje personalizado",
    });
  };

  const generateWhatsAppSummary = () => {
    if (!creator) return "";
    
    const growth = getMonthlyGrowth();
    const milestones = getMilestones().slice(0, 1);
    
    let message = `Hola ${creator.nombre}! 👋\n\n`;
    message += `📊 *Resumen de tu desempeño*\n\n`;
    message += `💎 Diamantes actuales: ${(creator.diamantes || 0).toLocaleString()}\n`;
    message += `📈 Engagement: ${(creator.engagement_rate || 0).toFixed(1)}%\n`;
    message += `📺 Días en Live: ${creator.dias_live || 0}\n`;
    message += `⏰ Horas en Live: ${creator.horas_live || 0}\n\n`;
    
    if (growth.diamantes !== 0) {
      message += `*Comparación con el mes pasado:*\n`;
      message += `💎 Diamantes: ${growth.diamantes > 0 ? '+' : ''}${growth.diamantes.toFixed(1)}%\n`;
      message += `👁️ Vistas: ${growth.views > 0 ? '+' : ''}${growth.views.toFixed(1)}%\n`;
      message += `📈 Engagement: ${growth.engagement > 0 ? '+' : ''}${growth.engagement.toFixed(1)}%\n\n`;
    }
    
    if (milestones.length > 0) {
      message += `🎯 *Próximo hito:* ${milestones[0].label}\n`;
      message += `Faltan ${milestones[0].remaining.toLocaleString()} 💎\n\n`;
    }
    
    message += `¡Sigue así! 🚀`;
    return message;
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {creator.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Información del Creador
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Usuario TikTok</p>
                <p className="font-semibold">@{creator.tiktok_username || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-semibold">{creator.telefono || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-semibold">{creator.categoria || "No especificada"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manager</p>
                <p className="font-semibold">{creator.manager || "No asignado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Días en Live</p>
                <p className="font-semibold text-primary">{creator.dias_live || 0} días</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas en Live</p>
                <p className="font-semibold text-primary">{creator.horas_live || 0} horas</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diamantes</p>
                <p className="font-semibold text-accent">{(creator.diamantes || 0).toLocaleString()} 💎</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engagement</p>
                <p className="font-semibold">{(creator.engagement_rate || 0).toFixed(1)}%</p>
              </div>
              <div className="col-span-2">
                <Button 
                  onClick={openWhatsApp} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={!creator.telefono}
                  size="lg"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Enviar Mensaje por WhatsApp
                </Button>
                {!creator.telefono && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    No hay número de teléfono registrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="milestones">
                <Target className="h-4 w-4 mr-2" />
                Hitos
              </TabsTrigger>
              <TabsTrigger value="growth">
                <TrendingUp className="h-4 w-4 mr-2" />
                Crecimiento
              </TabsTrigger>
              <TabsTrigger value="advice">
                <Sparkles className="h-4 w-4 mr-2" />
                Consejos IA
              </TabsTrigger>
              <TabsTrigger value="agenda">
                <Calendar className="h-4 w-4 mr-2" />
                Agenda
              </TabsTrigger>
            </TabsList>

            <TabsContent value="milestones" className="space-y-4">
              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Próximos Hitos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getMilestones().map((milestone, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold flex items-center gap-2">
                          <span>{milestone.icon}</span>
                          {milestone.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Faltan {milestone.remaining.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4">
              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Comparación Mensual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const growth = getMonthlyGrowth();
                    const metrics = [
                      { label: "Diamantes", value: growth.diamantes, current: creator.diamantes || 0, last: creator.last_month_diamantes || 0 },
                      { label: "Vistas", value: growth.views, current: creator.views || 0, last: creator.last_month_views || 0 },
                      { label: "Engagement", value: growth.engagement, current: creator.engagement_rate || 0, last: creator.last_month_engagement || 0, isPercentage: true },
                    ];

                    return metrics.map((metric, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-background/50 border border-border/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{metric.label}</span>
                          <div className="flex items-center gap-2">
                            {metric.value > 0 ? (
                              <ArrowUp className="h-4 w-4 text-green-500" />
                            ) : metric.value < 0 ? (
                              <ArrowDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`font-bold ${metric.value > 0 ? 'text-green-500' : metric.value < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {metric.value > 0 ? '+' : ''}{metric.value.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Actual</p>
                            <p className="font-semibold">
                              {metric.isPercentage 
                                ? `${metric.current.toFixed(1)}%` 
                                : metric.current.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Mes Pasado</p>
                            <p className="font-semibold">
                              {metric.isPercentage 
                                ? `${metric.last.toFixed(1)}%` 
                                : metric.last.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advice" className="space-y-4">
              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Consejos Personalizados</CardTitle>
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
                          Generar Nuevos Consejos
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {aiAdvice ? (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                      {aiAdvice}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Haz clic en "Generar Nuevos Consejos" para obtener recomendaciones personalizadas
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agenda" className="space-y-4">
              {userRole === "admin" && (
                <>
                  <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Enviar Resumen por WhatsApp
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={openWhatsApp} 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={!creator.telefono}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar Resumen al Creador
                      </Button>
                      {!creator.telefono && (
                        <p className="text-sm text-muted-foreground text-center mt-2">
                          No hay número de teléfono registrado
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Nueva Interacción</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="tipo">Tipo de Interacción</Label>
                        <Input
                          id="tipo"
                          placeholder="Ej: Llamada, Reunión, Email"
                          value={newInteraction.tipo_interaccion}
                          onChange={(e) =>
                            setNewInteraction({ ...newInteraction, tipo_interaccion: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin">Manager/Admin</Label>
                        <Input
                          id="admin"
                          placeholder="Tu nombre"
                          value={newInteraction.admin_nombre}
                          onChange={(e) =>
                            setNewInteraction({ ...newInteraction, admin_nombre: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="notas">Notas</Label>
                        <Textarea
                          id="notas"
                          placeholder="Detalles de la interacción..."
                          value={newInteraction.notas}
                          onChange={(e) =>
                            setNewInteraction({ ...newInteraction, notas: e.target.value })
                          }
                          rows={3}
                        />
                      </div>
                      <Button onClick={addInteraction} className="w-full">
                        <Phone className="h-4 w-4 mr-2" />
                        Guardar Interacción
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Historial de Interacciones (Solo Admin)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {interactions.length > 0 ? (
                        <div className="space-y-3">
                          {interactions.map((interaction) => (
                            <div
                              key={interaction.id}
                              className="p-3 rounded-lg bg-background/50 border border-border/30"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold text-primary">
                                  {interaction.tipo_interaccion}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(interaction.fecha).toLocaleDateString()}
                                </span>
                              </div>
                              {interaction.admin_nombre && (
                                <p className="text-sm text-muted-foreground mb-1">
                                  Por: {interaction.admin_nombre}
                                </p>
                              )}
                              <p className="text-sm">{interaction.notas}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No hay interacciones registradas
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
              
              {userRole !== "admin" && (
                <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                  <CardContent className="py-12">
                    <p className="text-muted-foreground text-center">
                      Solo los administradores pueden ver y gestionar las interacciones con los creadores.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

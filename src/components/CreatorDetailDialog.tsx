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
import { MessageSquare, Phone, Calendar, TrendingUp, Target, Sparkles, Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

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
  const { toast } = useToast();

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
      console.error("Error generating advice:", error);
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
    if (!creator || !newInteraction.tipo_interaccion || !newInteraction.notas) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("creator_interactions").insert({
      creator_id: creator.id,
      tipo_interaccion: newInteraction.tipo_interaccion,
      notas: newInteraction.notas,
      admin_nombre: newInteraction.admin_nombre,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la interacción",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Interacción guardada correctamente",
      });
      setNewInteraction({ tipo_interaccion: "", notas: "", admin_nombre: "" });
      fetchInteractions();
    }
  };

  const openWhatsApp = () => {
    if (creator?.telefono) {
      const cleanPhone = creator.telefono.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    }
  };

  const getMilestones = () => {
    if (!creator) return [];
    
    const diamantes = creator.diamantes || 0;
    const milestones = [
      { value: 10000, label: "10K Diamantes" },
      { value: 50000, label: "50K Diamantes" },
      { value: 100000, label: "100K Diamantes" },
      { value: 500000, label: "500K Diamantes" },
      { value: 1000000, label: "1M Diamantes" },
    ];

    return milestones
      .filter(m => m.value > diamantes)
      .map(m => ({
        ...m,
        remaining: m.value - diamantes,
        progress: (diamantes / m.value) * 100,
      }));
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
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{creator.telefono || "No especificado"}</p>
                  {creator.telefono && (
                    <Button size="sm" variant="outline" onClick={openWhatsApp}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
            </CardContent>
          </Card>

          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="milestones">
                <Target className="h-4 w-4 mr-2" />
                Hitos
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
                  {getMilestones().slice(0, 3).map((milestone, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{milestone.label}</span>
                        <span className="text-sm text-muted-foreground">
                          Faltan {milestone.remaining.toLocaleString()} 💎
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
                  <CardTitle className="text-lg">Historial de Interacciones</CardTitle>
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
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

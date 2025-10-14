import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Video,
  Swords,
  Lightbulb,
  Volume2,
  Home,
  AlertCircle,
  Loader2,
  X,
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Creator {
  id: string;
  nombre: string;
  telefono?: string;
  dias_en_agencia?: number;
  diam_live_mes?: number;
}

interface SupervisionLog {
  id: string;
  fecha_evento: string;
  en_vivo: boolean;
  en_batalla: boolean;
  buena_iluminacion: boolean;
  cumple_normas: boolean;
  audio_claro: boolean;
  set_profesional: boolean;
  score: number;
  riesgo: string;
}

interface CreatorDrawerProps {
  creator: Creator | null;
  latestLog?: SupervisionLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReload: () => void;
  onOpenIncident: () => void;
}

export function CreatorDrawer({
  creator,
  latestLog,
  open,
  onOpenChange,
  onReload,
  onOpenIncident,
}: CreatorDrawerProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!creator) return null;

  const getRiesgoColor = (riesgo?: string) => {
    switch (riesgo) {
      case 'verde': return 'bg-green-500';
      case 'amarillo': return 'bg-yellow-500';
      case 'rojo': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const quickLog = async (flags: Record<string, boolean>) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('supervision-quicklog', {
        body: {
          creator_id: creator.id,
          flags
        }
      });

      if (error) throw error;

      // Registrar actividad en el panel de admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("whatsapp_activity").insert({
          creator_id: creator.id,
          user_email: user.email || "Unknown",
          action_type: "supervision_log",
          creator_name: creator.nombre,
          message_preview: `Supervisión: ${Object.keys(flags).join(', ')}`,
        });
      }

      toast({
        title: "Registro guardado",
        description: `Evento registrado para ${creator.nombre}`,
      });

      onReload();
    } catch (error: any) {
      console.error('Error logging:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el evento",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const timeSinceLog = latestLog 
    ? Math.floor((Date.now() - new Date(latestLog.fecha_evento).getTime()) / (1000 * 60))
    : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] neo-card">
        <DrawerHeader className="border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full neo-card-sm flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <span className="text-lg font-bold text-primary">
                  {creator.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <DrawerTitle className="text-xl">{creator.nombre}</DrawerTitle>
                <DrawerDescription className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${getRiesgoColor(latestLog?.riesgo)}`} />
                  {latestLog?.riesgo === 'verde' && 'Excelente'}
                  {latestLog?.riesgo === 'amarillo' && 'Necesita atención'}
                  {latestLog?.riesgo === 'rojo' && 'Requiere acción'}
                  {!latestLog && 'Sin datos'}
                </DrawerDescription>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="neo-button">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Métricas rápidas */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                📊 Métricas Rápidas
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="neo-card-sm p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3 w-3 text-primary" />
                    <p className="text-xs text-muted-foreground">Días en agencia</p>
                  </div>
                  <p className="text-lg font-bold">
                    {creator.dias_en_agencia || 0}
                  </p>
                </div>
                <div className="neo-card-sm p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3 w-3 text-accent" />
                    <p className="text-xs text-muted-foreground">Diamantes mes</p>
                  </div>
                  <p className="text-lg font-bold">
                    {creator.diam_live_mes?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            {latestLog && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    📝 Último Registro
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    hace {timeSinceLog}min
                  </div>
                </div>
                <div className="neo-card-sm p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-semibold">{latestLog.score}</span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Acciones */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                🛠 Acciones Disponibles
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={latestLog?.en_vivo ? "default" : "outline"}
                  onClick={() => quickLog({ en_vivo: true })}
                  disabled={submitting}
                  className="neo-button flex-col h-auto py-3"
                >
                  <Video className="h-5 w-5 mb-1" />
                  <span className="text-xs">LIVE</span>
                </Button>
                <Button
                  size="sm"
                  variant={latestLog?.en_batalla ? "default" : "outline"}
                  onClick={() => quickLog({ en_batalla: true })}
                  disabled={submitting}
                  className="neo-button flex-col h-auto py-3"
                >
                  <Swords className="h-5 w-5 mb-1" />
                  <span className="text-xs">PK</span>
                </Button>
                <Button
                  size="sm"
                  variant={latestLog?.buena_iluminacion ? "default" : "outline"}
                  onClick={() => quickLog({ buena_iluminacion: true })}
                  disabled={submitting}
                  className="neo-button flex-col h-auto py-3"
                >
                  <Lightbulb className="h-5 w-5 mb-1" />
                  <span className="text-xs">Luz</span>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={latestLog?.audio_claro ? "default" : "outline"}
                  onClick={() => quickLog({ audio_claro: true })}
                  disabled={submitting}
                  className="neo-button flex-col h-auto py-3"
                >
                  <Volume2 className="h-5 w-5 mb-1" />
                  <span className="text-xs">Audio</span>
                </Button>
                <Button
                  size="sm"
                  variant={latestLog?.set_profesional ? "default" : "outline"}
                  onClick={() => quickLog({ set_profesional: true })}
                  disabled={submitting}
                  className="neo-button flex-col h-auto py-3"
                >
                  <Home className="h-5 w-5 mb-1" />
                  <span className="text-xs">Set</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    onOpenIncident();
                    onOpenChange(false);
                  }}
                  disabled={submitting}
                  className="neo-button flex-col h-auto py-3"
                >
                  <AlertCircle className="h-5 w-5 mb-1" />
                  <span className="text-xs">Reporte</span>
                </Button>
              </div>

              {submitting && (
                <div className="flex items-center justify-center text-xs text-muted-foreground py-2">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Guardando...
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t border-border/50">
          <DrawerClose asChild>
            <Button variant="outline" className="neo-button">
              Cerrar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

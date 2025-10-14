import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
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
  MessageCircle,
  Clock,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreatorBriefSummary } from "@/components/CreatorBriefSummary";
import { openWhatsApp } from "@/utils/whatsapp";

interface Creator {
  id: string;
  nombre: string;
  telefono?: string;
  dias_en_agencia?: number;
  diam_live_mes?: number;
  tiktok_username?: string;
  horas_live_mes?: number;
  dias_live_mes?: number;
  graduacion?: string;
  manager?: string;
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

interface CreatorPanelProps {
  creator: Creator | null;
  latestLog?: SupervisionLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReload: () => void;
  onOpenIncident: () => void;
}

export function CreatorPanel({
  creator,
  latestLog,
  open,
  onOpenChange,
  onReload,
  onOpenIncident,
}: CreatorPanelProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [selectedFlags, setSelectedFlags] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  if (!creator) return null;

  const toggleFlag = (flag: string) => {
    setSelectedFlags(prev => ({
      ...prev,
      [flag]: !prev[flag]
    }));
  };

  const getRiesgoColor = (riesgo?: string) => {
    switch (riesgo) {
      case 'verde': return 'bg-green-500';
      case 'amarillo': return 'bg-yellow-500';
      case 'rojo': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const quickLog = async () => {
    if (Object.keys(selectedFlags).length === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos una acción para registrar",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('supervision-quicklog', {
        body: {
          creator_id: creator.id,
          flags: selectedFlags,
          notas: notes.trim() || undefined
        }
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("whatsapp_activity").insert({
          creator_id: creator.id,
          user_email: user.email || "Unknown",
          action_type: "supervision_log",
          creator_name: creator.nombre,
          message_preview: `Supervisión: ${Object.keys(selectedFlags).join(', ')}${notes ? ' - ' + notes.substring(0, 50) : ''}`,
        });
      }

      toast({
        title: "Registro guardado",
        description: `Evento registrado para ${creator.nombre}`,
      });

      // Limpiar selección y notas
      setSelectedFlags({});
      setNotes("");
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

  const PanelContent = () => (
    <>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-12 w-12 rounded-full neo-card-sm flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0">
            <span className="text-lg font-bold text-primary">
              {creator.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{creator.nombre}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <div className={`w-3 h-3 rounded-full ${getRiesgoColor(latestLog?.riesgo)} flex-shrink-0`} />
              <span className="truncate">
                {latestLog?.riesgo === 'verde' && 'Excelente'}
                {latestLog?.riesgo === 'amarillo' && 'Necesita atención'}
                {latestLog?.riesgo === 'rojo' && 'Requiere acción'}
                {!latestLog && 'Sin datos'}
              </span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onOpenChange(false)}
          className="neo-button flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Resumen del creador */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              📊 Resumen
            </h3>
            <CreatorBriefSummary creator={creator} />
          </div>

          <Separator />

          {/* Batallas Oficiales */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              ⚔️ Batallas Oficiales
            </h3>
            <div className="neo-card-sm p-3 rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground">No hay batallas programadas</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full neo-button"
                onClick={async () => {
                  if (creator.telefono) {
                    await openWhatsApp({
                      phone: creator.telefono,
                      message: `Hola ${creator.nombre}, ¿tienes alguna batalla oficial programada próximamente?`,
                      creatorId: creator.id,
                      creatorName: creator.nombre,
                      actionType: 'seguimiento'
                    });
                  } else {
                    toast({
                      title: "Sin teléfono",
                      description: "Este creador no tiene número registrado",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Consultar por WhatsApp
              </Button>
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
              🛠 Selecciona Acciones
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant={selectedFlags.en_vivo ? "default" : "outline"}
                onClick={() => toggleFlag('en_vivo')}
                disabled={submitting}
                className="neo-button flex-col h-auto py-3"
              >
                <Video className="h-5 w-5 mb-1" />
                <span className="text-xs">LIVE</span>
              </Button>
              <Button
                size="sm"
                variant={selectedFlags.en_batalla ? "default" : "outline"}
                onClick={() => toggleFlag('en_batalla')}
                disabled={submitting}
                className="neo-button flex-col h-auto py-3"
              >
                <Swords className="h-5 w-5 mb-1" />
                <span className="text-xs">PK</span>
              </Button>
              <Button
                size="sm"
                variant={selectedFlags.buena_iluminacion ? "default" : "outline"}
                onClick={() => toggleFlag('buena_iluminacion')}
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
                variant={selectedFlags.audio_claro ? "default" : "outline"}
                onClick={() => toggleFlag('audio_claro')}
                disabled={submitting}
                className="neo-button flex-col h-auto py-3"
              >
                <Volume2 className="h-5 w-5 mb-1" />
                <span className="text-xs">Audio</span>
              </Button>
              <Button
                size="sm"
                variant={selectedFlags.set_profesional ? "default" : "outline"}
                onClick={() => toggleFlag('set_profesional')}
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

            {/* Campo de notas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Notas adicionales (opcional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe observaciones adicionales..."
                className="neo-input min-h-[80px] resize-none"
                disabled={submitting}
              />
            </div>

            {/* Botón para guardar */}
            <Button
              onClick={quickLog}
              disabled={submitting || Object.keys(selectedFlags).length === 0}
              className="w-full neo-button bg-gradient-to-r from-primary to-accent"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                `Guardar Registro (${Object.keys(selectedFlags).length} accion${Object.keys(selectedFlags).length !== 1 ? 'es' : ''})`
              )}
            </Button>

            {Object.keys(selectedFlags).length === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Selecciona al menos una acción para continuar
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer solo en móvil */}
      {!isDesktop && (
        <div className="p-4 border-t border-border/50">
          <Button 
            variant="outline" 
            className="w-full neo-button"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[450px] sm:max-w-[450px] p-0 neo-card flex flex-col overflow-y-auto">
          <PanelContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] neo-card flex flex-col">
        <PanelContent />
      </DrawerContent>
    </Drawer>
  );
}

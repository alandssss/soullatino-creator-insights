import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Loader2
} from "lucide-react";

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

interface CreatorCardProps {
  creator: Creator;
  latestLog?: SupervisionLog;
  onReload: () => void;
  onOpenIncident: () => void;
}

export function CreatorCard({ creator, latestLog, onReload, onOpenIncident }: CreatorCardProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

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
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{creator.nombre}</h3>
            {creator.dias_en_agencia && creator.dias_en_agencia < 90 && (
              <Badge variant="outline" className="bg-indigo-50 text-xs mt-1">
                🆕 Nuevo
              </Badge>
            )}
          </div>
          <div className={`w-4 h-4 rounded-full ${getRiesgoColor(latestLog?.riesgo)}`} 
               title={latestLog?.riesgo || 'Sin datos'} />
        </div>

        {latestLog && (
          <div className="text-xs text-muted-foreground mb-3">
            Último registro: hace {timeSinceLog}min
            {latestLog.score !== undefined && (
              <span className="ml-2">• Score: {latestLog.score}</span>
            )}
          </div>
        )}

        {/* Botones rápidos */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Button
            size="sm"
            variant={latestLog?.en_vivo ? "default" : "outline"}
            onClick={() => quickLog({ en_vivo: true })}
            disabled={submitting}
            className="text-xs"
          >
            <Video className="h-3 w-3 mr-1" />
            LIVE
          </Button>
          <Button
            size="sm"
            variant={latestLog?.en_batalla ? "default" : "outline"}
            onClick={() => quickLog({ en_batalla: true })}
            disabled={submitting}
            className="text-xs"
          >
            <Swords className="h-3 w-3 mr-1" />
            PK
          </Button>
          <Button
            size="sm"
            variant={latestLog?.buena_iluminacion ? "default" : "outline"}
            onClick={() => quickLog({ buena_iluminacion: true })}
            disabled={submitting}
            className="text-xs"
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            Luz
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <Button
            size="sm"
            variant={latestLog?.audio_claro ? "default" : "outline"}
            onClick={() => quickLog({ audio_claro: true })}
            disabled={submitting}
            className="text-xs"
          >
            <Volume2 className="h-3 w-3 mr-1" />
            Audio
          </Button>
          <Button
            size="sm"
            variant={latestLog?.set_profesional ? "default" : "outline"}
            onClick={() => quickLog({ set_profesional: true })}
            disabled={submitting}
            className="text-xs"
          >
            <Home className="h-3 w-3 mr-1" />
            Set
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onOpenIncident}
            disabled={submitting}
            className="text-xs"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Reporte
          </Button>
        </div>

        {submitting && (
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Guardando...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
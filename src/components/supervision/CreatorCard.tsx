import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  onClick: () => void;
}

export function CreatorCard({ creator, latestLog, onClick }: CreatorCardProps) {
  const getRiesgoColor = (riesgo?: string) => {
    switch (riesgo) {
      case 'verde': return 'bg-green-500';
      case 'amarillo': return 'bg-yellow-500';
      case 'rojo': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const timeSinceLog = latestLog 
    ? Math.floor((Date.now() - new Date(latestLog.fecha_evento).getTime()) / (1000 * 60))
    : null;

  return (
    <div 
      onClick={onClick}
      className="neo-card p-4 cursor-pointer hover:neo-card-pressed active:neo-card-pressed transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        {/* Avatar/Inicial */}
        <div className="h-10 w-10 rounded-full neo-card-sm flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0">
          <span className="text-sm font-bold text-primary">
            {creator.nombre.charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* Nombre e info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{creator.nombre}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {latestLog && (
              <>
                <Clock className="h-3 w-3" />
                <span>hace {timeSinceLog}min</span>
              </>
            )}
            {!latestLog && <span>Sin datos</span>}
          </div>
        </div>

        {/* Indicador de riesgo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {creator.dias_en_agencia && creator.dias_en_agencia < 90 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              🆕
            </Badge>
          )}
          <div 
            className={`w-3 h-3 rounded-full ${getRiesgoColor(latestLog?.riesgo)}`} 
            title={latestLog?.riesgo || 'Sin datos'} 
          />
        </div>
      </div>

      {/* Métricas rápidas */}
      {latestLog && (
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-muted-foreground">
            Score: <span className="font-semibold text-foreground">{latestLog.score}</span>
          </span>
          {creator.diam_live_mes && (
            <span className="text-muted-foreground">
              💎 {(creator.diam_live_mes / 1000).toFixed(0)}k
            </span>
          )}
        </div>
      )}
    </div>
  );
}
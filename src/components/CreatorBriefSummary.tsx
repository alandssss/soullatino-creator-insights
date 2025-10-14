import { Card } from "@/components/ui/card";
import { Calendar, TrendingUp, Clock, Award } from "lucide-react";

interface CreatorBriefSummaryProps {
  creator: {
    nombre: string;
    tiktok_username?: string;
    dias_en_agencia?: number;
    diam_live_mes?: number;
    horas_live_mes?: number;
    dias_live_mes?: number;
    graduacion?: string;
    manager?: string;
  };
  compact?: boolean;
}

export function CreatorBriefSummary({ creator, compact = false }: CreatorBriefSummaryProps) {
  return (
    <Card className={`neo-card-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full neo-card-sm flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {creator.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{creator.nombre}</h3>
            {creator.tiktok_username && (
              <p className="text-xs text-muted-foreground truncate">@{creator.tiktok_username}</p>
            )}
          </div>
          {creator.graduacion && (
            <div className="flex items-center gap-1 text-xs neo-card-sm px-2 py-1 rounded-full">
              <Award className="h-3 w-3 text-accent" />
              <span className="font-medium">{creator.graduacion}</span>
            </div>
          )}
        </div>

        {/* Métricas Grid */}
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
          <div className="neo-card-sm p-2 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-primary" />
              <p className="text-xs text-muted-foreground">Días agencia</p>
            </div>
            <p className="text-sm font-bold">{creator.dias_en_agencia || 0}</p>
          </div>

          <div className="neo-card-sm p-2 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3 w-3 text-accent" />
              <p className="text-xs text-muted-foreground">Diamantes</p>
            </div>
            <p className="text-sm font-bold">{creator.diam_live_mes?.toLocaleString() || 0}</p>
          </div>

          {!compact && (
            <div className="neo-card-sm p-2 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3 w-3 text-primary" />
                <p className="text-xs text-muted-foreground">Horas mes</p>
              </div>
              <p className="text-sm font-bold">{creator.horas_live_mes?.toFixed(1) || 0}</p>
            </div>
          )}
        </div>

        {/* Manager info */}
        {creator.manager && !compact && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Manager: <span className="font-medium text-foreground">{creator.manager}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

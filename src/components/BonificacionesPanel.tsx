import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Award, Calendar, Target, Zap, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { creatorAnalytics } from "@/services/creatorAnalytics";
import { MetricCard } from "@/components/MetricCard";

interface BonificacionesPanelProps {
  creatorId: string;
  creatorName: string;
}

export const BonificacionesPanel = ({ creatorId, creatorName }: BonificacionesPanelProps) => {
  const [bonificacion, setBonificacion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBonificacion();
  }, [creatorId]);

  const loadBonificacion = async () => {
    setLoading(true);
    try {
      const mesActual = new Date();
      const mesReferencia = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-01`;

      const bonificaciones = await creatorAnalytics.getBonificaciones(mesReferencia);
      const bonifCreator = bonificaciones.find(b => b.creator_id === creatorId);
      setBonificacion(bonifCreator || null);
    } catch (error) {
      console.error('Error cargando bonificación:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar la bonificación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularBonificacion = async () => {
    setCalculating(true);
    try {
      await creatorAnalytics.calcularBonificaciones();

      toast({
        title: "✅ Bonificación calculada",
        description: "Las bonificaciones han sido actualizadas",
      });

      await loadBonificacion();
    } catch (error) {
      console.error('Error calculando bonificación:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo calcular la bonificación",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            Bonificaciones del Mes
          </CardTitle>
          <Button
            onClick={calcularBonificacion}
            disabled={calculating}
            size="sm"
            variant="outline"
          >
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Calcular
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!bonificacion ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No hay datos calculados para este mes</p>
            <Button onClick={calcularBonificacion} disabled={calculating}>
              <Zap className="h-4 w-4 mr-2" />
              Calcular Bonificaciones
            </Button>
          </div>
        ) : (
          <>
            {/* Métricas del Mes */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                LIVE del Mes (hasta ayer)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <MetricCard 
                  label="Días" 
                  value={bonificacion.dias_live_mes} 
                  variant="primary"
                />
                <MetricCard 
                  label="Horas" 
                  value={bonificacion.horas_live_mes?.toFixed(1)} 
                  variant="primary"
                />
                <MetricCard 
                  label="Diamantes" 
                  value={bonificacion.diam_live_mes?.toLocaleString()} 
                  variant="accent"
                />
              </div>
            </div>

            {/* Próximo Objetivo */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Próximo Objetivo
              </h3>
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{bonificacion.proximo_objetivo_valor || "Sin objetivo"}</p>
                  {bonificacion.cerca_de_objetivo && (
                    <Badge variant="default">¡Cerca!</Badge>
                  )}
                </div>
                {bonificacion.dias_restantes > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {bonificacion.req_diam_por_dia > 0 && (
                      <>💎 {bonificacion.req_diam_por_dia.toLocaleString()} diamantes/día</>
                    )}
                    {bonificacion.req_horas_por_dia > 0 && (
                      <>⏰ {bonificacion.req_horas_por_dia.toFixed(1)} horas/día</>
                    )}
                    {' '}en {bonificacion.dias_restantes} días restantes
                  </p>
                )}
              </div>
              {bonificacion.es_prioridad_300k && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    ⭐ Prioridad: Alcanzar 300K este mes
                  </p>
                </div>
              )}
            </div>

            {/* Graduaciones */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Graduaciones Diamantes
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'grad_50k', label: '50K' },
                  { key: 'grad_100k', label: '100K' },
                  { key: 'grad_300k', label: '300K' },
                  { key: 'grad_500k', label: '500K' },
                  { key: 'grad_1m', label: '1M' },
                ].map((grad) => (
                  <div
                    key={grad.key}
                    className={`p-2 rounded-lg text-center border ${
                      bonificacion[grad.key]
                        ? 'bg-green-500/20 border-green-500/50'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <p className="text-xs font-medium">
                      {bonificacion[grad.key] ? '✅' : '⭕'} {grad.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hitos */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Hitos Días/Horas
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'hito_12d_40h', label: '12d/40h' },
                  { key: 'hito_20d_60h', label: '20d/60h' },
                  { key: 'hito_22d_80h', label: '22d/80h' },
                ].map((hito) => (
                  <div
                    key={hito.key}
                    className={`p-2 rounded-lg text-center border ${
                      bonificacion[hito.key]
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <p className="text-xs font-medium">
                      {bonificacion[hito.key] ? '✅' : '⭕'} {hito.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bono Extra */}
            {bonificacion.dias_extra_22 > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      🎁 Bono por Constancia
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bonificacion.dias_extra_22} días por encima de 22
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${bonificacion.bono_extra_usd}
                    </p>
                    <p className="text-xs text-muted-foreground">USD</p>
                  </div>
                </div>
              </div>
            )}

            {/* Última actualización */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Última actualización: {new Date(bonificacion.fecha_calculo).toLocaleDateString('es-MX')}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

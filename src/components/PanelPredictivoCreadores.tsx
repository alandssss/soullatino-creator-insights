import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { openWhatsApp } from "@/utils/whatsapp";
import { 
  Loader2, 
  RefreshCw, 
  Download, 
  Search, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Target,
  Award,
  MessageCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

interface CreatorBonificacion {
  id: string;
  creator_id: string;
  nombre?: string;
  dias_live_mes: number;
  horas_live_mes: number;
  diam_live_mes: number;
  dias_restantes: number;
  grad_50k: boolean;
  grad_100k: boolean;
  grad_300k: boolean;
  grad_500k: boolean;
  grad_1m: boolean;
  hito_12d_40h: boolean;
  hito_20d_60h: boolean;
  hito_22d_80h: boolean;
  dias_extra_22: number;
  bono_extra_usd: number;
  proximo_objetivo_tipo: string;
  proximo_objetivo_valor: string;
  req_diam_por_dia: number;
  req_horas_por_dia: number;
  es_prioridad_300k: boolean;
  cerca_de_objetivo: boolean;
  telefono?: string;
}

export const PanelPredictivoCreadores = () => {
  const [bonificaciones, setBonificaciones] = useState<CreatorBonificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState<"todos" | "verde" | "amarillo" | "rojo">("todos");
  const { toast } = useToast();

  useEffect(() => {
    loadBonificaciones();
  }, []);

  const loadBonificaciones = async () => {
    setLoading(true);
    try {
      const mesActual = new Date();
      const mesReferencia = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: bonifs, error: bonifError } = await supabase
        .from('creator_bonificaciones')
        .select('*')
        .eq('mes_referencia', mesReferencia)
        .order('diam_live_mes', { ascending: false });

      if (bonifError) throw bonifError;

      // Obtener nombres y teléfonos de creadores
      const { data: creators } = await supabase
        .from('creators')
        .select('id, nombre, telefono');

      type Creator = { id: string; nombre: string; telefono?: string };
      const creatorsMap = new Map((creators as Creator[] || []).map(c => [c.id, c]));

      const enriched = (bonifs || []).map(b => ({
        ...b,
        nombre: creatorsMap.get(b.creator_id)?.nombre || 'Sin nombre',
        telefono: creatorsMap.get(b.creator_id)?.telefono
      }));

      setBonificaciones(enriched);
    } catch (error) {
      console.error('Error cargando bonificaciones:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las bonificaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularTodasLasBonificaciones = async () => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-all-bonificaciones');

      if (error) throw error;

      toast({
        title: "✅ Bonificaciones calculadas",
        description: `Se procesaron ${data?.total || 0} creadores`,
      });

      await loadBonificaciones();
    } catch (error) {
      console.error('Error calculando bonificaciones:', error);
      toast({
        title: "Error",
        description: "No se pudieron calcular las bonificaciones",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const calcularProbabilidad = (bonif: CreatorBonificacion): { color: string; label: string; porcentaje: number } => {
    const fechaActual = new Date();
    const diaDelMes = fechaActual.getDate();
    const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
    const tiempoTranscurrido = (diaDelMes / ultimoDia) * 100;

    // Encontrar próxima graduación
    const graduaciones = [50000, 100000, 300000, 500000, 1000000];
    const proximaGrad = graduaciones.find(g => bonif.diam_live_mes < g) || 1000000;
    const avance = (bonif.diam_live_mes / proximaGrad) * 100;

    if (avance >= tiempoTranscurrido * 0.9) {
      return { color: "bg-green-500", label: "Alta", porcentaje: 85 };
    } else if (avance >= tiempoTranscurrido * 0.6) {
      return { color: "bg-yellow-500", label: "Media", porcentaje: 50 };
    } else {
      return { color: "bg-red-500", label: "Baja", porcentaje: 20 };
    }
  };

  const exportarExcel = () => {
    const dataParaExcel = bonificaciones.map(b => {
      const prob = calcularProbabilidad(b);
      return {
        'Creador': b.nombre,
        'Días LIVE': b.dias_live_mes,
        'Horas LIVE': b.horas_live_mes,
        'Diamantes': b.diam_live_mes,
        'Próximo Objetivo': b.proximo_objetivo_valor,
        'Req. Diam/Día': b.req_diam_por_dia,
        'Req. Horas/Día': b.req_horas_por_dia?.toFixed(1),
        'Días Restantes': b.dias_restantes,
        'Probabilidad': prob.label,
        '50K': b.grad_50k ? 'Sí' : 'No',
        '100K': b.grad_100k ? 'Sí' : 'No',
        '300K': b.grad_300k ? 'Sí' : 'No',
        '500K': b.grad_500k ? 'Sí' : 'No',
        '1M': b.grad_1m ? 'Sí' : 'No',
        '12d/40h': b.hito_12d_40h ? 'Sí' : 'No',
        '20d/60h': b.hito_20d_60h ? 'Sí' : 'No',
        '22d/80h': b.hito_22d_80h ? 'Sí' : 'No',
        'Bono Extra (USD)': b.bono_extra_usd,
        'Prioridad 300K': b.es_prioridad_300k ? 'Sí' : 'No'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataParaExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bonificaciones");
    XLSX.writeFile(wb, `bonificaciones_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Exportado exitosamente",
      description: "El archivo Excel ha sido descargado",
    });
  };

  const generarMensajeWhatsApp = (bonif: CreatorBonificacion): string => {
    const prob = calcularProbabilidad(bonif);
    
    let mensaje = `🎯 *Reporte del Mes - ${bonif.nombre}*\n\n`;
    mensaje += `📊 *Avance actual:*\n`;
    mensaje += `📅 ${bonif.dias_live_mes} días • ⏰ ${bonif.horas_live_mes}h • 💎 ${bonif.diam_live_mes.toLocaleString()}\n\n`;
    mensaje += `🎯 *Próximo objetivo:* ${bonif.proximo_objetivo_valor}\n`;
    mensaje += `📈 *Necesitas:* ${bonif.req_diam_por_dia?.toLocaleString() || 0} diam/día • ${bonif.req_horas_por_dia?.toFixed(1) || 0}h/día\n`;
    mensaje += `📅 *Días restantes:* ${bonif.dias_restantes}\n`;
    mensaje += `🎲 *Probabilidad:* ${prob.label}\n\n`;

    if (bonif.es_prioridad_300k) {
      mensaje += `⭐ *PRIORIDAD:* Alcanzar 300K este mes\n\n`;
    }

    if (bonif.cerca_de_objetivo) {
      mensaje += `🔥 *¡Estás muy cerca!* Un último empujón y lo logras\n\n`;
    }

    if (bonif.bono_extra_usd > 0) {
      mensaje += `💰 *Bono extra:* $${bonif.bono_extra_usd} USD (${bonif.dias_extra_22} días)\n\n`;
    }

    mensaje += `¡Sigue así! 💪`;

    return mensaje;
  };

  const abrirWhatsApp = async (bonif: CreatorBonificacion) => {
    if (!bonif.telefono) {
      toast({
        title: "Sin teléfono",
        description: "Este creador no tiene número registrado",
        variant: "destructive",
      });
      return;
    }

    try {
      await openWhatsApp({
        phone: bonif.telefono,
        message: generarMensajeWhatsApp(bonif),
        creatorId: bonif.creator_id,
        creatorName: bonif.nombre,
        actionType: 'bonificaciones'
      });
      
      toast({
        title: "✅ WhatsApp abierto",
        description: "Mensaje enviado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const bonificacionesFiltradas = bonificaciones.filter(b => {
    const matchSearch = b.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filtroRiesgo === "todos") return matchSearch;
    
    const prob = calcularProbabilidad(b);
    const matchRiesgo = 
      (filtroRiesgo === "verde" && prob.color === "bg-green-500") ||
      (filtroRiesgo === "amarillo" && prob.color === "bg-yellow-500") ||
      (filtroRiesgo === "rojo" && prob.color === "bg-red-500");
    
    return matchSearch && matchRiesgo;
  });

  const estadisticas = {
    total: bonificaciones.length,
    conAltoRiesgo: bonificaciones.filter(b => calcularProbabilidad(b).color === "bg-red-500").length,
    cercaDeObjetivo: bonificaciones.filter(b => b.cerca_de_objetivo).length,
    conBono: bonificaciones.filter(b => b.bono_extra_usd > 0).length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Encabezado y acciones */}
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <Target className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                <span className="text-base md:text-2xl">Panel Predictivo</span>
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Análisis del mes actual
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={calcularTodasLasBonificaciones}
                disabled={calculating}
                variant="default"
                size="sm"
                className="w-full sm:w-auto text-xs md:text-sm"
              >
                {calculating ? (
                  <>
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-2 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    Recalcular
                  </>
                )}
              </Button>
              <Button
                onClick={exportarExcel}
                variant="outline"
                size="sm"
                disabled={bonificaciones.length === 0}
                className="w-full sm:w-auto text-xs md:text-sm"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="p-3 md:p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Total</p>
              <p className="text-lg md:text-2xl font-bold text-primary">{estadisticas.total}</p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Riesgo</p>
              <p className="text-lg md:text-2xl font-bold text-red-500">{estadisticas.conAltoRiesgo}</p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Cerca</p>
              <p className="text-lg md:text-2xl font-bold text-green-500">{estadisticas.cercaDeObjetivo}</p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Bono</p>
              <p className="text-lg md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{estadisticas.conBono}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filtroRiesgo === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroRiesgo("todos")}
                className="text-xs flex-1 sm:flex-none"
              >
                Todos
              </Button>
              <Button
                variant={filtroRiesgo === "verde" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroRiesgo("verde")}
                className={`text-xs flex-1 sm:flex-none ${filtroRiesgo === "verde" ? "bg-green-500 hover:bg-green-600" : ""}`}
              >
                Alta
              </Button>
              <Button
                variant={filtroRiesgo === "amarillo" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroRiesgo("amarillo")}
                className={`text-xs flex-1 sm:flex-none ${filtroRiesgo === "amarillo" ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
              >
                Media
              </Button>
              <Button
                variant={filtroRiesgo === "rojo" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroRiesgo("rojo")}
                className={`text-xs flex-1 sm:flex-none ${filtroRiesgo === "rojo" ? "bg-red-500 hover:bg-red-600" : ""}`}
              >
                Baja
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de creadores */}
      <div className="space-y-2 md:space-y-3">
        {bonificacionesFiltradas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 md:py-12 px-4">
              <p className="text-sm md:text-base text-muted-foreground">
                {bonificaciones.length === 0 
                  ? "No hay bonificaciones. Haz clic en 'Recalcular' para generar datos."
                  : "No se encontraron creadores"}
              </p>
            </CardContent>
          </Card>
        ) : (
          bonificacionesFiltradas.map((bonif) => {
            const prob = calcularProbabilidad(bonif);
            const proximaGrad = [50000, 100000, 300000, 500000, 1000000].find(g => bonif.diam_live_mes < g) || 1000000;
            const progresoGrad = (bonif.diam_live_mes / proximaGrad) * 100;

            return (
              <Card key={bonif.id} className="bg-card/50 hover:bg-card/80 transition-all">
                <CardContent className="p-3 md:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                        <h3 className="text-base md:text-lg font-semibold truncate">{bonif.nombre}</h3>
                        <div className={`w-3 h-3 rounded-full ${prob.color} flex-shrink-0`} title={`Probabilidad: ${prob.label}`} />
                        {bonif.es_prioridad_300k && (
                          <Badge variant="destructive" className="text-[10px] md:text-xs">Prioridad 300K</Badge>
                        )}
                        {bonif.cerca_de_objetivo && (
                          <Badge variant="default" className="text-[10px] md:text-xs">Cerca!</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                        <div>
                          <p className="text-muted-foreground text-[10px] md:text-xs">Días</p>
                          <p className="font-semibold text-sm md:text-base">{bonif.dias_live_mes}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] md:text-xs">Horas</p>
                          <p className="font-semibold text-sm md:text-base">{bonif.horas_live_mes?.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] md:text-xs">Diam</p>
                          <p className="font-semibold text-accent text-sm md:text-base">{bonif.diam_live_mes?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    {bonif.telefono && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => abrirWhatsApp(bonif)}
                        className="w-full sm:w-auto text-xs"
                      >
                        <MessageCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        WhatsApp
                      </Button>
                    )}
                  </div>

                  {/* Progreso */}
                  <div className="mb-3 md:mb-4">
                    <div className="flex justify-between text-xs md:text-sm mb-2">
                      <span className="text-muted-foreground truncate mr-2">
                        {bonif.proximo_objetivo_valor || "Completado"}
                      </span>
                      <span className="font-medium flex-shrink-0">
                        {progresoGrad.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={progresoGrad} className="h-1.5 md:h-2" />
                  </div>

                  {/* Requerimientos */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 text-xs md:text-sm">
                    <div className="p-2 md:p-3 rounded-lg bg-muted/30">
                      <p className="text-muted-foreground mb-1 text-[10px] md:text-xs">Diam/Día</p>
                      <p className="font-semibold text-xs md:text-sm">{bonif.req_diam_por_dia?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-muted/30">
                      <p className="text-muted-foreground mb-1 text-[10px] md:text-xs">H/Día</p>
                      <p className="font-semibold text-xs md:text-sm">{bonif.req_horas_por_dia?.toFixed(1) || 0}</p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-muted/30">
                      <p className="text-muted-foreground mb-1 text-[10px] md:text-xs">Días Rest.</p>
                      <p className="font-semibold text-xs md:text-sm">{bonif.dias_restantes}</p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-muted/30">
                      <p className="text-muted-foreground mb-1 text-[10px] md:text-xs">Probabilidad</p>
                      <p className="font-semibold flex items-center gap-1 text-xs md:text-sm">
                        {prob.label}
                        {prob.label === "Alta" && <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />}
                        {prob.label === "Media" && <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />}
                        {prob.label === "Baja" && <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />}
                      </p>
                    </div>
                  </div>

                  {/* Logros */}
                  <div className="mt-3 md:mt-4 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-1 flex-wrap">
                      {bonif.grad_50k && <Badge variant="secondary" className="text-[10px] md:text-xs">50K</Badge>}
                      {bonif.grad_100k && <Badge variant="secondary" className="text-[10px] md:text-xs">100K</Badge>}
                      {bonif.grad_300k && <Badge variant="secondary" className="text-[10px] md:text-xs">300K</Badge>}
                      {bonif.grad_500k && <Badge variant="secondary" className="text-[10px] md:text-xs">500K</Badge>}
                      {bonif.grad_1m && <Badge variant="secondary" className="text-[10px] md:text-xs">1M</Badge>}
                      {bonif.hito_12d_40h && <Badge variant="outline" className="text-[10px] md:text-xs">12d/40h</Badge>}
                      {bonif.hito_20d_60h && <Badge variant="outline" className="text-[10px] md:text-xs">20d/60h</Badge>}
                      {bonif.hito_22d_80h && <Badge variant="outline" className="text-[10px] md:text-xs">22d/80h</Badge>}
                    </div>
                    {bonif.bono_extra_usd > 0 && (
                      <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-semibold text-green-600 dark:text-green-400">
                        <Award className="h-3 w-3 md:h-4 md:w-4" />
                        +${bonif.bono_extra_usd} USD
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ImpactData {
  period: string;
  diamantes_mejora: number;
  engagement_mejora: number;
  dias_live_mejora: number;
  creadores_count: number;
}

export const FeedbackImpactChart = () => {
  const [impactData, setImpactData] = useState<ImpactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCreators: 0,
    avgDiamanteIncrease: 0,
    avgEngagementIncrease: 0,
  });

  useEffect(() => {
    fetchImpactData();
  }, []);

  const fetchImpactData = async () => {
    try {
      // Obtener datos de impacto de los últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1); // Primer día del mes

      const { data: impactRecords, error } = await supabase
        .from("creator_feedback_impact")
        .select("*")
        .gte("month_date", sixMonthsAgo.toISOString().split('T')[0])
        .order("month_date", { ascending: false });

      if (error) {
        console.error("Error fetching impact data:", error);
        setLoading(false);
        return;
      }

      // Agrupar por mes y calcular promedios
      const monthMap = new Map<string, {
        diamantes_total: number;
        engagement_total: number;
        dias_live_total: number;
        count: number;
      }>();

      impactRecords?.forEach(record => {
        const monthKey = new Date(record.month_date).toLocaleDateString('es-MX', { 
          month: 'short', 
          year: '2-digit' 
        });
        
        const diamantesDiff = (record.diamantes_after || 0) - (record.diamantes_before || 0);
        const engagementDiff = (record.engagement_after || 0) - (record.engagement_before || 0);
        const diasLiveDiff = (record.dias_live_after || 0) - (record.dias_live_before || 0);
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            diamantes_total: 0,
            engagement_total: 0,
            dias_live_total: 0,
            count: 0,
          });
        }

        const current = monthMap.get(monthKey)!;
        current.diamantes_total += diamantesDiff;
        current.engagement_total += engagementDiff;
        current.dias_live_total += diasLiveDiff;
        current.count += 1;
      });

      // Convertir a array y calcular promedios
      const chartData: ImpactData[] = Array.from(monthMap.entries()).map(([period, data]) => ({
        period,
        diamantes_mejora: Math.round(data.diamantes_total / data.count),
        engagement_mejora: Number((data.engagement_total / data.count).toFixed(2)),
        dias_live_mejora: Number((data.dias_live_total / data.count).toFixed(1)),
        creadores_count: data.count,
      })).reverse();

      setImpactData(chartData);

      // Calcular estadísticas generales
      const totalCreators = new Set(impactRecords?.map(r => r.creator_id)).size;
      const avgDiamante = chartData.reduce((sum, d) => sum + d.diamantes_mejora, 0) / (chartData.length || 1);
      const avgEngagement = chartData.reduce((sum, d) => sum + d.engagement_mejora, 0) / (chartData.length || 1);

      setStats({
        totalCreators,
        avgDiamanteIncrease: Math.round(avgDiamante),
        avgEngagementIncrease: Number(avgEngagement.toFixed(2)),
      });

    } catch (error) {
      console.error("Error in fetchImpactData:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Impacto de tu Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (impactData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Impacto de tu Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aún no hay datos de impacto disponibles</p>
            <p className="text-sm mt-2">Los datos se generarán después del primer período de feedback</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Impacto de tu Feedback
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Evolución mensual del desempeño de creadores con retroalimentación
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estadísticas resumidas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
            <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-foreground">{stats.totalCreators}</div>
            <div className="text-xs text-muted-foreground">Creadores apoyados</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-accent/5 border border-accent/10">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-accent" />
            <div className="text-2xl font-bold text-foreground">+{stats.avgDiamanteIncrease.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Diamantes promedio</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/10">
            <BarChart3 className="h-5 w-5 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-foreground">+{stats.avgEngagementIncrease}%</div>
            <div className="text-xs text-muted-foreground">Engagement promedio</div>
          </div>
        </div>

        {/* Gráfico de evolución */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={impactData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="diamantes_mejora" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                name="Mejora Diamantes"
                dot={{ fill: 'hsl(var(--accent))' }}
              />
              <Line 
                type="monotone" 
                dataKey="dias_live_mejora" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Mejora Días Live"
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Mostrando impacto de los últimos {impactData.length} meses
        </div>
      </CardContent>
    </Card>
  );
};

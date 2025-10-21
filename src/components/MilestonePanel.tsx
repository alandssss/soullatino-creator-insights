import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Creator {
  id: string;
  nombre: string;
  dias_live_mes?: number;
  horas_live_mes?: number;
  diamantes?: number;
  telefono?: string;
}

interface MilestonePanelProps {
  creators: Creator[];
}

interface BonificacionData {
  creator_id: string;
  hito_12d_40h: boolean;
  hito_20d_60h: boolean;
  hito_22d_80h: boolean;
  dias_live_mes: number;
  horas_live_mes: number;
  diam_live_mes: number;
  creators?: {
    nombre: string;
    telefono?: string;
  };
}

export function MilestonePanel({ creators }: MilestonePanelProps) {
  const [loading, setLoading] = useState(true);
  const [bonificaciones, setBonificaciones] = useState<BonificacionData[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<"bronze" | "silver" | "gold">("bronze");

  useEffect(() => {
    loadBonificaciones();
  }, []);

  const loadBonificaciones = async () => {
    try {
      const mesActual = new Date();
      const mesRef = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-01`;
      
      const { data, error } = await supabase
        .from('creator_bonificaciones')
        .select(`
          *,
          creators!inner(nombre, telefono)
        `)
        .eq('mes_referencia', mesRef);

      if (error) throw error;
      setBonificaciones(data || []);
    } catch (error) {
      console.error('Error loading bonificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneCreators = (milestone: "bronze" | "silver" | "gold") => {
    return bonificaciones.filter(bonif => {
      switch (milestone) {
        case "bronze":
          return bonif.hito_12d_40h;
        case "silver":
          return bonif.hito_20d_60h;
        case "gold":
          return bonif.hito_22d_80h;
        default:
          return false;
      }
    });
  };

  const bronzeCreators = getMilestoneCreators("bronze");
  const silverCreators = getMilestoneCreators("silver");
  const goldCreators = getMilestoneCreators("gold");

  if (loading) {
    return (
      <Card className="neo-card border-border/30">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="neo-card border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          🎯 Hitos de la Agencia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedMilestone} onValueChange={(v) => setSelectedMilestone(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bronze" className="flex items-center gap-2">
              <span className="text-xl">🥉</span>
              Bronce ({bronzeCreators.length})
            </TabsTrigger>
            <TabsTrigger value="silver" className="flex items-center gap-2">
              <span className="text-xl">🥈</span>
              Plata ({silverCreators.length})
            </TabsTrigger>
            <TabsTrigger value="gold" className="flex items-center gap-2">
              <span className="text-xl">🥇</span>
              Oro ({goldCreators.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bronze" className="mt-4 space-y-3">
            <div className="neo-card-sm p-4 rounded-lg border-l-4 border-green-500/50 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🥉</span>
                <h3 className="font-semibold text-sm">Hito Bronce</h3>
              </div>
              <p className="text-xs text-muted-foreground">12 días / 40 horas en LIVE</p>
            </div>

            {bronzeCreators.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No hay creadores en este hito</p>
            ) : (
              <div className="grid gap-2">
                {bronzeCreators.map((bonif) => (
                  <div key={bonif.creator_id} className="neo-card-sm p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{bonif.creators?.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {bonif.dias_live_mes}d / {bonif.horas_live_mes.toFixed(1)}h / {bonif.diam_live_mes.toLocaleString()} 💎
                      </p>
                    </div>
                    <div className="text-2xl">✅</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="silver" className="mt-4 space-y-3">
            <div className="neo-card-sm p-4 rounded-lg border-l-4 border-blue-500/50 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🥈</span>
                <h3 className="font-semibold text-sm">Hito Plata</h3>
              </div>
              <p className="text-xs text-muted-foreground">20 días / 60 horas en LIVE</p>
            </div>

            {silverCreators.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No hay creadores en este hito</p>
            ) : (
              <div className="grid gap-2">
                {silverCreators.map((bonif) => (
                  <div key={bonif.creator_id} className="neo-card-sm p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{bonif.creators?.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {bonif.dias_live_mes}d / {bonif.horas_live_mes.toFixed(1)}h / {bonif.diam_live_mes.toLocaleString()} 💎
                      </p>
                    </div>
                    <div className="text-2xl">✅</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gold" className="mt-4 space-y-3">
            <div className="neo-card-sm p-4 rounded-lg border-l-4 border-yellow-500/50 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🥇</span>
                <h3 className="font-semibold text-sm">Hito Oro</h3>
              </div>
              <p className="text-xs text-muted-foreground">22 días / 80 horas en LIVE</p>
            </div>

            {goldCreators.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No hay creadores en este hito</p>
            ) : (
              <div className="grid gap-2">
                {goldCreators.map((bonif) => (
                  <div key={bonif.creator_id} className="neo-card-sm p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{bonif.creators?.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {bonif.dias_live_mes}d / {bonif.horas_live_mes.toFixed(1)}h / {bonif.diam_live_mes.toLocaleString()} 💎
                      </p>
                    </div>
                    <div className="text-2xl">✅</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

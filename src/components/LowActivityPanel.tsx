import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Creator = Tables<"creators">;

export const LowActivityPanel = () => {
  const [lowActivityCreators, setLowActivityCreators] = useState<Creator[]>([]);
  const [zeroActivityCreators, setZeroActivityCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLowOpen, setIsLowOpen] = useState(false);
  const [isZeroOpen, setIsZeroOpen] = useState(false);

  useEffect(() => {
    fetchLowActivityCreators();
  }, []);

  const fetchLowActivityCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .lt("dias_live", 4)
        .eq("status", "activo")
        .order("dias_live", { ascending: true });

      if (error) throw error;
      
      // Separar creadores con 0 días de los que tienen 1-3 días
      const zero = (data || []).filter(c => (c.dias_live || 0) === 0);
      const low = (data || []).filter(c => (c.dias_live || 0) > 0 && (c.dias_live || 0) < 4);
      
      setZeroActivityCreators(zero);
      setLowActivityCreators(low);
    } catch (error) {
      console.error("Error fetching low activity creators:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Creadores con Baja Actividad
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

  const totalLowActivity = lowActivityCreators.length + zeroActivityCreators.length;

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Creadores con Baja Actividad
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {totalLowActivity} creadores con menos de 4 días live este mes
        </p>
      </CardHeader>
      <CardContent>
        {totalLowActivity === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Todos los creadores tienen buena actividad</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Creadores con 1-3 días - Menú desplegable */}
            {lowActivityCreators.length > 0 && (
              <Collapsible open={isLowOpen} onOpenChange={setIsLowOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto border border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-orange-500">
                        {lowActivityCreators.length} creadores con baja actividad (1-3 días)
                      </span>
                    </div>
                    {isLowOpen ? (
                      <ChevronUp className="h-4 w-4 text-orange-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-orange-500" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3">
                  {lowActivityCreators.map((creator) => (
                    <div
                      key={creator.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                    >
                      <div>
                        <h3 className="font-semibold text-foreground">{creator.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          {creator.categoria || "Sin categoría"} • {creator.manager || "Sin manager"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-orange-500 font-bold">
                          <Calendar className="h-4 w-4" />
                          <span>{creator.dias_live || 0} días</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(creator.horas_live || 0).toFixed(1)} hrs live
                        </p>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Creadores con 0 días - Menú desplegable */}
            {zeroActivityCreators.length > 0 && (
              <Collapsible open={isZeroOpen} onOpenChange={setIsZeroOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-red-500">
                        {zeroActivityCreators.length} creadores sin actividad (0 días)
                      </span>
                    </div>
                    {isZeroOpen ? (
                      <ChevronUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3">
                  {zeroActivityCreators.map((creator) => (
                    <div
                      key={creator.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-red-500/20 hover:border-red-500/40 transition-all"
                    >
                      <div>
                        <h3 className="font-semibold text-foreground">{creator.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          {creator.categoria || "Sin categoría"} • {creator.manager || "Sin manager"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-red-500 font-bold">
                          <Calendar className="h-4 w-4" />
                          <span>0 días</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(creator.horas_live || 0).toFixed(1)} hrs live
                        </p>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

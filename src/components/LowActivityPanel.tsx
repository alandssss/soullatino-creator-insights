import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Creator = Tables<"creators">;

export const LowActivityPanel = () => {
  const [lowActivityCreators, setLowActivityCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLowActivityCreators(data || []);
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

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Creadores con Baja Actividad
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {lowActivityCreators.length} creadores con menos de 4 días live este mes
        </p>
      </CardHeader>
      <CardContent>
        {lowActivityCreators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Todos los creadores tienen buena actividad</p>
          </div>
        ) : (
          <div className="space-y-3">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

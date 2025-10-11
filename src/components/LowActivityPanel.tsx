import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Creator = Tables<"creators">;

export const LowActivityPanel = () => {
  const [creatorsByDays, setCreatorsByDays] = useState<{ [key: number]: Creator[] }>({});
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchLowActivityCreators();
  }, []);

  const fetchLowActivityCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .lte("dias_live", 8)
        .eq("status", "activo")
        .order("dias_live", { ascending: false });

      if (error) throw error;
      
      // Agrupar creadores por días live exactos
      const grouped: { [key: number]: Creator[] } = {};
      (data || []).forEach(creator => {
        const days = creator.dias_live || 0;
        if (!grouped[days]) {
          grouped[days] = [];
        }
        grouped[days].push(creator);
      });
      
      setCreatorsByDays(grouped);
    } catch (error) {
      console.error("Error fetching low activity creators:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (days: number) => {
    setOpenSections(prev => ({
      ...prev,
      [days]: !prev[days]
    }));
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

  const totalLowActivity = Object.values(creatorsByDays).reduce((sum, creators) => sum + creators.length, 0);

  const getColorForDays = (days: number) => {
    if (days === 0) return { border: "border-destructive/40", bg: "hover:bg-destructive/10", text: "text-destructive", icon: "text-destructive" };
    if (days === 1) return { border: "border-accent/40", bg: "hover:bg-accent/10", text: "text-accent", icon: "text-accent" };
    if (days === 2) return { border: "border-accent/35", bg: "hover:bg-accent/8", text: "text-accent/90", icon: "text-accent/90" };
    if (days === 3) return { border: "border-primary/40", bg: "hover:bg-primary/10", text: "text-primary", icon: "text-primary" };
    if (days === 4) return { border: "border-primary/35", bg: "hover:bg-primary/8", text: "text-primary/90", icon: "text-primary/90" };
    if (days === 5) return { border: "border-primary/30", bg: "hover:bg-primary/5", text: "text-primary/80", icon: "text-primary/80" };
    if (days === 6) return { border: "border-muted-foreground/30", bg: "hover:bg-muted/10", text: "text-muted-foreground", icon: "text-muted-foreground" };
    if (days === 7) return { border: "border-muted-foreground/25", bg: "hover:bg-muted/8", text: "text-muted-foreground/90", icon: "text-muted-foreground/90" };
    if (days === 8) return { border: "border-muted-foreground/20", bg: "hover:bg-muted/5", text: "text-muted-foreground/80", icon: "text-muted-foreground/80" };
    return { border: "border-muted", bg: "hover:bg-muted/5", text: "text-muted-foreground", icon: "text-muted-foreground" };
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Creadores con Baja Actividad
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {totalLowActivity} creadores con 8 días live o menos este mes
        </p>
      </CardHeader>
      <CardContent>
        {totalLowActivity === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Todos los creadores tienen buena actividad</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Ordenar por días descendente (8, 7, 6, 5, 4, 3, 2, 1, 0) */}
            {[8, 7, 6, 5, 4, 3, 2, 1, 0].map(days => {
              if (!creatorsByDays[days] || creatorsByDays[days].length === 0) return null;
              
              const colors = getColorForDays(days);
              const creators = creatorsByDays[days];
              
              return (
                <Collapsible 
                  key={days} 
                  open={openSections[days]} 
                  onOpenChange={() => toggleSection(days)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`w-full justify-between p-3 h-auto border ${colors.border} ${colors.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-4 w-4 ${colors.icon}`} />
                        <span className={`font-medium ${colors.text}`}>
                          {creators.length} {creators.length === 1 ? 'creador' : 'creadores'} con {days} {days === 1 ? 'día' : 'días'} live
                        </span>
                      </div>
                      {openSections[days] ? (
                        <ChevronUp className={`h-4 w-4 ${colors.icon}`} />
                      ) : (
                        <ChevronDown className={`h-4 w-4 ${colors.icon}`} />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {creators.map((creator) => (
                      <div
                        key={creator.id}
                        className={`flex items-center justify-between p-3 rounded-lg bg-background/50 border ${colors.border.replace('hover:', '')} hover:${colors.border.split('hover:')[1]} transition-all`}
                      >
                        <div>
                          <h3 className="font-semibold text-foreground">{creator.nombre}</h3>
                          <p className="text-sm text-muted-foreground">
                            {creator.categoria || "Sin categoría"} • {creator.manager || "Sin manager"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center gap-1 ${colors.text} font-bold`}>
                            <Calendar className="h-4 w-4" />
                            <span>{days} {days === 1 ? 'día' : 'días'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(creator.horas_live || 0).toFixed(1)} hrs live
                          </p>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

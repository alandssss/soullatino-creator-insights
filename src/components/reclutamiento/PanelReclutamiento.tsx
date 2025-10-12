import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Search, 
  Phone, 
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  Filter
} from "lucide-react";
import { NuevoProspectoDialog } from "./NuevoProspectoDialog";
import { ProspectoCard } from "./ProspectoCard";

interface Prospecto {
  id: string;
  nombre_completo: string;
  usuario_tiktok: string;
  pais: string;
  whatsapp: string;
  instagram?: string;
  edad?: number;
  estado_actual: string;
  fecha_captura: string;
  fecha_ultimo_cambio: string;
  reclutador_nombre?: string;
  mostro_interes?: boolean;
  en_humand: boolean;
  notas?: any;
}

const ESTADOS = [
  { id: "nuevo", label: "🟡 Nuevo", color: "bg-yellow-500", description: "Pendiente de contacto" },
  { id: "contactado", label: "🟠 Contactado", color: "bg-orange-500", description: "En seguimiento" },
  { id: "acepto", label: "🟢 Aceptó", color: "bg-green-500", description: "Ingresará" },
  { id: "registrado_humand", label: "🔵 En Humand", color: "bg-blue-500", description: "Registrado" },
  { id: "activo", label: "✅ Activo", color: "bg-emerald-500", description: "Transmitiendo" },
];

export const PanelReclutamiento = () => {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProspectos();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('prospectos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospectos_reclutamiento'
        },
        () => {
          loadProspectos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProspectos = async () => {
    try {
      const { data, error } = await supabase
        .from('prospectos_reclutamiento')
        .select('*')
        .neq('estado_actual', 'descartado')
        .order('fecha_captura', { ascending: false });

      if (error) throw error;
      setProspectos(data || []);
    } catch (error) {
      console.error('Error cargando prospectos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los prospectos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const prospectosPorEstado = (estado: string) => {
    return prospectosFiltrados.filter(p => p.estado_actual === estado);
  };

  const prospectosFiltrados = prospectos.filter(p => {
    const matchSearch = 
      p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.usuario_tiktok.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filtroEstado === "todos") return matchSearch;
    return matchSearch && p.estado_actual === filtroEstado;
  });

  const estadisticas = {
    total: prospectos.length,
    nuevos: prospectos.filter(p => p.estado_actual === 'nuevo').length,
    enSeguimiento: prospectos.filter(p => p.estado_actual === 'contactado').length,
    aceptaron: prospectos.filter(p => p.estado_actual === 'acepto').length,
    enHumand: prospectos.filter(p => p.en_humand).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Panel de Reclutamiento
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gestión de prospectos y seguimiento personalizado
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Prospecto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Total Prospectos</p>
              <p className="text-2xl font-bold text-primary">{estadisticas.total}</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-muted-foreground mb-1">Nuevos</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{estadisticas.nuevos}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs text-muted-foreground mb-1">En Seguimiento</p>
              <p className="text-2xl font-bold text-orange-500">{estadisticas.enSeguimiento}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Aceptaron</p>
              <p className="text-2xl font-bold text-green-500">{estadisticas.aceptaron}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">En Humand</p>
              <p className="text-2xl font-bold text-blue-500">{estadisticas.enHumand}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar prospecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtroEstado === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroEstado("todos")}
              >
                <Filter className="h-4 w-4 mr-2" />
                Todos
              </Button>
              {ESTADOS.map(estado => (
                <Button
                  key={estado.id}
                  variant={filtroEstado === estado.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroEstado(estado.id)}
                >
                  {estado.label.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista Embudo/Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {ESTADOS.map((estado) => {
          const prospectosEnEstado = prospectosPorEstado(estado.id);
          
          return (
            <Card key={estado.id} className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${estado.color}`} />
                    {estado.label}
                  </div>
                  <Badge variant="secondary">{prospectosEnEstado.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{estado.description}</p>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {prospectosEnEstado.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Sin prospectos
                  </div>
                ) : (
                  prospectosEnEstado.map((prospecto) => (
                    <ProspectoCard
                      key={prospecto.id}
                      prospecto={prospecto}
                      onUpdate={loadProspectos}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Diálogo nuevo prospecto */}
      <NuevoProspectoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadProspectos}
      />
    </div>
  );
};

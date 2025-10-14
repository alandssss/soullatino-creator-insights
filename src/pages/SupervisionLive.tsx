import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Eye,
  Swords,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  Video,
  Shield
} from "lucide-react";
import { CreatorCard } from "@/components/supervision/CreatorCard";
import { CreatorDrawer } from "@/components/supervision/CreatorDrawer";
import { IncidentDialog } from "@/components/supervision/IncidentDialog";
import * as XLSX from "xlsx";

interface Creator {
  id: string;
  nombre: string;
  telefono?: string;
  dias_en_agencia?: number;
  diam_live_mes?: number;
}

interface SupervisionLog {
  id: string;
  creator_id: string;
  observer_name?: string | null;
  fecha_evento: string;
  en_vivo: boolean;
  en_batalla: boolean;
  buena_iluminacion: boolean;
  cumple_normas: boolean;
  audio_claro: boolean;
  set_profesional: boolean;
  score: number;
  riesgo: string;
  reporte?: string | null;
  severidad?: string | null;
  accion_sugerida?: string | null;
}

export default function SupervisionLive() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [logs, setLogs] = useState<SupervisionLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState<"todos" | "verde" | "amarillo" | "rojo">("todos");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

  useEffect(() => {
    checkAccess();
    loadData();
    setupRealtime();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'manager', 'supervisor'].includes(roleData.role)) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para acceder a este módulo",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar creadores
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select('id, nombre, telefono, dias_en_agencia, diam_live_mes')
        .order('nombre');

      if (creatorsError) throw creatorsError;
      setCreators(creatorsData || []);

      // Cargar logs recientes (últimas 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: logsData, error: logsError } = await supabase
        .from('supervision_live_logs')
        .select('*')
        .gte('fecha_evento', oneDayAgo)
        .order('fecha_evento', { ascending: false });

      if (logsError) throw logsError;
      setLogs((logsData || []) as SupervisionLog[]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('supervision-live-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supervision_live_logs'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getLatestLogForCreator = (creatorId: string): SupervisionLog | undefined => {
    return logs.find(log => log.creator_id === creatorId);
  };

  const creatorsFiltrados = creators.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;

    if (filtroRiesgo === "todos") return true;

    const latestLog = getLatestLogForCreator(c.id);
    return latestLog?.riesgo === filtroRiesgo;
  });

  const kpis = {
    enVivoAhora: logs.filter(l => l.en_vivo && new Date(l.fecha_evento).getTime() > Date.now() - 15 * 60 * 1000).length,
    enBatallaAhora: logs.filter(l => l.en_batalla && new Date(l.fecha_evento).getTime() > Date.now() - 15 * 60 * 1000).length,
    alertasActivas: logs.filter(l => l.riesgo === 'rojo').length,
    buenaIluminacion: logs.filter(l => l.buena_iluminacion).length,
  };

  const exportarCSV = () => {
    const dataParaExcel = logs.map(log => {
      const creator = creators.find(c => c.id === log.creator_id);
      return {
        'Creador': creator?.nombre || log.creator_id,
        'Fecha/Hora': new Date(log.fecha_evento).toLocaleString(),
        'Supervisor': log.observer_name || '',
        'En Vivo': log.en_vivo ? 'Sí' : 'No',
        'En Batalla': log.en_batalla ? 'Sí' : 'No',
        'Buena Iluminación': log.buena_iluminacion ? 'Sí' : 'No',
        'Cumple Normas': log.cumple_normas ? 'Sí' : 'No',
        'Audio Claro': log.audio_claro ? 'Sí' : 'No',
        'Set Profesional': log.set_profesional ? 'Sí' : 'No',
        'Score': log.score,
        'Riesgo': log.riesgo,
        'Reporte': log.reporte || '',
        'Severidad': log.severidad || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataParaExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supervisión");
    XLSX.writeFile(wb, `supervision_live_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Exportado",
      description: "Archivo descargado correctamente",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 max-h-screen overflow-y-auto">
      {/* Header compacto */}
      <div className="neo-card p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Supervisión Live
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Supervisando: <span className="font-semibold">{creators.length}</span> creadores
            </p>
          </div>
          <Button onClick={exportarCSV} variant="outline" size="sm" className="neo-button">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* KPIs compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
          <div className="neo-card-sm p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Video className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">En Vivo</p>
            </div>
            <p className="text-lg md:text-xl font-bold text-green-500">{kpis.enVivoAhora}</p>
          </div>
          <div className="neo-card-sm p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Swords className="h-3 w-3 text-purple-500" />
              <p className="text-xs text-muted-foreground">En PK</p>
            </div>
            <p className="text-lg md:text-xl font-bold text-purple-500">{kpis.enBatallaAhora}</p>
          </div>
          <div className="neo-card-sm p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <p className="text-xs text-muted-foreground">Alertas</p>
            </div>
            <p className="text-lg md:text-xl font-bold text-red-500">{kpis.alertasActivas}</p>
          </div>
          <div className="neo-card-sm p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-3 w-3 text-yellow-600" />
              <p className="text-xs text-muted-foreground">Buena Luz</p>
            </div>
            <p className="text-lg md:text-xl font-bold text-yellow-600">{kpis.buenaIluminacion}</p>
          </div>
        </div>

        {/* Filtros compactos */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 neo-input h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={filtroRiesgo === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroRiesgo("todos")}
              className="neo-button text-xs px-3"
            >
              Todos
            </Button>
            <Button
              variant={filtroRiesgo === "verde" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroRiesgo("verde")}
              className={`neo-button text-xs px-3 ${filtroRiesgo === "verde" ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
            >
              🟢
            </Button>
            <Button
              variant={filtroRiesgo === "amarillo" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroRiesgo("amarillo")}
              className={`neo-button text-xs px-3 ${filtroRiesgo === "amarillo" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}`}
            >
              🟡
            </Button>
            <Button
              variant={filtroRiesgo === "rojo" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroRiesgo("rojo")}
              className={`neo-button text-xs px-3 ${filtroRiesgo === "rojo" ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
            >
              🔴
            </Button>
          </div>
        </div>
      </div>

      {/* Grid compacto de creadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {creatorsFiltrados.length === 0 ? (
          <div className="col-span-full neo-card p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No se encontraron creadores
            </p>
          </div>
        ) : (
          creatorsFiltrados.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              latestLog={getLatestLogForCreator(creator.id)}
              onClick={() => {
                setSelectedCreator(creator);
                setDrawerOpen(true);
              }}
            />
          ))
        )}
      </div>

      {/* Drawer lateral con acciones */}
      <CreatorDrawer
        creator={selectedCreator}
        latestLog={selectedCreator ? getLatestLogForCreator(selectedCreator.id) : undefined}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onReload={loadData}
        onOpenIncident={() => {
          setIncidentDialogOpen(true);
        }}
      />

      {/* Dialog de incidente */}
      {selectedCreator && (
        <IncidentDialog
          open={incidentDialogOpen}
          onOpenChange={setIncidentDialogOpen}
          creator={selectedCreator}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
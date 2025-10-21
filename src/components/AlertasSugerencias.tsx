import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, PhoneCall, MessageSquare, Search, AlertTriangle, TrendingUp } from "lucide-react";
import { openWhatsApp } from "@/utils/whatsapp";

interface Recommendation {
  creator_id: string;
  creator_username: string;
  phone_e164: string | null;
  dias_actuales: number;
  horas_actuales: number;
  diamantes_actuales: number;
  proximo_objetivo: string;
  dias_restantes: number;
  faltan_dias: number;
  faltan_horas: number;
  horas_min_dia_sugeridas: number;
  prioridad_riesgo: number;
}

interface Summary {
  total: number;
  riesgo_alto: number;
  riesgo_medio: number;
  riesgo_bajo: number;
  con_deficit_dias: number;
  con_deficit_horas: number;
}

export default function AlertasSugerencias() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecs, setFilteredRecs] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRiesgo, setFilterRiesgo] = useState<'all' | 'alto' | 'medio' | 'bajo'>('all');

  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    filterRecommendations();
  }, [recommendations, searchTerm, filterRiesgo]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-recommendations-today');
      
      if (error) throw error;
      
      if (data?.success) {
        setRecommendations(data.recommendations || []);
        setSummary(data.summary || null);
      }
    } catch (error: any) {
      console.error('Error loading recommendations:', error);
      toast.error('Error al cargar recomendaciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Por favor sube un archivo Excel (.xlsx o .xls)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-excel-recommendations', {
        body: formData,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`✅ ${data.records_processed} registros procesados`);
        await loadRecommendations();
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Error al procesar archivo: ' + error.message);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  const filterRecommendations = () => {
    let filtered = [...recommendations];

    // Búsqueda por nombre
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.creator_username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por riesgo
    if (filterRiesgo !== 'all') {
      if (filterRiesgo === 'alto') {
        filtered = filtered.filter(r => r.prioridad_riesgo >= 40);
      } else if (filterRiesgo === 'medio') {
        filtered = filtered.filter(r => r.prioridad_riesgo >= 20 && r.prioridad_riesgo < 40);
      } else if (filterRiesgo === 'bajo') {
        filtered = filtered.filter(r => r.prioridad_riesgo < 20);
      }
    }

    setFilteredRecs(filtered);
  };

  const generarMensajeWhatsApp = (rec: Recommendation): string => {
    return `Hola ${rec.creator_username} 👋
Quedan ${rec.dias_restantes} días del mes.

Para ${rec.proximo_objetivo}:
• Te faltan ${rec.faltan_dias} día(s)
• Te faltan ${rec.faltan_horas.toFixed(1)} horas

Recomiendo ${rec.horas_min_dia_sugeridas.toFixed(1)} horas/día hasta fin de mes.

${rec.prioridad_riesgo >= 40 ? '⚠️ Si saltas 1 día, podrías perder la bonificación.' : ''}

¿Confirmas ${rec.horas_min_dia_sugeridas.toFixed(1)}h hoy y 5 PKO de 5 min?`;
  };

  const handleWhatsApp = async (rec: Recommendation) => {
    if (!rec.phone_e164) {
      toast.error('Este creador no tiene teléfono registrado');
      return;
    }

    try {
      // Registrar contacto
      await supabase.functions.invoke('register-contact', {
        body: {
          creator_id: rec.creator_id,
          creator_username: rec.creator_username,
          phone_e164: rec.phone_e164,
          channel: 'WhatsApp'
        }
      });

      // Abrir WhatsApp
      await openWhatsApp({
        phone: rec.phone_e164,
        message: generarMensajeWhatsApp(rec),
        creatorId: rec.creator_id,
        creatorName: rec.creator_username,
        actionType: 'bonificaciones'
      });
    } catch (error: any) {
      console.error('Error WhatsApp:', error);
      toast.error('Error al abrir WhatsApp');
    }
  };

  const handleLlamar = async (rec: Recommendation) => {
    if (!rec.phone_e164) {
      toast.error('Este creador no tiene teléfono registrado');
      return;
    }

    try {
      // Registrar contacto
      await supabase.functions.invoke('register-contact', {
        body: {
          creator_id: rec.creator_id,
          creator_username: rec.creator_username,
          phone_e164: rec.phone_e164,
          channel: 'Telefono'
        }
      });

      // Abrir tel: en móvil o mostrar número
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = `tel:${rec.phone_e164}`;
      } else {
        toast.success(`Número: ${rec.phone_e164}`);
      }
    } catch (error: any) {
      console.error('Error llamar:', error);
      toast.error('Error al registrar llamada');
    }
  };

  const exportarCSV = () => {
    const headers = ['Creator', 'Días', 'Horas', 'Diamantes', 'Objetivo', 'Faltan Días', 'Faltan Horas', 'Horas/Día Sugeridas', 'Riesgo'];
    const rows = filteredRecs.map(r => [
      r.creator_username,
      r.dias_actuales,
      r.horas_actuales.toFixed(1),
      r.diamantes_actuales.toFixed(0),
      r.proximo_objetivo,
      r.faltan_dias,
      r.faltan_horas.toFixed(1),
      r.horas_min_dia_sugeridas.toFixed(1),
      r.prioridad_riesgo
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alertas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiesgoBadge = (prioridad: number) => {
    if (prioridad >= 40) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Riesgo Alto</Badge>;
    } else if (prioridad >= 20) {
      return <Badge variant="default" className="gap-1 bg-yellow-500"><AlertTriangle className="h-3 w-3" /> Riesgo Medio</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> Riesgo Bajo</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Alertas y Sugerencias</h2>
          <p className="text-muted-foreground">Sistema predictivo de bonificaciones</p>
        </div>
        
        <div className="flex gap-2">
          <label htmlFor="excel-upload">
            <Button disabled={uploading} asChild>
              <span className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Procesando...' : 'Subir Excel'}
              </span>
            </Button>
          </label>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button onClick={exportarCSV} variant="outline" disabled={filteredRecs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </Card>
          <Card className="p-4 border-red-500/50">
            <div className="text-sm text-muted-foreground">Riesgo Alto</div>
            <div className="text-2xl font-bold text-red-500">{summary.riesgo_alto}</div>
          </Card>
          <Card className="p-4 border-yellow-500/50">
            <div className="text-sm text-muted-foreground">Riesgo Medio</div>
            <div className="text-2xl font-bold text-yellow-500">{summary.riesgo_medio}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Riesgo Bajo</div>
            <div className="text-2xl font-bold">{summary.riesgo_bajo}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Déficit Días</div>
            <div className="text-2xl font-bold">{summary.con_deficit_dias}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Déficit Horas</div>
            <div className="text-2xl font-bold">{summary.con_deficit_horas}</div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar creador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterRiesgo === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterRiesgo('all')}
          >
            Todos
          </Button>
          <Button
            variant={filterRiesgo === 'alto' ? 'destructive' : 'outline'}
            onClick={() => setFilterRiesgo('alto')}
          >
            Alto
          </Button>
          <Button
            variant={filterRiesgo === 'medio' ? 'default' : 'outline'}
            onClick={() => setFilterRiesgo('medio')}
            className={filterRiesgo === 'medio' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
          >
            Medio
          </Button>
          <Button
            variant={filterRiesgo === 'bajo' ? 'secondary' : 'outline'}
            onClick={() => setFilterRiesgo('bajo')}
          >
            Bajo
          </Button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : filteredRecs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No hay recomendaciones. Sube un archivo Excel para comenzar.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecs.map((rec) => (
            <Card key={rec.creator_id} className="p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{rec.creator_username}</h3>
                    {getRiesgoBadge(rec.prioridad_riesgo)}
                    {rec.faltan_dias <= 1 && rec.faltan_dias > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Último margen
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Días live:</span>
                      <span className="ml-2 font-semibold">{rec.dias_actuales}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Horas live:</span>
                      <span className="ml-2 font-semibold">{rec.horas_actuales.toFixed(1)}h</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Diamantes:</span>
                      <span className="ml-2 font-semibold">{rec.diamantes_actuales.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Objetivo:</span>
                      <span className="ml-2 font-semibold">{rec.proximo_objetivo}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Faltan días:</span>
                      <span className="ml-2 font-semibold text-orange-500">{rec.faltan_dias}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Faltan horas:</span>
                      <span className="ml-2 font-semibold text-orange-500">{rec.faltan_horas.toFixed(1)}h</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Horas/día sugeridas:</span>
                      <span className="ml-2 font-semibold text-blue-500">{rec.horas_min_dia_sugeridas.toFixed(1)}h</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Quedan <strong>{rec.dias_restantes} días</strong> del mes
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleWhatsApp(rec)}
                    disabled={!rec.phone_e164}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={() => handleLlamar(rec)}
                    disabled={!rec.phone_e164}
                    variant="outline"
                    className="gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Llamar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

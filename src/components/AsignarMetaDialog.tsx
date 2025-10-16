import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Target } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface AsignarMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
  onMetaAsignada?: () => void;
}

const metaSchema = z.object({
  metrica_tipo: z.string().min(1, "Selecciona una métrica"),
  valor_objetivo: z.number().min(1, "El valor debe ser mayor a 0"),
  fecha_finalizacion: z.date().refine(val => val !== undefined, {
    message: "Selecciona una fecha de finalización"
  }),
  descripcion: z.string().optional(),
  notas: z.string().optional(),
});

export const AsignarMetaDialog = ({
  open,
  onOpenChange,
  creatorId,
  creatorName,
  onMetaAsignada
}: AsignarMetaDialogProps) => {
  const [metricaTipo, setMetricaTipo] = useState<string>("");
  const [valorObjetivo, setValorObjetivo] = useState<string>("");
  const [fechaFinalizacion, setFechaFinalizacion] = useState<Date>();
  const [descripcion, setDescripcion] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar datos
      const validatedData = metaSchema.parse({
        metrica_tipo: metricaTipo,
        valor_objetivo: parseFloat(valorObjetivo),
        fecha_finalizacion: fechaFinalizacion,
        descripcion: descripcion || undefined,
        notas: notas || undefined,
      });

      setLoading(true);

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insertar meta
      const { error } = await supabase
        .from('creator_metas')
        .insert({
          creator_id: creatorId,
          metrica_tipo: validatedData.metrica_tipo,
          valor_objetivo: validatedData.valor_objetivo,
          fecha_finalizacion: validatedData.fecha_finalizacion.toISOString().split('T')[0],
          descripcion: validatedData.descripcion,
          notas: validatedData.notas,
          created_by_user_id: user?.id,
          created_by_email: user?.email,
        });

      if (error) throw error;

      toast({
        title: "✅ Meta asignada",
        description: `Meta de ${getMetricaLabel(metricaTipo)} asignada a ${creatorName}`,
      });

      // Limpiar formulario
      setMetricaTipo("");
      setValorObjetivo("");
      setFechaFinalizacion(undefined);
      setDescripcion("");
      setNotas("");
      
      onMetaAsignada?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error asignando meta:', error);
      
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "No se pudo asignar la meta",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getMetricaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      diamantes_30d: "Diamantes (últimos 30 días)",
      views_30d: "Vistas (últimos 30 días)",
      engagement_rate: "Tasa de Engagement",
      followers: "Seguidores",
      dias_live_mes: "Días en Vivo (mes actual)",
      horas_live_mes: "Horas en Vivo (mes actual)",
    };
    return labels[tipo] || tipo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Asignar Nueva Meta
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Asigna un objetivo a {creatorName}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Métrica */}
          <div className="space-y-2">
            <Label htmlFor="metrica">Métrica</Label>
            <Select value={metricaTipo} onValueChange={setMetricaTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de métrica que quieres medir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diamantes_30d">Diamantes (últimos 30 días)</SelectItem>
                <SelectItem value="views_30d">Vistas (últimos 30 días)</SelectItem>
                <SelectItem value="engagement_rate">Tasa de Engagement</SelectItem>
                <SelectItem value="followers">Seguidores</SelectItem>
                <SelectItem value="dias_live_mes">Días en Vivo (mes actual)</SelectItem>
                <SelectItem value="horas_live_mes">Horas en Vivo (mes actual)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="valor">Valor Objetivo</Label>
            <Input
              id="valor"
              type="number"
              placeholder="Número que el creador debe alcanzar"
              value={valorObjetivo}
              onChange={(e) => setValorObjetivo(e.target.value)}
              min="1"
              required
            />
          </div>

          {/* Fecha de Finalización */}
          <div className="space-y-2">
            <Label>Fecha de Finalización</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaFinalizacion && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaFinalizacion ? (
                    format(fechaFinalizacion, "PPP", { locale: es })
                  ) : (
                    <span>Fecha límite para cumplir la meta</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaFinalizacion}
                  onSelect={setFechaFinalizacion}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              placeholder="Ej: Meta del mes de enero"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Agrega notas adicionales sobre esta meta..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Asignando..." : "Asignar Meta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

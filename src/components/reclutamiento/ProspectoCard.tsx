import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { openWhatsApp } from "@/utils/whatsapp";
import { 
  MessageCircle, 
  Phone, 
  Edit, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  fecha_aceptacion?: string;
  fecha_ingreso_humand?: string;
  reclutador_nombre?: string;
  mostro_interes?: boolean;
  agendo_prueba?: boolean;
  en_humand: boolean;
  usuario_humand?: string;
  notas?: any;
}

interface ProspectoCardProps {
  prospecto: Prospecto;
  onUpdate: () => void;
}

export const ProspectoCard = ({ prospecto, onUpdate }: ProspectoCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState(prospecto.estado_actual);
  const [mostroInteres, setMostroInteres] = useState(prospecto.mostro_interes || false);
  const [agendoPrueba, setAgendoPrueba] = useState(prospecto.agendo_prueba || false);
  const [enHumand, setEnHumand] = useState(prospecto.en_humand);
  const [usuarioHumand, setUsuarioHumand] = useState(prospecto.usuario_humand || "");
  const [nota, setNota] = useState("");
  const { toast } = useToast();

  const abrirWhatsApp = async () => {
    const mensaje = `Hola ${prospecto.nombre_completo}! 👋\n\nSoy del equipo de Soul Latino. Vi tu perfil de TikTok (@${prospecto.usuario_tiktok}) y me gustaría platicarte sobre una gran oportunidad.\n\n¿Tienes unos minutos para hablar?`;
    
    try {
      await openWhatsApp({
        phone: prospecto.whatsapp,
        message: mensaje,
        creatorId: prospecto.id,
        creatorName: prospecto.nombre_completo,
        actionType: 'reclutamiento'
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

  const guardarCambios = async () => {
    setLoading(true);
    try {
      const updates: any = {
        estado_actual: nuevoEstado,
        mostro_interes: mostroInteres,
        agendo_prueba: agendoPrueba,
        en_humand: enHumand,
      };

      if (nuevoEstado === 'acepto' && !prospecto.fecha_aceptacion) {
        updates.fecha_aceptacion = new Date().toISOString();
      }

      if (enHumand && usuarioHumand) {
        updates.usuario_humand = usuarioHumand;
        if (!prospecto.fecha_ingreso_humand) {
          updates.fecha_ingreso_humand = new Date().toISOString();
        }
      }

      // Actualizar prospecto
      const { error: updateError } = await supabase
        .from('prospectos_reclutamiento')
        .update(updates)
        .eq('id', prospecto.id);

      if (updateError) throw updateError;

      // Agregar nota si hay
      if (nota.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: activityError } = await supabase
          .from('actividad_reclutamiento')
          .insert({
            prospecto_id: prospecto.id,
            user_id: user?.id,
            user_email: user?.email,
            accion: 'nota_agregada',
            nota: nota.trim(),
          });

        if (activityError) throw activityError;

        // Registrar en el panel de actividad del admin
        await supabase.from("whatsapp_activity").insert({
          creator_id: prospecto.id,
          user_email: user?.email || "Unknown",
          action_type: "reclutamiento_nota",
          creator_name: prospecto.nombre_completo,
          message_preview: `Nota: ${nota.trim().substring(0, 150)}`,
        });
      }

      toast({
        title: "✅ Cambios guardados",
        description: "El prospecto ha sido actualizado",
      });

      setDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const diasDesdeCaptura = Math.floor(
    (new Date().getTime() - new Date(prospecto.fecha_captura).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <Card className="bg-background/80 hover:bg-background transition-all cursor-pointer" onClick={() => setDialogOpen(true)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{prospecto.nombre_completo}</h4>
              <p className="text-xs text-muted-foreground">@{prospecto.usuario_tiktok}</p>
              <p className="text-xs text-muted-foreground">{prospecto.pais}</p>
            </div>
            {prospecto.en_humand && (
              <Badge variant="default" className="bg-blue-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Humand
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                abrirWhatsApp();
              }}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {diasDesdeCaptura}d
            </span>
            {prospecto.reclutador_nombre && (
              <span className="truncate">{prospecto.reclutador_nombre}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de edición */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{prospecto.nombre_completo}</DialogTitle>
            <p className="text-sm text-muted-foreground">@{prospecto.usuario_tiktok} • {prospecto.pais}</p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{prospecto.whatsapp}</p>
              </div>
              {prospecto.instagram && (
                <div>
                  <p className="text-muted-foreground">Instagram</p>
                  <p className="font-medium">@{prospecto.instagram}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Fecha de captura</p>
                <p className="font-medium">
                  {format(new Date(prospecto.fecha_captura), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Reclutador</p>
                <p className="font-medium">{prospecto.reclutador_nombre || 'No asignado'}</p>
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label>Estado del Proceso</Label>
              <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuevo">🟡 Nuevo / Pendiente</SelectItem>
                  <SelectItem value="contactado">🟠 Contactado / En seguimiento</SelectItem>
                  <SelectItem value="acepto">🟢 Aceptó ingresar</SelectItem>
                  <SelectItem value="registrado_humand">🔵 Registrado en Humand</SelectItem>
                  <SelectItem value="activo">✅ Activo (transmitiendo)</SelectItem>
                  <SelectItem value="descartado">❌ Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seguimiento */}
            <div className="space-y-3">
              <Label>Seguimiento</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mostro_interes"
                    checked={mostroInteres}
                    onCheckedChange={(checked) => setMostroInteres(checked as boolean)}
                  />
                  <label
                    htmlFor="mostro_interes"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Mostró interés
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agendo_prueba"
                    checked={agendoPrueba}
                    onCheckedChange={(checked) => setAgendoPrueba(checked as boolean)}
                  />
                  <label
                    htmlFor="agendo_prueba"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Se agendó prueba/explicación
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="en_humand"
                    checked={enHumand}
                    onCheckedChange={(checked) => setEnHumand(checked as boolean)}
                  />
                  <label
                    htmlFor="en_humand"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Ya está en Humand
                  </label>
                </div>
              </div>
            </div>

            {/* Usuario Humand si aplica */}
            {enHumand && (
              <div className="space-y-2">
                <Label htmlFor="usuario_humand">Usuario en Humand</Label>
                <input
                  id="usuario_humand"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={usuarioHumand}
                  onChange={(e) => setUsuarioHumand(e.target.value)}
                  placeholder="Usuario de Humand"
                />
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="nota">Agregar Nota (opcional)</Label>
              <Textarea
                id="nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Le gustó la propuesta, tiene dudas sobre horarios..."
                rows={3}
              />
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={guardarCambios} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

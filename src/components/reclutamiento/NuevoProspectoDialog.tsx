import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { z } from "zod";

const prospectoSchema = z.object({
  nombre_completo: z.string().trim().min(1, "Nombre requerido").max(100),
  usuario_tiktok: z.string().trim().min(1, "Usuario de TikTok requerido").max(50),
  pais: z.string().trim().min(1, "País requerido"),
  whatsapp: z.string().trim().min(1, "WhatsApp requerido").max(20),
  instagram: z.string().trim().max(50).optional(),
  edad: z.number().min(13).max(99).optional(),
  lengua: z.string().trim().max(50).optional(),
  fuente_reclutamiento: z.string().trim().max(100).optional(),
});

interface NuevoProspectoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NuevoProspectoDialog = ({ open, onOpenChange, onSuccess }: NuevoProspectoDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: "",
    usuario_tiktok: "",
    pais: "México",
    whatsapp: "",
    instagram: "",
    edad: "",
    lengua: "Español",
    fuente_reclutamiento: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Validar datos
      const dataToValidate = {
        ...formData,
        edad: formData.edad ? parseInt(formData.edad) : undefined,
        instagram: formData.instagram || undefined,
        fuente_reclutamiento: formData.fuente_reclutamiento || undefined,
      };

      const validated = prospectoSchema.parse(dataToValidate);

      // Insertar prospecto
      const insertData = {
        nombre_completo: validated.nombre_completo,
        usuario_tiktok: validated.usuario_tiktok,
        pais: validated.pais,
        whatsapp: validated.whatsapp,
        instagram: validated.instagram,
        edad: validated.edad,
        lengua: validated.lengua,
        fuente_reclutamiento: validated.fuente_reclutamiento,
        reclutador_id: user.id,
        reclutador_nombre: user.email?.split('@')[0] || "Unknown",
        estado_actual: "nuevo" as const,
      };

      const { error } = await supabase.from("prospectos_reclutamiento").insert(insertData);

      if (error) throw error;

      toast({
        title: "✅ Prospecto registrado",
        description: `${validated.nombre_completo} ha sido agregado exitosamente`,
      });

      // Limpiar form y cerrar
      setFormData({
        nombre_completo: "",
        usuario_tiktok: "",
        pais: "México",
        whatsapp: "",
        instagram: "",
        edad: "",
        lengua: "Español",
        fuente_reclutamiento: "",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error creando prospecto:', error);
        toast({
          title: "Error",
          description: "No se pudo registrar el prospecto",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Registrar Nuevo Prospecto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_completo">Nombre Completo *</Label>
              <Input
                id="nombre_completo"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario_tiktok">Usuario TikTok *</Label>
              <Input
                id="usuario_tiktok"
                value={formData.usuario_tiktok}
                onChange={(e) => setFormData({ ...formData, usuario_tiktok: e.target.value })}
                placeholder="@usuario"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pais">País *</Label>
              <Select value={formData.pais} onValueChange={(value) => setFormData({ ...formData, pais: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="México">México</SelectItem>
                  <SelectItem value="Colombia">Colombia</SelectItem>
                  <SelectItem value="Argentina">Argentina</SelectItem>
                  <SelectItem value="Chile">Chile</SelectItem>
                  <SelectItem value="Perú">Perú</SelectItem>
                  <SelectItem value="España">España</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+52 1234567890"
                required
              />
            </div>
          </div>

          {/* Datos opcionales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram (opcional)</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@usuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edad">Edad (opcional)</Label>
              <Input
                id="edad"
                type="number"
                value={formData.edad}
                onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                placeholder="18"
                min="13"
                max="99"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lengua">Lengua</Label>
              <Select value={formData.lengua} onValueChange={(value) => setFormData({ ...formData, lengua: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Español">Español</SelectItem>
                  <SelectItem value="Inglés">Inglés</SelectItem>
                  <SelectItem value="Portugués">Portugués</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuente">Fuente de Reclutamiento (opcional)</Label>
              <Input
                id="fuente"
                value={formData.fuente_reclutamiento}
                onChange={(e) => setFormData({ ...formData, fuente_reclutamiento: e.target.value })}
                placeholder="Redes sociales, referido, etc."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Registrar Prospecto
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

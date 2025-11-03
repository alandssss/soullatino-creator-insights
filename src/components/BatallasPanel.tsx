import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Plus, Send, Sword, Calendar, Clock, Users, CheckCheck, Check, X } from "lucide-react";

interface Batalla {
  id: string;
  creator_id: string;
  fecha: string;
  hora: string;
  oponente: string;
  guantes: boolean;
  reto: string | null;
  tipo: '1v1' | '3v3';
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  notificacion_enviada: boolean;
  creator: {
    nombre: string;
    telefono: string | null;
  };
  logs_whatsapp?: Array<{
    ultimo_estado: string | null;
    delivered_at: string | null;
    read_at: string | null;
    failed_at: string | null;
  }>;
}

export default function BatallasPanel() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    creator_id: '',
    fecha: '',
    hora: '',
    oponente: '',
    guantes: false,
    reto: '',
    tipo: '1v1' as '1v1' | '3v3',
  });

  const queryClient = useQueryClient();

  // Obtener lista de creators
  const { data: creators } = useQuery({
    queryKey: ['creators-for-batallas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, nombre, telefono')
        .eq('status', 'activo')
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  // Obtener batallas con estado de WhatsApp
  const { data: batallas, isLoading } = useQuery({
    queryKey: ['batallas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batallas')
        .select(`
          *,
          creator:creators(nombre, telefono),
          logs_whatsapp(ultimo_estado, delivered_at, read_at, failed_at)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });
      if (error) throw error;
      return data as unknown as Batalla[];
    },
  });

  // Crear batalla
  const createBatalla = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('batallas')
        .insert([{
          ...data,
          reto: data.reto || null,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batallas'] });
      toast.success('Batalla creada correctamente');
      setOpen(false);
      setFormData({
        creator_id: '',
        fecha: '',
        hora: '',
        oponente: '',
        guantes: false,
        reto: '',
        tipo: '1v1',
      });
    },
    onError: (error) => {
      toast.error('Error al crear batalla: ' + error.message);
    },
  });

  // Enviar notificación
  const sendNotification = useMutation({
    mutationFn: async (batallaId: string) => {
      const { data, error } = await supabase.functions.invoke('send-batalla', {
        body: { batallaId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batallas'] });
      toast.success('Notificación enviada correctamente');
    },
    onError: (error) => {
      toast.error('Error al enviar notificación: ' + error.message);
    },
  });

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pendiente: 'default',
      confirmada: 'secondary',
      completada: 'outline',
      cancelada: 'destructive',
    } as const;
    return <Badge variant={variants[estado as keyof typeof variants] || 'default'}>{estado}</Badge>;
  };

  const getWhatsAppStatusBadge = (batalla: Batalla) => {
    if (!batalla.notificacion_enviada || !batalla.logs_whatsapp || batalla.logs_whatsapp.length === 0) {
      return null;
    }

    const log = batalla.logs_whatsapp[0];
    const estado = log.ultimo_estado;

    if (log.read_at) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCheck className="h-3 w-3" />
          Leído
        </Badge>
      );
    }

    if (log.delivered_at) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Check className="h-3 w-3" />
          Entregado
        </Badge>
      );
    }

    if (log.failed_at) {
      return (
        <Badge variant="destructive" className="gap-1">
          <X className="h-3 w-3" />
          Fallido
        </Badge>
      );
    }

    if (estado === 'sent' || estado === 'queued') {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enviando
        </Badge>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Batallas</h2>
          <p className="text-muted-foreground">
            Programa batallas y envía notificaciones por WhatsApp
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Batalla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nueva Batalla</DialogTitle>
              <DialogDescription>
                Completa los datos de la batalla
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="creator">Creator</Label>
                <Select
                  value={formData.creator_id}
                  onValueChange={(value) => setFormData({ ...formData, creator_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators?.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.nombre} {!creator.telefono && '(sin teléfono)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hora">Hora</Label>
                <Input
                  id="hora"
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="oponente">Oponente</Label>
                <Input
                  id="oponente"
                  value={formData.oponente}
                  onChange={(e) => setFormData({ ...formData, oponente: e.target.value })}
                  placeholder="Nombre del oponente"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: '1v1' | '3v3') => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1v1">1v1</SelectItem>
                    <SelectItem value="3v3">3v3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="guantes"
                  checked={formData.guantes}
                  onCheckedChange={(checked) => setFormData({ ...formData, guantes: checked })}
                />
                <Label htmlFor="guantes">Con guantes</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reto">Reto (opcional)</Label>
                <Textarea
                  id="reto"
                  value={formData.reto}
                  onChange={(e) => setFormData({ ...formData, reto: e.target.value })}
                  placeholder="Descripción del reto"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createBatalla.mutate(formData)}
                disabled={!formData.creator_id || !formData.fecha || !formData.hora || !formData.oponente || createBatalla.isPending}
              >
                {createBatalla.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Batalla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : batallas && batallas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {batallas.map((batalla) => (
            <Card key={batalla.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{batalla.creator.nombre}</CardTitle>
                    <CardDescription>vs {batalla.oponente}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    {getEstadoBadge(batalla.estado)}
                    {getWhatsAppStatusBadge(batalla)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(batalla.fecha + 'T00:00:00'), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{batalla.hora}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{batalla.tipo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sword className="h-4 w-4 text-muted-foreground" />
                    <span>{batalla.guantes ? 'Con guantes' : 'Sin guantes'}</span>
                  </div>
                  {batalla.reto && (
                    <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                      <strong>Reto:</strong> {batalla.reto}
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => sendNotification.mutate(batalla.id)}
                  disabled={
                    sendNotification.isPending || 
                    batalla.notificacion_enviada || 
                    !batalla.creator.telefono
                  }
                  variant={batalla.notificacion_enviada ? "outline" : "default"}
                >
                  {sendNotification.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {batalla.notificacion_enviada 
                    ? 'Notificación enviada' 
                    : !batalla.creator.telefono 
                    ? 'Sin teléfono' 
                    : 'Enviar notificación'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sword className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay batallas registradas</p>
            <p className="text-sm text-muted-foreground">Crea una nueva batalla para comenzar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

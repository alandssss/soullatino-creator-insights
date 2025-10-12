import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Upload, Check, X } from "lucide-react";

const phoneUpdateSchema = z.object({
  username: z.string().trim().min(1),
  telefono: z.string().trim().min(1).max(20),
});

interface PhoneUpdate {
  username: string;
  telefono: string;
  status?: 'pending' | 'success' | 'error';
  message?: string;
}

export const CreatorPhoneUpdate = () => {
  const [csvData, setCsvData] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<PhoneUpdate[]>([]);
  const { toast } = useToast();

  const parseCsvData = (data: string): PhoneUpdate[] => {
    const lines = data.trim().split('\n');
    const updates: PhoneUpdate[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;

      const [username, telefono] = line.split('\t').map(s => s.trim());
      
      if (username && telefono && telefono !== '[No Data]') {
        try {
          phoneUpdateSchema.parse({ username, telefono });
          updates.push({ username, telefono, status: 'pending' });
        } catch (error) {
          updates.push({ 
            username: username || 'Unknown', 
            telefono: telefono || '', 
            status: 'error',
            message: 'Formato inválido'
          });
        }
      }
    }

    return updates;
  };

  const updatePhones = async () => {
    if (!csvData.trim()) {
      toast({
        title: "Error",
        description: "Por favor pega los datos primero",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    const updates = parseCsvData(csvData);
    const resultsArray: PhoneUpdate[] = [];

    for (const update of updates) {
      if (update.status === 'error') {
        resultsArray.push(update);
        continue;
      }

      try {
        // Search by nombre first with parameterized query (safe from SQL injection)
        let { data: creator, error: searchError } = await supabase
          .from('creators')
          .select('id, nombre, tiktok_username')
          .eq('nombre', update.username)
          .maybeSingle();

        if (searchError) throw searchError;

        // If not found by nombre, try by tiktok_username with parameterized query (safe from SQL injection)
        if (!creator) {
          const result = await supabase
            .from('creators')
            .select('id, nombre, tiktok_username')
            .eq('tiktok_username', update.username)
            .maybeSingle();
          
          creator = result.data;
          if (result.error) throw result.error;
        }

        if (!creator) {
          resultsArray.push({ 
            ...update, 
            status: 'error',
            message: 'Creador no encontrado'
          });
          continue;
        }

        // Actualizar el teléfono
        const { error: updateError } = await supabase
          .from('creators')
          .update({ telefono: update.telefono })
          .eq('id', creator.id);

        if (updateError) throw updateError;

        resultsArray.push({ 
          ...update, 
          status: 'success',
          message: `✓ Actualizado`
        });
      } catch (error: any) {
        resultsArray.push({ 
          ...update, 
          status: 'error',
          message: error.message
        });
      }
    }

    setResults(resultsArray);
    setProcessing(false);

    const successCount = resultsArray.filter(r => r.status === 'success').length;
    toast({
      title: "Proceso completado",
      description: `${successCount} de ${resultsArray.length} teléfonos actualizados`,
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Actualización Masiva de Teléfonos
        </CardTitle>
        <CardDescription>
          Pega los datos en formato: Username [TAB] Teléfono (una línea por creador)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Datos CSV (Username → Teléfono)
          </label>
          <Textarea
            placeholder="nicolminda	+5216147531946&#10;acharromztm	+5216692609693&#10;..."
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            className="h-32 font-mono text-sm"
          />
        </div>

        <Button 
          onClick={updatePhones} 
          disabled={processing || !csvData.trim()}
          className="w-full"
        >
          {processing ? "Procesando..." : "Actualizar Teléfonos"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-medium text-foreground">Resultados:</h3>
            <div className="space-y-1">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    result.status === 'success'
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'success' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    <span className="font-mono">{result.username}</span>
                    {result.telefono && <span className="text-muted-foreground">→ {result.telefono}</span>}
                  </div>
                  {result.message && (
                    <span className="text-muted-foreground">{result.message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
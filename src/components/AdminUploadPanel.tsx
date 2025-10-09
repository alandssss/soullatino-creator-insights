import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export const AdminUploadPanel = () => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          selectedFile.type === "application/vnd.ms-excel") {
        setFile(selectedFile);
      } else {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx o .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const processExcelFile = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const excelData = await processExcelFile(file) as any[];
      
      console.log("Datos del Excel - Primeras 2 filas:", excelData.slice(0, 2));
      console.log("Columnas disponibles:", excelData.length > 0 ? Object.keys(excelData[0]) : []);
      
      // Mapear los datos del Excel a la estructura de la base de datos
      // Ser más flexible con los nombres de columnas - buscar cualquier variación
      const creatorsData = excelData.map((row: any) => {
        // Función para parsear duración en formato "40h 3m 43s" a horas decimales
        const parseDuration = (duration: string): number => {
          if (!duration) return 0;
          const hourMatch = duration.match(/(\d+)h/);
          const minMatch = duration.match(/(\d+)m/);
          const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
          const minutes = minMatch ? parseInt(minMatch[1]) : 0;
          return hours + (minutes / 60);
        };

        // Función para parsear porcentajes (ej: "42.88%" -> 42.88)
        const parsePercentage = (percent: string): number => {
          if (!percent) return 0;
          const match = percent.toString().match(/-?\d+\.?\d*/);
          return match ? parseFloat(match[0]) : 0;
        };

        const tiktokUsername = row["Creator's username"] || "";
        
        // ============================================
        // COLUMNAS CRÍTICAS (H, I, J, AB)
        // ============================================
        const diamantes = row["Diamonds"] || 0;                         // Columna H
        const horasLive = parseDuration(row["LIVE duration"] || "");    // Columna I  
        const diasLive = row["Valid go LIVE days"] || 0;                // Columna J
        const batallasPKO = row["PKO battles"] || row["PKO Battles"] || row["Batallas PKO"] || 0;  // Columna AB
        
        // OTRAS COLUMNAS IMPORTANTES
        const diasDesdeInicio = row["Days since joining"] || 0;  // Columna G
        
        // DATOS DEL MES PASADO
        const diamantesLastMonth = row["Diamonds last month"] || 0;
        const horasLiveLastMonth = parseDuration(row["LIVE duration (hours) last month"] || "");
        const diasLiveLastMonth = row["Valid go LIVE days last month"] || 0;
        const followersLastMonth = row["New followers last month"] || 0;
        
        // PORCENTAJES DE CRECIMIENTO/DECRECIMIENTO
        const diamondsVsLastMonth = parsePercentage(row["Diamonds - Vs. last month"] || "0");
        const liveDurationVsLastMonth = parsePercentage(row["LIVE duration - Vs. last month"] || "0");
        const validDaysVsLastMonth = parsePercentage(row["Valid go LIVE days - Vs. last month"] || "0");
        const followersVsLastMonth = parsePercentage(row["New followers - Vs. last month"] || "0");
        
        const followers = row["New followers"] || 0;
        const manager = row["Creator Network manager"] || null;
        const graduacion = row["Graduation status"] || null;
        
        return {
          nombre: tiktokUsername,
          tiktok_username: tiktokUsername,
          telefono: null,
          email: null,
          instagram: null,
          categoria: row["Group"] !== "Not in a group" ? row["Group"] : null,
          manager: manager,
          status: "activo",
          graduacion: graduacion,
          // COLUMNAS CRÍTICAS H, I, J, AB
          diamantes: diamantes,                    // H
          horas_live: horasLive,                   // I
          dias_live: diasLive,                     // J
          engagement_rate: batallasPKO,            // AB - Batallas PKO (motor de monetización)
          // OTRAS MÉTRICAS
          followers: followers,
          views: 0,
          dias_desde_inicio: diasDesdeInicio,
          last_month_diamantes: diamantesLastMonth,
          last_month_views: 0,
          last_month_engagement: 0,
          horasLiveLastMonth: horasLiveLastMonth,
          diasLiveLastMonth: diasLiveLastMonth,
          followersLastMonth: followersLastMonth,
          // Porcentajes de cambio
          diamondsVsLastMonth: diamondsVsLastMonth,
          liveDurationVsLastMonth: liveDurationVsLastMonth,
          validDaysVsLastMonth: validDaysVsLastMonth,
          followersVsLastMonth: followersVsLastMonth,
        };
      }).filter(creator => creator.nombre && creator.nombre.toString().trim().length > 0);

      console.log("Datos mapeados - Primeros 2:", creatorsData.slice(0, 2));
      console.log("Total de filas con nombre válido:", creatorsData.length);

      if (creatorsData.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron datos válidos en el archivo. Asegúrate de que haya una columna 'Nombre'.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Estrategia: UPSERT en creators + INSERT diario en creator_daily_stats
      let successCount = 0;
      let errorCount = 0;

      for (const creatorData of creatorsData) {
        try {
          // 1. UPSERT en tabla creators usando tiktok_username como clave única
          const { data: upsertedCreator, error: upsertError } = await supabase
            .from("creators")
            .upsert({
              tiktok_username: creatorData.tiktok_username,
              nombre: creatorData.nombre,
              telefono: creatorData.telefono,
              email: creatorData.email,
              instagram: creatorData.instagram,
              categoria: creatorData.categoria,
              manager: creatorData.manager,
              status: creatorData.status,
              graduacion: creatorData.graduacion,
              diamantes: creatorData.diamantes,
              followers: creatorData.followers,
              views: creatorData.views,
              engagement_rate: creatorData.engagement_rate,
              dias_live: creatorData.dias_live,
              horas_live: creatorData.horas_live,
              dias_desde_inicio: creatorData.dias_desde_inicio,
            }, { onConflict: 'tiktok_username' })
            .select()
            .single();

          if (upsertError) throw upsertError;

          // 2. INSERT snapshot diario en creator_daily_stats
          const { error: snapshotError } = await supabase
            .from("creator_daily_stats")
            .insert({
              creator_id: upsertedCreator.id,
              snapshot_date: new Date().toISOString().split('T')[0],
              days_since_joining: creatorData.dias_desde_inicio || 0,
              live_duration_l30d: creatorData.horasLiveLastMonth || 0,
              diamonds_l30d: creatorData.last_month_diamantes || 0,
              diamond_baseline: 0,
              ingreso_estimado: creatorData.last_month_diamantes ? (creatorData.last_month_diamantes * 0.005) : 0,
              followers: creatorData.followers || 0,
              engagement_rate: 0,
            });

          // Si ya existe un snapshot para hoy, ignorar el error de UNIQUE constraint
          if (snapshotError && !snapshotError.message?.includes('duplicate key')) {
            console.warn("Error creando snapshot:", snapshotError);
          }

          successCount++;
        } catch (err) {
          console.error("Error con creador:", creatorData.nombre, err);
          errorCount++;
        }
      }

      // Registrar el archivo cargado
      await supabase
        .from("uploaded_reports")
        .insert({
          filename: file.name,
          records_count: successCount,
          processed: true,
        });

      toast({
        title: "Éxito",
        description: `Se procesaron ${successCount} creadores correctamente${errorCount > 0 ? `. ${errorCount} con errores.` : ''}`,
      });

      setFile(null);
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      window.location.reload();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Panel de Carga - Solo Admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={uploading}
            className="cursor-pointer"
          />
          {file && (
            <p className="text-sm text-muted-foreground mt-2">
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Cargar Datos de Creadores
            </>
          )}
        </Button>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• El archivo debe ser Excel (.xlsx o .xls)</p>
          <p>• Columnas críticas: H (Diamantes), I (Duración LIVE), J (Días en LIVE), AB (Batallas PKO)</p>
          <p>• Los creadores existentes se actualizarán automáticamente</p>
        </div>
      </CardContent>
    </Card>
  );
};
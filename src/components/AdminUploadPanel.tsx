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
        // Función helper para buscar valor en diferentes posibles nombres de columna (case insensitive)
        const findValue = (possibleKeys: string[]) => {
          // Primero buscar coincidencia exacta
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
              return row[key];
            }
          }
          
          // Si no hay coincidencia exacta, buscar case insensitive
          const rowKeys = Object.keys(row);
          for (const possibleKey of possibleKeys) {
            const matchedKey = rowKeys.find(k => 
              k.toLowerCase().trim() === possibleKey.toLowerCase().trim()
            );
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && row[matchedKey] !== "") {
              return row[matchedKey];
            }
          }
          
          // Buscar por palabras clave parciales
          for (const possibleKey of possibleKeys) {
            const matchedKey = rowKeys.find(k => 
              k.toLowerCase().includes(possibleKey.toLowerCase()) ||
              possibleKey.toLowerCase().includes(k.toLowerCase())
            );
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && row[matchedKey] !== "") {
              return row[matchedKey];
            }
          }
          
          return null;
        };

        const nombre = findValue(["Nombre", "nombre", "Name", "name", "NOMBRE", "Creator", "creator"]);
        
        return {
          nombre: nombre || "",
          tiktok_username: findValue(["Usuario TikTok", "tiktok_username", "TikTok", "TikTok Username", "Username", "username", "user"]) || null,
          telefono: findValue(["Teléfono", "telefono", "Telefono", "Phone", "phone", "tel", "Tel"]) || null,
          email: findValue(["Email", "email", "Correo", "correo", "E-mail", "mail"]) || null,
          instagram: findValue(["Instagram", "instagram", "IG", "ig"]) || null,
          categoria: findValue(["Categoría", "categoria", "Categoria", "Category", "category", "Grupo", "grupo", "Group"]) || null,
          manager: findValue(["Manager", "manager", "Gerente", "gerente", "Agency Manager"]) || null,
          status: findValue(["Status", "status", "Estado", "estado", "State"]) || "activo",
          graduacion: findValue(["Graduación", "graduacion", "Graduacion", "Graduation", "Level"]) || null,
          diamantes: parseInt(findValue(["Diamantes", "diamantes", "Diamonds", "diamonds", "Beans"]) || "0") || 0,
          followers: parseInt(findValue(["Seguidores", "followers", "Followers", "Fans", "fans"]) || "0") || 0,
          views: parseInt(findValue(["Vistas", "views", "Views", "Visualizaciones"]) || "0") || 0,
          engagement_rate: parseFloat(findValue(["Engagement", "engagement_rate", "Engagement Rate", "Tasa de Engagement"]) || "0") || 0,
          dias_live: parseInt(findValue(["Días Live", "dias_live", "Dias Live", "Days Live", "Live Days"]) || "0") || 0,
          horas_live: parseFloat(findValue(["Horas Live", "horas_live", "Hours Live", "Live Hours"]) || "0") || 0,
          dias_desde_inicio: parseInt(findValue(["Días Desde Inicio", "dias_desde_inicio", "Days Since Start"]) || "0") || 0,
          last_month_diamantes: parseInt(findValue(["Diamantes Mes Pasado", "last_month_diamantes", "Previous Diamonds"]) || "0") || 0,
          last_month_views: parseInt(findValue(["Vistas Mes Pasado", "last_month_views", "Previous Views"]) || "0") || 0,
          last_month_engagement: parseFloat(findValue(["Engagement Mes Pasado", "last_month_engagement", "Previous Engagement"]) || "0") || 0,
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
          // 1. UPSERT en tabla creators (info básica)
          const { data: upsertedCreator, error: upsertError } = await supabase
            .from("creators")
            .upsert({
              nombre: creatorData.nombre,
              tiktok_username: creatorData.tiktok_username,
              telefono: creatorData.telefono,
              email: creatorData.email,
              instagram: creatorData.instagram,
              categoria: creatorData.categoria,
              manager: creatorData.manager,
              status: creatorData.status,
              graduacion: creatorData.graduacion,
              // Métricas actuales (para vista rápida)
              diamantes: creatorData.diamantes,
              followers: creatorData.followers,
              views: creatorData.views,
              engagement_rate: creatorData.engagement_rate,
              dias_live: creatorData.dias_live,
              horas_live: creatorData.horas_live,
              dias_desde_inicio: creatorData.dias_desde_inicio,
            }, { onConflict: 'nombre' })
            .select()
            .single();

          if (upsertError) throw upsertError;

          // 2. INSERT snapshot diario en creator_daily_stats
          const { error: snapshotError } = await supabase
            .from("creator_daily_stats")
            .insert({
              creator_id: upsertedCreator.id,
              snapshot_date: new Date().toISOString().split('T')[0], // Fecha de hoy
              days_since_joining: creatorData.dias_desde_inicio || 0,
              live_duration_l30d: creatorData.horas_live || 0,
              diamonds_l30d: creatorData.diamantes || 0,
              diamond_baseline: 0, // Ajustar si tienes este dato
              ingreso_estimado: creatorData.diamantes ? (creatorData.diamantes * 0.005) : 0, // 0.5% conversión estimada
              followers: creatorData.followers || 0,
              engagement_rate: creatorData.engagement_rate || 0,
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
          <p>• Columnas esperadas: Nombre, Usuario TikTok, Teléfono, Email, Categoría, Manager, Diamantes, etc.</p>
          <p>• Los creadores existentes se actualizarán automáticamente</p>
        </div>
      </CardContent>
    </Card>
  );
};
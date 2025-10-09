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
      
      console.log("Datos del Excel:", excelData.slice(0, 2)); // Ver las primeras 2 filas
      
      // Mapear los datos del Excel a la estructura de la base de datos
      // Ser más flexible con los nombres de columnas
      const creatorsData = excelData.map((row: any) => {
        // Función helper para buscar valor en diferentes posibles nombres de columna
        const findValue = (possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
              return row[key];
            }
          }
          return null;
        };

        return {
          nombre: findValue(["Nombre", "nombre", "Name", "name", "NOMBRE"]) || "",
          tiktok_username: findValue(["Usuario TikTok", "tiktok_username", "TikTok", "TikTok Username", "Username", "username"]) || null,
          telefono: findValue(["Teléfono", "telefono", "Telefono", "Phone", "phone"]) || null,
          email: findValue(["Email", "email", "Correo", "correo", "E-mail"]) || null,
          instagram: findValue(["Instagram", "instagram", "IG"]) || null,
          categoria: findValue(["Categoría", "categoria", "Categoria", "Category"]) || null,
          manager: findValue(["Manager", "manager", "Gerente"]) || null,
          status: findValue(["Status", "status", "Estado"]) || "activo",
          graduacion: findValue(["Graduación", "graduacion", "Graduacion"]) || null,
          diamantes: parseInt(findValue(["Diamantes", "diamantes", "Diamonds"]) || "0") || 0,
          followers: parseInt(findValue(["Seguidores", "followers", "Followers", "Fans"]) || "0") || 0,
          views: parseInt(findValue(["Vistas", "views", "Views"]) || "0") || 0,
          engagement_rate: parseFloat(findValue(["Engagement", "engagement_rate", "Engagement Rate"]) || "0") || 0,
          dias_live: parseInt(findValue(["Días Live", "dias_live", "Dias Live", "Days Live"]) || "0") || 0,
          horas_live: parseFloat(findValue(["Horas Live", "horas_live", "Hours Live"]) || "0") || 0,
          dias_desde_inicio: parseInt(findValue(["Días Desde Inicio", "dias_desde_inicio"]) || "0") || 0,
          last_month_diamantes: parseInt(findValue(["Diamantes Mes Pasado", "last_month_diamantes"]) || "0") || 0,
          last_month_views: parseInt(findValue(["Vistas Mes Pasado", "last_month_views"]) || "0") || 0,
          last_month_engagement: parseFloat(findValue(["Engagement Mes Pasado", "last_month_engagement"]) || "0") || 0,
        };
      }).filter(creator => creator.nombre); // Solo incluir filas con nombre

      console.log("Datos mapeados:", creatorsData.slice(0, 2));

      if (creatorsData.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron datos válidos en el archivo. Asegúrate de que haya una columna 'Nombre'.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Insertar creadores uno por uno o actualizar si ya existen
      let successCount = 0;
      let errorCount = 0;

      for (const creatorData of creatorsData) {
        try {
          // Intentar actualizar primero por nombre
          const { data: existing } = await supabase
            .from("creators")
            .select("id")
            .eq("nombre", creatorData.nombre)
            .maybeSingle();

          if (existing) {
            // Actualizar
            await supabase
              .from("creators")
              .update(creatorData)
              .eq("id", existing.id);
          } else {
            // Insertar nuevo
            await supabase
              .from("creators")
              .insert(creatorData);
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
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
      
      // Mapear los datos del Excel a la estructura de la base de datos
      const creatorsData = excelData.map((row: any) => ({
        nombre: row["Nombre"] || row["nombre"] || "",
        tiktok_username: row["Usuario TikTok"] || row["tiktok_username"] || row["TikTok"] || "",
        telefono: row["Teléfono"] || row["telefono"] || row["Telefono"] || "",
        email: row["Email"] || row["email"] || row["Correo"] || "",
        instagram: row["Instagram"] || row["instagram"] || "",
        categoria: row["Categoría"] || row["categoria"] || row["Categoria"] || "",
        manager: row["Manager"] || row["manager"] || "",
        status: row["Status"] || row["status"] || "activo",
        graduacion: row["Graduación"] || row["graduacion"] || row["Graduacion"] || "",
        diamantes: parseInt(row["Diamantes"] || row["diamantes"] || "0"),
        followers: parseInt(row["Seguidores"] || row["followers"] || row["Followers"] || "0"),
        views: parseInt(row["Vistas"] || row["views"] || row["Views"] || "0"),
        engagement_rate: parseFloat(row["Engagement"] || row["engagement_rate"] || row["Engagement Rate"] || "0"),
        dias_live: parseInt(row["Días Live"] || row["dias_live"] || row["Dias Live"] || "0"),
        horas_live: parseFloat(row["Horas Live"] || row["horas_live"] || row["Horas Live"] || "0"),
        dias_desde_inicio: parseInt(row["Días Desde Inicio"] || row["dias_desde_inicio"] || "0"),
        last_month_diamantes: parseInt(row["Diamantes Mes Pasado"] || row["last_month_diamantes"] || "0"),
        last_month_views: parseInt(row["Vistas Mes Pasado"] || row["last_month_views"] || "0"),
        last_month_engagement: parseFloat(row["Engagement Mes Pasado"] || row["last_month_engagement"] || "0"),
      }));

      // Insertar o actualizar creadores en la base de datos
      const { error } = await supabase
        .from("creators")
        .upsert(creatorsData, { 
          onConflict: "tiktok_username",
          ignoreDuplicates: false 
        });

      if (error) throw error;

      // Registrar el archivo cargado
      await supabase
        .from("uploaded_reports")
        .insert({
          filename: file.name,
          records_count: creatorsData.length,
          processed: true,
        });

      toast({
        title: "Éxito",
        description: `Se procesaron ${creatorsData.length} creadores correctamente`,
      });

      setFile(null);
      // Limpiar el input
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Recargar la página para mostrar los nuevos datos
      window.location.reload();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo",
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
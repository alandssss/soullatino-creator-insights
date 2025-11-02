import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[upload-excel-recommendations] Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener datos del form
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file uploaded');
    }

    console.log(`[upload-excel-recommendations] Processing file: ${file.name}`);

    // Leer el archivo Excel
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    console.log(`[upload-excel-recommendations] Found ${rawData.length} rows`);

    // Función para parsear horas en diferentes formatos
    function parseHours(input: any): number {
      if (!input) return 0;
      
      const str = String(input).trim();
      
      // Formato: "125h 8min 10s"
      const hmsMatch = str.match(/(\d+)h\s*(\d+)?min\s*(\d+)?s?/i);
      if (hmsMatch) {
        const hours = parseInt(hmsMatch[1] || '0');
        const mins = parseInt(hmsMatch[2] || '0');
        const secs = parseInt(hmsMatch[3] || '0');
        return hours + (mins / 60) + (secs / 3600);
      }
      
      // Formato: "8:30:00" o "8:30"
      const timeMatch = str.match(/^(\d+):(\d+)(?::(\d+))?$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const mins = parseInt(timeMatch[2]);
        const secs = parseInt(timeMatch[3] || '0');
        return hours + (mins / 60) + (secs / 3600);
      }
      
      // Formato: "90min"
      const minsMatch = str.match(/(\d+)\s*min/i);
      if (minsMatch) {
        return parseInt(minsMatch[1]) / 60;
      }
      
      // Número simple
      const numMatch = str.replace(/,/g, '');
      const num = parseFloat(numMatch);
      return isNaN(num) ? 0 : num;
    }

    // Función para parsear números con comas
    function parseNumber(input: any): number {
      if (!input) return 0;
      const str = String(input).replace(/,/g, '');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }

    // Mapeo de columnas (ES/EN)
    const columnMappings = {
      id: ['Creator ID', 'User ID', 'ID', 'CreatorID', 'id'],
      username: ['Username', 'Creator Name', 'Nombre', 'nombre', 'creator_name'],
      days: ['Days', 'Días', 'Dias', 'Days live', 'dias_live', 'days_live'],
      hours: ['Hours', 'Horas', 'Live Hours', 'Live duration', 'horas_live', 'live_hours'],
      diamonds: ['Diamonds', 'Diamantes', 'diamantes', 'diamonds'],
    };

    // Encontrar las columnas correctas
    const getColumnValue = (row: any, possibleNames: string[]) => {
      for (const name of possibleNames) {
        if (row[name] !== undefined) return row[name];
      }
      return null;
    };

    // Fecha de referencia (hoy en America/Chihuahua)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chihuahua' });

    // Procesar y upsert datos
    const records = [];
    let insertedCount = 0;
    let updatedCount = 0;

    for (const row of rawData) {
      const creatorId = getColumnValue(row, columnMappings.id);
      const username = getColumnValue(row, columnMappings.username);
      const hoursRaw = getColumnValue(row, columnMappings.hours);
      const diamondsRaw = getColumnValue(row, columnMappings.diamonds);

      if (!creatorId) {
        console.warn('[upload-excel-recommendations] Skipping row without creator ID:', row);
        continue;
      }

      // Buscar creator por ID
      const { data: creators } = await supabase
        .from('creators')
        .select('id, nombre')
        .eq('id', creatorId)
        .limit(1);

      if (!creators || creators.length === 0) {
        console.warn(`[upload-excel-recommendations] Creator not found: ${creatorId}`);
        continue;
      }

      const creator = creators[0];
      const hours = parseHours(hoursRaw);
      const diamonds = parseNumber(diamondsRaw);

      // Upsert a creator_live_daily
      const { error: upsertError } = await supabase
        .from('creator_live_daily')
        .upsert({
          creator_id: creator.id,
          fecha: today,
          horas: hours,
          diamantes: diamonds,
        }, {
          onConflict: 'creator_id,fecha'
        });

      if (upsertError) {
        console.error(`[upload-excel-recommendations] Error upserting ${creator.id}:`, upsertError);
      } else {
        insertedCount++;
        records.push({ creator_id: creator.id, horas: hours, diamantes: diamonds });
      }
    }

    console.log(`[upload-excel-recommendations] Upserted ${insertedCount} records`);

    // Refrescar la vista materializada
    console.log('[upload-excel-recommendations] Refreshing materialized view...');
    const { error: refreshError } = await supabase.rpc('refresh_creator_riesgos_mes');

    if (refreshError) {
      console.error('[upload-excel-recommendations] Error refreshing view:', refreshError);
    }

    // Obtener resumen de riesgos
    const { data: riesgos, error: riesgosError } = await supabase
      .from('creator_riesgos_mes')
      .select('prioridad_riesgo, faltan_dias, faltan_horas');

    let summary = {
      total: 0,
      riesgo_alto: 0,
      riesgo_medio: 0,
      riesgo_bajo: 0,
      con_deficit_dias: 0,
      con_deficit_horas: 0,
    };

    if (riesgos && !riesgosError) {
      summary.total = riesgos.length;
      summary.riesgo_alto = riesgos.filter(r => r.prioridad_riesgo >= 40).length;
      summary.riesgo_medio = riesgos.filter(r => r.prioridad_riesgo >= 20 && r.prioridad_riesgo < 40).length;
      summary.riesgo_bajo = riesgos.filter(r => r.prioridad_riesgo < 20).length;
      summary.con_deficit_dias = riesgos.filter(r => r.faltan_dias > 0).length;
      summary.con_deficit_horas = riesgos.filter(r => r.faltan_horas > 0).length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        records_processed: insertedCount,
        summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[upload-excel-recommendations] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

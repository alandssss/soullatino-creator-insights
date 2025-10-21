# Módulo: Alertas y Sugerencias

## Descripción General

Sistema predictivo de bonificaciones integrado con Supabase que permite:
- Importar datos diarios desde Excel de TikTok
- Calcular riesgos y prioridades basados en métricas de días, horas y diamantes
- Mostrar tabla priorizada con recomendaciones accionables
- Contactar creadores vía WhatsApp/Teléfono
- Registrar actividad de contactos

## Arquitectura

### Base de Datos

#### Tablas

1. **`creator_live_daily`** (ya existía)
   - `id`: bigserial
   - `creator_id`: uuid
   - `fecha`: date
   - `horas`: numeric(7,2)
   - `diamantes`: numeric(12,2)
   - `created_at`: timestamptz

2. **`creator_contact_log`** (nueva)
   - Registra cada intento de contacto (WhatsApp/Teléfono)
   - Campos: creator_id, phone_e164, channel, action, user_agent, ip, notes

#### Vista Materializada

**`creator_riesgos_mes`**
- Calcula métricas agregadas del mes actual (zona horaria: America/Chihuahua)
- Campos calculados:
  - `dias_actuales`, `horas_actuales`, `diamantes_actuales`
  - `proximo_objetivo` (12d/40h, 20d/60h, 22d/80h)
  - `faltan_dias`, `faltan_horas`
  - `horas_min_dia_sugeridas` (mínimo 2.0h/día)
  - `prioridad_riesgo` (0-100, donde ≥40 es riesgo alto)
  - `dias_restantes` en el mes

#### Función

**`refresh_creator_riesgos_mes()`**
- Refresca la vista materializada de forma concurrente
- Se ejecuta después de cada carga de Excel y diariamente vía cron

### Edge Functions

Todas ubicadas en `supabase/functions/` y requieren autenticación JWT:

1. **`upload-excel-recommendations`**
   - POST multipart/form-data con archivo .xlsx
   - Parsea columnas en ES/EN
   - Parsea horas en formatos: "125h 8min 10s", "8:30:00", "90min", "12.5"
   - Upsert a `creator_live_daily`
   - Refresca vista materializada
   - Retorna resumen de riesgos

2. **`get-recommendations-today`**
   - GET recomendaciones ordenadas por prioridad_riesgo DESC
   - Retorna lista + resumen de riesgos

3. **`register-contact`**
   - POST { creator_id, creator_username, phone_e164, channel }
   - Inserta en `creator_contact_log`
   - Si channel='WhatsApp': registra también en `whatsapp_activity`

4. **`cron-daily-recompute`**
   - Refresca vista materializada
   - Recalcula bonificaciones del mes
   - Retorna resumen actualizado
   - **Programar**: 08:00 America/Chihuahua diariamente

## Frontend

### Componente: `AlertasSugerencias.tsx`

Ubicado en `src/components/AlertasSugerencias.tsx`

**Características:**
- Uploader de Excel con validación (.xlsx, .xls)
- Tabla de recomendaciones con cards responsivas
- Filtros: búsqueda por nombre, riesgo (alto/medio/bajo)
- Badges de riesgo y alertas críticas
- Botones de acción: WhatsApp, Llamar
- Exportar CSV
- Dashboard de resumen (total, riesgo alto/medio/bajo, déficits)

**Mensaje WhatsApp generado:**
```
Hola {Creator} 👋
Quedan {DiasRestantes} días del mes.

Para {ProximoObjetivo}:
• Te faltan {FaltanDias} día(s)
• Te faltan {FaltanHoras} horas

Recomiendo {HorasMinDiaSugeridas} horas/día hasta fin de mes.

⚠️ Si saltas 1 día, podrías perder la bonificación.

¿Confirmas {HorasMinDiaSugeridas}h hoy y 5 PKO de 5 min?
```

### Ruta

Accesible en: `/alertas`
- Integrada en el menú principal de navegación
- Accesible para roles: admin, manager, viewer

## Formato de Excel Esperado

El parser acepta columnas en español e inglés (mayúsculas/minúsculas):

| Columna Requerida | Nombres Aceptados |
|-------------------|-------------------|
| Creator ID | `Creator ID`, `User ID`, `ID`, `CreatorID` |
| Username | `Username`, `Creator Name`, `Nombre` |
| Días | `Days`, `Días`, `Days live` |
| Horas | `Hours`, `Horas`, `Live Hours`, `Live duration` |
| Diamantes | `Diamonds`, `Diamantes` |

**Formatos de Horas Soportados:**
- `125h 8min 10s` → 125.136 horas
- `8:30:00` → 8.5 horas
- `90min` → 1.5 horas
- `12.5` → 12.5 horas

## Cálculo de Riesgo

### Fórmula de Prioridad de Riesgo

```
prioridad_riesgo = componente_dias + componente_horas

componente_dias:
  - margen <= 0 días: +50
  - margen == 1 día: +40
  - margen <= 3 días: +25
  - margen > 3 días: +10

componente_horas:
  - faltan > 20h: +30
  - faltan > 10h: +20
  - faltan > 0h: +10
  - cumplido: +0

margen = dias_restantes - faltan_dias
```

### Umbrales de Objetivos

| Objetivo | Días | Horas |
|----------|------|-------|
| 12d/40h | 12 | 40 |
| 20d/60h | 20 | 60 |
| 22d/80h | 22 | 80 |

**Lógica:**
- Si cumple 12d/40h → próximo objetivo: 20d/60h
- Si cumple 20d/60h → próximo objetivo: 22d/80h
- Si cumple 22d/80h → próximo objetivo: 22d/80h (mantiene)

## Seguridad (RLS)

### Políticas Activas

**`creator_live_daily`:**
- SELECT: admin, manager, viewer
- INSERT: admin, manager

**`creator_contact_log`:**
- SELECT: admin, manager
- INSERT: admin, manager

**`creator_riesgos_mes`:**
- SELECT: autenticados (vía GRANT)

## Instalación y Configuración

### 1. Migraciones

Las migraciones ya fueron ejecutadas:
- Tabla `creator_contact_log`
- Vista materializada `creator_riesgos_mes`
- Función `refresh_creator_riesgos_mes()`

### 2. Edge Functions

Las funciones se despliegan automáticamente al hacer push:
```bash
# No requiere acción manual, se despliegan con el código
```

### 3. Configuración de Cron (Opcional)

Para ejecutar `cron-daily-recompute` a las 08:00 diariamente:

```sql
-- Habilitar extensiones (si no están)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Programar cron (ajustar timezone según necesidad)
SELECT cron.schedule(
  'daily-recompute-alertas',
  '0 8 * * *',  -- 08:00 diariamente
  $$
  SELECT net.http_post(
    url:='https://rgypfqxiqeymltbinkvs.supabase.co/functions/v1/cron-daily-recompute',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

## Uso

### 1. Cargar Datos desde Excel

1. Ir a `/alertas`
2. Click en "Subir Excel"
3. Seleccionar archivo .xlsx o .xls con datos de TikTok
4. El sistema procesa automáticamente y muestra resumen

### 2. Revisar Recomendaciones

- Tabla ordenada por prioridad de riesgo (alto primero)
- Filtros rápidos: Todos, Alto, Medio, Bajo
- Búsqueda por nombre de creador
- Cards muestran: métricas actuales, faltantes, horas sugeridas/día

### 3. Contactar Creadores

**WhatsApp:**
- Click en botón "WhatsApp"
- Se registra el contacto automáticamente
- Abre wa.me con mensaje pre-rellenado

**Teléfono:**
- Click en botón "Llamar"
- En móvil: abre marcador (tel:)
- En desktop: muestra número para copiar
- Se registra el intento

### 4. Exportar Datos

- Click en "Exportar CSV"
- Descarga CSV con datos filtrados actuales

## Testing

### Casos de Prueba

**Parser de Horas:**
```javascript
// Casos esperados
parseHours("125h 8min 10s") // → 125.136
parseHours("8:30:00")        // → 8.5
parseHours("90min")          // → 1.5
parseHours("12.5")           // → 12.5
```

**Cálculo de Riesgo:**
```sql
-- Caso: Faltan 2 días, 15 horas, quedan 3 días del mes
-- margen = 3 - 2 = 1 → +40
-- horas > 10 → +20
-- TOTAL = 60 (riesgo alto ≥40)
```

### Endpoint de Prueba

```bash
# GET recomendaciones
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://rgypfqxiqeymltbinkvs.supabase.co/functions/v1/get-recommendations-today

# POST contact
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"creator_id":"UUID","creator_username":"Test","phone_e164":"+525512345678","channel":"WhatsApp"}' \
  https://rgypfqxiqeymltbinkvs.supabase.co/functions/v1/register-contact
```

## Troubleshooting

### Error: "No hay recomendaciones"

**Causa:** Vista materializada vacía o sin datos del mes actual
**Solución:**
1. Verificar datos en `creator_live_daily` para el mes actual
2. Ejecutar manualmente: `SELECT refresh_creator_riesgos_mes();`
3. Subir un Excel nuevo para forzar cálculo

### Error: "Sin teléfono registrado"

**Causa:** Campo `telefono` en `creators` es NULL
**Solución:** Actualizar número de teléfono en tabla `creators` (formato E.164 preferido)

### Vista materializada desactualizada

**Causa:** No se ejecutó el refresh después de insertar datos
**Solución:**
```sql
SELECT refresh_creator_riesgos_mes();
```

## Roadmap Futuro

- [ ] Histórico de recomendaciones (sparklines por creador)
- [ ] Notificaciones automáticas a managers si riesgo ≥ 40
- [ ] Selector de umbral personalizado por creador
- [ ] Integración con Twilio para llamadas automatizadas
- [ ] Dashboard de tendencias semanales

## Soporte

Para dudas o problemas:
1. Revisar logs en Supabase Dashboard → Functions → Logs
2. Verificar políticas RLS si hay errores de permisos
3. Consultar esta documentación

---

**Última actualización:** 2025-10-21  
**Versión:** 1.0.0

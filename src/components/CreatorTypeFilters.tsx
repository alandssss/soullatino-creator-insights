import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, Phone, PhoneOff, AlertTriangle, Award } from "lucide-react";

export type CreatorFilterType = 
  | "todos" 
  | "nuevos" 
  | "activos_telefono" 
  | "sin_telefono" 
  | "en_riesgo" 
  | "top_diamantes";

interface CreatorTypeFiltersProps {
  selectedFilter: CreatorFilterType;
  onFilterChange: (filter: CreatorFilterType) => void;
  counts?: {
    total: number;
    nuevos: number;
    activos: number;
    sinTelefono: number;
    enRiesgo: number;
    top: number;
  };
}

export function CreatorTypeFilters({ 
  selectedFilter, 
  onFilterChange,
  counts
}: CreatorTypeFiltersProps) {
  const filters = [
    { value: "todos", label: "Todos los creadores", icon: Users, count: counts?.total },
    { value: "nuevos", label: "Nuevos (<90 días)", icon: Sparkles, count: counts?.nuevos },
    { value: "activos_telefono", label: "Con teléfono", icon: Phone, count: counts?.activos },
    { value: "sin_telefono", label: "Sin teléfono", icon: PhoneOff, count: counts?.sinTelefono },
    { value: "en_riesgo", label: "En riesgo (0 actividad)", icon: AlertTriangle, count: counts?.enRiesgo },
    { value: "top_diamantes", label: "Top diamantes", icon: Award, count: counts?.top },
  ] as const;

  return (
    <div className="space-y-3">
      <Select value={selectedFilter} onValueChange={(v) => onFilterChange(v as CreatorFilterType)}>
        <SelectTrigger className="w-full md:w-[280px]">
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent>
          {filters.map((filter) => {
            const Icon = filter.icon;
            return (
              <SelectItem key={filter.value} value={filter.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{filter.label}</span>
                  {filter.count !== undefined && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {filter.count}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = selectedFilter === filter.value;
          return (
            <Badge
              key={filter.value}
              variant={isActive ? "default" : "outline"}
              className="cursor-pointer gap-1.5 px-3 py-1.5"
              onClick={() => onFilterChange(filter.value as CreatorFilterType)}
            >
              <Icon className="h-3.5 w-3.5" />
              {filter.label}
              {filter.count !== undefined && (
                <span className="ml-1 font-semibold">({filter.count})</span>
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

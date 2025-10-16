import { useState, useEffect } from "react";
import { CreatorFilterType } from "@/components/CreatorTypeFilters";

interface Creator {
  id: string;
  nombre: string;
  telefono?: string;
  dias_en_agencia?: number;
  dias_live_mes?: number;
  horas_live_mes?: number;
  diam_live_mes?: number;
}

export function useCreatorFilters(creators: Creator[]) {
  const [selectedFilter, setSelectedFilter] = useState<CreatorFilterType>(() => {
    const stored = localStorage.getItem('creator_filter_type');
    return (stored as CreatorFilterType) || "todos";
  });

  useEffect(() => {
    localStorage.setItem('creator_filter_type', selectedFilter);
  }, [selectedFilter]);

  const applyFilter = (creators: Creator[]): Creator[] => {
    switch (selectedFilter) {
      case "nuevos":
        return creators.filter(c => (c.dias_en_agencia || 0) < 90);
      
      case "activos_telefono":
        return creators.filter(c => c.telefono && c.telefono.length > 0);
      
      case "sin_telefono":
        return creators.filter(c => !c.telefono || c.telefono.length === 0);
      
      case "en_riesgo":
        return creators.filter(c => 
          (c.dias_live_mes === undefined || c.dias_live_mes === 0) && 
          (c.horas_live_mes === undefined || c.horas_live_mes === 0)
        );
      
      case "top_diamantes":
        return [...creators]
          .sort((a, b) => (b.diam_live_mes || 0) - (a.diam_live_mes || 0))
          .slice(0, 20);
      
      default:
        return creators;
    }
  };

  const getCounts = (creators: Creator[]) => ({
    total: creators.length,
    nuevos: creators.filter(c => (c.dias_en_agencia || 0) < 90).length,
    activos: creators.filter(c => c.telefono && c.telefono.length > 0).length,
    sinTelefono: creators.filter(c => !c.telefono || c.telefono.length === 0).length,
    enRiesgo: creators.filter(c => 
      (c.dias_live_mes === undefined || c.dias_live_mes === 0) && 
      (c.horas_live_mes === undefined || c.horas_live_mes === 0)
    ).length,
    top: Math.min(20, creators.length),
  });

  return {
    selectedFilter,
    setSelectedFilter,
    filteredCreators: applyFilter(creators),
    counts: getCounts(creators),
  };
}

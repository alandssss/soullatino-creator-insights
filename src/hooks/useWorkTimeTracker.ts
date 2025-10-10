import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkTimeData {
  accumulatedSeconds: number;
  dailyGoalHours: number;
  isActive: boolean;
  isLoading: boolean;
}

export const useWorkTimeTracker = (userEmail?: string) => {
  const [timeData, setTimeData] = useState<WorkTimeData>({
    accumulatedSeconds: 0,
    dailyGoalHours: 8,
    isActive: false,
    isLoading: true,
  });
  
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar actividad del usuario
  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    if (!timeData.isActive) {
      setActive(true);
    }
  };

  // Inicializar listeners de actividad
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetActivityTimer);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivityTimer);
      });
    };
  }, [timeData.isActive]);

  // Verificar inactividad cada 5 segundos
  useEffect(() => {
    activityCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const INACTIVITY_THRESHOLD = 60000; // 1 minuto sin actividad

      if (timeSinceLastActivity > INACTIVITY_THRESHOLD && timeData.isActive) {
        setActive(false);
      }
    }, 5000);

    return () => {
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
    };
  }, [timeData.isActive]);

  const fetchTodayActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener meta de horas del usuario
      const { data: goalData } = await supabase
        .from("user_work_goals")
        .select("daily_hours_goal")
        .eq("user_id", user.id)
        .maybeSingle();

      const dailyGoal = goalData?.daily_hours_goal || 8;

      // Obtener inicio y fin del período actual desde la base de datos
      const { data: periodData } = await supabase.rpc('get_current_period_start');
      const periodStart = periodData;

      // Obtener actividad del período actual
      const { data: activityData, error } = await supabase
        .from("user_daily_activity")
        .select("*")
        .eq("user_id", user.id)
        .eq("period_start_date", periodStart)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching activity:", error);
        return;
      }

      if (activityData) {
        setTimeData({
          accumulatedSeconds: activityData.accumulated_seconds || 0,
          dailyGoalHours: dailyGoal,
          isActive: activityData.is_active || false,
          isLoading: false,
        });
      } else {
        // Crear registro para el período actual
        const { error: insertError } = await supabase
          .from("user_daily_activity")
          .insert({
            user_id: user.id,
            period_start_date: periodStart,
            accumulated_seconds: 0,
            daily_goal_hours: dailyGoal,
            is_active: false,
          });

        if (insertError) {
          console.error("Error creating period activity:", insertError);
        }

        setTimeData({
          accumulatedSeconds: 0,
          dailyGoalHours: dailyGoal,
          isActive: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Error in fetchTodayActivity:", error);
      setTimeData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setActive = async (active: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: periodStart } = await supabase.rpc('get_current_period_start');
      
      const { error } = await supabase
        .from("user_daily_activity")
        .update({
          is_active: active,
          last_activity_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("period_start_date", periodStart);

      if (error) {
        console.error("Error updating active status:", error);
        return;
      }

      setTimeData(prev => ({ ...prev, isActive: active }));

      if (!active) {
        toast({
          title: "Contador pausado",
          description: "Se detectó inactividad. Continúa dando feedback para reanudar.",
        });
      }
    } catch (error) {
      console.error("Error in setActive:", error);
    }
  };

  const incrementTime = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: periodStart } = await supabase.rpc('get_current_period_start');
      const newSeconds = timeData.accumulatedSeconds + 1;

      const { error } = await supabase
        .from("user_daily_activity")
        .update({
          accumulated_seconds: newSeconds,
          last_activity_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("period_start_date", periodStart);

      if (error) {
        console.error("Error incrementing time:", error);
        return;
      }

      setTimeData(prev => ({
        ...prev,
        accumulatedSeconds: newSeconds,
      }));

      // Notificar cuando alcance la meta
      const hours = newSeconds / 3600;
      if (hours >= timeData.dailyGoalHours && (newSeconds - 1) / 3600 < timeData.dailyGoalHours) {
        toast({
          title: "¡Meta de apoyo alcanzada! 🎉",
          description: `Has completado tus ${timeData.dailyGoalHours} horas de feedback a creadores.`,
        });
      }
    } catch (error) {
      console.error("Error in incrementTime:", error);
    }
  };

  // Incrementar contador cada segundo si está activo
  useEffect(() => {
    if (timeData.isActive && !timeData.isLoading) {
      intervalRef.current = setInterval(incrementTime, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeData.isActive, timeData.isLoading, timeData.accumulatedSeconds]);

  // Cargar datos al montar
  useEffect(() => {
    fetchTodayActivity();
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalGoalSeconds = timeData.dailyGoalHours * 3600;
    return Math.min((timeData.accumulatedSeconds / totalGoalSeconds) * 100, 100);
  };

  return {
    ...timeData,
    formatTime: formatTime(timeData.accumulatedSeconds),
    progress: getProgress(),
    refresh: fetchTodayActivity,
  };
};

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WorkTimeData {
  accumulatedSeconds: number;
  dailyGoalHours: number;
  isActive: boolean;
  isLoading: boolean;
  sessionStartAt: number | null;
  lastActivityAt: number | null;
}

const INACTIVITY_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutos
const DAILY_GOAL_MINUTES = 300; // 5 horas = 300 minutos

export const useWorkTimeTracker = (userEmail?: string) => {
  const [timeData, setTimeData] = useState<WorkTimeData>({
    accumulatedSeconds: 0,
    dailyGoalHours: 5, // Meta de 5 horas
    isActive: false,
    isLoading: true,
    sessionStartAt: null,
    lastActivityAt: null,
  });

  const activityCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Persistir/cargar desde localStorage
  const saveToLocalStorage = (data: Partial<WorkTimeData>) => {
    const stored = JSON.parse(localStorage.getItem('feedback_work_data') || '{}');
    const updated = { ...stored, ...data, date: new Date().toDateString() };
    localStorage.setItem('feedback_work_data', JSON.stringify(updated));
  };

  const loadFromLocalStorage = (): Partial<WorkTimeData> | null => {
    const stored = JSON.parse(localStorage.getItem('feedback_work_data') || '{}');
    const today = new Date().toDateString();
    if (stored.date === today) {
      return stored;
    }
    return null;
  };

  useEffect(() => {
    fetchTodayActivity();
  }, [userEmail]);

  // Detectar actividad del usuario y actualizar lastActivityAt
  useEffect(() => {
    if (!timeData.isActive) return;

    const updateActivity = () => {
      setTimeData(prev => ({ ...prev, lastActivityAt: Date.now() }));
      saveToLocalStorage({ lastActivityAt: Date.now() });
    };

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'wheel'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    updateActivity(); // Actualizar inmediatamente

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [timeData.isActive]);

  // Verificar inactividad periódicamente
  useEffect(() => {
    if (!timeData.isActive || !timeData.lastActivityAt || !timeData.sessionStartAt) return;

    activityCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - (timeData.lastActivityAt || now);

      if (timeSinceActivity >= INACTIVITY_THRESHOLD_MS) {
        // Pausar automáticamente y sumar tiempo acumulado
        const sessionDuration = (timeData.lastActivityAt! - timeData.sessionStartAt!) / 1000;
        const newAccumulated = timeData.accumulatedSeconds + Math.max(0, Math.floor(sessionDuration));
        
        setTimeData(prev => ({
          ...prev,
          isActive: false,
          accumulatedSeconds: newAccumulated,
          sessionStartAt: null,
          lastActivityAt: null,
        }));

        saveToLocalStorage({
          accumulatedSeconds: newAccumulated,
          isActive: false,
          sessionStartAt: null,
          lastActivityAt: null,
        });

        updateAccumulatedInDB(newAccumulated);
      }
    }, 30000); // Verificar cada 30 segundos

    return () => {
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
    };
  }, [timeData.isActive, timeData.lastActivityAt, timeData.sessionStartAt, timeData.accumulatedSeconds]);

  // Calcular tiempo actual basado en timestamps
  const getCurrentAccumulatedSeconds = (): number => {
    if (!timeData.isActive || !timeData.sessionStartAt || !timeData.lastActivityAt) {
      return timeData.accumulatedSeconds;
    }

    const now = Date.now();
    const timeSinceActivity = now - timeData.lastActivityAt;
    
    // Si hay más de 20 min sin actividad, no sumar más
    if (timeSinceActivity >= INACTIVITY_THRESHOLD_MS) {
      const sessionDuration = (timeData.lastActivityAt - timeData.sessionStartAt) / 1000;
      return timeData.accumulatedSeconds + Math.max(0, Math.floor(sessionDuration));
    }

    // Sumar el tiempo de la sesión actual
    const sessionDuration = (now - timeData.sessionStartAt) / 1000;
    return timeData.accumulatedSeconds + Math.max(0, Math.floor(sessionDuration));
  };

  // Actualizar display cada segundo
  useEffect(() => {
    if (!timeData.isActive) return;

    const interval = setInterval(() => {
      setTimeData(prev => ({ ...prev })); // Forzar re-render para actualizar el display
    }, 1000);

    return () => clearInterval(interval);
  }, [timeData.isActive]);

  const fetchTodayActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTimeData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('user_daily_activity')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching activity:', error);
        setTimeData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Cargar desde localStorage primero
      const localData = loadFromLocalStorage();

      if (data) {
        setTimeData({
          accumulatedSeconds: localData?.accumulatedSeconds ?? data.accumulated_seconds,
          dailyGoalHours: 5,
          isActive: localData?.isActive ?? data.is_active,
          isLoading: false,
          sessionStartAt: localData?.sessionStartAt ?? null,
          lastActivityAt: localData?.lastActivityAt ?? null,
        });
      } else {
        // Crear registro nuevo
        const { error: insertError } = await supabase
          .from('user_daily_activity')
          .insert({
            user_id: user.id,
            activity_date: today,
            accumulated_seconds: 0,
            daily_goal_hours: 5,
            is_active: false,
          });

        if (!insertError) {
          setTimeData({
            accumulatedSeconds: 0,
            dailyGoalHours: 5,
            isActive: false,
            isLoading: false,
            sessionStartAt: null,
            lastActivityAt: null,
          });
        }
      }
    } catch (error) {
      console.error('Error in fetchTodayActivity:', error);
      setTimeData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setActive = async (active: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const now = Date.now();

      if (active) {
        // Iniciar sesión
        const { error } = await supabase
          .from('user_daily_activity')
          .update({
            is_active: true,
            last_activity_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('activity_date', today);

        if (!error) {
          setTimeData(prev => ({
            ...prev,
            isActive: true,
            sessionStartAt: now,
            lastActivityAt: now,
          }));
          saveToLocalStorage({ isActive: true, sessionStartAt: now, lastActivityAt: now });
        }
      } else {
        // Pausar sesión y guardar tiempo acumulado
        const currentAccumulated = getCurrentAccumulatedSeconds();
        
        const { error } = await supabase
          .from('user_daily_activity')
          .update({
            is_active: false,
            accumulated_seconds: currentAccumulated,
            last_activity_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('activity_date', today);

        if (!error) {
          setTimeData(prev => ({
            ...prev,
            isActive: false,
            accumulatedSeconds: currentAccumulated,
            sessionStartAt: null,
            lastActivityAt: null,
          }));
          saveToLocalStorage({
            isActive: false,
            accumulatedSeconds: currentAccumulated,
            sessionStartAt: null,
            lastActivityAt: null,
          });
        }
      }
    } catch (error) {
      console.error('Error setting active state:', error);
    }
  };

  const updateAccumulatedInDB = async (seconds: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('user_daily_activity')
        .update({
          accumulated_seconds: seconds,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('activity_date', today);
    } catch (error) {
      console.error('Error updating accumulated time:', error);
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    const currentSeconds = getCurrentAccumulatedSeconds();
    const goalSeconds = DAILY_GOAL_MINUTES * 60; // 5 horas en segundos
    return Math.min((currentSeconds / goalSeconds) * 100, 100);
  };

  return {
    ...timeData,
    formatTime: formatTime(getCurrentAccumulatedSeconds()),
    progress: getProgress(),
    refresh: fetchTodayActivity,
    accumulatedSeconds: getCurrentAccumulatedSeconds(),
  };
};

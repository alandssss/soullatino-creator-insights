import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayActivity {
  date: string;
  seconds: number;
  goalHours: number;
  completed: boolean;
}

export const MonthlyFeedbackCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthActivities, setMonthActivities] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthActivities();
  }, [currentMonth]);

  const fetchMonthActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener meta del usuario
      const { data: goalData } = await supabase
        .from("user_work_goals")
        .select("daily_hours_goal")
        .eq("user_id", user.id)
        .maybeSingle();

      const dailyGoal = goalData?.daily_hours_goal || 8;

      // Calcular inicio y fin del mes
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: activities, error } = await supabase
        .from("user_daily_activity")
        .select("*")
        .eq("user_id", user.id)
        .gte("activity_date", monthStart.toISOString().split('T')[0])
        .lte("activity_date", monthEnd.toISOString().split('T')[0])
        .order("activity_date", { ascending: true });

      if (error) {
        console.error("Error fetching month activities:", error);
        return;
      }

      const processedActivities: DayActivity[] = (activities || []).map(activity => ({
        date: activity.activity_date,
        seconds: activity.accumulated_seconds || 0,
        goalHours: activity.daily_goal_hours || dailyGoal,
        completed: (activity.accumulated_seconds || 0) >= (activity.daily_goal_hours || dailyGoal) * 3600,
      }));

      setMonthActivities(processedActivities);
    } catch (error) {
      console.error("Error in fetchMonthActivities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getActivityForDate = (day: number): DayActivity | undefined => {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return monthActivities.find(a => a.date === dateStr);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isFutureDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date > new Date();
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();
  const monthName = currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Registro Mensual de Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Registro Mensual de Feedback
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[150px] text-center">
              {monthName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-2">
          {/* Espacios vacíos antes del primer día */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const activity = getActivityForDate(day);
            const today = isToday(day);
            const future = isFutureDate(day);

            let bgColor = "bg-muted/20";
            let textColor = "text-muted-foreground";
            let borderColor = "border-border/20";

            if (!future && activity) {
              if (activity.completed) {
                bgColor = "bg-green-500/20";
                borderColor = "border-green-500/40";
                textColor = "text-green-700 dark:text-green-400";
              } else {
                bgColor = "bg-red-500/20";
                borderColor = "border-red-500/40";
                textColor = "text-red-700 dark:text-red-400";
              }
            }

            if (today) {
              borderColor = "border-primary ring-2 ring-primary/20";
            }

            return (
              <div
                key={day}
                className={`
                  aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                  transition-all cursor-default
                  ${bgColor} ${borderColor} ${textColor}
                  ${future ? 'opacity-40' : ''}
                `}
              >
                <div className="text-sm font-bold">{day}</div>
                {activity && !future && (
                  <div className="text-[10px] mt-1">
                    {(activity.seconds / 3600).toFixed(1)}h
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500/40" />
            <span className="text-muted-foreground">Meta cumplida</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border-2 border-red-500/40" />
            <span className="text-muted-foreground">Meta no cumplida</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted/20 border-2 border-border/20" />
            <span className="text-muted-foreground">Sin datos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, Target } from "lucide-react";
import { useWorkTimeTracker } from "@/hooks/useWorkTimeTracker";
import { Badge } from "@/components/ui/badge";

interface WorkTimeTrackerProps {
  userEmail?: string;
}

export const WorkTimeTracker = ({ userEmail }: WorkTimeTrackerProps) => {
  const { formatTime, progress, dailyGoalHours, isActive, isLoading } = useWorkTimeTracker(userEmail);

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/30">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Tiempo de Feedback a Creadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/30">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Tiempo de Feedback a Creadores
          </div>
          <Badge variant={isActive ? "default" : "secondary"} className="ml-auto">
            {isActive ? "Dando Feedback" : "Pausado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1 font-mono">
            {formatTime}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            <span>Meta: {dailyGoalHours}h diarias</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {progress >= 100 && (
          <div className="text-center text-sm font-medium text-green-600 dark:text-green-400">
            ¡Meta del día alcanzada! 🎉
          </div>
        )}

        {!isActive && (
          <div className="text-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            El contador está pausado por inactividad. Continúa dando feedback para reanudar.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

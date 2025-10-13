import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProbabilityBadgeProps {
  probability: number;
  className?: string;
}

export const ProbabilityBadge = ({ probability, className }: ProbabilityBadgeProps) => {
  const getVariant = () => {
    if (probability >= 90) return "default";
    if (probability >= 70) return "secondary";
    if (probability >= 50) return "outline";
    return "destructive";
  };

  const getLabel = () => {
    if (probability >= 90) return "Muy probable";
    if (probability >= 70) return "Probable";
    if (probability >= 50) return "Posible";
    return "Difícil";
  };

  const getColorClass = () => {
    if (probability >= 90) return "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50";
    if (probability >= 70) return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50";
    if (probability >= 50) return "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50";
    return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50";
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn(getColorClass(), className)}
    >
      {getLabel()} ({probability}%)
    </Badge>
  );
};

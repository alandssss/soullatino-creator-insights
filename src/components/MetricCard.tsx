import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "default" | "primary" | "accent" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  default: "bg-muted/30 border-border",
  primary: "bg-primary/10 border-primary/20 text-primary",
  accent: "bg-accent/10 border-accent/20 text-accent",
  success: "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
  warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
};

export const MetricCard = ({ 
  label, 
  value, 
  icon: Icon, 
  variant = "default",
  className 
}: MetricCardProps) => {
  return (
    <div className={cn("p-3 rounded-lg border", variantStyles[variant], className)}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-3 w-3 opacity-50" />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

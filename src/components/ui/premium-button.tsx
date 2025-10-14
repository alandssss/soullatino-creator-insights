import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const premiumButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 neo-button",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-primary-light text-primary-foreground hover:shadow-glow-primary",
        accent: "bg-gradient-to-r from-accent to-accent-light text-accent-foreground hover:shadow-glow-accent",
        outline: "border-2 border-border hover:bg-muted/50 hover:border-primary/50",
        ghost: "hover:bg-muted/30 hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        glass: "glass-effect hover:bg-card/50",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof premiumButtonVariants> {
  asChild?: boolean;
}

const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(premiumButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
PremiumButton.displayName = "PremiumButton";

export { PremiumButton, premiumButtonVariants };

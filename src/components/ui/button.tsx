import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-card text-primary border border-border/40 neo-card-sm hover:shadow-[var(--neo-shadow-light),var(--neo-shadow-dark),var(--neo-glow-primary)] hover:scale-[1.02] active:neo-card-pressed active:scale-[0.98]",
        destructive: "bg-card text-destructive border border-destructive/30 neo-card-sm hover:shadow-[var(--neo-shadow-light),var(--neo-shadow-dark)] hover:border-destructive/50 active:neo-card-pressed",
        outline: "border border-border/40 bg-card text-foreground neo-card-sm hover:text-primary hover:border-primary/40 active:neo-card-pressed",
        secondary: "bg-card text-secondary-foreground border border-border/30 neo-card-sm hover:shadow-[var(--neo-shadow-light),var(--neo-shadow-dark)] active:neo-card-pressed",
        ghost: "hover:bg-muted/50 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-card text-green-400 border border-green-500/30 neo-card-sm hover:shadow-[var(--neo-shadow-light),var(--neo-shadow-dark),0_0_20px_hsl(142_76%_56%/0.3)] hover:scale-[1.02] active:neo-card-pressed active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

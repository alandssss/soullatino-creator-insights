import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/30",
        outline: "border border-input bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] text-foreground hover:bg-[var(--glass-highlight)] hover:shadow-lg",
        success: "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:shadow-green-600/30 hover:scale-[1.02] active:scale-[0.98]",
        metallic: "relative bg-gradient-to-br from-[hsl(0_0%_85%)] via-[hsl(0_0%_65%)] to-[hsl(0_0%_75%)] text-[hsl(0_0%_15%)] font-semibold border-[3px] border-transparent bg-clip-padding shadow-[var(--metallic-shadow-outer)] hover:shadow-[0_6px_12px_hsl(0_0%_0%_/_0.5),_0_3px_6px_hsl(0_0%_0%_/_0.4)] hover:scale-[1.03] active:scale-[0.97] active:shadow-[inset_0_3px_6px_hsl(0_0%_0%_/_0.4)] before:absolute before:inset-0 before:rounded-[calc(0.75rem-3px)] before:bg-gradient-to-b before:from-[hsl(0_0%_100%_/_0.4)] before:to-transparent before:pointer-events-none after:absolute after:inset-0 after:rounded-[calc(0.75rem-3px)] after:shadow-[inset_0_2px_4px_hsl(0_0%_100%_/_0.3),_inset_0_-2px_4px_hsl(0_0%_0%_/_0.3)] after:pointer-events-none [&]:bg-origin-border [&]:border-[image:var(--metallic-border)_1]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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

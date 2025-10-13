import * as React from "react";
import { cn } from "../../lib/utils";

type Variant = "default" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  default: "btn btn-default",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  destructive: "btn btn-destructive"
};

const sizeClasses: Record<Size, string> = {
  default: "",
  sm: "btn-sm",
  lg: "btn-lg"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button ref={ref} className={cn(variantClasses[variant], sizeClasses[size], className)} {...props} />
  )
);

Button.displayName = "Button";

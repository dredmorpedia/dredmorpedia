"use client";

import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary px-4 text-primary-foreground hover:bg-primary/90",
        outline:
          "border-border bg-surface px-4 text-foreground hover:border-primary hover:text-primary",
        ghost:
          "border-transparent px-3 text-muted-foreground hover:text-foreground",
      },
      size: {
        default: "h-10",
        small: "h-9 min-h-9 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends
    React.ComponentProps<typeof ButtonPrimitive>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

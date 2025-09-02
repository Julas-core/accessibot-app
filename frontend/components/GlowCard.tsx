import React from "react";
import { Card } from "@/components/ui/card";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  glowProps?: Partial<{
    blur: number;
    inactiveZone: number;
    proximity: number;
    spread: number;
    variant: "default" | "white";
    glow: boolean;
    movementDuration: number;
    borderWidth: number;
    disabled: boolean;
  }>;
}

export function GlowCard({
  children,
  className,
  wrapperClassName,
  glowProps,
}: GlowCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3",
        wrapperClassName
      )}
    >
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
        {...glowProps}
      />
      <Card
        className={cn(
          "relative rounded-[inherit] border-[0.75px] bg-background shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]",
          className
        )}
      >
        {children}
      </Card>
    </div>
  );
}

import React from "react";
import { LavaLamp } from "@/components/ui/fluid-blob";

export default function DemoOne() {
  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center relative overflow-hidden">
      <LavaLamp />
      <h1 className="text-6xl md:text-8xl font-bold tracking-tight mix-blend-exclusion text-white whitespace-nowrap">
        Morphic Dreams
      </h1>
      <p className="text-lg md:text-xl text-center text-white mix-blend-exclusion max-w-2xl leading-relaxed">
        Where thoughts take shape and consciousness flows like liquid mercury through infinite dimensions.
      </p>
    </div>
  );
}

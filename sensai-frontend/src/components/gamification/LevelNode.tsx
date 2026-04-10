"use client";

import React from "react";
import { Check, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelNodeProps {
    id: number;
    title: string;
    status: "locked" | "active" | "completed";
    stars?: number;
    onClick?: () => void;
    position?: "left" | "right" | "center";
}

export function LevelNode({ id, title, status, stars = 0, onClick, position = "center" }: LevelNodeProps) {
    const isCompleted = status === "completed";
    const isActive = status === "active";
    const isLocked = status === "locked";

    return (
        <div 
            className={cn(
                "relative group flex items-center justify-center mb-16",
                position === "left" && "-translate-x-12",
                position === "right" && "translate-x-12",
                position === "center" && "translate-x-0"
            )}
        >
            {/* Background connection line simulation (would be handled by SVG path in full version) */}
            <div className="absolute top-1/2 left-1/2 w-1 h-24 -z-10 -translate-x-1/2 bg-border"></div>

            <button
                onClick={onClick}
                disabled={isLocked}
                className={cn(
                    "relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform",
                    isActive ? "scale-110 ring-4 ring-[var(--theme-active,rgba(255,255,255,0.4))] ring-offset-2 ring-offset-background" : "hover:scale-105",
                    isLocked ? "cursor-not-allowed opacity-70 saturate-0" : "cursor-pointer",
                    "border-4 border-background"
                )}
                style={{
                    backgroundColor: isCompleted 
                        ? 'hsl(var(--theme-node-completed, 140 70% 50%))' 
                        : isActive 
                            ? 'hsl(var(--theme-node-active, 50 90% 60%))'
                            : 'hsl(var(--theme-node-locked, 240 10% 30%))'
                }}
            >
                {isCompleted && <Check className="w-8 h-8 text-white stroke-[3]" />}
                {isActive && <Play className="w-8 h-8 text-white ml-1 fill-current" />}
                {isLocked && <Lock className="w-6 h-6 text-white/50" />}

                {/* Stars Indicator */}
                {isCompleted && (
                    <div className="absolute -bottom-4 flex gap-1 bg-background/80 backdrop-blur rounded-full px-2 py-0.5 border shadow-sm">
                        {[1, 2, 3].map((star) => (
                            <Star 
                                key={star} 
                                className={cn(
                                    "w-3 h-3 transition-all",
                                    star <= stars ? "text-yellow-400 fill-current" : "text-muted-foreground"
                                )} 
                            />
                        ))}
                    </div>
                )}
            </button>

            {/* Title Tooltip/Label */}
            <div className={cn(
                "absolute top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-card border shadow-lg opacity-0 transition-opacity whitespace-nowrap z-10 pointer-events-none",
                isActive ? "opacity-100" : "group-hover:opacity-100",
                position === "left" || position === "center" ? "left-[calc(100%+16px)]" : "right-[calc(100%+16px)]"
            )}>
                <p className="font-bold text-sm tracking-tight">{title}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {isCompleted ? "Completed" : isActive ? "Current Level" : "Locked"}
                </p>
            </div>
        </div>
    );
}

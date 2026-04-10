"use client";

import React from "react";
import { useGamification } from "@/providers/GamificationProvider";
import { Flame, Star, Target } from "lucide-react";

export function GamifiedHUD() {
    const { profile, isLoading } = useGamification();

    if (isLoading || !profile) return null;

    return (
        <div className="flex items-center gap-6 p-4 rounded-xl bg-card border shadow-sm sticky top-4 z-50 animate-in fade-in slide-in-from-top-4">
            {/* Persona Display */}
            <div className="flex flex-col">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Persona</span>
                <span className="font-semibold capitalize text-[var(--theme-primary)]">
                    {profile.persona}
                </span>
            </div>

            <div className="h-8 w-px bg-border hidden sm:block"></div>

            {/* XP Display */}
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--theme-accent)] text-white">
                    <Star className="w-4 h-4 fill-current" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-muted-foreground">Total XP</span>
                    <span className="font-bold">{profile.total_xp.toLocaleString()}</span>
                </div>
            </div>

            <div className="h-8 w-px bg-border hidden sm:block"></div>

            {/* Streak Display */}
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-500">
                    <Flame className="w-4 h-4 fill-current" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-muted-foreground">Day Streak</span>
                    <span className="font-bold">{profile.streak.current_streak} 🔥</span>
                </div>
            </div>

            <div className="h-8 w-px bg-border hidden md:block"></div>

            {/* Daily Mission Snippet */}
            <div className="flex items-center gap-2 hidden md:flex min-w-[200px]">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500">
                    <Target className="w-4 h-4" />
                </div>
                <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold text-muted-foreground truncate max-w-[120px]">
                            {profile.daily_missions[0]?.description || "No missions"}
                        </span>
                        <span className="text-xs font-bold">
                            {profile.daily_missions[0]?.current_count} / {profile.daily_missions[0]?.target_count}
                        </span>
                    </div>
                    {/* Tiny Progress bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ 
                                width: `${(profile.daily_missions[0]?.current_count / profile.daily_missions[0]?.target_count) * 100}%` 
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

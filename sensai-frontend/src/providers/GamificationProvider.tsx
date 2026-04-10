"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

export type PersonaType = "explorer" | "achiever" | "social" | "competitive" | "balanced";

export interface GamificationProfile {
    user_id: number;
    persona: PersonaType;
    total_xp: number;
    streak: {
        current_streak: number;
        highest_streak: number;
        tasks_completed_today: number;
    };
    daily_missions: any[];
}

interface GamificationContextType {
    profile: GamificationProfile | null;
    currentTheme: string;
    setTheme: (theme: string) => void;
    addXp: (amount: number) => void;
    isLoading: boolean;
    fetchProfile: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<GamificationProfile | null>(null);
    const [currentTheme, setCurrentTheme] = useState("space_exploration");
    const [isLoading, setIsLoading] = useState(true);

    const { user, isAuthenticated } = useAuth();

    const fetchProfile = async () => {
        if (!isAuthenticated || !user?.id) {
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/profile?user_id=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (e) {
            console.error("Failed to fetch gamification profile", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [isAuthenticated, user?.id]);

    // Effect to apply theme class to body
    useEffect(() => {
        document.body.classList.remove('theme-space_exploration', 'theme-cyber_city');
        document.body.classList.add(`theme-${currentTheme}`);
    }, [currentTheme]);

    const setTheme = (theme: string) => {
        setCurrentTheme(theme);
    };

    const addXp = (amount: number) => {
        if (profile) {
            setProfile({
                ...profile,
                total_xp: profile.total_xp + amount
            });
        }
    };

    return (
        <GamificationContext.Provider value={{ profile, currentTheme, setTheme, addXp, isLoading, fetchProfile }}>
            {children}
        </GamificationContext.Provider>
    );
}

export function useGamification() {
    const context = useContext(GamificationContext);
    if (context === undefined) {
        throw new Error("useGamification must be used within a GamificationProvider");
    }
    return context;
}

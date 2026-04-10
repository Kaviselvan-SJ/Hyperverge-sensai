"use client";

import React, { useEffect, useState } from "react";
import { Medal, Star, Target, Zap, Lock, ShieldCheck, Trophy, Loader2 } from "lucide-react";

interface Badge {
    id: number;
    badge_title: string;
    badge_description: string;
    badge_icon: string;
    badge_type: string;
    difficulty_level: string;
    xp_reward: number;
    earned_at?: string;
}

const rarityColors: Record<string, { ring: string; glow: string; label: string }> = {
    legendary: { ring: "border-purple-400", glow: "shadow-purple-400/30", label: "text-purple-400 bg-purple-400/10" },
    hard:       { ring: "border-rose-400",   glow: "shadow-rose-400/30",   label: "text-rose-400 bg-rose-400/10" },
    medium:     { ring: "border-amber-400",  glow: "shadow-amber-400/30",  label: "text-amber-400 bg-amber-400/10" },
    easy:       { ring: "border-emerald-400",glow: "shadow-emerald-400/30",label: "text-emerald-400 bg-emerald-400/10" },
};

function BadgeIcon({ name, className = "w-8 h-8" }: { name: string; className?: string }) {
    switch ((name || "").toLowerCase()) {
        case "star":   return <Star   className={className} />;
        case "medal":  return <Medal  className={className} />;
        case "zap":    return <Zap    className={className} />;
        case "shield": return <ShieldCheck className={className} />;
        default:       return <Target className={className} />;
    }
}

export default function AchievementPanel({ userId }: { userId: string }) {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [allBadges, setAllBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<"recent" | "difficulty" | "category">("recent");

    useEffect(() => {
        const loadBadges = async () => {
            try {
                const [earnedRes, allRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/user/${userId}/badges`),
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/badges`)
                ]);

                const earned: Badge[] = earnedRes.ok ? await earnedRes.json() : [];
                const all: Badge[] = allRes.ok ? await allRes.json() : [];

                // Merge: mark which are earned
                const earnedIds = new Set(earned.map(b => b.id));
                const merged = all.map(b => ({ ...b, earned_at: earnedIds.has(b.id) ? earned.find(e => e.id === b.id)?.earned_at : undefined }));

                setBadges(merged);
                setAllBadges(merged);
            } catch (err) {
                console.error("Failed to load badges:", err);
            } finally {
                setLoading(false);
            }
        };
        if (userId) loadBadges();
    }, [userId]);

    const sorted = [...badges].sort((a, b) => {
        if (sort === "recent") {
            if (a.earned_at && !b.earned_at) return -1;
            if (!a.earned_at && b.earned_at) return 1;
            return (b.earned_at || "").localeCompare(a.earned_at || "");
        }
        if (sort === "difficulty") {
            const order = ["legendary","hard","medium","easy"];
            return order.indexOf(a.difficulty_level) - order.indexOf(b.difficulty_level);
        }
        return a.badge_type.localeCompare(b.badge_type);
    });

    const earned = badges.filter(b => b.earned_at).length;
    const total  = badges.length;

    return (
        <div className="w-full max-w-4xl mx-auto py-8">
            {/* Header */}
            <div className="flex flex-wrap gap-4 items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-amber-400" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Your Achievements</h2>
                        <p className="text-sm text-slate-500">{earned} / {total} badges earned</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 flex-1 max-w-xs">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                            style={{ width: total > 0 ? `${(earned / total) * 100}%` : "0%" }}
                        />
                    </div>
                    <span className="text-xs font-bold text-amber-500">{total > 0 ? Math.round((earned/total)*100) : 0}%</span>
                </div>

                {/* Sort control */}
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {(["recent","difficulty","category"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSort(s)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${sort === s ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {sorted.map((badge) => {
                        const rarity = rarityColors[badge.difficulty_level] || rarityColors.easy;
                        const isEarned = !!badge.earned_at;
                        return (
                            <div
                                key={badge.id}
                                className={`relative group p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center
                                    ${isEarned
                                        ? `${rarity.ring} shadow-xl ${rarity.glow} hover:-translate-y-1 cursor-pointer bg-white dark:bg-slate-800`
                                        : "border-slate-200 dark:border-slate-700 opacity-50 bg-slate-50 dark:bg-slate-800/40"
                                    }`}
                            >
                                {!isEarned && (
                                    <div className="absolute top-2.5 right-2.5 text-slate-400">
                                        <Lock className="w-3.5 h-3.5" />
                                    </div>
                                )}

                                {isEarned && (
                                    <div className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rarity.label}`}>
                                        {badge.difficulty_level}
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-inner
                                    ${isEarned ? "bg-gradient-to-br from-amber-300 to-orange-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                                    <BadgeIcon name={badge.badge_icon} className="w-7 h-7" />
                                </div>

                                <h3 className="text-xs font-bold text-slate-800 dark:text-white leading-tight mb-1">{badge.badge_title}</h3>

                                {isEarned ? (
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                        +{badge.xp_reward} XP
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">Locked</span>
                                )}

                                {/* Hover tooltip */}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-20 w-52 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl transition-opacity duration-200">
                                    <p className="font-semibold mb-1">{badge.badge_title}</p>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">{badge.badge_description}</p>
                                    {isEarned && badge.earned_at && (
                                        <p className="text-amber-400 mt-2 text-[10px]">
                                            Earned {new Date(badge.earned_at).toLocaleDateString()}
                                        </p>
                                    )}
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-8 border-transparent border-t-slate-900" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

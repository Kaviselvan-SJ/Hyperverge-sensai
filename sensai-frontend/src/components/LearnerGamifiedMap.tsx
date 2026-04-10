"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, Star, Trophy, Shield, Rocket, Lock, Check, Medal, Zap, Target, ShieldCheck, Award } from "lucide-react";

interface SubjectData {
    theme: string;
    topics: any[];
}

function BadgeIcon({ name, className = "w-6 h-6" }: { name: string; className?: string }) {
    switch ((name || "").toLowerCase()) {
        case "star":   return <Star   className={className} />;
        case "medal":  return <Medal  className={className} />;
        case "zap":    return <Zap    className={className} />;
        case "shield": return <ShieldCheck className={className} />;
        default:       return <Target className={className} />;
    }
}

const rarityRing: Record<string, string> = {
    legendary: "ring-purple-400 shadow-purple-400/40",
    hard:       "ring-rose-400 shadow-rose-400/30",
    medium:     "ring-amber-400 shadow-amber-400/30",
    easy:       "ring-emerald-400 shadow-emerald-400/20",
};

export default function LearnerGamifiedMap({ 
    subject, 
    learnerId, 
    courseId,
    onNodeClick,
    completedTasks
}: { 
    subject: SubjectData, 
    learnerId: string, 
    courseId: string,
    onNodeClick: (taskId: string) => void,
    completedTasks: Record<string, boolean>
}) {
    const [activeTab, setActiveTab] = useState<"map" | "achievements">("map");
    const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
    const [allBadges, setAllBadges] = useState<any[]>([]);
    const [certData, setCertData] = useState<any | null>(null);
    const [badgesLoaded, setBadgesLoaded] = useState(false);

    // Load badges when Achievements tab is opened
    useEffect(() => {
        if (activeTab === "achievements" && !badgesLoaded && learnerId) {
            const loadAchievements = async () => {
                try {
                    // Fetch badges in parallel
                    const [earnedRes, allRes] = await Promise.all([
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/user/${learnerId}/badges`),
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/badges`)
                    ]);

                    const earned = earnedRes.ok ? await earnedRes.json() : [];
                    const all   = allRes.ok   ? await allRes.json()   : [];
                    const earnedIds = new Set(earned.map((b: any) => b.id));

                    const merged = all.map((b: any) => ({
                        ...b,
                        earned_at: earnedIds.has(b.id) ? earned.find((e: any) => e.id === b.id)?.earned_at : undefined
                    }));
                    setEarnedBadges(earned);
                    setAllBadges(merged);

                    // Fetch certificate separately — returns null (200) if not yet earned
                    try {
                        const certRes = await fetch(
                            `${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/user/${learnerId}/certificate/${courseId}`
                        );
                        if (certRes.ok) {
                            const certJson = await certRes.json();
                            if (certJson) setCertData(certJson); // null means not earned yet
                        }
                    } catch { /* network error — cert silently unavailable */ }

                    setBadgesLoaded(true);
                } catch (err) {
                    console.error("Failed to load achievements:", err);
                    setBadgesLoaded(true); // still mark loaded so UI doesn't spin forever
                }
            };
            loadAchievements();
        }
    }, [activeTab, badgesLoaded, learnerId, courseId]);

    // Calculate dynamic XP
    const completedCount = Object.values(completedTasks).filter(v => v).length;
    const xp = completedCount * 150;

    // Theme colors
    const colors = {
        space_exploration: {
            bg: "bg-[#0B0A26]",
            path: "stroke-indigo-400",
            nodes: ["bg-indigo-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500"],
            accent: "text-amber-300"
        },
        default: {
            bg: "bg-slate-900",
            path: "stroke-slate-500",
            nodes: ["bg-blue-500", "bg-emerald-500", "bg-teal-500"],
            accent: "text-amber-400"
        }
    };

    const theme = (colors as any)[subject.theme] || colors.default;

    // Pre-calculate which levels are completed/active
    const levelStates = new Map<string, { isCompleted: boolean; isActive: boolean; isLocked: boolean }>();
    
    let foundFirstIncomplete = false;
    
    if (subject.topics) {
        subject.topics.forEach((topic: any) => {
            if (topic.levels) {
                topic.levels.forEach((level: any) => {
                    const taskId = level.subtopics?.[0]?.task_id;
                    const isCompleted = taskId ? !!completedTasks[taskId] : false;
                    
                    let isActive = false;
                    let isLocked = false;

                    if (!isCompleted) {
                        if (!foundFirstIncomplete) {
                            isActive = true;
                            foundFirstIncomplete = true;
                        } else {
                            isLocked = true;
                        }
                    }

                    levelStates.set(level.id, { isCompleted, isActive, isLocked });
                });
            }
        });
    }

    const earnedCount = allBadges.filter(b => b.earned_at).length;
    const totalBadges = allBadges.length;

    return (
        <div className={`w-full min-h-[600px] rounded-3xl overflow-hidden relative shadow-2xl border-4 border-indigo-900/50 ${theme.bg}`}>
            {/* Stars background for Space theme */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(50)].map((_, i) => (
                    <div 
                        key={i} 
                        className="absolute rounded-full bg-white"
                        style={{
                            width: Math.random() * 3 + 1 + 'px',
                            height: Math.random() * 3 + 1 + 'px',
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                            opacity: Math.random() * 0.8 + 0.2,
                            animation: `twinkle ${Math.random() * 5 + 3}s infinite`
                        }}
                    />
                ))}
            </div>

            {/* Top HUD */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-indigo-500/30 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-indigo-500 rounded-xl p-2 min-w-[60px]">
                        <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Level</span>
                        <span className="text-xl font-black text-white">{completedCount + 1}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 mb-1">
                            <Sparkles className={`w-4 h-4 ${theme.accent}`} />
                            <span className={`font-bold ${theme.accent}`}>{xp} XP</span>
                        </div>
                        <div className="w-32 h-2 bg-indigo-950 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{ width: `${Math.min((xp % 1000) / 10, 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Achievements counter HUD pill */}
                <button
                    onClick={() => setActiveTab(activeTab === "achievements" ? "map" : "achievements")}
                    className="bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-amber-500/40 flex items-center gap-2 hover:bg-black/60 transition-colors"
                >
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-300 font-bold text-sm">
                        {badgesLoaded ? `${earnedCount}/${totalBadges}` : "Badges"}
                    </span>
                </button>
            </div>

            {/* Tab Switcher Bar */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex bg-black/60 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setActiveTab("map")}
                    className={`px-5 py-2 text-sm font-bold transition-colors flex items-center gap-1.5 ${activeTab === "map" ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"}`}
                >
                    <Rocket className="w-3.5 h-3.5" /> Map
                </button>
                <button
                    onClick={() => setActiveTab("achievements")}
                    className={`px-5 py-2 text-sm font-bold transition-colors flex items-center gap-1.5 ${activeTab === "achievements" ? "bg-amber-500 text-white" : "text-white/60 hover:text-white"}`}
                >
                    <Trophy className="w-3.5 h-3.5" /> Achievements
                </button>
            </div>

            {/* Scrollable Map Area */}
            {activeTab === "map" && (
                <div className="max-h-[800px] overflow-y-auto w-full pt-36 pb-24 px-4 flex flex-col items-center relative z-10 scrollbar-hide">
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; transform: scale(1.2); } }
                        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 0; } }
                        .scrollbar-hide::-webkit-scrollbar { display: none; }
                    `}} />

                    {subject.topics?.map((topic: any, tIdx: number) => (
                        <div key={topic.id} className="w-full max-w-lg mb-20 relative">
                            {/* Topic Header Plate */}
                            <div className="relative mb-8 text-center">
                                <div className="inline-block relative">
                                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
                                    <div className="relative bg-gradient-to-b from-indigo-900 to-black border-2 border-indigo-500/50 rounded-full py-2 px-8 shadow-2xl">
                                        <h3 className="text-lg font-black text-indigo-100 uppercase tracking-widest">{topic.topic_name}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Levels rendering (Candy Crush Snake Pattern) */}
                            <div className="relative w-full min-h-[300px]">
                                {/* Decorative curved SVG path — uses numeric coords via viewBox */}
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    viewBox="0 0 400 600"
                                    preserveAspectRatio="none"
                                >
                                    <path
                                        d="M 200,0 C 380,80 20,160 200,280 C 380,380 20,460 200,600"
                                        className={`${theme.path} opacity-30`}
                                        strokeWidth="12"
                                        strokeDasharray="20,10"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                {topic.levels?.map((level: any, lIdx: number) => {
                                    const xPositions = ['50%', '70%', '60%', '30%', '40%', '60%'];
                                    const xPos = xPositions[lIdx % xPositions.length];
                                    
                                    const state = levelStates.get(level.id) || { isCompleted: false, isActive: false, isLocked: true };
                                    const { isCompleted, isActive, isLocked } = state;
                                    
                                    const nodeColor = theme.nodes[lIdx % theme.nodes.length];
                                    
                                    return (
                                        <div 
                                            key={level.id} 
                                            className="relative w-full h-32 flex items-center group cursor-pointer transition-transform"
                                            onClick={() => {
                                                if (isLocked) {
                                                    alert("Level is Locked 🔒\nComplete previous checkpoints to unlock this level!");
                                                } else if (level.subtopics?.[0]?.task_id) {
                                                    onNodeClick(level.subtopics[0].task_id.toString());
                                                } else {
                                                    alert(`Opening Topic/Level Page: ${level.level_title} 🚀`);
                                                }
                                            }}
                                        >
                                            <div 
                                                className="absolute" 
                                                style={{ left: xPos, transform: 'translateX(-50%)' }}
                                            >
                                                {isActive && (
                                                    <div className="absolute -inset-4 bg-white opacity-20 rounded-full animate-[pulse-ring_2s_ease-out_infinite]" />
                                                )}
                                                
                                                <div className={`
                                                    relative w-20 h-20 rounded-full border-4 shadow-2xl flex justify-center flex-col items-center
                                                    transition-all duration-300 hover:scale-110
                                                    ${isLocked ? 'bg-slate-800 border-slate-700 opacity-60' : 
                                                      isActive ? `${nodeColor} border-white shadow-[0_0_30px_rgba(255,255,255,0.4)]` : 
                                                      'bg-emerald-500 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]'}
                                                `}>
                                                    {isCompleted ? (
                                                        <Check className="w-10 h-10 text-white" strokeWidth={4} />
                                                    ) : isLocked ? (
                                                        <Lock className="w-8 h-8 text-slate-500" />
                                                    ) : (
                                                        <Star className="w-10 h-10 text-white drop-shadow-md" fill="white" />
                                                    )}
                                                </div>
                                                
                                                {/* Level tooltip */}
                                                <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 bg-black/80 backdrop-blur border border-white/10 rounded-lg p-2 text-center transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} pointer-events-none`}>
                                                    <p className="text-white font-bold text-sm leading-tight">{level.level_title}</p>
                                                    <p className="text-amber-400 text-xs mt-1 font-bold">+{level.xp_reward} XP</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    
                    {(!subject.topics || subject.topics.length === 0) && (
                        <div className="text-white/50 italic text-center mt-20 p-8 border border-white/10 rounded-2xl">
                            Journey map is being constructed...
                        </div>
                    )}
                </div>
            )}

            {/* Achievements Tab Content */}
            {activeTab === "achievements" && (
                <div className="max-h-[800px] overflow-y-auto w-full pt-36 pb-10 px-5 relative z-10 scrollbar-hide">
                    <style dangerouslySetInnerHTML={{__html: `.scrollbar-hide::-webkit-scrollbar { display: none; }`}} />

                    {!badgesLoaded ? (
                        <div className="flex justify-center pt-20">
                            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Certificate card */}
                            {certData ? (
                                <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 border-2 border-amber-400/50 rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-xl shadow-amber-500/10">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                        <Award className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-0.5">🎓 Course Certificate Earned</p>
                                        <p className="text-white font-bold text-sm">Certificate issued on {new Date(certData.issue_date).toLocaleDateString()}</p>
                                        <p className="text-white/50 text-xs font-mono mt-0.5">ID: {certData.verification_id}</p>
                                    </div>
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/certificates/verify/${certData.verification_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0"
                                    >
                                        Verify
                                    </a>
                                </div>
                            ) : (
                                <div className="border border-white/10 rounded-2xl p-4 mb-6 flex items-center gap-3 opacity-50">
                                    <Award className="w-8 h-8 text-white/30 flex-shrink-0" />
                                    <div>
                                        <p className="text-white/60 text-sm font-semibold">Course Certificate</p>
                                        <p className="text-white/30 text-xs">Complete all levels to earn your certificate</p>
                                    </div>
                                </div>
                            )}

                            {/* Progress summary */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">Badges</h3>
                                <span className="text-amber-400 text-sm font-bold">{earnedCount} / {totalBadges} earned</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                                    style={{ width: totalBadges > 0 ? `${(earnedCount / totalBadges) * 100}%` : "0%" }}
                                />
                            </div>

                            {/* Badge grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {allBadges.map(badge => {
                                    const isEarned = !!badge.earned_at;
                                    const rarity = rarityRing[badge.difficulty_level] || rarityRing.easy;
                                    return (
                                        <div
                                            key={badge.id}
                                            className={`relative group flex flex-col items-center p-3 rounded-2xl border transition-all
                                                ${isEarned ? `bg-white/5 border-white/20 ring-2 ${rarity}` : "bg-white/5 border-white/5 opacity-40"}`}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg
                                                ${isEarned ? "bg-gradient-to-br from-amber-300 to-orange-500 text-white" : "bg-white/10 text-white/30"}`}>
                                                <BadgeIcon name={badge.badge_icon} className="w-6 h-6" />
                                            </div>
                                            <p className="text-white text-[11px] font-bold text-center leading-tight">{badge.badge_title}</p>
                                            {isEarned && (
                                                <span className="text-[10px] text-amber-400 font-bold mt-1">+{badge.xp_reward} XP</span>
                                            )}

                                            {/* Tooltip */}
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-30 w-40 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10">
                                                <p className="font-bold mb-0.5">{badge.badge_title}</p>
                                                <p className="text-white/60">{badge.badge_description}</p>
                                                {isEarned && badge.earned_at && (
                                                    <p className="text-amber-400 mt-1 text-[10px]">Earned {new Date(badge.earned_at).toLocaleDateString()}</p>
                                                )}
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-slate-900" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

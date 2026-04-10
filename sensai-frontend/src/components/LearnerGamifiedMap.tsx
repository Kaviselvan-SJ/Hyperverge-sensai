"use client";

import React, { useState } from 'react';
import { Sparkles, Star, Trophy, Shield, Rocket, Lock, Check } from "lucide-react";

interface SubjectData {
    theme: string;
    topics: any[];
}

export default function LearnerGamifiedMap({ 
    subject, 
    learnerId, 
    courseId,
    onNodeClick 
}: { 
    subject: SubjectData, 
    learnerId: string, 
    courseId: string,
    onNodeClick: (taskId: string) => void 
}) {
    const [xp, setXp] = useState(1450);

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
                        <span className="text-xl font-black text-white">4</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 mb-1">
                            <Sparkles className={`w-4 h-4 ${theme.accent}`} />
                            <span className={`font-bold ${theme.accent}`}>{xp} XP</span>
                        </div>
                        <div className="w-32 h-2 bg-indigo-950 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-indigo-500/30 flex items-center gap-3">
                    <span className="text-white font-bold">Daily Streak</span>
                    <div className="flex items-center justify-center bg-orange-500 rounded-xl px-3 py-1 font-black text-white gap-1 shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                        🔥 5
                    </div>
                </div>
            </div>

            {/* Scrollable Map Area */}
            <div className="max-h-[800px] overflow-y-auto w-full pt-32 pb-24 px-4 flex flex-col items-center relative z-10 scrollbar-hide">
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
                            {/* Decorative curved SVG path for the road */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                                <path 
                                    d="M 50%,0 C 150%,50 -50%,150 50%,250 C 150%,350 -50%,450 50%,500" 
                                    className={`${theme.path} opacity-30`} 
                                    strokeWidth="12" 
                                    strokeDasharray="20,10" 
                                    fill="none" 
                                    strokeLinecap="round"
                                />
                            </svg>

                            {topic.levels?.map((level: any, lIdx: number) => {
                                // Simplified pseudo-random x positions to form a snake pattern
                                const xPositions = ['50%', '70%', '60%', '30%', '40%', '60%'];
                                const xPos = xPositions[lIdx % xPositions.length];
                                
                                // Mock state since we are just illustrating
                                const isCompleted = lIdx < 2 && tIdx === 0;
                                const isActive = lIdx === 2 && tIdx === 0;
                                const isLocked = (!isCompleted && !isActive);
                                
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
                                                // Fallback if no subtopic explicitly mapped
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
                                                  isActive ? `bg-gradient-to-t from-${nodeColor.split('-')[1]}-600 to-${nodeColor.split('-')[1]}-400 border-white shadow-[0_0_30px_rgba(255,255,255,0.4)]` : 
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
                                            
                                            {/* Level Badge Info on Hover / Active */}
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
        </div>
    );
}

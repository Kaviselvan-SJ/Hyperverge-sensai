"use client";

import React, { useEffect, useState } from "react";
import { LevelNode } from "./LevelNode";
import { useGamification } from "@/providers/GamificationProvider";
import { useAuth } from "@/lib/auth";

// Mock interface for nodes passed to the component
export interface MapNode {
    id: number;
    title: string;
    status: "locked" | "active" | "completed";
    stars?: number;
    position?: "left" | "right" | "center";
}

interface CourseWorldProps {
    courseId: number;
    title: string;
}

export function CourseWorld({ courseId, title }: CourseWorldProps) {
    const { addXp, profile, fetchProfile } = useGamification();
    const [nodes, setNodes] = useState<MapNode[]>([]);
    const { user, isAuthenticated } = useAuth();
    
    const fetchMapNodes = async () => {
        if (!isAuthenticated || !user?.id) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/course/${courseId}/map?user_id=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                
                // Map LevelUnlockStates to MapNodes
                const formattedNodes = data.nodes.map((node: any, idx: number) => {
                    const status = node.is_completed ? "completed" : (node.is_unlocked ? "active" : "locked");
                    let position = "center";
                    if (idx % 3 === 0) position = "left";
                    if (idx % 3 === 2) position = "right";

                    return {
                        id: node.task_id,
                        title: `Task Module ${idx + 1}`,
                        status: status,
                        stars: node.stars,
                        position: position
                    };
                });
                
                // Provide some fallback if there are no tasks yet
                if (formattedNodes.length === 0) {
                    setNodes([
                        { id: 1, title: "Level 1: The Awakening", status: "completed", stars: 3, position: "left" },
                        { id: 2, title: "Level 2: Basic Concepts", status: "active", position: "center" }
                    ]);
                } else {
                    setNodes(formattedNodes);
                }
            }
        } catch (e) {
            console.error("Failed to fetch course map nodes", e);
        }
    };

    // Fetch map nodes based on courseId
    useEffect(() => {
        fetchMapNodes();
    }, [courseId, isAuthenticated, user?.id]);

    const handleNodeClick = async (node: MapNode) => {
        if (node.status === "locked") return;
        
        if (node.status === "active") {
            try {
                // Call real endpoint for MVP mock completion
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/task/${node.id}/complete?user_id=${user?.id}`, {
                    method: 'POST'
                });
                if (res.ok) {
                    const data = await res.json();
                    
                    // Trigger global Context fetch to update HUD via fetchProfile
                    addXp(data.xp_gained);
                    fetchProfile();
                    
                    // Refresh map specifically to get unlocks
                    await fetchMapNodes();
                }
            } catch (e) {
                 console.error("Task completion failed", e);
            }
        } else {
            alert(`Re-entering ${node.title} for revision.`);
        }
    };

    return (
        <div className="relative isolate min-h-[600px] w-full max-w-3xl mx-auto rounded-3xl bg-[var(--theme-bg)] text-[var(--theme-fg)] border-4 border-white/10 p-12 overflow-hidden shadow-2xl">
            {/* Thematic Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-bg)] via-transparent to-[var(--theme-primary)]/10 z-0"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--theme-secondary)]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--theme-primary)]/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-white drop-shadow-md">
                        {title}
                    </h2>
                    <p className="text-[var(--theme-accent)] font-medium text-sm tracking-widest uppercase">
                        Active Journey
                    </p>
                </div>
                
                <div className="flex flex-col items-center pt-8 pb-32">
                    {nodes.map((node) => (
                        <LevelNode
                            key={node.id}
                            id={node.id}
                            title={node.title}
                            status={node.status}
                            stars={node.stars}
                            position={node.position}
                            onClick={() => handleNodeClick(node)}
                        />
                    ))}
                </div>
            </div>
            
            {/* Map Start Decorator */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>
    );
}

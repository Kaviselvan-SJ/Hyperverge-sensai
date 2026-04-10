"use client";

import { useState, useEffect } from "react";
import LearnerCourseView from "@/components/LearnerCourseView";
import LearnerGamifiedMap from "@/components/LearnerGamifiedMap";
import { Module } from "@/types/course";
import { getCompletionData } from "@/lib/api";

interface ClientLearnerViewWrapperProps {
    modules: Module[];
    learnerId: string;
    cohortId: string;
    courseId: string;
    isAdminView: boolean;
    learnerName: string;
}

export default function ClientLearnerViewWrapper({
    modules,
    learnerId,
    cohortId,
    courseId,
    isAdminView,
    learnerName
}: ClientLearnerViewWrapperProps) {

    const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});
    const [completedQuestionIds, setCompletedQuestionIds] = useState<Record<string, Record<string, boolean>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Gamification state
    const [gamifiedSubject, setGamifiedSubject] = useState<any>(null);

    useEffect(() => {
        const fetchLearnerProgress = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // 1. Fetch normal completions
                const { taskCompletions, questionCompletions } = await getCompletionData(parseInt(cohortId), learnerId);
                setCompletedTaskIds(taskCompletions);
                setCompletedQuestionIds(questionCompletions);

                // 2. Fetch Gamification Data
                const gamificationRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/course/${courseId}/map?user_id=${learnerId}`);
                if (gamificationRes.ok) {
                    const gamificationData = await gamificationRes.json();
                    
                    // If it returned a hierarchy object (with topics/levels) instead of standard array
                    if (gamificationData.topics && gamificationData.topics.length > 0) {
                        setGamifiedSubject(gamificationData);
                    }
                }
            } catch (err) {
                console.error("Error fetching learner progress:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLearnerProgress();
    }, [learnerId, courseId]);

    const handleNodeClick = (taskId: string) => {
        // This is a stub for what would normally open the task viewer
        console.log("Opening task:", taskId);
        // Ideally we would navigate or open a modal:
        // window.location.hash = `taskId=${taskId}`;
        alert("Micro-level task opened: " + taskId);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-t-2 border-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg text-center">
                <p className="text-red-400 mb-2">{error}</p>
            </div>
        );
    }

    return (
        <LearnerCourseView
            modules={modules}
            completedTaskIds={completedTaskIds}
            completedQuestionIds={completedQuestionIds}
            viewOnly={true}
            learnerId={learnerId}
            isAdminView={isAdminView}
            learnerName={learnerName}
            gamifiedSubject={gamifiedSubject}
        />
    );
} 
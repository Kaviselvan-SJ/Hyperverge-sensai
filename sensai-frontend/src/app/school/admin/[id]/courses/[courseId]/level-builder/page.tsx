"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Layers, Target, Flag, Pencil, Gift } from "lucide-react";
import { Header } from "@/components/layout/header";
import RewardsConfigEditor from "@/components/RewardsConfigEditor";

export default function LevelBuilder() {
    const router = useRouter();
    const params = useParams();
    const schoolId = params.id as string;
    const courseId = params.courseId as string;

    const [isLoading, setIsLoading] = useState(true);
    const [subject, setSubject] = useState<any>(null);
    const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState<"map" | "rewards">("map");

    useEffect(() => {
        const fetchSubject = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/builder/subject/${courseId}`);
                if (res.ok) {
                    const data = await res.json();
                    setSubject(data);
                } else {
                    setSubject(null);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubject();
    }, [courseId]);

    const handleCreateSubject = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/builder/subject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                course_id: parseInt(courseId),
                theme: "space_exploration",
                difficulty: "intermediate",
                estimated_duration: "4 weeks"
            })
        });
        if (res.ok) {
            const data = await res.json();
            setSubject({ ...data, topics: [] });
            setMessage("Gamified Journey Created!");
        }
    };

    const handleAddTopic = async () => {
        if (!subject) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/builder/topic`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject_id: subject.id,
                topic_name: "New Environment Sector",
                topic_description: "Advance to the next map location.",
                topic_order: subject.topics?.length || 0,
                topic_difficulty: "medium",
                unlock_rule: "complete_previous"
            })
        });
        if (res.ok) {
            const newTopic = await res.json();
            setSubject({ ...subject, topics: [...(subject.topics || []), { ...newTopic, levels: [] }] });
        }
    };

    const handleAddLevel = async (topicIndex: number, topicId: number) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/builder/level`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic_id: topicId,
                level_title: "Level Node",
                level_description: "A checkpoint in the journey.",
                level_order_index: subject.topics[topicIndex].levels?.length || 0,
                difficulty_tag: "normal",
                xp_reward: 100,
                unlock_condition: "complete_previous",
                estimated_duration: "10 mins"
            })
        });
        if (res.ok) {
            const newLvl = await res.json();
            const newTopics = [...subject.topics];
            newTopics[topicIndex].levels = [...(newTopics[topicIndex].levels || []), { ...newLvl, subtopics: [] }];
            setSubject({ ...subject, topics: newTopics });
        }
    };

    const handleRenameTopic = async (topicIndex: number, newName: string) => {
        if (!subject) return;
        const topicId = subject.topics[topicIndex].id;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/builder/topic/${topicId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic_name: newName })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleRenameLevel = async (topicIndex: number, levelIndex: number, newName: string) => {
        if (!subject) return;
        const levelId = subject.topics[topicIndex].levels[levelIndex].id;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/builder/level/${levelId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ level_title: newName })
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) return <div className="p-10 flex text-gray-500 justify-center">Loading builder...</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Header schoolSlug={schoolId} />
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto p-6 md:p-8">
                    
                    <button 
                        onClick={() => router.push(`/school/admin/${schoolId}/courses/${courseId}`)}
                        className="flex items-center text-gray-500 hover:text-black mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Course Editor
                    </button>
                    
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-6" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 mb-2">Subject Level Map Builder 🎮</h1>
                        <p className="text-indigo-200">Convert standard courses into beautiful interactive journeys for your learners.</p>
                        
                        {!subject ? (
                            <button 
                                onClick={handleCreateSubject}
                                className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl shadow-lg font-bold hover:scale-105 transition transform"
                            >
                                <SparklesIcon /> Enable Gamified Journey Map
                            </button>
                        ) : (
                            <div className="mt-6 inline-block px-4 py-2 bg-indigo-900/50 rounded-lg text-amber-300 border border-indigo-700 font-bold backdrop-blur-md">
                                Theme: Space Exploration ✨
                            </div>
                        )}
                    </div>

                    {/* Tab bar */}
                    {subject && (
                        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
                            <button
                                onClick={() => setActiveTab("map")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                                    activeTab === "map" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
                                }`}
                            >
                                <Layers className="w-4 h-4" /> Level Map
                            </button>
                            <button
                                onClick={() => setActiveTab("rewards")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                                    activeTab === "rewards" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
                                }`}
                            >
                                <Gift className="w-4 h-4" /> Rewards & Certificates
                            </button>
                        </div>
                    )}

                    {/* MAP TAB */}
                    {subject && activeTab === "map" && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center"><Layers className="mr-2 text-indigo-500" /> Topic Journey Segments</h2>
                                <button onClick={handleAddTopic} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center font-semibold transition">
                                    <Plus className="w-5 h-5 mr-1" /> Add Sector
                                </button>
                            </div>

                            <div className="space-y-6">
                                {subject.topics?.map((topic: any, tIdx: number) => (
                                    <div key={topic.id} className="bg-white rounded-xl shadow-md border-2 border-indigo-50 overflow-hidden transform transition hover:shadow-lg">
                                        <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex justify-between items-center text-indigo-900">
                                            <div className="flex items-center flex-1">
                                                <Target className="mr-2 text-indigo-400" /> 
                                                <span className="font-bold mr-2 whitespace-nowrap">Sector {tIdx + 1}:</span>
                                                <input 
                                                    type="text"
                                                    value={topic.topic_name}
                                                    onChange={(e) => {
                                                        const newTopics = [...subject.topics];
                                                        newTopics[tIdx].topic_name = e.target.value;
                                                        setSubject({...subject, topics: newTopics});
                                                    }}
                                                    onBlur={(e) => handleRenameTopic(tIdx, e.target.value)}
                                                    className="bg-transparent border border-transparent hover:border-indigo-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-300 rounded px-2 py-1 text-lg font-bold w-full max-w-sm transition"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleAddLevel(tIdx, topic.id)}
                                                className="px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm font-semibold flex items-center"
                                            >
                                                <Plus className="w-4 h-4 mr-1"/> Add Level Checkpoint
                                            </button>
                                        </div>
                                        <div className="p-5 flex gap-4 overflow-x-auto">
                                            {topic.levels?.length === 0 && <span className="text-gray-400 italic text-sm">No levels in this sector yet.</span>}
                                            {topic.levels?.map((lvl: any, lIdx: number) => (
                                                <div key={lvl.id} className="min-w-[200px] bg-gradient-to-b from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 relative">
                                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center font-bold shadow-md">
                                                        {lIdx + 1}
                                                    </div>
                                                    <Flag className="text-amber-500 mb-2 w-6 h-6" />
                                                    <input 
                                                        type="text"
                                                        value={lvl.level_title}
                                                        onChange={(e) => {
                                                            const newTopics = [...subject.topics];
                                                            newTopics[tIdx].levels[lIdx].level_title = e.target.value;
                                                            setSubject({...subject, topics: newTopics});
                                                        }}
                                                        onBlur={(e) => handleRenameLevel(tIdx, lIdx, e.target.value)}
                                                        className="bg-transparent border border-transparent hover:border-amber-200 outline-none focus:bg-white focus:ring-2 focus:ring-amber-300 rounded px-1 py-1 font-bold text-amber-900 mb-1 w-full transition"
                                                    />
                                                    <p className="text-xs text-amber-700/80 mb-3">{lvl.xp_reward} XP</p>
                                                    
                                                    <div className="text-xs text-center border-t border-amber-200/50 pt-3 text-amber-600 flex flex-col gap-2">
                                                        <span>{lvl.subtopics?.length || 0} tasks linked</span>
                                                        <button 
                                                            onClick={async () => {
                                                                if (lvl.subtopics && lvl.subtopics.length > 0 && lvl.subtopics[0].task_id) {
                                                                    router.push(`/school/admin/${schoolId}/courses/${courseId}?taskId=${lvl.subtopics[0].task_id}`);
                                                                } else {
                                                                    // Show an immediate initialization indicator
                                                                    const btn = document.getElementById(`btn-edit-${lvl.id}`);
                                                                    if(btn) btn.innerHTML = "Creating...";
                                                                    try {
                                                                        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/builder/level/${lvl.id}/initialize-task`, {
                                                                            method: "POST"
                                                                        });
                                                                        if (res.ok) {
                                                                             const data = await res.json();
                                                                             router.push(`/school/admin/${schoolId}/courses/${courseId}?taskId=${data.task_id}`);
                                                                        } else {
                                                                             alert("Could not initialize level content.");
                                                                             if(btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil w-3 h-3 mr-1"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Edit Content';
                                                                        }
                                                                    } catch (e) {
                                                                        console.error(e);
                                                                    }
                                                                }
                                                            }}
                                                            id={`btn-edit-${lvl.id}`}
                                                            className="mt-1 flex items-center justify-center font-bold text-white bg-gradient-to-r from-orange-400 to-amber-500 rounded px-2 py-1 hover:scale-105 transition shadow-sm"
                                                        >
                                                            <Pencil className="w-3 h-3 mr-1" /> {lvl.subtopics?.length ? "Edit Content" : "Add Content"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* REWARDS TAB */}
                    {subject && activeTab === "rewards" && (
                        <RewardsConfigEditor courseId={courseId} orgId={schoolId} />
                    )}
                    
                    {message && (
                        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce">
                            {message}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function SparklesIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
    )
}

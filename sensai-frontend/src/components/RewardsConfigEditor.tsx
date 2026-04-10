"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Save, X, Star, Medal, Zap, Target, ShieldCheck, Award, CheckCircle2 } from "lucide-react";

const BADGE_ICONS = ["Star", "Medal", "Zap", "Target", "Shield"];
const BADGE_TYPES = ["level", "topic", "milestone", "streak", "course", "boss"];
const DIFFICULTIES = ["easy", "medium", "hard", "legendary"];

function BadgeIconPreview({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
    switch ((name || "").toLowerCase()) {
        case "star":   return <Star   className={className} />;
        case "medal":  return <Medal  className={className} />;
        case "zap":    return <Zap    className={className} />;
        case "shield": return <ShieldCheck className={className} />;
        default:       return <Target className={className} />;
    }
}

const difficultyColors: Record<string, string> = {
    easy:       "bg-emerald-100 text-emerald-700 border-emerald-300",
    medium:     "bg-amber-100 text-amber-700 border-amber-300",
    hard:       "bg-rose-100 text-rose-700 border-rose-300",
    legendary:  "bg-purple-100 text-purple-700 border-purple-300",
};

interface BadgeTemplate {
    id?: number;
    badge_title: string;
    badge_description: string;
    badge_icon: string;
    badge_type: string;
    difficulty_level: string;
    xp_reward: number;
    unlock_condition: string;
}

interface CertTemplate {
    id?: number;
    certificate_title: string;
    signatory_name: string;
    institution_logo: string;
    certificate_background: string;
}

const BLANK_BADGE: BadgeTemplate = {
    badge_title: "",
    badge_description: "",
    badge_icon: "Star",
    badge_type: "level",
    difficulty_level: "easy",
    xp_reward: 100,
    unlock_condition: "level_complete",
};

const BLANK_CERT: CertTemplate = {
    certificate_title: "Certificate of Completion",
    signatory_name: "",
    institution_logo: "",
    certificate_background: "default",
};

export default function RewardsConfigEditor({ courseId, orgId }: { courseId: string; orgId: string }) {
    const [tab, setTab] = useState<"badges" | "certificate">("badges");
    const [badges, setBadges] = useState<BadgeTemplate[]>([]);
    const [certTemplate, setCertTemplate] = useState<CertTemplate>(BLANK_CERT);
    const [editingBadge, setEditingBadge] = useState<BadgeTemplate | null>(null);
    const [showBadgeForm, setShowBadgeForm] = useState(false);
    const [certSaved, setCertSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState("");

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [badgeRes, certRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/badges`),
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/certificate-template/${courseId}`)
                ]);
                if (badgeRes.ok) setBadges(await badgeRes.json());
                if (certRes.ok) {
                    const ct = await certRes.json();
                    setCertTemplate(ct);
                }
            } catch (err) {
                console.error("Failed to load reward config:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [courseId]);

    const saveBadge = async () => {
        if (!editingBadge) return;
        setSaving(true);
        try {
            const isNew = !editingBadge.id;
            const url = isNew
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/badges`
                : `${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/badges/${editingBadge.id}`;
            const res = await fetch(url, {
                method: isNew ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingBadge),
            });
            if (res.ok) {
                const saved = await res.json();
                if (isNew) {
                    setBadges(prev => [...prev, { ...editingBadge, id: saved.id }]);
                } else {
                    setBadges(prev => prev.map(b => b.id === editingBadge.id ? editingBadge : b));
                }
                setShowBadgeForm(false);
                setEditingBadge(null);
                showToast("Badge saved successfully!");
            }
        } catch (err) {
            showToast("Error saving badge.");
        } finally {
            setSaving(false);
        }
    };

    const deleteBadge = async (id: number) => {
        if (!confirm("Delete this badge? Learners who earned it will keep it.")) return;
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/badges/${id}`, { method: "DELETE" });
        setBadges(prev => prev.filter(b => b.id !== id));
        showToast("Badge deleted.");
    };

    const saveCertTemplate = async () => {
        setSaving(true);
        try {
            const isNew = !certTemplate.id;
            const payload = { ...certTemplate, org_id: parseInt(orgId), course_id: parseInt(courseId) };
            const url = isNew
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/certificate-template`
                : `${process.env.NEXT_PUBLIC_BACKEND_URL}/gamification/certificate-template/${certTemplate.id}`;
            const res = await fetch(url, {
                method: isNew ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const saved = await res.json();
                setCertTemplate(prev => ({ ...prev, id: saved.id || prev.id }));
                setCertSaved(true);
                showToast("Certificate template saved!");
                setTimeout(() => setCertSaved(false), 3000);
            }
        } catch (err) {
            showToast("Error saving certificate template.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-100">
                {(["badges", "certificate"] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-4 font-semibold text-sm capitalize transition-colors ${tab === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        {t === "badges" ? "🏅 Badge Templates" : "🎓 Certificate Template"}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {/* ── BADGES TAB ── */}
                {tab === "badges" && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Badge Templates</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Learners earn these automatically on course milestones.</p>
                            </div>
                            <button
                                onClick={() => { setEditingBadge({ ...BLANK_BADGE }); setShowBadgeForm(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
                            >
                                <Plus className="w-4 h-4" /> New Badge
                            </button>
                        </div>

                        {/* Badge grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {badges.map(badge => (
                                <div key={badge.id} className="group relative border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white shadow flex-shrink-0">
                                            <BadgeIconPreview name={badge.badge_icon} className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-gray-800 truncate">{badge.badge_title}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${difficultyColors[badge.difficulty_level] || difficultyColors.easy}`}>
                                                    {badge.difficulty_level}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{badge.badge_description}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">+{badge.xp_reward} XP</span>
                                                <span className="text-xs text-gray-400 capitalize">{badge.badge_type}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingBadge({ ...badge }); setShowBadgeForm(true); }}
                                            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-indigo-50 text-indigo-600 shadow-sm"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => badge.id && deleteBadge(badge.id)}
                                            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-rose-50 text-rose-500 shadow-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {badges.length === 0 && (
                                <div className="col-span-3 text-center py-12 text-gray-400">
                                    <Medal className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>No badge templates yet. Create your first one!</p>
                                </div>
                            )}
                        </div>

                        {/* Badge form drawer */}
                        {showBadgeForm && editingBadge && (
                            <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
                                <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-800">
                                            {editingBadge.id ? "Edit Badge" : "Create Badge"}
                                        </h3>
                                        <button onClick={() => { setShowBadgeForm(false); setEditingBadge(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex-1 p-6 space-y-5">
                                        {/* Live preview */}
                                        <div className="flex justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-200">
                                                    <BadgeIconPreview name={editingBadge.badge_icon} className="w-10 h-10" />
                                                </div>
                                                <p className="font-bold text-gray-800">{editingBadge.badge_title || "Badge Title"}</p>
                                                <span className="text-xs text-amber-600 bg-amber-50 px-3 py-0.5 rounded-full font-bold">+{editingBadge.xp_reward} XP</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block">
                                                <span className="text-sm font-semibold text-gray-700">Badge Title *</span>
                                                <input
                                                    type="text"
                                                    value={editingBadge.badge_title}
                                                    onChange={e => setEditingBadge({ ...editingBadge, badge_title: e.target.value })}
                                                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                                    placeholder="e.g. Space Pioneer"
                                                />
                                            </label>

                                            <label className="block">
                                                <span className="text-sm font-semibold text-gray-700">Description</span>
                                                <textarea
                                                    value={editingBadge.badge_description}
                                                    onChange={e => setEditingBadge({ ...editingBadge, badge_description: e.target.value })}
                                                    rows={2}
                                                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
                                                    placeholder="e.g. Mastered the first section of the course"
                                                />
                                            </label>

                                            <div className="grid grid-cols-2 gap-3">
                                                <label className="block">
                                                    <span className="text-sm font-semibold text-gray-700">Icon</span>
                                                    <div className="mt-1 flex gap-2 flex-wrap">
                                                        {BADGE_ICONS.map(icon => (
                                                            <button
                                                                key={icon}
                                                                onClick={() => setEditingBadge({ ...editingBadge, badge_icon: icon })}
                                                                className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition ${editingBadge.badge_icon === icon ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-gray-200 text-gray-400 hover:border-indigo-300"}`}
                                                            >
                                                                <BadgeIconPreview name={icon} className="w-4 h-4" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </label>

                                                <label className="block">
                                                    <span className="text-sm font-semibold text-gray-700">XP Reward</span>
                                                    <input
                                                        type="number"
                                                        value={editingBadge.xp_reward}
                                                        onChange={e => setEditingBadge({ ...editingBadge, xp_reward: parseInt(e.target.value) || 0 })}
                                                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                                    />
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <label className="block">
                                                    <span className="text-sm font-semibold text-gray-700">Type</span>
                                                    <select
                                                        value={editingBadge.badge_type}
                                                        onChange={e => setEditingBadge({ ...editingBadge, badge_type: e.target.value })}
                                                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
                                                    >
                                                        {BADGE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                                                    </select>
                                                </label>

                                                <label className="block">
                                                    <span className="text-sm font-semibold text-gray-700">Difficulty</span>
                                                    <select
                                                        value={editingBadge.difficulty_level}
                                                        onChange={e => setEditingBadge({ ...editingBadge, difficulty_level: e.target.value })}
                                                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
                                                    >
                                                        {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                                                    </select>
                                                </label>
                                            </div>

                                            <label className="block">
                                                <span className="text-sm font-semibold text-gray-700">Unlock Condition</span>
                                                <input
                                                    type="text"
                                                    value={editingBadge.unlock_condition}
                                                    onChange={e => setEditingBadge({ ...editingBadge, unlock_condition: e.target.value })}
                                                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                                    placeholder="e.g. level_complete, streak_7, topic_complete"
                                                />
                                                <p className="text-xs text-gray-400 mt-1">System checks this key after each completion event.</p>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                                        <button
                                            onClick={() => { setShowBadgeForm(false); setEditingBadge(null); }}
                                            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveBadge}
                                            disabled={saving || !editingBadge.badge_title}
                                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition text-sm disabled:opacity-60"
                                        >
                                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Badge
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── CERTIFICATE TAB ── */}
                {tab === "certificate" && (
                    <div className="max-w-2xl mx-auto">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Certificate Template</h3>
                        <p className="text-sm text-gray-500 mb-6">Customize how the completion certificate looks and what details it contains.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Form */}
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-sm font-semibold text-gray-700">Certificate Title</span>
                                    <input
                                        type="text"
                                        value={certTemplate.certificate_title}
                                        onChange={e => setCertTemplate({ ...certTemplate, certificate_title: e.target.value })}
                                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                        placeholder="Certificate of Completion"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-gray-700">Signatory Name</span>
                                    <input
                                        type="text"
                                        value={certTemplate.signatory_name}
                                        onChange={e => setCertTemplate({ ...certTemplate, signatory_name: e.target.value })}
                                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                        placeholder="e.g. Prof. Kaviya, Lead Instructor"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-gray-700">Institution Logo URL</span>
                                    <input
                                        type="text"
                                        value={certTemplate.institution_logo}
                                        onChange={e => setCertTemplate({ ...certTemplate, institution_logo: e.target.value })}
                                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                        placeholder="https://..."
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-gray-700">Certificate Style</span>
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        {["default", "elegant", "modern"].map(style => (
                                            <button
                                                key={style}
                                                onClick={() => setCertTemplate({ ...certTemplate, certificate_background: style })}
                                                className={`py-2 px-3 rounded-xl border-2 text-xs font-semibold capitalize transition ${certTemplate.certificate_background === style ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-indigo-200"}`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </label>

                                <button
                                    onClick={saveCertTemplate}
                                    disabled={saving}
                                    className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
                                >
                                    {certSaved
                                        ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                                        : saving
                                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            : <><Save className="w-4 h-4" /> Save Certificate Template</>
                                    }
                                </button>
                            </div>

                            {/* Live Preview */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Live Preview</p>
                                <div className={`border-4 border-double p-6 rounded text-center relative overflow-hidden shadow-lg
                                    ${certTemplate.certificate_background === "elegant" ? "bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-amber-400" :
                                      certTemplate.certificate_background === "modern"  ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-400" :
                                      "bg-white border-slate-300 text-slate-800"}`}
                                >
                                    {/* Corner accents */}
                                    <div className="absolute top-0 left-0 w-16 h-16 bg-indigo-600 rounded-br-full opacity-10" />
                                    <div className="absolute bottom-0 right-0 w-20 h-20 bg-amber-400 rounded-tl-full opacity-10" />

                                    {certTemplate.institution_logo && (
                                        <img src={certTemplate.institution_logo} alt="logo" className="h-8 mx-auto mb-3 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                                    )}

                                    <p className={`text-[10px] uppercase tracking-widest mb-2 font-bold ${certTemplate.certificate_background === "elegant" ? "text-amber-300" : "text-slate-400"}`}>
                                        {certTemplate.certificate_title || "Certificate of Completion"}
                                    </p>

                                    <p className={`text-[9px] mb-1 italic ${certTemplate.certificate_background === "elegant" ? "text-slate-300" : "text-slate-400"}`}>This certifies that</p>
                                    <p className={`text-sm font-bold border-b pb-1 mb-2 font-serif ${certTemplate.certificate_background === "elegant" ? "text-white border-amber-400/30" : "text-slate-800 border-slate-300"}`}>
                                        Learner Name
                                    </p>
                                    <p className={`text-[8px] italic mb-1 ${certTemplate.certificate_background === "elegant" ? "text-slate-300" : "text-slate-400"}`}>has completed</p>
                                    <p className={`text-xs font-bold uppercase mb-3 ${certTemplate.certificate_background === "elegant" ? "text-indigo-300" : "text-indigo-700"}`}>
                                        Course Name
                                    </p>

                                    <div className="flex justify-between items-end mt-2 text-[8px]">
                                        <div className={`border-b w-20 pb-0.5 ${certTemplate.certificate_background === "elegant" ? "border-slate-500 text-slate-400" : "border-slate-300 text-slate-400"}`}>
                                            Date
                                        </div>
                                        <Award className={`w-6 h-6 ${certTemplate.certificate_background === "elegant" ? "text-amber-400" : "text-amber-500"}`} />
                                        <div className={`border-b w-24 pb-0.5 text-right ${certTemplate.certificate_background === "elegant" ? "border-slate-500 text-slate-400" : "border-slate-300 text-slate-400"}`}>
                                            {certTemplate.signatory_name || "Signatory"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold animate-bounce">
                    {toast}
                </div>
            )}
        </div>
    );
}

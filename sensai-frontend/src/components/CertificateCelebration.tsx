"use client";

import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Award, Share2, Download, CheckCircle2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CertificateProps {
    learnerName: string;
    courseName: string;
    issueDate: string;
    verificationId: string;
    mentorName?: string;
    onClose: () => void;
}

export default function CertificateCelebration({ 
    learnerName, 
    courseName, 
    issueDate, 
    verificationId, 
    mentorName = "Lead SensAi Instructor",
    onClose
}: CertificateProps) {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        // Trigger celebratory confetti when modal opens
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#4f46e5', '#fbbf24', '#ec4899']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#4f46e5', '#fbbf24', '#ec4899']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, []);

    const handleDownload = async () => {
        if (!certificateRef.current) return;
        setDownloading(true);

        try {
            const canvas = await html2canvas(certificateRef.current, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
            pdf.save(`${courseName.replace(/\s+/g, "_")}_Certificate.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="max-w-4xl w-full flex flex-col items-center">
                
                {/* Header text */}
                <div className="text-center mb-8 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-400 text-amber-900 mb-4 shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                        <Award className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Congratulations!</h1>
                    <p className="text-xl text-slate-300">You've successfully mastered {courseName}</p>
                </div>

                {/* The Certificate UI (used for both display and PDF render) */}
                <div 
                    ref={certificateRef}
                    className="w-full bg-white text-slate-800 p-12 md:p-16 rounded-sm shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px] border-8 border-double border-slate-200"
                    style={{ aspectRatio: "1.414 / 1" }}
                >
                    {/* Background decorations */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600 rounded-br-full opacity-10"></div>
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-400 rounded-tl-full opacity-10"></div>
                    
                    <div className="text-center z-10 w-full max-w-2xl px-8">
                        <h2 className="text-3xl font-serif text-slate-400 uppercase tracking-widest mb-10">Certificate of Completion</h2>
                        
                        <p className="text-slate-500 italic mb-4">This acknowledges that</p>
                        <h3 className="text-5xl font-serif text-slate-800 border-b border-slate-300 pb-2 mb-8">{learnerName}</h3>
                        
                        <p className="text-slate-500 italic mb-4">has successfully completed the course curriculum for</p>
                        <h4 className="text-2xl font-bold text-indigo-900 uppercase tracking-widest mb-16">{courseName}</h4>
                        
                        <div className="flex justify-between items-end w-full mt-auto">
                            <div className="text-left w-48">
                                <p className="border-b border-slate-800 opacity-50 pb-1 mb-1 font-serif text-lg">{new Date(issueDate).toLocaleDateString()}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Date Assessed</p>
                            </div>
                            
                            {/* Seal */}
                            <div className="w-24 h-24 rounded-full border-4 border-amber-400 flex items-center justify-center bg-amber-50 shadow-inner">
                                <Award className="w-12 h-12 text-amber-500" />
                            </div>
                            
                            <div className="text-right w-48">
                                <p className="border-b border-slate-800 opacity-50 pb-1 mb-1 font-serif text-lg">{mentorName}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Lead Mentor</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-4 left-4 text-[10px] text-slate-400 font-mono">
                        ID: {verificationId}<br/>
                        Verify at: sensai.io/verify/{verificationId}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-8 flex gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                    <button 
                        onClick={handleDownload}
                        disabled={downloading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all"
                    >
                        {downloading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        <span>{downloading ? 'Generating PDF...' : 'Download Certificate'}</span>
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl font-semibold transition-all"
                    >
                        Return to Map
                    </button>
                </div>
            </div>
        </div>
    );
}

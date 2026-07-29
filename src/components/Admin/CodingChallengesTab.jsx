import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Check, X, ShieldAlert, Code2, Users, Eye, User, Terminal, ArrowLeft, Edit, Clock, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ritLogo from '../../assets/rit-logo.png';
import techsparkLogo from '../../assets/techspark-logo.png';

const CodingChallengesTab = () => {
    const [challenges, setChallenges] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewSubmissionsModal, setViewSubmissionsModal] = useState(null);
    const [submissionTab, setSubmissionTab] = useState('pending');

    const [newChallenge, setNewChallenge] = useState({
        title: '',
        problemStatement: '',
        sampleInput: '',
        sampleOutput: '',
        allowedLanguages: 'Python, JavaScript, C++, Java',
        xpPoints: 100,
        timeLimit: 30,
        status: 'active',
        scheduledStartTime: ''
    });

    useEffect(() => {
        const qChallenges = query(collection(db, 'ts_challenges'));
        const unsubChallenges = onSnapshot(qChallenges, (snapshot) => {
            setChallenges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qSubs = query(collection(db, 'ts_challenge_submissions'));
        const unsubSubs = onSnapshot(qSubs, (snapshot) => {
            setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubChallenges();
            unsubSubs();
        };
    }, []);

    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const generatePDFReport = async (challenge, relatedSubs) => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const [rit, gfg, ts] = await Promise.all([
                loadImage(ritLogo),
                loadImage('/gfg-logo.png'), // from public folder
                loadImage(techsparkLogo)
            ]);

            const constrainImage = (img, maxW, maxH) => {
                const nw = img.naturalWidth || img.width || 1;
                const nh = img.naturalHeight || img.height || 1;

                let w = maxW;
                let h = w * (nh / nw);
                if (h > maxH) {
                    h = maxH;
                    w = h * (nw / nh);
                }
                return { w, h };
            };

            const ritDim = constrainImage(rit, 50, 20);
            const tsDim = constrainImage(ts, 50, 16); // Made smaller
            const gfgDim = constrainImage(gfg, 55, 26); // Made bigger

            const headerCenterY = 20;

            doc.addImage(rit, 'PNG', 15, headerCenterY - (ritDim.h / 2), ritDim.w, ritDim.h);
            // Shifted slightly to the right (+10)
            doc.addImage(ts, 'PNG', (pageWidth / 2) - (tsDim.w / 2) + 10, headerCenterY - (tsDim.h / 2), tsDim.w, tsDim.h);
            doc.addImage(gfg, 'PNG', pageWidth - 15 - gfgDim.w, headerCenterY - (gfgDim.h / 2), gfgDim.w, gfgDim.h);

            const headerStartY = headerCenterY + 20;

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("TechSpark Club Coding Challenge Report", pageWidth / 2, headerStartY, { align: "center" });
            
            // Header info positioning based on new headerStartY
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`Challenge: ${challenge.title}`, 15, headerStartY + 15);
            doc.text(`Total Submissions: ${relatedSubs.length}`, 15, headerStartY + 23);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, headerStartY + 31);

            const tableColumn = ["S.No", "Roll Number", "Name", "Dept & Sec", "Language", "Time Taken", "Status"];
            const tableRows = [];

            const sortedSubs = [...relatedSubs].sort((a, b) => {
                 if (a.status === 'verified' && b.status !== 'verified') return -1;
                 if (a.status !== 'verified' && b.status === 'verified') return 1;
                 return (a.timeTaken || 999999) - (b.timeTaken || 999999);
            });

            sortedSubs.forEach((sub, index) => {
                tableRows.push([
                    index + 1,
                    sub.studentRoll || 'N/A',
                    sub.studentName || 'N/A',
                    `${sub.studentDepartment || '-'} / ${sub.studentSection || '-'}`,
                    sub.language || '-',
                    sub.timeTakenFormatted || '-',
                    sub.status === 'verified' ? 'Verified' : 'Pending'
                ]);
            });

            autoTable(doc, {
                startY: headerStartY + 40,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [30, 58, 138], textColor: 255 },
                styles: { fontSize: 9, cellPadding: 3 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { top: headerStartY + 40 }
            });

            // --- APPEND CODE DETAILS SECTION ---
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Student Submissions - Detailed Code Report", pageWidth / 2, 20, { align: "center" });
            
            let currentY = 30;

            sortedSubs.forEach((sub, index) => {
                autoTable(doc, {
                    startY: currentY,
                    head: [[`#${index + 1} - ${sub.studentName} (${sub.studentRoll}) | ${sub.studentDepartment} | Lang: ${sub.language}`]],
                    body: [[`--- SOURCE CODE ---\n${sub.code || 'No code submitted.'}\n\n--- EXECUTION OUTPUT ---\n${sub.output || 'No output log.'}`]],
                    theme: 'plain',
                    headStyles: { fillColor: [240, 240, 240], textColor: [20, 20, 20], fontStyle: 'bold', lineWidth: 0.2, lineColor: [200, 200, 200], cellPadding: 3 },
                    bodyStyles: { font: 'courier', fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [200, 200, 200] },
                    margin: { top: 20 }
                });
                currentY = doc.lastAutoTable.finalY + 10;
            });

            // Signatures on the very last page
            const finalY = doc.lastAutoTable.finalY + 40; 
            if (finalY > pageHeight - 30) {
                doc.addPage();
            }

            const signYPos = doc.lastAutoTable.finalY > pageHeight - 50 ? 40 : doc.lastAutoTable.finalY + 40;

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            const colW = pageWidth / 4;
            
            doc.text("Club Faculty", colW * 0.5, signYPos, { align: "center" });
            doc.text("Coordinator", colW * 0.5, signYPos + 5, { align: "center" });

            doc.text("Overall Club", colW * 1.5, signYPos, { align: "center" });
            doc.text("Coordinator", colW * 1.5, signYPos + 5, { align: "center" });

            doc.text("HOD", colW * 2.5, signYPos + 5, { align: "center" });
            doc.text("Principal", colW * 3.5, signYPos + 5, { align: "center" });

            doc.save(`${challenge.title.replace(/\s+/g, '_')}_Detailed_Report.pdf`);

        } catch (err) {
            console.error("PDF Generation Error", err);
            alert("Failed to generate PDF. Make sure logos are accessible.");
        }
    };

    const handleSaveChallenge = async (e) => {
        e.preventDefault();
        try {
            if (newChallenge.id) {
                const challengeRef = doc(db, 'ts_challenges', newChallenge.id);
                const { id, ...updateData } = newChallenge;
                await updateDoc(challengeRef, updateData);
                alert('Challenge updated successfully!');
            } else {
                await addDoc(collection(db, 'ts_challenges'), {
                    ...newChallenge,
                    createdAt: serverTimestamp()
                });
                alert('Challenge posted successfully!');
            }
            setIsCreateModalOpen(false);
            setNewChallenge({
                title: '', problemStatement: '', sampleInput: '', sampleOutput: '', allowedLanguages: 'Python, JavaScript, C++, Java', xpPoints: 100, timeLimit: 30, status: 'active'
            });
        } catch (error) {
            console.error("Error saving challenge:", error);
            alert("Failed to save challenge");
        }
    };

    const handleDeleteChallenge = async (challengeId) => {
        if (!window.confirm("Delete this challenge? All related submissions might be orphaned.")) return;
        try {
            await deleteDoc(doc(db, 'ts_challenges', challengeId));
            alert("Challenge deleted successfully.");
        } catch (error) {
            console.error("Error deleting challenge:", error);
            alert("Failed to delete challenge");
        }
    };

    const handleVerifySubmission = async (subId, studentUid, xpToAward) => {
        try {
            await updateDoc(doc(db, 'ts_challenge_submissions', subId), {
                status: 'verified',
                verifiedAt: serverTimestamp(),
                xpAwarded: xpToAward
            });
            // The student dashboard will dynamically calculate their total XP including these verified challenge points.
            alert(`Verified! ${xpToAward} XP awarded to student.`);
        } catch (err) {
            console.error("Error verifying:", err);
            alert("Failed to verify submission");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Challenges...</div>;

    if (viewSubmissionsModal) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header for Submissions View */}
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => { setViewSubmissionsModal(null); setSubmissionTab('pending'); }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                {viewSubmissionsModal.title}
                            </h2>
                            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Reviewing student submissions and logs.</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => generatePDFReport(viewSubmissionsModal, submissions.filter(s => s.challengeId === viewSubmissionsModal.id))}
                        className="px-5 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" /> Download PDF Report
                    </button>
                </div>

                {(() => {
                    const relatedSubs = submissions.filter(s => s.challengeId === viewSubmissionsModal.id);
                    const pendingSubs = relatedSubs.filter(s => s.status !== 'verified').sort((a, b) => (b.submittedAt?.toMillis() || 0) - (a.submittedAt?.toMillis() || 0));
                    const verifiedSubs = relatedSubs.filter(s => s.status === 'verified').sort((a, b) => {
                        if ((a.timeTaken || 999999) !== (b.timeTaken || 999999)) return (a.timeTaken || 999999) - (b.timeTaken || 999999);
                        return (a.warnings || 0) - (b.warnings || 0);
                    });
                    
                    const activeSubs = submissionTab === 'pending' ? pendingSubs : verifiedSubs;

                    return (
                        <>
                            {/* Tabs */}
                            <div className="flex gap-4 border-b border-slate-200 px-2">
                                <button 
                                    onClick={() => setSubmissionTab('pending')}
                                    className={`px-4 py-3 font-black uppercase tracking-wider text-sm border-b-2 transition-all ${submissionTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    Pending Review ({pendingSubs.length})
                                </button>
                                <button 
                                    onClick={() => setSubmissionTab('verified')}
                                    className={`px-4 py-3 font-black uppercase tracking-wider text-sm border-b-2 transition-all ${submissionTab === 'verified' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    Verified ({verifiedSubs.length})
                                </button>
                            </div>

                            {/* Submissions List */}
                            <div className="space-y-6">
                                {activeSubs.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">No submissions in this category.</p>
                                    </div>
                                ) : (
                                    activeSubs.map(sub => (
                                        <div key={sub.id} className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl flex flex-col gap-6">
                                {/* Header Info */}
                                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">{sub.studentName}</h3>
                                        <div className="text-sm font-bold text-slate-500 uppercase flex flex-wrap items-center gap-3 mt-2">
                                            <span className="flex items-center gap-1 text-slate-700"><User className="w-4 h-4" /> {sub.studentRoll}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>{sub.studentDepartment || 'Dept N/A'}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>Yr {sub.studentYear || '-'} Sec {sub.studentSection || '-'}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold uppercase mt-4 flex flex-wrap items-center gap-3">
                                            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">Lang: {sub.language}</span>
                                            {sub.timeTakenFormatted && (
                                                <span className="flex items-center gap-1.5 text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">
                                                    <Clock className="w-4 h-4" /> {sub.timeTakenFormatted}
                                                </span>
                                            )}
                                            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${sub.warnings >= 3 ? 'text-red-700 bg-red-100' : 'text-orange-700 bg-orange-100'}`}>
                                                <ShieldAlert className="w-4 h-4" /> Warnings: {sub.warnings || 0}/3
                                            </span>
                                            {sub.status === 'verified' && (
                                                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                                                    <Check className="w-4 h-4" /> Verified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        {sub.status !== 'verified' && (
                                            <button 
                                                onClick={() => handleVerifySubmission(sub.id, sub.studentUid, viewSubmissionsModal.xpPoints)}
                                                className="px-5 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
                                            >
                                                <Check className="w-5 h-5" /> Verify & Award XP
                                            </button>
                                        )}
                                        <button 
                                            onClick={async () => {
                                                if(window.confirm("Are you sure you want to allow this student to retake the challenge? This will delete their current submission.")) {
                                                    try {
                                                        await deleteDoc(doc(db, 'ts_challenge_submissions', sub.id));
                                                        alert("Submission deleted. Student can now retake the challenge.");
                                                    } catch(err) {
                                                        console.error(err);
                                                        alert("Failed to delete submission.");
                                                    }
                                                }
                                            }}
                                            className="px-5 py-3 bg-red-50 border border-red-200 text-red-700 hover:bg-red-600 hover:text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
                                        >
                                            <X className="w-5 h-5" /> Allow Retake
                                        </button>
                                    </div>
                                </div>

                                {/* Code & Output Grids */}
                                <div className="grid lg:grid-cols-2 gap-6 mt-2">
                                    <div className="bg-slate-900 rounded-2xl flex flex-col overflow-hidden border border-slate-800 shadow-inner max-h-96">
                                        <div className="bg-slate-950 text-slate-500 text-xs font-black uppercase tracking-widest px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                                            <Code2 className="w-4 h-4" /> Source Code
                                        </div>
                                        <div className="p-5 overflow-auto custom-scrollbar flex-1">
                                            <pre className="text-sm text-blue-400 font-mono whitespace-pre-wrap">
                                                {sub.code}
                                            </pre>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-900 rounded-2xl flex flex-col overflow-hidden border border-slate-800 shadow-inner max-h-96">
                                        <div className="bg-slate-950 text-slate-500 text-xs font-black uppercase tracking-widest px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                                            <Terminal className="w-4 h-4" /> Output Log
                                        </div>
                                        <div className="p-5 overflow-auto custom-scrollbar flex-1">
                                            <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">
                                                {sub.output || "No output recorded."}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                                    ))
                                )}
                            </div>
                        </>
                    );
                })()}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Code2 className="text-blue-600" /> Weekly Coding Challenges
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage GeeksforGeeks native assessments and review submissions.</p>
                </div>
                <div className="flex items-center gap-2">
                <button 
                    onClick={async () => {
                        await addDoc(collection(db, 'ts_challenges'), {
                            title: 'Two Sum Problem',
                            problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
                            sampleInput: '2 7 11 15\n9',
                            sampleOutput: '0 1',
                            allowedLanguages: 'Python, JavaScript, C++, Java',
                            xpPoints: 500,
                            timeLimit: 15,
                            status: 'active',
                            createdAt: serverTimestamp()
                        });
                        alert('Sample Challenge Created!');
                    }}
                    className="px-4 py-2.5 bg-green-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:bg-green-700 transition-all mr-2"
                >
                    <Code2 className="w-5 h-5" /> Generate Sample Challenge
                </button>
                <button 
                    onClick={() => {
                        setNewChallenge({
                            title: '', problemStatement: '', sampleInput: '', sampleOutput: '', allowedLanguages: 'Python, JavaScript, C++, Java', xpPoints: 100, timeLimit: 30, disableCopyPaste: true, disableScreenshots: true, status: 'active', scheduledStartTime: ''
                        });
                        setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                    <Plus className="w-5 h-5" /> Post Challenge
                </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {challenges.map(challenge => {
                    const relatedSubs = submissions.filter(s => s.challengeId === challenge.id);
                    return (
                        <div key={challenge.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${challenge.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {challenge.status}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                            XP: {challenge.xpPoints}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase">{challenge.title}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { 
                                        setNewChallenge(challenge); 
                                        setIsCreateModalOpen(true); 
                                    }} className="text-blue-500 text-xs font-bold bg-blue-50 p-2 rounded-lg hover:bg-blue-100 flex items-center justify-center">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    {(challenge.status === 'active' || challenge.status === 'scheduled') && (
                                        <button onClick={async () => {
                                            if(window.confirm("Are you sure you want to end this challenge?")) {
                                                await updateDoc(doc(db, 'ts_challenges', challenge.id), { status: 'closed' });
                                            }
                                        }} className="text-orange-500 text-xs font-bold bg-orange-50 px-3 py-2 rounded-lg hover:bg-orange-100 uppercase tracking-widest">End</button>
                                    )}
                                    <button onClick={() => handleDeleteChallenge(challenge.id)} className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg hover:bg-red-100">Delete</button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <p className="text-xs text-slate-600 font-medium line-clamp-3">{challenge.problemStatement}</p>
                            </div>
                            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-600" /> Submissions ({relatedSubs.length})
                                </h4>
                                <button 
                                    onClick={() => setViewSubmissionsModal(challenge)}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1"
                                >
                                    <Eye className="w-4 h-4" /> Review
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Challenge Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                        
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-3xl w-full max-w-2xl p-6 lg:p-8 shadow-2xl relative z-10 custom-scrollbar max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase">
                                {newChallenge.id ? 'Edit Challenge' : 'Post Coding Challenge'}
                            </h2>
                            <form onSubmit={handleSaveChallenge} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Challenge Title</label>
                                    <input required value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium" placeholder="e.g. Reverse a Linked List" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Problem Statement (Markdown supported)</label>
                                    <textarea required value={newChallenge.problemStatement} onChange={e => setNewChallenge({...newChallenge, problemStatement: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium h-32 resize-none" placeholder="Problem description..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sample Input</label>
                                        <textarea value={newChallenge.sampleInput} onChange={e => setNewChallenge({...newChallenge, sampleInput: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium h-20 resize-none font-mono text-sm" placeholder="e.g. 5\n1 2 3 4 5" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sample Output</label>
                                        <textarea value={newChallenge.sampleOutput} onChange={e => setNewChallenge({...newChallenge, sampleOutput: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium h-20 resize-none font-mono text-sm" placeholder="e.g. 5 4 3 2 1" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Allowed Languages</label>
                                        <input value={newChallenge.allowedLanguages} onChange={e => setNewChallenge({...newChallenge, allowedLanguages: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Schedule Start Time (Optional)</label>
                                        <input type="datetime-local" value={newChallenge.scheduledStartTime || ''} onChange={e => setNewChallenge({...newChallenge, scheduledStartTime: e.target.value, status: e.target.value ? 'scheduled' : 'active'})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">XP Points</label>
                                        <input type="number" required value={newChallenge.xpPoints} onChange={e => setNewChallenge({...newChallenge, xpPoints: parseInt(e.target.value)})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time (Mins)</label>
                                        <input type="number" required value={newChallenge.timeLimit} onChange={e => setNewChallenge({...newChallenge, timeLimit: parseInt(e.target.value)})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all uppercase tracking-widest mt-4">
                                    {newChallenge.id ? 'Update Challenge' : 'Post Challenge'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default CodingChallengesTab;

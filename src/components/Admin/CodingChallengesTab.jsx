import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Check, X, ShieldAlert, Code2, Users, Eye, User, Terminal, ArrowLeft, Edit, Clock, Download, BarChart3, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [reportModal, setReportModal] = useState(null);
    const [reportGroupBy, setReportGroupBy] = useState('year');
    const [expandedGroups, setExpandedGroups] = useState({});
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

    const generateGroupedPDFReport = async (challenge, relatedSubs, groupBy) => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            const [rit, gfg, ts] = await Promise.all([
                loadImage(ritLogo),
                loadImage('/gfg-logo.png'),
                loadImage(techsparkLogo)
            ]);

            const constrainImage = (img, maxW, maxH) => {
                const nw = img.naturalWidth || img.width || 1;
                const nh = img.naturalHeight || img.height || 1;
                let w = maxW, h = w * (nh / nw);
                if (h > maxH) { h = maxH; w = h * (nw / nh); }
                return { w, h };
            };

            const ritDim = constrainImage(rit, 50, 20);
            const tsDim = constrainImage(ts, 50, 16);
            const gfgDim = constrainImage(gfg, 55, 26);
            const headerCenterY = 20;
            doc.addImage(rit, 'PNG', 15, headerCenterY - (ritDim.h / 2), ritDim.w, ritDim.h);
            doc.addImage(ts, 'PNG', (pageWidth / 2) - (tsDim.w / 2) + 10, headerCenterY - (tsDim.h / 2), tsDim.w, tsDim.h);
            doc.addImage(gfg, 'PNG', pageWidth - 15 - gfgDim.w, headerCenterY - (gfgDim.h / 2), gfgDim.w, gfgDim.h);

            const headerStartY = headerCenterY + 20;
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text(`TechSpark Weekly Coding Challenge — ${groupBy === 'year' ? 'Year' : groupBy === 'dept' ? 'Department' : 'Section'}-wise Report`, pageWidth / 2, headerStartY, { align: "center" });
            doc.setFontSize(11); doc.setFont("helvetica", "normal");
            doc.text(`Challenge: ${challenge.title}`, 15, headerStartY + 12);
            doc.text(`Total Submissions: ${relatedSubs.length}   |   Verified: ${relatedSubs.filter(s => s.status === 'verified').length}`, 15, headerStartY + 20);
            doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 15, headerStartY + 28);

            // Group the submissions
            const groupMap = {};
            relatedSubs.forEach(sub => {
                let key = 'Unknown';
                if (groupBy === 'year') key = sub.studentYear ? `Year ${sub.studentYear}` : 'Unknown Year';
                else if (groupBy === 'dept') key = sub.studentDepartment || 'Unknown Dept';
                else if (groupBy === 'section') key = `${sub.studentDepartment || '?'} - Sec ${sub.studentSection || '?'}`;
                if (!groupMap[key]) groupMap[key] = [];
                groupMap[key].push(sub);
            });

            let currentY = headerStartY + 38;
            const tableColumn = ["S.No", "Name", "Roll No", "Dept", "Year/Sec", "Language", "Status"];

            Object.entries(groupMap).sort(([a], [b]) => a.localeCompare(b)).forEach(([groupName, subs]) => {
                // Group header
                doc.setFontSize(12); doc.setFont("helvetica", "bold");
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFillColor(30, 58, 138);
                doc.roundedRect(15, currentY, pageWidth - 30, 8, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.text(`${groupName}  (${subs.length} submissions | ${subs.filter(s => s.status === 'verified').length} verified)`, 18, currentY + 5.5);
                doc.setTextColor(0, 0, 0);
                currentY += 12;

                const rows = subs.sort((a, b) => {
                    if (a.status === 'verified' && b.status !== 'verified') return -1;
                    if (a.status !== 'verified' && b.status === 'verified') return 1;
                    return (a.timeTaken || 999999) - (b.timeTaken || 999999);
                }).map((sub, i) => [
                    i + 1,
                    sub.studentName || 'N/A',
                    sub.studentRoll || 'N/A',
                    sub.studentDepartment || '-',
                    `Yr${sub.studentYear || '?'} / ${sub.studentSection || '?'}`,
                    sub.language || '-',
                    sub.status === 'verified' ? '✓ Verified' : 'Pending'
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [tableColumn],
                    body: rows,
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2.5 },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    margin: { left: 15, right: 15 },
                    columnStyles: { 6: { textColor: [5, 150, 105], fontStyle: 'bold' } }
                });
                currentY = doc.lastAutoTable.finalY + 10;
            });

            // Overall summary at the end
            doc.addPage();
            doc.setFontSize(14); doc.setFont("helvetica", "bold");
            doc.text("Overall Summary", pageWidth / 2, 20, { align: "center" });

            const summaryRows = Object.entries(groupMap).sort(([a], [b]) => a.localeCompare(b)).map(([gName, subs]) => [
                gName, subs.length, subs.filter(s => s.status === 'verified').length, subs.filter(s => s.status !== 'verified').length,
                `${Math.round((subs.filter(s => s.status === 'verified').length / subs.length) * 100)}%`
            ]);
            summaryRows.push(['TOTAL', relatedSubs.length, relatedSubs.filter(s => s.status === 'verified').length, relatedSubs.filter(s => s.status !== 'verified').length, `${Math.round((relatedSubs.filter(s => s.status === 'verified').length / relatedSubs.length) * 100)}%`]);

            autoTable(doc, {
                startY: 28,
                head: [['Group', 'Total Submissions', 'Verified', 'Pending', 'Pass Rate']],
                body: summaryRows,
                theme: 'grid',
                headStyles: { fillColor: [30, 58, 138], textColor: 255 },
                styles: { fontSize: 10, cellPadding: 3 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                foot: [summaryRows[summaryRows.length - 1]],
                footStyles: { fillColor: [240, 253, 244], textColor: [5, 150, 105], fontStyle: 'bold' }
            });

            const signY = doc.lastAutoTable.finalY + 30;
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            const colW = pageWidth / 3;
            doc.text("Club Coordinator", colW * 0.5, signY, { align: "center" });
            doc.text("HOD", colW * 1.5, signY, { align: "center" });
            doc.text("Principal", colW * 2.5, signY, { align: "center" });

            doc.save(`${challenge.title.replace(/\s+/g, '_')}_${groupBy}_wise_Report.pdf`);
        } catch (err) {
            console.error("Grouped PDF Error", err);
            alert("Failed to generate report. Make sure logos are accessible.");
        }
    };

    const handleSaveChallenge = async (e) => {
        e.preventDefault();
        try {
            if (newChallenge.id) {
                const challengeRef = doc(db, 'ts_challenges', newChallenge.id);
                const { id, ...updateData } = newChallenge;
                if (updateData.testCases && updateData.testCases.length > 0) {
                    updateData.testCases = updateData.testCases.map((tc, idx) => {
                        if (idx === 0) {
                            return { ...tc, input: newChallenge.sampleInput, output: newChallenge.sampleOutput };
                        }
                        return tc;
                    });
                }
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
                        try {
                            const res = await fetch('http://localhost:8008/mcp/create-weekly-challenge?difficulty=EASY');
                            if (res.ok) {
                                const data = await res.json();
                                await addDoc(collection(db, 'ts_challenges'), {
                                    ...data.challenge,
                                    createdAt: serverTimestamp()
                                });
                                alert('✅ Weekly LeetCode Challenge (10 Test Cases) Created & Scheduled!');
                            } else {
                                throw new Error("MCP Server offline");
                            }
                        } catch (err) {
                            // Fallback client-side generation
                            await addDoc(collection(db, 'ts_challenges'), {
                                title: '[LeetCode] Two Sum Problem',
                                problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
                                sampleInput: '2 7 11 15\n9',
                                sampleOutput: '0 1',
                                testCasesCount: 10,
                                testCases: [
                                    { id: 1, input: '2 7 11 15\n9', output: '0 1', isHidden: false, description: 'Sample Case 1' },
                                    { id: 2, input: '3 2 4\n6', output: '1 2', isHidden: false, description: 'Sample Case 2' },
                                    { id: 3, input: '3 3\n6', output: '0 1', isHidden: true, description: 'Duplicates edge case' },
                                    { id: 4, input: '-1 -2 -3 -4\n-7', output: '2 3', isHidden: true, description: 'Negative numbers' },
                                    { id: 5, input: '0 4 3 0\n0', output: '0 3', isHidden: true, description: 'Zero elements' },
                                    { id: 6, input: '1000 2000 3000\n5000', output: '1 2', isHidden: true, description: 'Large integers' },
                                    { id: 7, input: '1 5 9 13\n14', output: '1 2', isHidden: true, description: 'Middle element match' },
                                    { id: 8, input: '10 20 30 40 50\n90', output: '3 4', isHidden: true, description: 'End element match' },
                                    { id: 9, input: '5 4 3 2 1\n3', output: '3 4', isHidden: true, description: 'Reverse order' },
                                    { id: 10, input: '100 200\n300', output: '0 1', isHidden: true, description: 'Two element array' }
                                ],
                                allowedLanguages: 'Python, JavaScript, C++, Java',
                                xpPoints: 500,
                                timeLimit: 30,
                                status: 'scheduled',
                                scheduleWindow: 'Saturday 00:00 - Sunday 24:00',
                                createdAt: serverTimestamp()
                            });
                            alert('✅ Weekly LeetCode Challenge (10 Test Cases) Created & Scheduled!');
                        }
                    }}
                    className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all mr-2"
                >
                    <Code2 className="w-5 h-5" /> Generate LeetCode Challenge (10 Test Cases)
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
                                        <div className="flex gap-1">
                                        {challenge.status === 'scheduled' && (
                                        <button onClick={async () => {
                                            if(window.confirm("Activate this challenge now for students?")) {
                                                await updateDoc(doc(db, 'ts_challenges', challenge.id), { status: 'active' });
                                                alert("✅ Challenge is now LIVE for students!");
                                            }
                                        }} className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-all">
                                            ⚡ Go Live
                                        </button>
                                        )}
                                        <button onClick={async () => {
                                            if(window.confirm("Are you sure you want to end this challenge?")) {
                                                await updateDoc(doc(db, 'ts_challenges', challenge.id), { status: 'closed' });
                                            }
                                        }} className="text-orange-500 text-xs font-bold bg-orange-50 px-3 py-2 rounded-lg hover:bg-orange-100 uppercase tracking-widest">End</button>
                                    </div>
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
                                <div className="flex gap-2">
                                <button 
                                    onClick={() => { setReportModal(challenge); setExpandedGroups({}); }}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"
                                >
                                    <BarChart3 className="w-4 h-4" /> Report
                                </button>
                                <button 
                                    onClick={() => setViewSubmissionsModal(challenge)}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1"
                                >
                                    <Eye className="w-4 h-4" /> Review
                                </button>
                                </div>
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

            {/* ===================== REPORT MODAL ===================== */}
            <AnimatePresence>
                {reportModal && (() => {
                    const relatedSubs = submissions.filter(s => s.challengeId === reportModal.id);
                    const verified = relatedSubs.filter(s => s.status === 'verified');
                    const pending = relatedSubs.filter(s => s.status !== 'verified');

                    // Group helper
                    const groupBy = (subs, key) => {
                        const map = {};
                        subs.forEach(sub => {
                            let k = 'Unknown';
                            if (key === 'year') k = sub.studentYear ? `Year ${sub.studentYear}` : 'Unknown Year';
                            else if (key === 'dept') k = sub.studentDepartment || 'Unknown Dept';
                            else if (key === 'section') k = `${sub.studentDepartment || '?'} — Sec ${sub.studentSection || '?'}`;
                            if (!map[k]) map[k] = [];
                            map[k].push(sub);
                        });
                        return map;
                    };

                    const groups = groupBy(relatedSubs, reportGroupBy);
                    const passRate = relatedSubs.length > 0 ? Math.round((verified.length / relatedSubs.length) * 100) : 0;

                    return (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                                onClick={() => setReportModal(null)} />

                            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="bg-white rounded-3xl w-full max-w-4xl p-6 lg:p-8 shadow-2xl relative z-10 max-h-[92vh] overflow-y-auto custom-scrollbar">

                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <BarChart3 className="w-5 h-5 text-blue-600" />
                                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Challenge Report</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium">{reportModal.title}</p>
                                    </div>
                                    <button onClick={() => setReportModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                    {[
                                        { label: 'Total Submissions', value: relatedSubs.length, color: 'bg-blue-50 text-blue-700', icon: <Users className="w-5 h-5" /> },
                                        { label: 'Verified', value: verified.length, color: 'bg-emerald-50 text-emerald-700', icon: <Check className="w-5 h-5" /> },
                                        { label: 'Pending Review', value: pending.length, color: 'bg-orange-50 text-orange-700', icon: <Clock className="w-5 h-5" /> },
                                        { label: 'Pass Rate', value: `${passRate}%`, color: 'bg-purple-50 text-purple-700', icon: <BarChart3 className="w-5 h-5" /> },
                                    ].map((s, i) => (
                                        <div key={i} className={`${s.color} rounded-2xl p-4 flex flex-col gap-1`}>
                                            <div className="flex items-center gap-2 opacity-70">{s.icon}<span className="text-xs font-bold uppercase tracking-wider">{s.label}</span></div>
                                            <div className="text-3xl font-black">{s.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Group By Selector + PDF Downloads */}
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Group By:</span>
                                        {[
                                            { id: 'year', label: '🎓 Year' },
                                            { id: 'dept', label: '🏫 Department' },
                                            { id: 'section', label: '🔤 Section' },
                                        ].map(opt => (
                                            <button key={opt.id} onClick={() => { setReportGroupBy(opt.id); setExpandedGroups({}); }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${reportGroupBy === opt.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => generateGroupedPDFReport(reportModal, relatedSubs, reportGroupBy)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 flex items-center gap-1.5 shadow-sm">
                                            <Download className="w-4 h-4" /> Download {reportGroupBy === 'year' ? 'Year' : reportGroupBy === 'dept' ? 'Dept' : 'Section'}-wise PDF
                                        </button>
                                        <button onClick={() => generatePDFReport(reportModal, relatedSubs)}
                                            className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 flex items-center gap-1.5 shadow-sm">
                                            <FileText className="w-4 h-4" /> Full Report
                                        </button>
                                    </div>
                                </div>

                                {/* Grouped Sections */}
                                {relatedSubs.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No submissions yet for this challenge.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, subs]) => {
                                            const gVerified = subs.filter(s => s.status === 'verified');
                                            const gPassRate = Math.round((gVerified.length / subs.length) * 100);
                                            const isExpanded = expandedGroups[groupName];
                                            return (
                                                <div key={groupName} className="border border-slate-200 rounded-2xl overflow-hidden">
                                                    {/* Group Header */}
                                                    <button onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                                                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-slate-800 text-sm uppercase tracking-wide">{groupName}</span>
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase">{subs.length} submissions</span>
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">{gVerified.length} verified</span>
                                                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${gPassRate >= 70 ? 'bg-green-100 text-green-700' : gPassRate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                {gPassRate}% pass
                                                            </span>
                                                        </div>
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                    </button>

                                                    {/* Expanded Table */}
                                                    {isExpanded && (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-800 text-white">
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">#</th>
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Name</th>
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Roll No</th>
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Dept</th>
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Yr / Sec</th>
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Language</th>
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Time</th>
                                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {subs.sort((a, b) => {
                                                                        if (a.status === 'verified' && b.status !== 'verified') return -1;
                                                                        if (a.status !== 'verified' && b.status === 'verified') return 1;
                                                                        return (a.timeTaken || 999999) - (b.timeTaken || 999999);
                                                                    }).map((sub, idx) => (
                                                                        <tr key={sub.id} className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                                                            <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                                                                            <td className="px-4 py-3 font-bold text-slate-800">{sub.studentName || 'N/A'}</td>
                                                                            <td className="px-4 py-3 font-mono text-slate-600">{sub.studentRoll || 'N/A'}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{sub.studentDepartment || '-'}</td>
                                                                            <td className="px-4 py-3 text-slate-600">Yr {sub.studentYear || '?'} / {sub.studentSection || '?'}</td>
                                                                            <td className="px-4 py-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">{sub.language || '-'}</span></td>
                                                                            <td className="px-4 py-3 text-blue-700 font-bold">{sub.timeTakenFormatted || '-'}</td>
                                                                            <td className="px-4 py-3">
                                                                                {sub.status === 'verified'
                                                                                    ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-black">✓ Verified</span>
                                                                                    : <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-black">Pending</span>}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

        </div>
    );
};

export default CodingChallengesTab;

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, deleteDoc, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { Briefcase, Send, CheckCircle, Clock, X, Eye, Info, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StudentRecruitmentSection = ({ user }) => {
    const [recruitingProjects, setRecruitingProjects] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    
    // View Application Details Modal
    const [viewAppModal, setViewAppModal] = useState(null);
    const [viewAppProject, setViewAppProject] = useState(null);

    // Join via Code Modal
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Calculate student year based on admissionYear
    const currentYear = new Date().getFullYear();
    const admissionYear = user?.admissionYear ? parseInt(user.admissionYear) : currentYear;
    // For academic year starting in late summer, simple difference might need +1 depending on the month, but we'll use a simple diff + 1.
    const studentYear = Math.max(1, currentYear - admissionYear + 1);
    const studentYearStr = studentYear.toString();

    useEffect(() => {
        if (!user || !user.uid) return;

        const qProjects = query(collection(db, 'ts_projects'), where('status', '==', 'recruiting'));
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter by visibility
            const visibleProjects = projects.filter(p => {
                if (!p.visibility || p.visibility.includes('ALL')) return true;
                return p.visibility.includes(studentYearStr);
            });
            setRecruitingProjects(visibleProjects);
        });

        const qApps = query(collection(db, 'project_applications'), where('studentUid', '==', user.uid));
        const unsubApps = onSnapshot(qApps, (snapshot) => {
            setMyApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubProjects();
            unsubApps();
        };
    }, [user, studentYearStr]);

    const handleApply = async (e) => {
        e.preventDefault();
        if (!selectedRole || !selectedProject) return;
        setIsApplying(true);

        try {
            await addDoc(collection(db, 'project_applications'), {
                projectId: selectedProject.id,
                projectTitle: selectedProject.title,
                studentUid: user.uid,
                studentName: user.fullName,
                studentRoll: user.rollNumber,
                roleAppliedFor: selectedRole,
                status: 'pending',
                appliedAt: serverTimestamp()
            });
            setSelectedProject(null);
            setSelectedRole('');
            alert('Application submitted successfully!');
        } catch (error) {
            console.error("Error applying:", error);
            alert("Failed to submit application.");
        } finally {
            setIsApplying(false);
        }
    };

    const handleViewApp = async (app) => {
        setViewAppModal(app);
        setViewAppProject(null);
        try {
            const snap = await getDoc(doc(db, 'ts_projects', app.projectId));
            if (snap.exists()) {
                setViewAppProject(snap.data());
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteApp = async (appId) => {
        if (!window.confirm("Are you sure you want to withdraw/delete this application?")) return;
        try {
            await deleteDoc(doc(db, 'project_applications', appId));
            setViewAppModal(null);
            alert("Application removed.");
        } catch (error) {
            console.error("Error deleting application:", error);
            alert("Failed to remove application");
        }
    };

    const handleJoinViaCode = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setIsJoining(true);

        try {
            const q = query(collection(db, 'ts_projects'), where('inviteCode', '==', joinCode.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Invalid invite code. Please check and try again.");
                setIsJoining(false);
                return;
            }

            const projectDoc = querySnapshot.docs[0];
            const projectData = projectDoc.data();

            // Check if user is already in the team
            const isAlreadyMember = projectData.teamMembers && projectData.teamMembers.some(m => m.uid === user.uid);
            if (isAlreadyMember || projectData.teamLead === user.uid) {
                alert("You are already a member of this project.");
                setIsJoining(false);
                return;
            }

            // Add to teamMembers
            const memberData = {
                uid: user.uid,
                name: user.fullName,
                role: 'Team Member',
                rollNumber: user.rollNumber
            };

            await updateDoc(doc(db, 'ts_projects', projectDoc.id), {
                teamMembers: arrayUnion(memberData)
            });

            // Add a hired application record for consistency
            await addDoc(collection(db, 'project_applications'), {
                projectId: projectDoc.id,
                projectTitle: projectData.title,
                studentUid: user.uid,
                studentName: user.fullName,
                studentRoll: user.rollNumber,
                roleAppliedFor: 'Team Member',
                status: 'hired',
                appliedAt: serverTimestamp(),
                hiredAs: 'Team Member',
                hiredAt: serverTimestamp()
            });

            alert("Successfully joined the project!");
            setIsJoinModalOpen(false);
            setJoinCode('');
        } catch (error) {
            console.error("Error joining by code:", error);
            alert("Failed to join project.");
        } finally {
            setIsJoining(false);
        }
    };

    if (loading) return null;

    if (recruitingProjects.length === 0 && myApplications.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600 shrink-0" />
                    Open Roles & Hiring
                </h2>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <button 
                        onClick={() => setIsJoinModalOpen(true)}
                        className="px-4 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <Key className="w-3.5 h-3.5" /> Join via Code
                    </button>
                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                        TechSpark Internal
                    </div>
                </div>
            </div>

            {/* Active Job Postings */}
            {recruitingProjects.length > 0 && (
                <div className="space-y-4 mb-8">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">We are recruiting!</h3>
                    {recruitingProjects.map(project => {
                        const hasApplied = myApplications.some(app => app.projectId === project.id);
                        
                        let displayRoles = project.rolesRequired || [];
                        let teamStatusMsg = '';
                        
                        // Team Project Hierarchy Logic
                        if (project.projectType === 'team') {
                            if (!project.teamLead) {
                                displayRoles = ['Team Lead'];
                                teamStatusMsg = 'Looking for a Team Lead';
                            } else {
                                const leadMember = project.teamMembers?.find(m => m.uid === project.teamLead);
                                teamStatusMsg = `Join ${leadMember ? leadMember.name : 'the Team Lead'}'s Team!`;
                            }
                        }

                        return (
                            <div key={project.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center hover:border-blue-200 transition-all group relative overflow-hidden">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${project.projectType === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {project.projectType}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 uppercase">{project.title}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 max-w-lg">{project.description}</p>
                                    
                                    {teamStatusMsg && (
                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-2 bg-blue-50 px-2 py-1 rounded w-fit">
                                            {teamStatusMsg}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {displayRoles.map((role, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold">{role}</span>
                                        ))}
                                    </div>
                                </div>
                                
                                {hasApplied ? (
                                    <div className="px-4 py-2 bg-slate-200/50 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0">
                                        <CheckCircle className="w-4 h-4" /> Applied
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setSelectedProject(project)}
                                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shrink-0"
                                    >
                                        Apply Now
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* My Applications Status */}
            {myApplications.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">My Applications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myApplications.map(app => (
                            <div 
                                key={app.id} 
                                onClick={() => handleViewApp(app)}
                                className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                            >
                                <div>
                                    <h4 className="text-base font-black text-slate-800 uppercase leading-snug group-hover:text-blue-600 transition-colors">{app.projectTitle}</h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 leading-snug">Role: {app.roleAppliedFor}</p>
                                </div>
                                <div className="mt-auto">
                                    {app.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider"><Clock className="w-3.5 h-3.5" /> Pending</span>}
                                    {app.status === 'hired' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider"><CheckCircle className="w-3.5 h-3.5" /> Hired!</span>}
                                    {app.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider"><X className="w-3.5 h-3.5" /> Rejected</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Apply Modal */}
            <AnimatePresence>
                {selectedProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
                        
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl">
                            <button onClick={() => setSelectedProject(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h2 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">Apply for Project</h2>
                            <p className="text-sm font-medium text-slate-500 mb-6">{selectedProject.title}</p>
                            
                            <form onSubmit={handleApply} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select your Role</label>
                                    <div className="space-y-2">
                                        {/* Determine roles to show based on team logic */}
                                        {(selectedProject.projectType === 'team' && !selectedProject.teamLead 
                                            ? ['Team Lead'] 
                                            : selectedProject.rolesRequired || []
                                        ).map((role, i) => (
                                            <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedRole === role ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                                                <input type="radio" name="role" value={role} checked={selectedRole === role} onChange={(e) => setSelectedRole(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                <span className={`text-sm font-bold ${selectedRole === role ? 'text-blue-700' : 'text-slate-700'}`}>{role}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                
                                <button type="submit" disabled={!selectedRole || isApplying} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50">
                                    {isApplying ? 'Submitting...' : 'Submit Application'} <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Application Details Modal */}
            <AnimatePresence>
                {viewAppModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewAppModal(null)} />
                        
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl">
                            <button onClick={() => setViewAppModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h2 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">Application Details</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4 mb-4">View your submission status</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Name</p>
                                    <h4 className="text-sm font-black text-slate-800 uppercase leading-snug">{viewAppModal.projectTitle}</h4>
                                </div>
                                
                                {viewAppProject && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</p>
                                        <p className="text-xs text-slate-600 font-medium">{viewAppProject.description}</p>
                                    </div>
                                )}
                                
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role Applied For</p>
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{viewAppModal.roleAppliedFor}</span>
                                </div>
                                
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Status</p>
                                    {viewAppModal.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider"><Clock className="w-3.5 h-3.5" /> Under Review</span>}
                                    {viewAppModal.status === 'hired' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider"><CheckCircle className="w-3.5 h-3.5" /> Hired Successfully</span>}
                                    {viewAppModal.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider"><X className="w-3.5 h-3.5" /> Not Selected</span>}
                                </div>
                                
                                <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center">
                                    {viewAppModal.appliedAt ? (
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                            Applied on: {new Date(viewAppModal.appliedAt.toDate()).toLocaleDateString()}
                                        </p>
                                    ) : <div />}
                                    
                                    {viewAppModal.status !== 'hired' && (
                                        <button 
                                            onClick={() => handleDeleteApp(viewAppModal.id)}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all"
                                        >
                                            Delete App
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Join via Code Modal */}
            <AnimatePresence>
                {isJoinModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsJoinModalOpen(false)} />
                        
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2rem] w-full max-w-sm relative z-10 shadow-2xl">
                            <button onClick={() => setIsJoinModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h2 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight flex items-center gap-2"><Key className="w-5 h-5 text-indigo-600" /> Join via Code</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4 mb-6">Enter team invite code</p>
                            
                            <form onSubmit={handleJoinViaCode} className="space-y-4">
                                <div>
                                    <input 
                                        type="text"
                                        required 
                                        value={joinCode} 
                                        onChange={e => setJoinCode(e.target.value)} 
                                        className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-center text-xl tracking-widest uppercase" 
                                        placeholder="E.g. X7B9K2" 
                                        maxLength={6}
                                    />
                                </div>
                                
                                <button type="submit" disabled={isJoining || !joinCode} className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50">
                                    {isJoining ? 'Joining...' : 'Join Team'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentRecruitmentSection;

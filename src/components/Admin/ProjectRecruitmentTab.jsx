import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, arrayUnion, deleteDoc, arrayRemove } from 'firebase/firestore';
import { Briefcase, Plus, Users, CheckCircle, X, Clock, ExternalLink, Activity, Eye, ShieldAlert, Trash2, Key, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectRecruitmentTab = () => {
    const [projects, setProjects] = useState([]);
    const [applications, setApplications] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [selectedStudentUid, setSelectedStudentUid] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewUpdatesModal, setViewUpdatesModal] = useState(null); // stores the project object to view updates

    const [newProject, setNewProject] = useState({
        title: '',
        description: '',
        rolesRequired: '',
        projectType: 'individual',
        visibility: ['ALL'], // Array: ['ALL'] or ['1', '2', '3', '4']
        githubUrl: '',
        liveUrl: ''
    });

    useEffect(() => {
        const qProjects = query(collection(db, 'ts_projects'));
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qApps = query(collection(db, 'project_applications'));
        const unsubApps = onSnapshot(qApps, (snapshot) => {
            setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qUsers = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubProjects();
            unsubApps();
            unsubUsers();
        };
    }, []);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            const roles = newProject.rolesRequired.split(',').map(r => r.trim()).filter(r => r);
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            let teamLeadVal = null;
            let teamMembersVal = [];
            let statusVal = 'recruiting';

            if (selectedStudentUid) {
                const studentUser = usersList.find(u => u.id === selectedStudentUid);
                if (studentUser) {
                    teamLeadVal = studentUser.id;
                    teamMembersVal = [{
                        uid: studentUser.id,
                        name: studentUser.fullName,
                        department: studentUser.department || 'N/A',
                        role: 'Team Lead',
                        rollNumber: studentUser.rollNumber || ''
                    }];
                    statusVal = 'in_progress';
                }
            }

            await addDoc(collection(db, 'ts_projects'), {
                ...newProject,
                rolesRequired: roles,
                status: statusVal,
                teamLead: teamLeadVal,
                teamMembers: teamMembersVal,
                updates: [],
                inviteCode: inviteCode,
                createdAt: serverTimestamp()
            });
            setIsCreateModalOpen(false);
            setSelectedStudentUid('');
            setNewProject({ title: '', description: '', rolesRequired: '', projectType: 'individual', visibility: ['ALL'], githubUrl: '', liveUrl: '' });
            alert('Project posted successfully!');
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project");
        }
    };

    const handleVisibilityToggle = (year) => {
        setNewProject(prev => {
            let newVis = [...prev.visibility];
            if (year === 'ALL') {
                return { ...prev, visibility: ['ALL'] };
            }
            // Remove 'ALL' if a specific year is clicked
            newVis = newVis.filter(v => v !== 'ALL');
            
            if (newVis.includes(year)) {
                newVis = newVis.filter(v => v !== year);
            } else {
                newVis.push(year);
            }
            if (newVis.length === 0) newVis = ['ALL'];
            return { ...prev, visibility: newVis };
        });
    };

    const handleHire = async (app, assignAsLead) => {
        if (!window.confirm(`Hire ${app.studentName} as ${assignAsLead ? 'Team Lead' : app.roleAppliedFor}?`)) return;
        
        try {
            await updateDoc(doc(db, 'project_applications', app.id), {
                status: 'hired',
                hiredAs: assignAsLead ? 'Team Lead' : app.roleAppliedFor,
                hiredAt: serverTimestamp()
            });

            const projectRef = doc(db, 'ts_projects', app.projectId);
            const memberData = {
                uid: app.studentUid,
                name: app.studentName,
                role: assignAsLead ? 'Team Lead' : app.roleAppliedFor,
                rollNumber: app.studentRoll
            };

            await updateDoc(projectRef, {
                teamMembers: arrayUnion(memberData)
            });

            if (assignAsLead) {
                await updateDoc(projectRef, {
                    teamLead: app.studentUid
                });
            }

            alert('Successfully hired!');
        } catch (error) {
            console.error("Error hiring:", error);
            alert("Failed to hire student");
        }
    };

    const handleReject = async (appId) => {
        if (!window.confirm("Reject this application?")) return;
        try {
            await updateDoc(doc(db, 'project_applications', app.id), {
                status: 'rejected'
            });
        } catch (error) {
            console.error("Error rejecting:", error);
        }
    };

    const handleStatusChange = async (projectId, newStatus) => {
        try {
            await updateDoc(doc(db, 'ts_projects', projectId), {
                status: newStatus
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (!window.confirm("Are you sure you want to delete this project? All associated applications will also be deleted.")) return;
        try {
            await deleteDoc(doc(db, 'ts_projects', projectId));
            
            // Delete associated applications
            const relatedApps = applications.filter(a => a.projectId === projectId);
            for (const app of relatedApps) {
                await deleteDoc(doc(db, 'project_applications', app.id));
            }

            alert("Project deleted successfully.");
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Failed to delete project");
        }
    };

    const handleRemoveMember = async (projectId, member, project) => {
        if (!window.confirm(`Remove ${member.name} from this project?`)) return;

        try {
            const projectRef = doc(db, 'ts_projects', projectId);
            
            await updateDoc(projectRef, {
                teamMembers: arrayRemove(member)
            });

            if (project.teamLead === member.uid) {
                await updateDoc(projectRef, {
                    teamLead: null
                });
            }

            const app = applications.find(a => a.projectId === projectId && a.studentUid === member.uid && a.status === 'hired');
            if (app) {
                await updateDoc(doc(db, 'project_applications', app.id), {
                    status: 'rejected' // set to rejected so they can re-apply if needed
                });
            }

            alert("Member removed successfully.");
        } catch (error) {
            console.error("Error removing member:", error);
            alert("Failed to remove member");
        }
    };

    const handleApproveProposal = async (projectId, requireRecruitment) => {
        try {
            await updateDoc(doc(db, 'ts_projects', projectId), {
                status: requireRecruitment ? 'recruiting' : 'in_progress'
            });
            alert('🎉 Project proposal approved successfully! It is now live.');
        } catch (error) {
            console.error("Error approving project proposal:", error);
            alert("Failed to approve project proposal.");
        }
    };

    const handleDeclineProposal = async (projectId) => {
        if (!window.confirm("Are you sure you want to decline and delete this project idea?")) return;
        try {
            await deleteDoc(doc(db, 'ts_projects', projectId));
            alert("Project idea declined and removed.");
        } catch (error) {
            console.error("Error declining project proposal:", error);
            alert("Failed to decline proposal.");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Projects...</div>;

    const pendingProposals = projects.filter(p => p.status === 'pending_approval');
    const activeProjects = projects.filter(p => p.status !== 'pending_approval');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Project Recruitment</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Post internal projects, match teams, and monitor progress.</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all"
                >
                    <Plus className="w-5 h-5" /> Post New Project
                </button>
            </div>

            {/* Pending Proposals Section */}
            {pendingProposals.length > 0 && (
                <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-200/60 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-lg font-black text-amber-800 uppercase tracking-tight flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-amber-600" /> Pending Student Proposals ({pendingProposals.length})
                        </h3>
                        <p className="text-xs text-amber-700/80 font-bold uppercase mt-0.5">Review, verify, and approve student-proposed project ideas</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {pendingProposals.map(proposal => (
                            <div key={proposal.id} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-md tracking-wider">
                                            {proposal.projectType} proposal
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                                            Proposed by: {proposal.proposedBy?.name || 'Student'}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{proposal.title}</h4>
                                    <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{proposal.description}</p>
                                    
                                    {proposal.projectType === 'team' && proposal.rolesRequired && proposal.rolesRequired.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Roles Required</p>
                                            <div className="flex flex-wrap gap-1">
                                                {proposal.rolesRequired.map((role, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">{role}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <button 
                                        onClick={() => handleApproveProposal(proposal.id, proposal.projectType === 'team')}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Check className="w-3.5 h-3.5" /> Approve & Go Live
                                    </button>
                                    <button 
                                        onClick={() => handleDeclineProposal(proposal.id)}
                                        className="py-2 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                {activeProjects.map(project => {
                    const projectApps = applications.filter(a => a.projectId === project.id);
                    const pendingApps = projectApps.filter(a => a.status === 'pending');
                    
                    return (
                        <div key={project.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${project.projectType === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {project.projectType}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> {(project.visibility || ['ALL']).join(', ')}
                                        </span>
                                        {project.inviteCode && (
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer" title="Invite Code" onClick={() => {navigator.clipboard.writeText(project.inviteCode); alert("Invite code copied!")}}>
                                                <Key className="w-3 h-3" /> {project.inviteCode}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase">{project.title}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{project.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <select 
                                        value={project.status}
                                        onChange={(e) => handleStatusChange(project.id, e.target.value)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none border ${
                                            project.status === 'recruiting' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                            project.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                                        }`}
                                    >
                                        <option value="recruiting">Recruiting</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                    <div className="flex gap-2 items-center">
                                        <button 
                                            onClick={() => setViewUpdatesModal(project)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all"
                                        >
                                            <Activity className="w-3.5 h-3.5" /> Updates
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteProject(project.id)}
                                            className="flex items-center justify-center p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-all"
                                            title="Delete Project"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Roles Required</p>
                                <div className="flex flex-wrap gap-2">
                                    {project.rolesRequired?.map((role, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold">{role}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Hired Members */}
                            {project.teamMembers && project.teamMembers.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Hired Members ({project.teamMembers.length})
                                    </h4>
                                    <div className="space-y-2 mb-4">
                                        {project.teamMembers.map((member, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-800">{member.name}</p>
                                                    <p className="text-[9px] font-bold text-emerald-600 uppercase">{member.role}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveMember(project.id, member, project)}
                                                    className="px-2 py-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 hover:border-red-200 rounded text-[9px] font-bold uppercase transition-all"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4 text-blue-600" /> Pending Applications ({pendingApps.length})
                                </h4>
                                
                                {pendingApps.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 font-medium italic">No pending applications.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {pendingApps.map(app => (
                                            <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{app.studentName}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{app.studentRoll} • Applied for: <span className="text-blue-600 font-bold">{app.roleAppliedFor}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-1">
                                                    <button onClick={() => handleHire(app, false)} className="flex-1 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all">Hire Member</button>
                                                    
                                                    {project.projectType === 'team' && (
                                                        <button onClick={() => handleHire(app, true)} className="flex-1 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all">Hire as Lead</button>
                                                    )}
                                                    
                                                    <button onClick={() => handleReject(app.id)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* View Updates Modal */}
            <AnimatePresence>
                {viewUpdatesModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewUpdatesModal(null)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2rem] w-full max-w-lg relative z-10 shadow-2xl">
                            <button onClick={() => setViewUpdatesModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-xl font-black text-slate-900 mb-1 uppercase">Project Updates</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">{viewUpdatesModal.title}</p>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {!viewUpdatesModal.updates || viewUpdatesModal.updates.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No updates posted yet.</p>
                                    </div>
                               ) : (
                                    viewUpdatesModal.updates.sort((a, b) => b.timestamp - a.timestamp).map((update, i) => (
                                        <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-black text-slate-800">{update.author}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {new Date(update.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap">{update.text}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Project Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                        
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg p-6 lg:p-8 shadow-2xl relative z-10 custom-scrollbar max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase">Post Project</h2>
                            <form onSubmit={handleCreateProject} className="space-y-5">
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Type</label>
                                        <div className="flex gap-2">
                                            <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 cursor-pointer transition-all ${newProject.projectType === 'individual' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                                                <input type="radio" className="hidden" checked={newProject.projectType === 'individual'} onChange={() => setNewProject({...newProject, projectType: 'individual'})} />
                                                <span className="text-[11px] font-black uppercase tracking-wider">Individual</span>
                                            </label>
                                            <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 cursor-pointer transition-all ${newProject.projectType === 'team' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                                                <input type="radio" className="hidden" checked={newProject.projectType === 'team'} onChange={() => setNewProject({...newProject, projectType: 'team'})} />
                                                <span className="text-[11px] font-black uppercase tracking-wider">Team</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Visibility (Years)</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {['ALL', '1', '2', '3', '4'].map(year => (
                                                <button
                                                    key={year}
                                                    type="button"
                                                    onClick={() => handleVisibilityToggle(year)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${newProject.visibility.includes(year) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    {year === 'ALL' ? 'All' : `Yr ${year}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Title</label>
                                    <input required value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium" placeholder="e.g. Smart Campus App" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                    <textarea required value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium h-24 resize-none" placeholder="Brief details about the project..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Student (Developer/Lead)</label>
                                    <select 
                                        value={selectedStudentUid} 
                                        onChange={e => setSelectedStudentUid(e.target.value)} 
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium bg-white"
                                    >
                                        <option value="">-- None / Select Student to Credit --</option>
                                        {usersList.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.fullName} ({u.department || 'No Dept'}) - {u.rollNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GitHub Repo Link (Optional)</label>
                                        <input value={newProject.githubUrl} onChange={e => setNewProject({...newProject, githubUrl: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-xs" placeholder="e.g. https://github.com/..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Live Deployed Link (Optional)</label>
                                        <input value={newProject.liveUrl} onChange={e => setNewProject({...newProject, liveUrl: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-xs" placeholder="e.g. https://my-app.vercel.app" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Roles Required (Comma separated)</label>
                                    <input required value={newProject.rolesRequired} onChange={e => setNewProject({...newProject, rolesRequired: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium" placeholder="e.g. Frontend Dev, UI/UX, Backend Dev" />
                                </div>
                                
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all uppercase tracking-widest mt-4">
                                    Post Project
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectRecruitmentTab;

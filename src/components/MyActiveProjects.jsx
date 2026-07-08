import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { Activity, Code2, ExternalLink, Send, CheckCircle, ShieldAlert, Key, Plus, X } from 'lucide-react';

const MyActiveProjects = ({ user }) => {
    const [activeProjects, setActiveProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [updateText, setUpdateText] = useState({}); // mapped by projectId
    const [links, setLinks] = useState({}); // mapped by projectId: { github, live }
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Proposal Modal State
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
    const [proposal, setProposal] = useState({
        title: '',
        description: '',
        projectType: 'individual',
        rolesRequired: '',
        githubUrl: '',
        liveUrl: ''
    });

    useEffect(() => {
        if (!user || !user.uid) return;

        // Fetch projects where the student is a member
        const qProjects = query(collection(db, 'ts_projects'), where('status', 'in', ['in_progress', 'recruiting']));
        const unsub = onSnapshot(qProjects, (snapshot) => {
            const allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const myProjects = allProjects.filter(p => 
                p.teamMembers && p.teamMembers.some(m => m.uid === user.uid)
            );
            
            setActiveProjects(myProjects);
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const handlePostUpdate = async (projectId) => {
        const text = updateText[projectId];
        if (!text || text.trim() === '') return;

        setIsSubmitting(true);
        try {
            const projectRef = doc(db, 'ts_projects', projectId);
            await updateDoc(projectRef, {
                updates: arrayUnion({
                    text: text.trim(),
                    author: user.fullName,
                    authorUid: user.uid,
                    timestamp: Date.now()
                })
            });
            setUpdateText(prev => ({ ...prev, [projectId]: '' }));
            alert('Update posted successfully!');
        } catch (error) {
            console.error("Error posting update:", error);
            alert("Failed to post update.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitLinks = async (projectId) => {
        const projectLinks = links[projectId];
        if (!projectLinks || (!projectLinks.github && !projectLinks.live)) {
            alert('Please provide at least one link.');
            return;
        }

        setIsSubmitting(true);
        try {
            const projectRef = doc(db, 'ts_projects', projectId);
            await updateDoc(projectRef, {
                githubUrl: projectLinks.github || '',
                liveUrl: projectLinks.live || '',
            });
            alert('Links submitted successfully! They will now appear on the public Projects Showcase.');
        } catch (error) {
            console.error("Error submitting links:", error);
            alert("Failed to submit links.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLinkChange = (projectId, field, value) => {
        setLinks(prev => ({
            ...prev,
            [projectId]: {
                ...prev[projectId],
                [field]: value
            }
        }));
    };

    const handleProposeProject = async (e) => {
        e.preventDefault();
        if (!proposal.title.trim() || !proposal.description.trim()) {
            alert("Please fill in Title and Description.");
            return;
        }

        setIsSubmitting(true);
        try {
            const roles = proposal.rolesRequired ? proposal.rolesRequired.split(',').map(r => r.trim()).filter(Boolean) : [];
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const projectData = {
                title: proposal.title.trim(),
                description: proposal.description.trim(),
                projectType: proposal.projectType,
                rolesRequired: roles,
                status: 'pending_approval',
                teamLead: user.uid,
                proposedBy: {
                    uid: user.uid,
                    name: user.fullName
                },
                teamMembers: [{
                    uid: user.uid,
                    name: user.fullName,
                    role: 'Team Lead',
                    rollNumber: user.rollNumber || ''
                }],
                updates: [],
                inviteCode: inviteCode,
                visibility: ['ALL'],
                githubUrl: proposal.githubUrl.trim(),
                liveUrl: proposal.liveUrl.trim(),
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'ts_projects'), projectData);
            setIsProposalModalOpen(false);
            setProposal({ title: '', description: '', projectType: 'individual', rolesRequired: '', githubUrl: '', liveUrl: '' });
            alert("🎉 Project idea submitted successfully! Once approved by the admin, it will go live.");
        } catch (error) {
            console.error("Error submitting project proposal:", error);
            alert("❌ Failed to submit proposal.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    My Workspace
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsProposalModalOpen(true)}
                        className="px-3.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1"
                    >
                        <Plus className="w-3.5 h-3.5" /> Propose Idea
                    </button>
                    {activeProjects.length > 0 && (
                        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl uppercase tracking-wider">
                            Active Projects
                        </div>
                    )}
                </div>
            </div>

            {activeProjects.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                    <Code2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-sm font-black text-slate-800 uppercase">No Active Projects</h3>
                    <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto mb-6">
                        You aren't a member of any active project team yet. Propose an innovative idea to get started!
                    </p>
                    <button
                        onClick={() => setIsProposalModalOpen(true)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-100 flex items-center gap-2 mx-auto"
                    >
                        <Plus className="w-4 h-4" /> Propose Project Idea
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {activeProjects.map(project => {
                        const isLead = project.teamLead === user.uid;
                        const myRole = project.teamMembers.find(m => m.uid === user.uid)?.role || 'Member';

                        return (
                            <div key={project.id} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col gap-6 relative overflow-hidden">
                                {/* Header */}
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {project.status.replace('_', ' ')}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-widest">
                                                My Role: {myRole}
                                            </span>
                                            {isLead && project.inviteCode && (
                                                <span 
                                                    className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:bg-indigo-100 transition-colors" 
                                                    title="Click to copy invite code" 
                                                    onClick={() => {navigator.clipboard.writeText(project.inviteCode); alert("Invite code copied!")}}
                                                >
                                                    <Key className="w-3 h-3" /> Code: {project.inviteCode}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 uppercase">{project.title}</h3>
                                    </div>
                                    {isLead && (
                                        <div className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                            <ShieldAlert className="w-3.5 h-3.5" /> Team Lead
                                        </div>
                                    )}
                                </div>

                                {/* Two Columns: Updates & Final Submission */}
                                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                                    
                                    {/* Post Status Update */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-blue-500" /> Post Progress Update
                                        </h4>
                                        <p className="text-[10px] text-slate-500">Keep admins informed about your progress, roadblocks, or milestones.</p>
                                        <div className="flex gap-2">
                                            <input 
                                                value={updateText[project.id] || ''}
                                                onChange={e => setUpdateText(prev => ({ ...prev, [project.id]: e.target.value }))}
                                                placeholder="e.g. Completed the UI design today..."
                                                className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                                            />
                                            <button 
                                                onClick={() => handlePostUpdate(project.id)}
                                                disabled={isSubmitting || !updateText[project.id]}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shrink-0"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Final Links (Only Team Leads or Individuals) */}
                                    {(isLead || project.projectType === 'individual') && (
                                        <div className="space-y-3 pl-0 md:pl-6 md:border-l border-slate-200">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Final Submission
                                            </h4>
                                            <p className="text-[10px] text-slate-500">Add your GitHub and Live URLs to feature this on the public showcase.</p>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Code2 className="w-4 h-4 text-slate-400" />
                                                    <input 
                                                        value={links[project.id]?.github ?? project.githubUrl ?? ''}
                                                        onChange={e => handleLinkChange(project.id, 'github', e.target.value)}
                                                        placeholder="GitHub Repo URL"
                                                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ExternalLink className="w-4 h-4 text-slate-400" />
                                                    <input 
                                                        value={links[project.id]?.live ?? project.liveUrl ?? ''}
                                                        onChange={e => handleLinkChange(project.id, 'live', e.target.value)}
                                                        placeholder="Live Demo URL"
                                                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => handleSubmitLinks(project.id)}
                                                    disabled={isSubmitting}
                                                    className="w-full mt-2 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-all"
                                                >
                                                    Update Links
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Proposal Modal */}
            {isProposalModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-widest">Propose Project Idea</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Submit your vision for review by TechSpark admin</p>
                            </div>
                            <button 
                                onClick={() => setIsProposalModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleProposeProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Title</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. Smart Campus Navigation App"
                                    value={proposal.title}
                                    onChange={e => setProposal(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Description & Goal</label>
                                <textarea 
                                    required
                                    rows="4"
                                    placeholder="Explain the problem statement, solution details, and target tech stack..."
                                    value={proposal.description}
                                    onChange={e => setProposal(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GitHub Repo Link (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. https://github.com/..."
                                        value={proposal.githubUrl}
                                        onChange={e => setProposal(prev => ({ ...prev, githubUrl: e.target.value }))}
                                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Deployed Link (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. https://my-app.vercel.app"
                                        value={proposal.liveUrl}
                                        onChange={e => setProposal(prev => ({ ...prev, liveUrl: e.target.value }))}
                                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Type</label>
                                    <select 
                                        value={proposal.projectType}
                                        onChange={e => setProposal(prev => ({ ...prev, projectType: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold outline-none bg-white focus:border-blue-500"
                                    >
                                        <option value="individual">Individual</option>
                                        <option value="team">Team (Requires Recruitment)</option>
                                    </select>
                                </div>
                                {proposal.projectType === 'team' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Roles Needed</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Frontend, Backend, UI Designer"
                                            value={proposal.rolesRequired}
                                            onChange={e => setProposal(prev => ({ ...prev, rolesRequired: e.target.value }))}
                                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                                <button 
                                    type="button"
                                    onClick={() => setIsProposalModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyActiveProjects;

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Activity, Code2, ExternalLink, Send, CheckCircle, ShieldAlert, Key } from 'lucide-react';

const MyActiveProjects = ({ user }) => {
    const [activeProjects, setActiveProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [updateText, setUpdateText] = useState({}); // mapped by projectId
    const [links, setLinks] = useState({}); // mapped by projectId: { github, live }
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!user || !user.uid) return;

        // Fetch projects where the student is a member. Firestore array-contains doesn't work easily on arrays of objects,
        // so we fetch all 'in_progress' and 'recruiting' projects and filter client-side.
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

    if (loading) return null;
    if (activeProjects.length === 0) return null;

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    My Workspace
                </h2>
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Active Projects
                </div>
            </div>

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
        </div>
    );
};

export default MyActiveProjects;

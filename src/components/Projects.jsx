import { useState, useEffect } from 'react';
import { Users, ExternalLink, Heart, Star, Code2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
    const { isAuthenticated, openAuthModal } = useAuth();
    const [projects, setProjects] = useState([]);
    const [projectLikes, setProjectLikes] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const qProjects = query(collection(db, 'ts_projects'), where('status', 'in', ['in_progress', 'completed']));
        
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(fetchedProjects);
            setLoading(false);

            // Setup listeners for likes dynamically based on fetched projects
            const unsubLikes = fetchedProjects.map(project => {
                const docRef = doc(db, 'project_stats', project.id);
                return onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setProjectLikes(prev => ({ ...prev, [project.id]: docSnap.data().likes || 0 }));
                    } else {
                        // Initialize if doesn't exist
                        setDoc(docRef, { likes: 0 }, { merge: true });
                    }
                });
            });

            // Cleanup likes listeners on project change
            return () => unsubLikes.forEach(unsub => unsub());
        });

        return () => unsubProjects();
    }, []);

    const handleLike = async (projectId) => {
        if (!isAuthenticated) {
            openAuthModal();
            return;
        }

        const docRef = doc(db, 'project_stats', projectId);
        try {
            await updateDoc(docRef, {
                likes: increment(1)
            });
        } catch (error) {
            console.error("Error updating likes:", error);
        }
    };

    const getStatusClasses = (status) => {
        if (status === 'completed') return 'bg-emerald-100/80 text-emerald-700';
        if (status === 'in_progress') return 'bg-blue-100/80 text-blue-700';
        return 'bg-slate-100/80 text-slate-700';
    };

    return (
        <section id="projects" className="section bg-slate-50 relative overflow-hidden">
            {/* Background Blob */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 blur-[120px] rounded-full -mr-64 -mt-64" />

            <div className="container-custom relative z-10">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900 tracking-tight uppercase italic">
                            Innovation <span className="text-blue-600">Hub</span>
                        </h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                            Explore cutting-edge solutions built by TechSpark Core Team.
                        </p>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center p-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <Code2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">No Projects Yet</h3>
                        <p className="text-slate-500 mt-2">Our team is brewing some fresh ideas!</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {projects.map((project, index) => {
                            const isFeatured = index === 0; // Highlight the first project
                            
                            return (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`${isFeatured ? 'md:col-span-2 lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-white'} 
                                        p-8 lg:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative group overflow-hidden flex flex-col`}
                                >
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />

                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getStatusClasses(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                        <div className="flex gap-2">
                                            {project.githubUrl && (
                                                <a href={project.githubUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-all"><Code2 className="w-4 h-4" /></a>
                                            )}
                                            {project.liveUrl && (
                                                <a href={project.liveUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center hover:bg-blue-600 hover:text-white text-blue-600 transition-all"><ExternalLink className="w-4 h-4" /></a>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className={`${isFeatured ? 'text-3xl lg:text-4xl' : 'text-2xl'} font-black mb-3 text-slate-900 uppercase tracking-tight relative z-10`}>
                                        {project.title}
                                    </h3>

                                    <p className={`text-slate-600 mb-6 font-medium relative z-10 ${isFeatured ? 'max-w-2xl text-lg' : 'text-sm'}`}>
                                        {project.description}
                                    </p>

                                    {/* Team Details */}
                                    <div className="mt-auto relative z-10 space-y-4">
                                        <div className="bg-white/60 p-4 rounded-2xl border border-white/40">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Team</h4>
                                            
                                            {/* Team Lead */}
                                            {project.teamMembers?.filter(m => m.uid === project.teamLead).map((lead, i) => (
                                                <div key={`lead-${i}`} className="flex items-center gap-2 mb-2">
                                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                    <span className="text-xs font-bold text-slate-800">
                                                        {lead.name} <span className="text-[10px] text-slate-400 font-medium">({lead.department || lead.dept || 'N/A'})</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-200/50 px-2 py-0.5 rounded-md">Lead</span>
                                                </div>
                                            ))}
                                            
                                            {/* Members */}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {project.teamMembers?.filter(m => m.uid !== project.teamLead).map((member, i) => (
                                                    <div key={`member-${i}`} className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                                                        <Users className="w-3 h-3 text-blue-500" />
                                                        <span className="text-[11px] font-bold text-slate-700">
                                                            {member.name} <span className="text-[9px] text-slate-400 font-medium">({member.department || member.dept || 'N/A'})</span>
                                                        </span>
                                                    </div>
                                                ))}
                                                {(!project.teamMembers || project.teamMembers.length === 0) && (
                                                    <span className="text-xs text-slate-400 italic font-medium">Recruiting team...</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                onClick={() => handleLike(project.id)}
                                                className="flex items-center gap-2 group/like active:scale-90 transition-all bg-white shadow-sm border border-slate-100 px-4 py-2 rounded-xl hover:border-pink-200"
                                            >
                                                <div className="w-6 h-6 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500 group-hover/like:bg-pink-500 group-hover/like:text-white transition-all">
                                                    <Heart className={`w-3.5 h-3.5 ${projectLikes[project.id] > 0 ? 'fill-current' : ''}`} />
                                                </div>
                                                <span className="text-xs font-black text-slate-500 group-hover/like:text-pink-600">
                                                    {projectLikes[project.id] || 0}
                                                </span>
                                            </button>

                                            {project.liveUrl && (
                                                <a
                                                    href={project.liveUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-100"
                                                >
                                                    Live Demo <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Projects;

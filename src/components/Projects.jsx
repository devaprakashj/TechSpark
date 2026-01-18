import { useState, useEffect } from 'react';
import { Users, ExternalLink, Heart, MessageSquare, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
    const { isAuthenticated, openAuthModal } = useAuth();
    const [projectLikes, setProjectLikes] = useState({});

    const projects = [
        {
            id: 'smart-campus',
            title: 'Smart Campus App',
            emoji: '🚀',
            description: 'Comprehensive mobile application for campus navigation, event management, and student services integration',
            team: 'Team Alpha',
            status: 'Ongoing',
            statusColor: 'yellow',
            featured: true,
            bgGradient: 'from-blue-50 to-cyan-50',
        },
        {
            id: 'ai-study-buddy',
            title: 'AI Study Buddy',
            emoji: '🤖',
            description: 'ML-powered personalized learning assistant that adapts to individual study patterns',
            team: 'Team Beta',
            status: 'Completed',
            statusColor: 'green',
            featured: false,
            bgGradient: 'white',
        },
        {
            id: 'eco-track',
            title: 'EcoTrack',
            emoji: '🌱',
            description: 'Carbon footprint tracker and sustainability recommendation engine',
            team: 'Team Gamma',
            status: 'Ongoing',
            statusColor: 'yellow',
            featured: false,
            bgGradient: 'white',
        },
        {
            id: 'code-collab',
            title: 'CodeCollab',
            emoji: '💻',
            description: 'Real-time collaborative coding platform with integrated version control',
            team: 'Team Delta',
            status: 'Planning',
            statusColor: 'blue',
            featured: false,
            bgGradient: 'white',
        },
        {
            id: 'health-hub',
            title: 'HealthHub',
            emoji: '❤️',
            description: 'Student wellness dashboard tracking mental health, fitness, fitness, and nutrition',
            team: 'Team Epsilon',
            status: 'Completed',
            statusColor: 'green',
            featured: false,
            bgGradient: 'from-purple-50 to-pink-50',
        },
    ];

    useEffect(() => {
        const unsubscribes = projects.map(project => {
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

        return () => unsubscribes.forEach(unsub => unsub());
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

    const getStatusClasses = (color) => {
        const classes = {
            yellow: 'bg-yellow-100/80 text-yellow-700',
            green: 'bg-green-100/80 text-green-700',
            blue: 'bg-blue-100/80 text-blue-700',
        };
        return classes[color] || classes.blue;
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
                            Explore cutting-edge solutions built by TechSpark members. Support your favorites!
                        </p>
                    </motion.div>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-3 gap-8">
                    {projects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`${project.featured ? 'md:col-span-2' : ''} ${project.bgGradient === 'white' ? 'bg-white' : `bg-gradient-to-br ${project.bgGradient}`
                                } p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative group overflow-hidden`}
                        >
                            {/* Decorative Grid Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />

                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`${project.featured ? 'text-7xl' : 'text-5xl'} transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
                                        {project.emoji}
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getStatusClasses(project.statusColor)}`}>
                                        {project.status}
                                    </span>
                                </div>

                                <h3 className={`${project.featured ? 'text-3xl lg:text-4xl' : 'text-2xl'} font-black mb-4 text-slate-900 uppercase italic tracking-tight`}>
                                    {project.title}
                                </h3>

                                <p className={`text-slate-600 mb-8 leading-relaxed font-medium ${project.featured ? 'max-w-2xl text-lg' : 'text-sm'}`}>
                                    {project.description}
                                </p>

                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-500">
                                            <Users className="w-3.5 h-3.5" />
                                            {project.team}
                                        </div>

                                        <button
                                            onClick={() => handleLike(project.id)}
                                            className="flex items-center gap-2 group/like active:scale-90 transition-all"
                                        >
                                            <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center text-pink-500 group-hover/like:bg-pink-500 group-hover/like:text-white transition-all">
                                                <Heart className={`w-4 h-4 ${projectLikes[project.id] > 0 ? 'fill-current' : ''}`} />
                                            </div>
                                            <span className="text-xs font-black text-slate-400 group-hover/like:text-pink-500">
                                                {projectLikes[project.id] || 0}
                                            </span>
                                        </button>
                                    </div>

                                    <button className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 hover:bg-blue-600">
                                        <ExternalLink className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* CTA - Premium Style */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="mt-20 bg-gradient-to-r from-slate-900 to-slate-800 p-12 lg:p-16 rounded-[3rem] text-center relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] -ml-32 -mb-32" />

                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-md">
                            <Lightbulb className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-3xl lg:text-4xl font-black text-white uppercase italic">
                            Ignite Your <span className="text-blue-400">Concept</span>
                        </h3>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            Have a disruptive idea? TechSpark provides the tactical mentorship, community support, and resources to build the future.
                        </p>
                        <div className="pt-8">
                            <button
                                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95"
                            >
                                Start Incubation
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Projects;

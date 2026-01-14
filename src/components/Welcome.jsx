import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, ShieldCheck, Zap, ArrowRight, Star } from 'lucide-react';

const Welcome = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Auto redirect to dashboard after 5 seconds if they don't click
        const timer = setTimeout(() => {
            navigate('/dashboard');
        }, 5000);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />

            <div className="max-w-4xl w-full relative z-10">
                <div className="flex flex-col items-center text-center">
                    {/* Animated Icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-10"
                    >
                        <ShieldCheck className="w-12 h-12 text-white" />
                    </motion.div>

                    {/* Heading Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4 mb-12"
                    >
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic">
                            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">TechSpark</span>
                        </h1>
                        <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">
                            Greetings, <span className="text-white font-bold">{user?.fullName || 'Innovator'}</span>. Your tactical clearance has been granted. Get ready to innovate, create, and impact.
                        </p>
                    </motion.div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
                        {[
                            { icon: <Zap className="w-6 h-6" />, title: "Real-time Ops", desc: "Live event tracking and instant notifications." },
                            { icon: <Star className="w-6 h-6" />, title: "Badge System", desc: "Earn exclusive tactical badges for your profile." },
                            { icon: <Rocket className="w-6 h-6" />, title: "Flash Missions", desc: "Join workshops and projects to level up." }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + (i * 0.1) }}
                                className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-sm hover:bg-white/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    {feature.icon}
                                </div>
                                <h3 className="text-white font-black uppercase italic tracking-tight mb-2 text-left">{feature.title}</h3>
                                <p className="text-slate-400 text-sm font-medium text-left leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Action Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all flex items-center gap-4 group"
                        >
                            Enter Control Center
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="mt-6 text-[10px] text-slate-500 font-black uppercase tracking-widest animate-pulse">
                            Auto-redirecting to dashboard...
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;

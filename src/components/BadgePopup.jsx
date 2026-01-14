import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle, Sparkles, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import tsLogo from '../assets/techspark-logo.png';
import ritLogo from '../assets/rit-logo.png';

const BadgePopup = ({ isOpen, onClose, userName }) => {
    const [phase, setPhase] = useState('entering');

    useEffect(() => {
        if (isOpen) {
            setPhase('entering');
            const timer = setTimeout(() => setPhase('celebrating'), 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                    className="relative bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 max-w-sm w-full text-center overflow-hidden border-4 border-blue-600/20"
                >
                    {/* Confetti Animation Elements */}
                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0, 1, 0.5],
                                x: [0, (i % 2 === 0 ? 1 : -1) * (50 + Math.random() * 100)],
                                y: [0, -(50 + Math.random() * 100)],
                            }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                            className="absolute left-1/2 top-1/2"
                        >
                            <Sparkles className={`w-4 h-4 ${i % 3 === 0 ? 'text-blue-500' : i % 3 === 1 ? 'text-yellow-500' : 'text-purple-500'}`} />
                        </motion.div>
                    ))}

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>

                    {/* The Badge */}
                    <motion.div
                        initial={{ rotateY: 0, scaleX: 1 }}
                        animate={{
                            y: [0, -10, 0],
                            rotateY: 0,
                            scaleX: 1
                        }}
                        transition={{
                            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="relative mx-auto w-48 h-48 mb-6"
                    >
                        {/* Outer Glow */}
                        <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />

                        {/* Badge Body */}
                        <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-full border-8 border-white shadow-2xl flex items-center justify-center overflow-hidden p-6">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                            <img
                                src={tsLogo}
                                alt="TechSpark"
                                className="w-32 h-32 object-contain relative z-10 brightness-200 invert"
                            />
                        </div>

                        {/* Banner Under Badge */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-blue-900 px-4 py-1 rounded-full font-black text-xs shadow-lg uppercase tracking-widest whitespace-nowrap border-2 border-white"
                        >
                            Official Member
                        </motion.div>
                    </motion.div>

                    <div className="relative z-10">
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-2xl font-black text-slate-900 mb-2 uppercase"
                        >
                            Congratulations!
                        </motion.h2>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="text-slate-500 text-sm mb-6 px-4"
                        >
                            Welcome <span className="text-blue-600 font-bold">{userName?.split(' ')[0]}</span>, you are now a verified member of the <span className="font-bold">TechSpark RIT</span> community!
                        </motion.p>

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            onClick={onClose}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-slate-200 uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={18} />
                            Get Started
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BadgePopup;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Monitor } from 'lucide-react';
import ritLogo from '../assets/rit-logo.png';
import techsparkLogo from '../assets/techspark-logo.png';

const ChallengeIntro = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const challenge = location.state?.challenge || null;

    const [isMobile, setIsMobile] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        // Strict desktop check
        const checkDevice = () => {
            const width = window.innerWidth;
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileDevice = /mobile|android|iphone|ipad|tablet/i.test(userAgent) || width < 1024;
            setIsMobile(isMobileDevice);
        };
        
        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    if (!challenge) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <p>Invalid Challenge Link. Please return to the dashboard.</p>
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <Monitor className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Desktop Required</h1>
                <p className="text-slate-400 font-medium">
                    This highly secure coding assessment cannot be taken on a mobile device or tablet. 
                    Please switch to a Desktop or Laptop to proceed.
                </p>
                <button onClick={() => navigate('/')} className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            {showSplash ? (
                <div 
                    key="splash"
                    className="h-screen w-screen overflow-hidden bg-white flex flex-col items-center justify-center p-2 relative"
                >
                    {/* Background decorations */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-green-500 to-emerald-600"></div>

                    <div className="flex flex-row items-center justify-center gap-6 md:gap-12 mb-4 w-full max-w-5xl mx-auto px-4 mt-2">
                        <img 
                            src={ritLogo} alt="RIT" className="h-8 md:h-12 object-contain" 
                        />
                        <img 
                            src={techsparkLogo} alt="TechSpark" className="h-8 md:h-12 object-contain" 
                        />
                        <img 
                            src="/gfg-logo.png" alt="GeeksForGeeks" className="h-10 md:h-16 object-contain scale-[1.35]" 
                        />
                    </div>
                    
                    <div className="text-center max-w-4xl px-2 flex flex-col items-center">
                        <h1 className="text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">
                            Welcome to the TechSpark Weekly Coding Challenge
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600 font-semibold mb-3">
                            Sharpen your coding skills, solve real-world programming problems, and compete with the best minds at Rajalakshmi Institute of Technology.
                        </p>
                        
                        <div className="text-left bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200 mb-3 w-full shadow-sm text-xs md:text-sm">
                            <p className="text-slate-700 leading-snug mb-2">
                                The <b>TechSpark Club</b>, in collaboration with <b>GeeksforGeeks</b>, proudly presents the Weekly Coding Challenge—a Saturday coding contest designed to help students strengthen their problem-solving abilities, improve algorithmic thinking, and prepare for coding interviews and placement assessments.
                            </p>
                            <p className="text-slate-700 leading-snug mb-3">
                                Every challenge is carefully curated with industry-relevant problems covering Data Structures, Algorithms, Competitive Programming, and Logical Reasoning.
                            </p>
                            
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="md:w-1/3">
                                    <h3 className="font-bold text-slate-900 text-sm md:text-sm mb-1.5 flex items-center gap-1">
                                        <span>📅</span> Contest Schedule
                                    </h3>
                                    <p className="text-slate-700 bg-blue-100/50 text-blue-700 px-3 py-1 rounded-md inline-block font-bold">
                                        Every Saturday
                                    </p>
                                </div>
                                
                                <div className="md:w-2/3">
                                    <h3 className="font-bold text-slate-900 text-sm md:text-sm mb-1.5 flex items-center gap-1">
                                        <span>🎯</span> Why Participate?
                                    </h3>
                                    <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                                        <li>Improve your coding and problem-solving skills.</li>
                                        <li>Practice placement-oriented programming questions.</li>
                                        <li>Compete with students across all departments.</li>
                                        <li>Earn certificates, badges, and leaderboard recognition.</li>
                                        <li>Build consistency through weekly coding practice.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs md:text-sm font-black text-blue-600 uppercase tracking-widest mb-3 text-center">
                            🏆 Challenge Yourself. Learn Every Week. Grow Every Contest.
                        </p>
                        
                        <button 
                            onClick={() => setShowSplash(false)}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-widest transition-all shadow-md shadow-blue-900/20 text-xs md:text-sm"
                        >
                            Next Step &rarr;
                        </button>
                    </div>
                </div>
            ) : (
                <div 
                    key="rules"
                    className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-2 md:p-4 relative overflow-hidden"
                >
                    <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-3xl w-full max-w-4xl z-10 shadow-2xl flex flex-col max-h-[95vh]">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
                            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">Assessment Rules</h2>
                        </div>
                        
                        <div className="space-y-3 mb-4 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-red-900/30">
                                <h3 className="text-red-400 font-bold uppercase text-xs md:text-sm mb-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> 
                                    1. Strict Environment Lock
                                </h3>
                                <p className="text-slate-300 text-xs md:text-sm leading-snug">
                                    You must remain in fullscreen mode. Exiting fullscreen, minimizing the browser, or switching tabs will immediately lock the screen and issue a warning. <b>3 warnings will result in automatic submission.</b>
                                </p>
                            </div>
                            
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-orange-900/30">
                                <h3 className="text-orange-400 font-bold uppercase text-xs md:text-sm mb-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> 
                                    2. Clipboard & Shortcut Protection
                                </h3>
                                <p className="text-slate-300 text-xs md:text-sm leading-snug">
                                    Copy, Paste, Right-Click, PrintScreen (Screenshots), and Developer Tools are completely disabled. Attempting to use any of these will instantly trigger a violation warning.
                                </p>
                            </div>
                            
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-blue-900/30">
                                <h3 className="text-blue-400 font-bold uppercase text-xs md:text-sm mb-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> 
                                    3. AI Monitoring & Logging
                                </h3>
                                <p className="text-slate-300 text-xs md:text-sm leading-snug">
                                    An AI proctoring system continuously monitors your session. All window blurs, keystroke anomalies, and malpractices are logged. Suspicious behavior will lead to <b>instant disqualification</b>.
                                </p>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <label className="flex items-center gap-3 cursor-pointer p-3 md:p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-600 transition-all mb-4">
                                <input type="checkbox" className="w-4 h-4 md:w-5 md:h-5 accent-blue-600" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                                <span className="text-xs md:text-sm text-slate-300 font-medium">
                                    I agree to adhere to the strict assessment rules. I understand that any violation may result in disqualification.
                                </span>
                            </label>

                            <button 
                                disabled={!agreed}
                                onClick={() => navigate('/secure-editor', { state: { challenge } })}
                                className={`w-full py-3 md:py-4 rounded-xl font-black uppercase tracking-widest transition-all text-sm md:text-base ${agreed ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/50' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                            >
                                Enter Secure Environment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ChallengeIntro;

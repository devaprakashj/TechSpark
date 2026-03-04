import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Mail, Clock, Lock, Sparkles, ShieldCheck } from 'lucide-react';
import { isMessagesReleased, timeToRelease, isFeatureActive, WD_RELEASE_TIME } from '../../utils/wdUtils';
import { useState, useEffect } from 'react';

function CountdownTile({ value, label }) {
    return (
        <div className="flex flex-col items-center px-3 py-2 rounded-xl"
            style={{ background: 'rgba(236,72,153,0.08)' }}>
            <span className="text-2xl font-black text-pink-600 leading-none">{String(value).padStart(2, '0')}</span>
            <span className="text-[9px] font-bold text-pink-400 uppercase tracking-widest mt-0.5">{label}</span>
        </div>
    );
}

export default function WomensDayInbox({ participation, inbox, released }) {
    const [remaining, setRemaining] = useState(timeToRelease());

    useEffect(() => {
        if (released) return;
        const t = setInterval(() => setRemaining(timeToRelease()), 1000);
        return () => clearInterval(t);
    }, [released]);

    if (!isFeatureActive()) return null;
    if (!participation?.optedIn) return null;

    // ── Not yet released ──────────────────────────────────────────────────────
    if (!released) {
        return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden shadow-md"
                style={{ background: 'linear-gradient(135deg,#fff0f8,#f3e8ff)', border: '1px solid #e8c8f4' }}>

                <div className="px-5 py-3 flex items-center gap-2"
                    style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                    <Lock className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-xs uppercase tracking-widest">Your Women's Day Messages</span>
                </div>

                <div className="p-5 text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ background: 'linear-gradient(135deg,#fce7f3,#f3e8ff)' }}>
                        <Heart className="w-6 h-6 text-pink-500" />
                    </div>
                    <p className="font-black text-sm text-gray-700 mb-1">Messages unlock on March 8! 🌸</p>
                    <p className="text-xs text-gray-500 mb-4">
                        Members have sent you messages. Our <strong>Spark Official System</strong> is currently processing and verifying them for the big reveal.
                        They'll be revealed at <strong>9:00 AM on March 8, 2026.</strong>
                    </p>

                    {/* Countdown */}
                    {remaining && (
                        <div className="flex items-center justify-center gap-2">
                            <CountdownTile value={remaining.days} label="Days" />
                            <span className="text-pink-300 font-black text-xl">:</span>
                            <CountdownTile value={remaining.hours} label="Hours" />
                            <span className="text-pink-300 font-black text-xl">:</span>
                            <CountdownTile value={remaining.mins} label="Mins" />
                            <span className="text-pink-300 font-black text-xl">:</span>
                            <CountdownTile value={remaining.secs} label="Secs" />
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // ── Released ──────────────────────────────────────────────────────────────
    const visibleMessages = inbox.filter(m => {
        const isPastRelease = new Date(m.releaseAt?.toDate?.() || m.releaseAt) <= new Date();
        return m.status === 'approved' && (released || isPastRelease);
    });

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden shadow-md"
            style={{ background: '#fff', border: '1px solid #f0d0e8' }}>

            <div className="px-5 py-3 flex items-center gap-2"
                style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                <Mail className="w-4 h-4 text-white" />
                <span className="text-white font-black text-xs uppercase tracking-widest">
                    Your Women's Day Messages
                </span>
                {visibleMessages.length > 0 && (
                    <span className="ml-auto bg-white text-pink-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {visibleMessages.length}
                    </span>
                )}
            </div>

            <div className="p-5">
                {visibleMessages.length === 0 ? (
                    <div className="text-center py-6">
                        <Sparkles className="w-10 h-10 text-pink-200 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-600">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Messages appear here once vetted by Spark Official System.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-3 p-3 rounded-xl text-center"
                            style={{ background: 'linear-gradient(135deg,#fff0f8,#f3e8ff)' }}>
                            <p className="text-sm font-black text-pink-700">
                                Appreciation — meant for you
                            </p>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {visibleMessages.map((msg, idx) => (
                                    <motion.div key={msg.id}
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.08 }}
                                        className="p-4 rounded-xl relative overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(135deg,#fdf0fb 0%,#f8f0ff 100%)',
                                            border: '1px solid rgba(236,72,153,0.15)',
                                        }}>
                                        {/* decorative */}
                                        <div className="absolute top-2 right-3 text-2xl opacity-20">💐</div>

                                        <p className="text-sm text-gray-700 leading-relaxed">"{msg.sanitizedText || msg.messageText}"</p>

                                        <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-pink-100/50">
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <ShieldCheck className="w-2.5 h-2.5 text-pink-500" />
                                                <span className="text-[8px] font-black text-pink-600 uppercase tracking-widest">
                                                    Spark Official <span className="text-[7px] bg-pink-100 px-1 rounded ml-1">SECURE</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5 text-gray-300" />
                                                <span className="text-[8px] text-gray-400">
                                                    March 8, 2026 · Women's Day 💜
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
}

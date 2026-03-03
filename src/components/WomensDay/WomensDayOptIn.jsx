import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Check, X, AlertCircle, Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { isOptInWindowOpen, isFeatureActive } from '../../utils/wdUtils';

export default function WomensDayOptIn({ user, participation, onOptIn, onOptOut, loading }) {
    const [confirming, setConfirming] = useState(false);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState('');

    const optedIn = participation?.optedIn === true;
    const windowOpen = isOptInWindowOpen();
    const active = isFeatureActive();

    if (!active) return null;

    const handleOptIn = async () => {
        setWorking(true); setError('');
        try { await onOptIn(); setConfirming(false); }
        catch (e) { setError(e.message); }
        finally { setWorking(false); }
    };

    const handleOptOut = async () => {
        setWorking(true); setError('');
        try { await onOptOut(); }
        catch (e) { setError(e.message); }
        finally { setWorking(false); }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{
                background: 'linear-gradient(135deg,#fff0f8 0%,#fce7f3 50%,#f3e8ff 100%)',
                border: '1px solid rgba(236,72,153,0.20)',
            }}
        >
            {/* Header */}
            <div className="px-5 py-3 flex items-center gap-2"
                style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                <Heart className="w-4 h-4 text-white fill-white" />
                <span className="text-white font-black text-xs uppercase tracking-widest">
                    Women's Day 2026 — Message Feature
                </span>
            </div>

            <div className="p-5">
                {optedIn ? (
                    /* ── OPTED IN state ── */
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                                <Check className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-gray-800">You're participating! 💐</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    TechSpark members can send you Women's Day messages.
                                    Messages release <strong>March 8 at 9 AM.</strong>
                                </p>
                                {/* Privacy note */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {[
                                        { icon: Eye, label: 'Name & Dept visible', ok: true },
                                        { icon: EyeOff, label: 'Email hidden', ok: false },
                                        { icon: EyeOff, label: 'Phone hidden', ok: false },
                                    ].map(({ icon: Icon, label, ok }) => (
                                        <span key={label} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            <Icon className="w-2.5 h-2.5" />{label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {windowOpen && (
                            <button onClick={handleOptOut} disabled={working}
                                className="flex-shrink-0 text-[10px] font-black uppercase text-pink-400 hover:text-red-500 transition-colors">
                                {working ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Opt out'}
                            </button>
                        )}
                    </div>
                ) : windowOpen ? (
                    /* ── OPT-IN form ── */
                    <div>
                        <p className="text-sm font-bold text-gray-800 mb-1">
                            Want to receive Women's Day messages from TechSpark members?
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                            Only your <strong>name & department</strong> will be visible to senders. Email and phone are never shared.
                        </p>

                        {!confirming ? (
                            <button
                                onClick={() => setConfirming(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-95"
                                style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                                <Heart className="w-3.5 h-3.5 fill-white" />
                                Yes, I want to participate
                            </button>
                        ) : (
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-xl border border-pink-200 bg-pink-50/60">
                                    <div className="flex gap-2 mb-2">
                                        <Shield className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-gray-700">
                                            By confirming, your <strong>name</strong> and <strong>department</strong> will be shown to senders.
                                            This flag auto-deactivates on <strong>March 9.</strong>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleOptIn} disabled={working}
                                            className="flex-1 py-2 rounded-lg text-xs font-black uppercase text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                            style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                                            {working ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            Confirm
                                        </button>
                                        <button onClick={() => setConfirming(false)} disabled={working}
                                            className="px-3 py-2 rounded-lg text-xs font-black uppercase text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-all">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                ) : (
                    /* ── Window closed ── */
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <AlertCircle className="w-4 h-4 text-pink-400" />
                        The opt-in window (March 5–6) has closed. Messages release March 8 at 9 AM.
                    </div>
                )}

                {error && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{error}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

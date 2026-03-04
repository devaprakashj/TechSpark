import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Send, CheckCircle, AlertCircle,
    Loader2, Lock, User, Building, Calendar, X, Info, Sparkles,
    ShieldCheck, AlertTriangle
} from 'lucide-react';
import { isSendWindowOpen, isFeatureActive, filterMessage } from '../../utils/wdUtils';

const MAX_CHARS = 200;

export default function WomensDayMessage({ user, sentMessages = [], sentCount, maxMessages, validateReceiver, sendMessage }) {

    const [regInput, setRegInput] = useState('');
    const [receiver, setReceiver] = useState(null);   // validated receiver info
    const [msgText, setMsgText] = useState('');
    const [step, setStep] = useState('search'); // search | compose | done
    const [error, setError] = useState('');
    const [searching, setSearching] = useState(false);
    const [sending, setSending] = useState(false);
    const [lastResult, setLastResult] = useState(null);   // { status: 'pending'|'flagged' }
    const [liveSafetyInfo, setLiveSafetyInfo] = useState({ isClean: true, flaggedWords: [] });

    const canSend = isSendWindowOpen() && isFeatureActive();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!regInput.trim()) return;
        setSearching(true); setError(''); setReceiver(null);
        const result = await validateReceiver(regInput.trim().toUpperCase());
        setSearching(false);
        if (result.valid) {
            setReceiver(result.receiver);
            setStep('compose');
        } else {
            setError(result.reason);
        }
    };

    const handleSend = async () => {
        if (!msgText.trim() || !receiver) return;

        // Final safety check before dispatch
        const safety = filterMessage(msgText);
        if (!safety.isClean) {
            setError(`Safety Block: This message contains restricted terms (${safety.flaggedWords.join(', ')}). Please revise.`);
            return;
        }

        setSending(true); setError('');
        const result = await sendMessage(receiver, msgText.trim());
        setSending(false);
        if (result.success) {
            setLastResult(result);
            setStep('done');
            setMsgText(''); setRegInput(''); setReceiver(null);
        } else {
            setError(result.reason);
        }
    };

    const reset = () => { setStep('search'); setError(''); setReceiver(null); setMsgText(''); setRegInput(''); };

    if (!isFeatureActive()) return null;

    if (!canSend && step === 'search') {
        return (
            <div className="rounded-2xl p-5 text-center"
                style={{ background: '#fff8fe', border: '1px solid #f9c8e8' }}>
                <p className="text-sm font-bold text-gray-600">
                    Message sending opens March 5 and closes March 7 at midnight.
                </p>
            </div>
        );
    }

    if (sentCount >= maxMessages && step === 'search') {
        return (
            <div className="rounded-2xl p-5"
                style={{ background: '#fff8fe', border: '1px solid #f9c8e8' }}>
                <div className="flex gap-3 items-start">
                    <Lock className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-black text-sm text-gray-700">Message limit reached ({maxMessages}/{maxMessages})</p>
                        <p className="text-xs text-gray-500 mt-0.5">You've used all your messages for Women's Day.</p>
                        <div className="mt-2 space-y-1">
                            {sentMessages.map(m => (
                                <div key={m.id} className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    To: {m.receiverRegNo} —
                                    <span className={`font-bold ${m.status === 'approved' ? 'text-green-600' : m.status === 'rejected' ? 'text-red-500' : m.status === 'flagged' ? 'text-amber-600' : 'text-blue-500'}`}>
                                        {m.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden shadow-md"
            style={{ background: '#fff', border: '1px solid #f0d0e8' }}>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between"
                style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-xs uppercase tracking-widest">
                        Send a Women's Day Message
                    </span>
                </div>
                <span className="text-pink-200 text-[10px] font-bold">
                    {sentCount}/{maxMessages} sent
                </span>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5 px-5 pt-3 pb-1">
                {['search', 'compose', 'done'].map((s, i) => (
                    <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: ['search', 'compose', 'done'].indexOf(step) >= i ? 'linear-gradient(90deg,#ec4899,#a855f7)' : '#f0e0f0' }} />
                ))}
            </div>

            <div className="p-5">
                <AnimatePresence mode="wait">
                    {/* ── STEP 1: Search ── */}
                    {step === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                            <p className="text-xs text-gray-500 mb-3 text-left">
                                This feature allows you to send Women's Day messages to your <strong>female peers</strong> who have opted in. 🌸
                            </p>
                            <p className="text-xs text-gray-500 mb-4 text-left">
                                Enter the receiver's <strong>Register Number</strong> to look them up.
                                Searching by name or browsing the student list is restricted for security.
                            </p>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    value={regInput}
                                    onChange={e => { setRegInput(e.target.value.toUpperCase()); setError(''); }}
                                    placeholder="e.g. 240007"
                                    maxLength={20}
                                    className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all font-mono tracking-wide"
                                />
                                <button type="submit" disabled={searching || !regInput.trim()}
                                    className="px-4 py-2.5 rounded-xl text-white font-black text-xs uppercase flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                                    style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </button>
                            </form>

                            {error && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                    className="mt-2.5 p-2.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600 font-semibold">{error}</p>
                                </motion.div>
                            )}

                            {/* Previously sent */}
                            {sentMessages.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-pink-50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Your sent messages</p>
                                    {sentMessages.map(m => (
                                        <div key={m.id} className="flex items-center justify-between text-xs py-1">
                                            <span className="text-gray-600 font-mono">{m.receiverRegNo}</span>
                                            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${m.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                m.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                    m.status === 'flagged' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-600'}`}>
                                                {m.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 2: Compose ── */}
                    {step === 'compose' && receiver && (
                        <motion.div key="compose" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                            {/* Receiver card - read only */}
                            <div className="mb-3 p-3 rounded-xl"
                                style={{ background: 'linear-gradient(135deg,#fdf0fb,#f3e8ff)', border: '1px solid #e8c8f4' }}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-gray-800">{receiver.name}</p>
                                            <p className="text-[10px] text-gray-500">{receiver.department} · Batch {receiver.batch}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle className="w-2.5 h-2.5" /> Participating
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">📵 Email hidden</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">📵 Phone hidden</span>
                                </div>
                            </div>

                            {/* Quick Messages */}
                            <div className="mb-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-pink-400" /> Quick Messages
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        "Happy Women's Day! Your strength inspires us all. 🌸",
                                        "Wishing you a day filled with love and appreciation! ✨",
                                        "To an amazing peer: Happy Women's Day! Keep shining. 💜",
                                        "Thank you for all the incredible work you do. 💐"
                                    ].map((tmpl, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setMsgText(tmpl); setError(''); }}
                                            className="px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-100 text-[10px] font-bold text-pink-700 hover:bg-pink-100 transition-all text-left"
                                        >
                                            {tmpl}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message box */}
                            <div className="relative">
                                <textarea
                                    value={msgText}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val.length <= MAX_CHARS) {
                                            setMsgText(val);
                                            setError('');
                                            // Live detection
                                            const safety = filterMessage(val);
                                            setLiveSafetyInfo(safety);
                                        }
                                    }}
                                    placeholder="Or write your own custom message here... 🌸"
                                    rows={4}
                                    className={`w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none transition-all shadow-inner ${!liveSafetyInfo.isClean ? 'border-red-300 bg-red-50/50 focus:border-red-500' : 'border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100'}`}
                                />
                                {!liveSafetyInfo.isClean && (
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-[9px] font-black rounded-lg animate-pulse uppercase tracking-widest shadow-lg">
                                        Safety Violation Found
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 mt-1 mb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <ShieldCheck className={`w-3 h-3 ${!liveSafetyInfo.isClean ? 'text-red-500' : 'text-emerald-500'}`} />
                                        {liveSafetyInfo.isClean ? 'Auto Safety Filter active' : 'Safety Filter: Unsafe Content Detected'}
                                    </div>
                                    <span className={`text-[10px] font-bold ${msgText.length > MAX_CHARS * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {msgText.length}/{MAX_CHARS}
                                    </span>
                                </div>
                                {!liveSafetyInfo.isClean && (
                                    <div className="mt-1 p-2 rounded-lg bg-red-100 border border-red-200 flex flex-wrap gap-1.5 items-center">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-[9px] font-black text-red-700 uppercase">Violations Found:</span>
                                        {liveSafetyInfo.flaggedWords.map(w => (
                                            <span key={w} className="bg-white text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-200 uppercase">{w}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600 font-semibold">{error}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
                                <Calendar className="w-3 h-3 text-pink-400" />
                                Message releases to receiver on <strong className="text-pink-600 ml-1">March 8, 9:00 AM</strong>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={reset}
                                    className="px-3 py-2.5 rounded-xl text-xs font-black text-gray-500 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 transition-all">
                                    <X className="w-3 h-3" /> Back
                                </button>
                                <button onClick={handleSend}
                                    disabled={sending || msgText.trim().length < 3 || !liveSafetyInfo.isClean}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-[1.01] ${!liveSafetyInfo.isClean ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''}`}
                                    style={{ background: !liveSafetyInfo.isClean ? '#94a3b8' : 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {sending ? 'Sending…' : !liveSafetyInfo.isClean ? 'Safety Blocked' : 'Send Message'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Done ── */}
                    {step === 'done' && (
                        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                                <CheckCircle className="w-7 h-7 text-white" />
                            </div>
                            <p className="font-black text-gray-800 mb-1">Message Sent! 💐</p>
                            <p className="text-xs text-gray-500 mb-1">
                                {lastResult?.status === 'flagged'
                                    ? 'Your message was flagged for review. Official Verification in progress.'
                                    : 'Pending Official Verification. Will release on March 8 at 9 AM.'}
                            </p>
                            <p className="text-[10px] text-gray-400 mb-4">
                                {sentCount}/{maxMessages} messages used
                            </p>
                            {sentCount < maxMessages && (
                                <button onClick={reset}
                                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-white transition-all active:scale-95"
                                    style={{ background: 'linear-gradient(90deg,#ec4899,#a855f7)' }}>
                                    Send Another
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

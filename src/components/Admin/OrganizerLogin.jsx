import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Calendar, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import tsLogo from '../../assets/techspark-logo.png';

const OrganizerLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const cleanUsername = username.trim();
            const cleanPassword = password.trim();

            const organizerQuery = query(
                collection(db, 'organizers'),
                where('username', '==', cleanUsername),
                where('password', '==', cleanPassword)
            );

            const snapshot = await getDocs(organizerQuery);

            if (!snapshot.empty) {
                const organizerData = snapshot.docs[0].data();
                localStorage.setItem('organizerToken', JSON.stringify({
                    id: snapshot.docs[0].id,
                    username: organizerData.username,
                    role: 'organizer',
                    lastLogin: new Date().toISOString()
                }));
                navigate('/organizer/dashboard');
            } else {
                setError('Invalid credentials for Event Organizer');
            }
        } catch (err) {
            console.error("Organizer login error:", err);
            setError('System error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Dark & Deep Background Effects */}
            <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-900 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" />
            <div className="absolute bottom-0 -right-4 w-96 h-96 bg-cyan-900 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse delay-700" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md"
            >
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 shadow-2xl relative">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    </div>

                    <div className="text-center mb-10">
                        <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <img src={tsLogo} alt="TechSpark Logo" className="w-full h-full object-contain filter drop-shadow-2xl" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight uppercase italic underline decoration-cyan-500 decoration-4 underline-offset-8">Editor Portal</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-4">Authorized Organizers Only</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Organizer ID"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="Passphrase"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl shadow-xl hover:bg-blue-50 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:hover:translate-y-0"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>ENTER DASHBOARD</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center flex flex-col gap-2">
                        <button
                            onClick={() => navigate('/admin/login')}
                            className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] hover:text-blue-400 transition-colors"
                        >
                            Switch to Core Admin
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default OrganizerLogin;

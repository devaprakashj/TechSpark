import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Loader2, ShieldAlert } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import tsLogo from '../../assets/techspark-logo.png';
import ritLogo from '../../assets/rit-logo.png';

const AdminLogin = () => {
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
            const adminQuery = query(
                collection(db, 'admin'),
                where('username', '==', username),
                where('password', '==', password)
            );

            const snapshot = await getDocs(adminQuery);

            if (!snapshot.empty) {
                const adminData = snapshot.docs[0].data();
                localStorage.setItem('adminToken', JSON.stringify({
                    id: snapshot.docs[0].id,
                    username: adminData.username,
                    role: adminData.role || 'admin',
                    lastLogin: new Date().toISOString()
                }));
                navigate('/admin/dashboard');
            } else {
                setError('Invalid username or password');
            }
        } catch (err) {
            console.error("Admin login error:", err);
            setError('System error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[100dvh] w-full flex flex-col md:flex-row md:items-center justify-center bg-[#bda8d9] overflow-hidden font-sans relative">

            {/* Page Background Abstract Waves */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0,40 C30,20 70,60 100,30 L100,100 L0,100 Z" fill="#a48ec7" />
                    <path d="M0,60 C40,40 60,80 100,50 L100,100 L0,100 Z" fill="#937ab9" />
                </svg>
            </div>
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-400/20 blur-[120px] rounded-full z-0" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/20 blur-[120px] rounded-full z-0" />

            {/* MOBILE ONLY: Top Header Text */}
            <div className="flex md:hidden flex-col items-center text-center pt-10 pb-6 px-6 relative z-10 w-full">
                <h2 className="text-[2.25rem] leading-[1.1] font-extrabold mb-3 tracking-tighter">
                    <span className="text-gray-700 font-bold text-[1.75rem]">Hello,</span><br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-800">Welcome Back!</span>
                </h2>
                <p className="text-[13.5px] text-gray-700/80 font-medium max-w-[280px] leading-relaxed">
                    Please enter your admin credentials to access the central control panel.
                </p>
            </div>

            {/* Main Card Wrapper */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full md:max-w-[1000px] mt-auto md:mt-0 flex-1 md:flex-none md:min-h-[500px] md:h-auto md:max-h-[90vh] bg-white rounded-t-[2.5rem] md:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10"
            >
                {/* DESKTOP ONLY: Left Panel */}
                <div className="hidden md:flex flex-col justify-center w-[48%] p-12 lg:p-14 relative overflow-hidden bg-[#7650a6] text-white">
                    {/* Darker Wave Overlay */}
                    <div className="absolute inset-0 z-0 opacity-100">
                        <svg viewBox="0 0 500 650" className="w-full h-full" preserveAspectRatio="none">
                            <path d="M0,250 C150,150 250,350 500,200 L500,650 L0,650 Z" fill="#674196" />
                            <path d="M0,450 C200,350 350,550 500,450 L500,650 L0,650 Z" fill="#5b3786" />
                        </svg>
                    </div>

                    {/* Topographic Lines Top Left */}
                    <svg className="absolute top-0 left-0 w-64 h-64 opacity-40 z-0 -translate-x-10 -translate-y-10" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="0.5">
                        <path d="M10,0 Q20,30 0,50" />
                        <path d="M25,0 Q35,35 0,65" />
                        <path d="M40,0 Q50,40 0,80" />
                        <path d="M55,0 Q65,45 0,95" />
                        <path d="M70,0 Q80,50 15,100" />
                    </svg>

                    {/* Topographic Lines Bottom Right */}
                    <svg className="absolute bottom-0 right-0 w-80 h-80 opacity-40 z-0 translate-x-10 translate-y-10" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="0.5">
                        <path d="M100,20 Q60,40 80,100" />
                        <path d="M100,35 Q45,55 65,100" />
                        <path d="M100,50 Q30,70 50,100" />
                        <path d="M100,65 Q15,85 35,100" />
                        <path d="M100,80 Q0,100 20,100" />
                    </svg>

                    {/* Dotted Grid Pattern */}
                    <div className="absolute top-12 right-12 flex gap-2.5 opacity-60 z-0">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-2.5">
                                {[...Array(9)].map((_, j) => (
                                    <div key={j} className="w-1.5 h-1.5 bg-white rounded-full" />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Accent Symbols */}
                    <div className="absolute top-24 left-[35%] text-white/60 text-2xl font-light z-0">+</div>
                    <div className="absolute top-[28%] right-[25%] w-3 h-3 border-[1.5px] border-white/60 rounded-full z-0" />
                    <div className="absolute bottom-[35%] left-[45%] text-white/60 text-2xl font-light z-0">+</div>
                    <div className="absolute bottom-24 left-16 w-3.5 h-3.5 border-[1.5px] border-white/60 rounded-full z-0" />

                    <div className="relative z-10 -mt-10">
                        <h2 className="text-[2.5rem] lg:text-[2.75rem] font-bold mb-4 leading-tight tracking-tight">Welcome Admin!</h2>
                        <p className="text-[1rem] lg:text-[1.05rem] text-white/90 max-w-[290px] leading-relaxed">
                            Securely authenticate to access the centralized control panel and manage TechSpark operations.
                        </p>
                    </div>
                </div>

                {/* Right Panel - Form (Mobile & Desktop) */}
                <div className="w-full md:w-[52%] px-6 sm:px-10 py-8 md:p-10 lg:p-10 flex flex-col bg-[#fdfdfd] md:bg-white relative z-10 h-full overflow-y-auto">

                    {/* Logos */}
                    <div className="flex items-center justify-center md:justify-start gap-4 md:gap-5 mb-6 md:mb-5 opacity-100 w-full shrink-0">
                        <img src={ritLogo} alt="RIT Logo" className="h-10 sm:h-12 md:h-10 object-contain" />
                        <div className="w-[1.5px] h-8 md:h-6 bg-gray-300 md:bg-gray-200"></div>
                        <img src={tsLogo} alt="TechSpark Logo" className="h-7 sm:h-9 md:h-8 object-contain" />
                    </div>

                    <h2 className="hidden md:block text-[2.25rem] font-bold text-gray-700 mb-5 tracking-tight">Sign In</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                                    <User className="w-[18px] h-[18px] text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Username or email"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border md:border-gray-200 md:shadow-none text-gray-700 placeholder:text-gray-400 pl-12 pr-6 py-[16px] md:py-[14px] rounded-2xl md:rounded-full outline-none focus:ring-2 focus:ring-[#243b55] md:focus:ring-[#7650a6] md:focus:border-[#7650a6] transition-all font-medium text-[14px]"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                                    <Lock className="w-[18px] h-[18px] text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border md:border-gray-200 md:shadow-none text-gray-700 placeholder:text-gray-400 pl-12 pr-6 py-[16px] md:py-[14px] rounded-2xl md:rounded-full outline-none focus:ring-2 focus:ring-[#243b55] md:focus:ring-[#7650a6] md:focus:border-[#7650a6] transition-all font-medium text-[14px]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2 pt-2 md:pt-1">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded-[4px] border-gray-300 text-[#243b55] md:text-[#7650a6] focus:ring-[#243b55] md:focus:ring-[#7650a6]" />
                                <span className="text-[13px] text-gray-500 font-medium">Remember me</span>
                            </label>
                            <button type="button" onClick={() => setError('Please contact the System Administrator to reset your admin credentials.')} className="text-[13px] text-gray-500 font-medium hover:text-[#243b55] md:hover:text-[#7650a6] transition-colors">
                                Forgot Password?
                            </button>
                        </div>

                        <div className="mt-4 p-3 bg-red-50/80 border border-red-100 rounded-xl flex items-start gap-3">
                            <ShieldAlert className="w-[18px] h-[18px] text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-700 leading-tight">
                                <strong className="font-semibold block mb-0.5">Restricted Admin Area</strong>
                                Unauthorized access is strictly prohibited and actively monitored.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#243b55] hover:bg-[#1a2a3d] md:bg-[#6a449c] md:hover:bg-[#5b3786] text-white font-medium py-[16px] md:py-[14px] rounded-2xl md:rounded-full shadow-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70 text-[15px] mt-4 mb-2 md:mb-0"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="md:hidden">Log Me In</span>}{!loading && <span className="hidden md:inline">Sign In</span>}
                        </button>
                    </form>

                    <div className="mt-auto pt-6 md:pt-0 md:mt-6 text-center text-[12px] font-medium text-gray-500 pb-4 md:pb-0">
                        Are you an organizer? <span onClick={() => navigate('/organizer/login')} className="text-[#243b55] md:text-[#7650a6] font-semibold cursor-pointer hover:underline ml-1">Organizer Login</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;

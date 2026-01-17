import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Search,
    Award,
    CheckCircle,
    XCircle,
    ExternalLink,
    Shield,
    FileText,
    User,
    Hash,
    Calendar,
    Loader2,
    QrCode,
    BadgeCheck,
    ArrowLeft,
    AlertCircle,
    Globe,
    Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CertificateVerification = () => {
    const [searchValue, setSearchValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'error'
    const [debugInfo, setDebugInfo] = useState(null);

    // Celebration effect
    const celebrate = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    // Get API URL from localStorage (set by Admin) or use default
    const getApiUrl = () => {
        const savedUrl = localStorage.getItem('certApiUrl');
        const defaultUrl = 'https://script.google.com/macros/s/AKfycbxZvWwaHjkFrS_yK3akleByW1FtmnWu7ht-UYt6ztPbTTnWUuGUmhjZ_HsOWdu5aHruFw/exec';

        // If no URL or old/broken URL, return default
        if (!savedUrl ||
            savedUrl.includes('AKfycbxVm9lozobl') ||
            savedUrl.includes('AKfycbzkMhn07pp') ||
            savedUrl.includes('AKfycbS_2h3kCOMCtzGf') ||
            savedUrl.includes('AKfycbxS_2h3kCOMCtzGf')) { // Force update old version
            return defaultUrl;
        }
        return savedUrl.trim();
    };

    // Check API Status on mount
    useEffect(() => {
        const checkApi = async () => {
            try {
                const baseUrl = getApiUrl();
                const separator = baseUrl.includes('?') ? '&' : '?';
                const testUrl = `${baseUrl}${separator}count=true`;
                const response = await fetch(testUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    setApiStatus('online');
                } else {
                    setApiStatus('error');
                }
            } catch (err) {
                console.warn('API Status Check failed:', err);
                setApiStatus('error');
            }
        };
        checkApi();
    }, []);

    // Check for QR code or URL parameters on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const value = urlParams.get('value') || urlParams.get('query');

        if (value) {
            setSearchValue(value);
            setTimeout(() => {
                handleVerify(value);
            }, 500);
        }
    }, []);

    const handleVerify = async (val = null) => {
        const queryValue = (val || searchValue).trim();

        if (!queryValue) {
            setError('Please enter a Register Number or Certificate ID');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setDebugInfo(null);

        try {
            const baseUrl = getApiUrl();
            const separator = baseUrl.includes('?') ? '&' : '?';
            const finalUrl = `${baseUrl}${separator}query=${encodeURIComponent(queryValue)}&value=${encodeURIComponent(queryValue)}`;

            console.log('Verifying with URL:', finalUrl);

            // Using standard fetch to bypass complex CORS preflights
            const response = await fetch(finalUrl);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const rawText = await response.text();
            let data;

            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error('JSON Parse Error:', rawText);
                if (rawText.includes('<html')) {
                    throw new Error('Database is asking for login. Ensure you deployed as "Anyone".');
                }
                throw new Error('Data format error. Please check script deployment.');
            }

            console.log('API Response:', data);
            setDebugInfo(JSON.stringify(data, null, 2));

            if (data.status === 'not_found' || data.status === 'not found' || (Array.isArray(data) && data.length === 0)) {
                setError('No certificates found matching your criteria.');
                setResult(null);
            } else if (Array.isArray(data)) {
                setResult(data);
                setError(null);
                celebrate(); // 🎉 PARTY!
            } else if (data.status === 'error') {
                setError(data.message || 'Verification failed.');
                setResult(null);
            } else {
                setResult([data]);
                setError(null);
                celebrate(); // 🎉 PARTY!
            }
        } catch (err) {
            console.error('Verification error:', err);
            const isNetworkError = err.message === 'Failed to fetch';
            setError(isNetworkError ? 'Browser Blocked connection. Please use Incognito mode or disable Ad-blockers.' : err.message);

            // Direct database check link to prove the script works
            const directUrl = `${getApiUrl().split('?')[0]}?query=${encodeURIComponent(queryValue)}`;
            setDebugInfo(isNetworkError
                ? `DATABASE TEST LINK:\nIf the link below opens in a new tab and shows your name, then the issue is only in your current browser settings.\n\n${directUrl}`
                : `Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleVerify();
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] selection:bg-blue-100">
            {/* Header Navigation */}
            <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold text-sm uppercase tracking-widest">Back to Home</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${apiStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            apiStatus === 'error' ? 'bg-red-50 text-red-600 border border-red-100' :
                                'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}>
                            <Activity className={`w-3 h-3 ${apiStatus === 'checking' ? 'animate-pulse' : ''}`} />
                            API Status: {apiStatus}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-24 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-xl shadow-blue-500/20"
                        >
                            <Shield className="w-4 h-4" />
                            Official Club Registry
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6">
                            Validate Your <span className="text-blue-600 italic">Achievement</span>
                        </h1>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                            Every milestone matters. Verify the authenticity of your TechSpark certificates
                            instantly through our secure administrative database.
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 mb-12"
                    >
                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Enter Register Number or Cert ID..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-16 pr-8 py-6 bg-slate-50 border-none rounded-[2rem] text-slate-800 font-bold text-lg focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                                />
                            </div>
                            <button
                                onClick={() => handleVerify()}
                                disabled={isLoading}
                                className="px-12 py-6 bg-slate-900 text-white rounded-[2.1rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                {isLoading ? 'Processing' : 'Verify'}
                            </button>
                        </div>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4 ${error.includes('No certificates')
                                    ? 'bg-slate-100 border-slate-200'
                                    : 'bg-red-50 border-red-100'
                                    } border`}
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${error.includes('No certificates')
                                    ? 'bg-slate-200 text-slate-500'
                                    : 'bg-red-100 text-red-600'
                                    }`}>
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className={`text-xl font-black uppercase tracking-tight mb-2 ${error.includes('No certificates') ? 'text-slate-800' : 'text-red-900'
                                        }`}>
                                        {error.includes('No certificates') ? 'Certificate Not Found' : 'Verification Incomplete'}
                                    </h4>
                                    <p className={`${error.includes('No certificates') ? 'text-slate-500' : 'text-red-600'} font-bold text-sm`}>
                                        {error.includes('No certificates')
                                            ? "We couldn't find any record matching that ID. Please double-check your entry."
                                            : error}
                                    </p>
                                </div>

                                {error.includes('No certificates') && (
                                    <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-slate-200/50 w-full max-w-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Still having trouble?</p>
                                        <a
                                            href="mailto:core@techspark.club"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                                        >
                                            Contact Core Member
                                        </a>
                                    </div>
                                )}

                                {!error.includes('No certificates') && (
                                    <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                                        <button
                                            onClick={() => window.open(getApiUrl(), '_blank')}
                                            className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 underline"
                                        >
                                            Check API Connection Manually
                                        </button>
                                        {debugInfo && (
                                            <details className="text-left w-full mt-4">
                                                <summary className="text-[10px] font-black uppercase text-slate-400 cursor-pointer">Technical Log</summary>
                                                <pre className="mt-2 p-4 bg-slate-900 text-emerald-400 rounded-xl text-[9px] overflow-auto max-h-40">
                                                    {debugInfo}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {result && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between mb-4 px-4">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Verified Records Found: {result.length}</h3>
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-100">
                                        <CheckCircle className="w-3 h-3" /> Secure Data
                                    </div>
                                </div>

                                {result.map((cert, index) => {
                                    // Role styling
                                    const roleStyles = {
                                        'WINNER_1ST': { bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', text: 'text-white', label: '🥇 1st Place Winner' },
                                        'WINNER_2ND': { bg: 'bg-gradient-to-r from-slate-300 to-slate-400', text: 'text-white', label: '🥈 2nd Place Winner' },
                                        'WINNER_3RD': { bg: 'bg-gradient-to-r from-amber-600 to-amber-700', text: 'text-white', label: '🥉 3rd Place Winner' },
                                        'SPECIAL_MENTION': { bg: 'bg-gradient-to-r from-purple-500 to-indigo-500', text: 'text-white', label: '⭐ Special Mention' },
                                        'PARTICIPANT': { bg: 'bg-slate-100', text: 'text-slate-600', label: '🎖️ Participant' }
                                    };
                                    const role = cert.role || 'PARTICIPANT';
                                    const roleStyle = roleStyles[role] || roleStyles['PARTICIPANT'];
                                    const isWinner = role.includes('WINNER');

                                    // Event type styling
                                    const typeStyles = {
                                        'Hackathon': { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🔮' },
                                        'Workshop': { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🛠️' },
                                        'Quiz': { bg: 'bg-green-100', text: 'text-green-700', icon: '📝' },
                                        'Competition': { bg: 'bg-pink-100', text: 'text-pink-700', icon: '🏆' },
                                        'Seminar': { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🎤' }
                                    };
                                    const eventType = cert.eventType || 'Workshop';
                                    const typeStyle = typeStyles[eventType] || typeStyles['Workshop'];

                                    return (
                                        <div key={index} className={`bg-white p-8 rounded-[2.5rem] border-2 ${isWinner ? 'border-yellow-300 bg-gradient-to-br from-white to-amber-50/30' : 'border-slate-100'} shadow-xl shadow-slate-200 group hover:border-blue-500/30 transition-all relative overflow-hidden`}>
                                            {/* Winner Glow */}
                                            {isWinner && (
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-200/40 to-transparent rounded-bl-[6rem]" />
                                            )}

                                            <div className="flex flex-col md:flex-row gap-8 relative z-10">
                                                <div className="flex-1 space-y-8">
                                                    {/* Badges Row */}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide ${roleStyle.bg} ${roleStyle.text} shadow-sm`}>
                                                            {roleStyle.label}
                                                        </span>
                                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${typeStyle.bg} ${typeStyle.text}`}>
                                                            {typeStyle.icon} {eventType}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-start gap-6">
                                                        <div className={`w-16 h-16 ${isWinner ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' : 'bg-slate-50 text-blue-600'} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-all shadow-lg`}>
                                                            <Award className="w-8 h-8" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Honoree</p>
                                                            <h4 className={`text-3xl font-black ${isWinner ? 'text-amber-900' : 'text-slate-900'} group-hover:text-blue-600 transition-colors uppercase`}>
                                                                {cert.studentName || cert.name || 'Student Name'}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                                                <Hash className="w-3.5 h-3.5" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Register No</span>
                                                            </div>
                                                            <p className="text-sm font-black text-slate-800">{cert.rollNumber || cert.registerNumber || cert.regNo || 'N/A'}</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                                                <FileText className="w-3.5 h-3.5" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Cert ID</span>
                                                            </div>
                                                            <p className="text-sm font-black text-slate-800">{cert.certificateId || cert.certID || 'N/A'}</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Event Date</span>
                                                            </div>
                                                            <p className="text-sm font-black text-slate-800">
                                                                {cert.eventDate || cert.date || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className={`p-6 ${isWinner ? 'bg-amber-50/50' : 'bg-blue-50/50'} rounded-3xl`}>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Globe className="w-4 h-4 text-blue-600" />
                                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Achievement Domain</span>
                                                        </div>
                                                        <p className={`text-lg font-black ${isWinner ? 'text-amber-900' : 'text-slate-800'} uppercase`}>
                                                            {cert.eventName || cert.event || 'TechSpark Official Event'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-3 justify-center">
                                                    {(cert.certificateUrl || cert.link) && (
                                                        <a
                                                            href={cert.certificateUrl || cert.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`px-8 py-5 ${isWinner ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-blue-600'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.05] transition-all flex items-center justify-center gap-3 shadow-lg ${isWinner ? 'shadow-amber-500/20' : 'shadow-blue-500/20'}`}
                                                        >
                                                            <Download className="w-4 h-4" /> {isWinner ? 'Download Winner Certificate' : 'Download Certificate'}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}

                        {!result && !error && !isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                                <div className="inline-block p-8 bg-white rounded-full shadow-inner border border-slate-50 mb-6">
                                    <QrCode className="w-12 h-12 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Waiting for Input</h3>
                                <p className="text-slate-300 text-xs font-bold uppercase mt-2">Enter credentials to begin secure lookup</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

const Download = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);

export default CertificateVerification;

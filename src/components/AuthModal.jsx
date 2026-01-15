import { useRef, useEffect, useState } from 'react';
import { X, Mail, CheckCircle, GraduationCap, Building2, Calendar, User, Hash, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import ritLogo from '../assets/rit-logo.png';
import tsLogo from '../assets/techspark-logo.png';

const AuthModal = () => {
    const {
        isAuthModalOpen,
        closeAuthModal,
        loginWithGoogle,
        isRegistrationStep,
        pendingUser,
        completeRegistration,
        isAuthenticated,
        signingIn
    } = useAuth();

    const navigate = useNavigate();

    // Redirect to dashboard after successful auth
    useEffect(() => {
        if (isAuthenticated && !isRegistrationStep) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, isRegistrationStep, navigate]);

    // Refs for registration form
    const rollNoRef = useRef();
    const phoneRef = useRef();
    const sectionRef = useRef();
    const yearRef = useRef();

    const [isRegScanning, setIsRegScanning] = useState(false);

    if (!isAuthModalOpen) return null;

    const handleRegistrationSubmit = (e) => {
        e.preventDefault();
        const data = {
            rollNumber: rollNoRef.current.value,
            department: pendingUser.department,
            phone: phoneRef.current.value,
            section: sectionRef.current.value,
            admissionYear: yearRef.current.value
        };
        completeRegistration(data);
    };

    const handleQrScan = async (text) => {
        if (!text) return;

        try {
            let rollNumber = text;

            // Check if QR contains college verification URL
            if (text.includes('ims.ritchennai.edu.in') || text.includes('http')) {
                console.log('Detected URL-based QR code:', text);

                // Fetch verification page
                let response;
                try {
                    response = await fetch(text, {
                        method: 'GET',
                        mode: 'cors',
                        headers: { 'Accept': 'text/html' }
                    });
                } catch (corsError) {
                    console.log('Direct fetch failed, using CORS proxy...');
                    const proxyUrl = 'https://api.allorigins.win/raw?url=';
                    response = await fetch(proxyUrl + encodeURIComponent(text));
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }

                const html = await response.text();

                // Extract roll number using multiple patterns
                const patterns = [
                    /Register Number[:\s]*(\d+)/i,
                    /Registration Number[:\s]*(\d+)/i,
                    /Roll Number[:\s]*(\d+)/i,
                    /Roll No[:\s.]*(\d+)/i,
                    /Reg\.?\s*No\.?[:\s]*(\d+)/i,
                    /<td[^>]*>(\d{10,15})<\/td>/i,
                ];

                for (const pattern of patterns) {
                    const match = html.match(pattern);
                    if (match && match[1]) {
                        rollNumber = match[1];
                        console.log('Extracted Roll Number:', rollNumber);
                        break;
                    }
                }
            }

            // Fill the input field
            if (rollNoRef.current) {
                rollNoRef.current.value = rollNumber.trim();
                setIsRegScanning(false);
            }
        } catch (error) {
            console.error('QR Scan Error:', error);
            alert('Failed to process QR code. Please enter manually or try again.');
            setIsRegScanning(false);
        }
    };

    const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeAuthModal}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* QR Scanner Overlay for Registration */}
                <AnimatePresence>
                    {isRegScanning && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        >
                            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" />
                            <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
                                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase tracking-widest">Scan ID (QR/BARCODE)</h3>
                                    <button onClick={() => setIsRegScanning(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-4 aspect-square">
                                    <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-blue-500 shadow-lg shadow-blue-500/20">
                                        <Scanner
                                            onScan={(result) => handleQrScan(result[0]?.rawValue)}
                                            onError={(error) => console.log(error?.message)}
                                            constraints={{ facingMode: 'environment' }}
                                            formats={[
                                                'qr_code',
                                                'code_128',
                                                'code_39',
                                                'ean_13',
                                                'ean_8',
                                                'upc_a',
                                                'upc_e',
                                                'codabar'
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="p-6 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                        Align your Student Identity QR or Barcode <br />within the frame to auto-fill
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex flex-col justify-between overflow-hidden">
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />

                        {/* Logos Container */}
                        <div className="relative z-10 flex items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-lg border border-white/50">
                            <div className="flex-1 flex justify-center">
                                <img src={ritLogo} alt="RIT Logo" className="h-10 md:h-12 w-auto object-contain" />
                            </div>
                            <div className="w-px h-10 bg-gray-100" />
                            <div className="flex-1 flex justify-center">
                                <img src={tsLogo} alt="TechSpark Logo" className="h-10 md:h-12 w-auto object-contain" />
                            </div>
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {isRegistrationStep ? 'Finalize Profile' : 'Welcome Back'}
                            </h2>
                            <p className="text-blue-100 text-sm">
                                {isRegistrationStep
                                    ? 'Confirm your academic details'
                                    : 'Access the TechSpark community'}
                            </p>
                        </div>

                        {!isRegistrationStep && (
                            <button
                                onClick={closeAuthModal}
                                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    <div className="p-8">
                        {/* LOGIN VIEW - Default */}
                        {!isRegistrationStep && (
                            <div className="space-y-6">
                                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <h3 className="text-sm font-semibold text-blue-900 mb-2">College Email Policy</h3>
                                    <p className="text-xs text-blue-700">
                                        Use your official college email address ending in <br />
                                        <code className="bg-blue-100 px-1 rounded">@ritchennai.edu.in</code>
                                    </p>
                                </div>

                                <button
                                    onClick={loginWithGoogle}
                                    disabled={signingIn}
                                    className={`w-full group relative flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-slate-200 font-semibold rounded-xl transition-all duration-300 ${signingIn ? 'opacity-70 cursor-not-allowed' : 'hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 text-slate-700'}`}
                                >
                                    {signingIn ? (
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <img
                                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                            alt="Google"
                                            className="w-5 h-5"
                                        />
                                    )}
                                    <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
                                </button>
                            </div>
                        )}

                        {/* REGISTRATION FORM - Shown only for new users */}
                        {isRegistrationStep && pendingUser && (
                            <form onSubmit={handleRegistrationSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                                {/* Name (Read Only) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={pendingUser.fullName}
                                            disabled
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Register Number (Editable + Scan) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Register Number</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            ref={rollNoRef}
                                            type="text"
                                            defaultValue={pendingUser.rollNumber}
                                            placeholder="SCAN OR ENTER MANUALLY"
                                            required
                                            className="w-full pl-10 pr-14 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsRegScanning(true)}
                                            className="absolute right-2 top-2 p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            title="Scan ID Card"
                                        >
                                            <QrCode size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 ml-1 font-bold uppercase tracking-widest italic flex items-center gap-1">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                                        Scan your RIT Identity Card for auto-fill
                                    </p>
                                </div>

                                {/* Mobile Number */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Mobile Number</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3.5 flex items-center gap-1 text-gray-400">
                                            <span className="text-xs font-bold">+91</span>
                                        </div>
                                        <input
                                            ref={phoneRef}
                                            type="tel"
                                            pattern="[6-9][0-9]{9}"
                                            placeholder="9876543210"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Department (Read Only) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Department</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={pendingUser.department}
                                            disabled
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 ml-1 italic">Derived from your email subdomain</p>
                                </div>

                                {/* Section Selection (A-K) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Section</label>
                                    <div className="relative">
                                        <CheckCircle className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                        <select
                                            ref={sectionRef}
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select Section</option>
                                            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Admission Year (Pre-filled) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admission Year (YYYY)</label>
                                        {pendingUser.yearOfStudy && (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase animate-pulse">
                                                {pendingUser.yearOfStudy === 'Alumni' ? 'Alumni' : `${pendingUser.yearOfStudy}${pendingUser.yearOfStudy === 1 ? 'st' : (pendingUser.yearOfStudy === 2 ? 'nd' : (pendingUser.yearOfStudy === 3 ? 'rd' : 'th'))} Year`} Detected
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                        <input
                                            ref={yearRef}
                                            type="number"
                                            min="2020"
                                            max="2030"
                                            defaultValue={pendingUser.admissionYear}
                                            placeholder="2024"
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    Confirm & Join
                                </button>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthModal;

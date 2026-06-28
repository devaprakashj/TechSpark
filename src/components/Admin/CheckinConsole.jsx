import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    QrCode,
    CheckCircle,
    X,
    LayoutDashboard,
    LogOut,
    Search,
    Users,
    Calendar,
    ArrowLeft,
    ShieldCheck,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Smartphone,
    UserPlus,
    ScanLine,
    User,
    Lock,
    ShieldAlert,
    ArrowRight,
    Clock,
    MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where, updateDoc, doc, onSnapshot, orderBy, limit, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Scanner } from '@yudiel/react-qr-scanner';
import techsparkLogo from '../../assets/techspark-logo.png';
import ritLogo from '../../assets/rit-logo.png';
import checkinIllustration from '../../assets/checkin-scan-illustration.png';

const CheckinConsole = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loadingEvents, setLoadingEvents] = useState(true);

    const [stats, setStats] = useState({ total: 0, present: 0 });
    const [recentScans, setRecentScans] = useState([]); // Array of {regId, studentName, studentRoll, time}
    const [isScanning, setIsScanning] = useState(true);
    const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string, detail?: any }

    // On-Spot Registration States
    const [showOnSpotModal, setShowOnSpotModal] = useState(false);
    const [onSpotScanning, setOnSpotScanning] = useState(false);
    const [fetchedStudent, setFetchedStudent] = useState(null);
    const [onSpotLoading, setOnSpotLoading] = useState(false);
    const [onSpotError, setOnSpotError] = useState('');
    const [manualRollNumber, setManualRollNumber] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);

    const navigate = useNavigate();

    // Check existing session
    useEffect(() => {
        const token = localStorage.getItem('organizerToken') || localStorage.getItem('adminToken');
        if (token) {
            setIsLoggedIn(true);
            fetchEvents();
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');

        try {
            // Check in Organizers collection
            const orgQuery = query(
                collection(db, 'organizers'),
                where('username', '==', loginData.username),
                where('password', '==', loginData.password)
            );
            const orgSnap = await getDocs(orgQuery);

            if (!orgSnap.empty) {
                const userData = orgSnap.docs[0].data();
                localStorage.setItem('organizerToken', JSON.stringify({
                    id: orgSnap.docs[0].id,
                    username: userData.username,
                    role: 'organizer'
                }));
                setIsLoggedIn(true);
                fetchEvents();
                return;
            }

            // Check Admin if not organizer
            const adminQuery = query(
                collection(db, 'admin'),
                where('username', '==', loginData.username),
                where('password', '==', loginData.password)
            );
            const adminSnap = await getDocs(adminQuery);

            if (!adminSnap.empty) {
                const userData = adminSnap.docs[0].data();
                localStorage.setItem('adminToken', JSON.stringify({
                    id: adminSnap.docs[0].id,
                    username: userData.username,
                    role: 'admin'
                }));
                setIsLoggedIn(true);
                fetchEvents();
                return;
            }

            setLoginError('Invalid credentials. Access Denied.');
        } catch (error) {
            console.error("Login error:", error);
            setLoginError('System authentication failure.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
            // Fetch all events to avoid index issues with complex queries
            const q = query(collection(db, 'events'));
            const snapshot = await getDocs(q);
            const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(event => ['LIVE', 'UPCOMING'].includes(event.status?.toUpperCase()))
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

            console.log("Fetched Events for Console:", eventList.length);
            setEvents(eventList);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoadingEvents(false);
        }
    };

    const startCheckin = (event) => {
        setSelectedEvent(event);

        // Set up real-time listener for the EVENT itself (to detect registrationOpen changes)
        const eventUnsubscribe = onSnapshot(doc(db, 'events', event.id), (docSnap) => {
            if (docSnap.exists()) {
                setSelectedEvent({ id: docSnap.id, ...docSnap.data() });
            }
        });

        // Set up real-time listener for registrations of this event
        const q = query(collection(db, 'registrations'), where('eventId', '==', event.id));
        const regUnsubscribe = onSnapshot(q, (snapshot) => {
            const regs = snapshot.docs.map(doc => doc.data());
            const total = regs.length;
            const present = regs.filter(r => r.status === 'Present' || r.status === 'Checked-in' || r.isAttended).length;
            setStats({ total, present });
        });

        // Return cleanup function
        return () => {
            eventUnsubscribe();
            regUnsubscribe();
        };
    };

    const processCheckin = async (rollNumber) => {
        if (!selectedEvent || !isScanning) return;

        setIsScanning(false);
        setFeedback({ type: 'loading', message: `Verifying ID: ${rollNumber}...` });

        try {
            // Find registration for this student and this event
            const q = query(
                collection(db, 'registrations'),
                where('eventId', '==', selectedEvent.id),
                where('studentRoll', '==', rollNumber)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setFeedback({
                    type: 'error',
                    message: 'NOT REGISTERED',
                    detail: `Roll No ${rollNumber} has no registration for this event.`
                });
                playAudio('error');
            } else {
                const regDoc = querySnapshot.docs[0];
                const regData = regDoc.data();

                if (regData.status === 'Present' || regData.status === 'Checked-in' || regData.isAttended) {
                    setFeedback({
                        type: 'warning',
                        message: 'ALREADY CHECKED-IN',
                        detail: `${regData.studentName} is already marked present.`
                    });
                    playAudio('warning');
                } else {
                    // Update registration status
                    await updateDoc(doc(db, 'registrations', regDoc.id), {
                        status: 'Present',
                        isAttended: true,
                        checkedInAt: serverTimestamp()
                    });

                    // Add XP points to user if possible
                    const userQuery = query(collection(db, 'users'), where('rollNumber', '==', rollNumber));
                    const userSnap = await getDocs(userQuery);
                    if (!userSnap.empty) {
                        const userDoc = userSnap.docs[0];
                        // Optional: update points logic here if needed
                    }

                    setFeedback({
                        type: 'success',
                        message: 'CHECK-IN SUCCESSFUL',
                        detail: regData.studentName
                    });
                    setRecentScans(prev => [{
                        regId: regDoc.id,
                        studentName: regData.studentName,
                        studentRoll: regData.studentRoll,
                        time: new Date().toLocaleTimeString()
                    }, ...prev].slice(0, 5));
                    playAudio('success');
                }
            }
        } finally {
            // Reset for next scan after 3 seconds
            setTimeout(() => {
                setIsScanning(true);
                setFeedback(null);
            }, 3000);
        }
    };

    const processQRUrl = async (url) => {
        if (!selectedEvent || !isScanning) return;

        setIsScanning(false);
        setFeedback({ type: 'loading', message: 'Fetching student data from verification server...' });

        try {
            console.log('Processing QR URL:', url);

            // Try direct fetch first
            let response;
            try {
                response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'text/html',
                    }
                });
            } catch (corsError) {
                // If CORS fails, try with public proxy
                console.log('Direct fetch failed, trying CORS proxy...', corsError);
                const proxyUrl = 'https://api.allorigins.win/raw?url=';
                response = await fetch(proxyUrl + encodeURIComponent(url));
            }

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const html = await response.text();
            console.log('Fetched HTML content');

            // Multiple patterns to extract roll number
            const patterns = [
                /Register Number[:\s]*(\d+)/i,
                /Registration Number[:\s]*(\d+)/i,
                /Roll Number[:\s]*(\d+)/i,
                /Roll No[:\s.]*(\d+)/i,
                /Reg\.?\s*No\.?[:\s]*(\d+)/i,
                /<td[^>]*>(\d{10,15})<\/td>/i, // Table cell with 10-15 digit number
            ];

            let rollNumber = null;
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    rollNumber = match[1];
                    console.log('Extracted Roll Number:', rollNumber, 'using pattern:', pattern);
                    break;
                }
            }

            if (rollNumber) {
                setFeedback({ type: 'loading', message: `Verifying Roll No: ${rollNumber}...` });

                // Wait a bit to show the extracted roll number
                await new Promise(resolve => setTimeout(resolve, 500));

                // Continue with normal check-in process
                await processCheckin(rollNumber);
            } else {
                throw new Error('Could not extract roll number from verification page');
            }

        } catch (error) {
            console.error('QR URL Processing Error:', error);

            setFeedback({
                type: 'error',
                message: 'AUTO-VERIFICATION FAILED',
                detail: 'Network error or data format issue. Please try scanning again.'
            });
            playAudio('error');

            // Auto-retry after error feedback
            setTimeout(() => {
                setIsScanning(true);
                setFeedback(null);
            }, 3000);
        }
    };

    const undoCheckin = async (regId) => {
        if (!window.confirm("Undo check-in for this student?")) return;
        try {
            await updateDoc(doc(db, 'registrations', regId), {
                status: 'Registered',
                isAttended: false,
                checkedInAt: null
            });
            setRecentScans(prev => prev.filter(s => s.regId !== regId));
            alert("Check-in reverted.");
        } catch (error) {
            console.error("Undo error:", error);
            alert("Failed to undo check-in.");
        }
    };

    const playAudio = (type) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);

            if (type === 'success') {
                const oscillator = audioContext.createOscillator();
                oscillator.connect(gainNode);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1); 
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            } else if (type === 'error') {
                // "NOT REGISTERED" - Harsh low buzz sound
                const oscillator = audioContext.createOscillator();
                oscillator.connect(gainNode);
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } else if (type === 'warning') {
                // "ALREADY CHECKED IN" - Double/descending warning tone
                const oscillator = audioContext.createOscillator();
                oscillator.connect(gainNode);
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.4);
            }
        } catch (e) {
            console.log('Audio not supported or blocked');
        }
    };

    // ON-SPOT REGISTRATION: Process QR Scan to fetch student data
    const processOnSpotScan = async (rollNumber) => {
        if (!selectedEvent) return;

        setOnSpotLoading(true);
        setOnSpotError('');
        setFetchedStudent(null);

        try {
            // First check if already registered for this event
            const regQuery = query(
                collection(db, 'registrations'),
                where('eventId', '==', selectedEvent.id),
                where('studentRoll', '==', rollNumber)
            );
            const regSnap = await getDocs(regQuery);

            if (!regSnap.empty) {
                setOnSpotError('This student is already registered for this event!');
                setOnSpotLoading(false);
                return;
            }

            // Fetch student from users collection
            const userQuery = query(
                collection(db, 'users'),
                where('rollNumber', '==', rollNumber)
            );
            const userSnap = await getDocs(userQuery);

            if (userSnap.empty) {
                setOnSpotError(`No student found with Roll No: ${rollNumber}. They might not be registered on the platform.`);
            } else {
                const userData = userSnap.docs[0].data();
                setFetchedStudent({
                    uid: userSnap.docs[0].id,
                    fullName: userData.fullName || userData.name,
                    rollNumber: userData.rollNumber,
                    email: userData.email,
                    department: userData.department,
                    yearOfStudy: userData.yearOfStudy,
                    phone: userData.phone || 'N/A',
                    section: userData.section || 'N/A'
                });
                setOnSpotScanning(false); // Stop scanning, show data
            }
        } catch (error) {
            console.error("On-Spot Scan Error:", error);
            setOnSpotError('Failed to fetch student data. Please try again.');
        } finally {
            setOnSpotLoading(false);
        }
    };

    // ON-SPOT REGISTRATION: Confirm and create registration
    const confirmOnSpotRegistration = async () => {
        if (!fetchedStudent || !selectedEvent) return;

        setOnSpotLoading(true);
        try {
            const regId = `${selectedEvent.id}_${fetchedStudent.uid}`;
            const regRef = doc(db, 'registrations', regId);

            await setDoc(regRef, {
                eventId: selectedEvent.id,
                eventTitle: selectedEvent.title,
                eventDate: selectedEvent.date,
                eventTime: selectedEvent.time || 'TBA',
                userId: fetchedStudent.uid,
                studentName: fetchedStudent.fullName,
                studentEmail: fetchedStudent.email,
                studentPhone: fetchedStudent.phone,
                studentRoll: fetchedStudent.rollNumber,
                studentDept: fetchedStudent.department,
                studentYear: fetchedStudent.yearOfStudy,
                studentSection: fetchedStudent.section,
                registeredAt: serverTimestamp(),
                status: 'Present',
                isAttended: true,
                isOnSpot: true, // Flag for analytics
                checkedInAt: serverTimestamp()
            });

            // Add to recent scans
            setRecentScans(prev => [{
                regId: regId,
                studentName: fetchedStudent.fullName,
                studentRoll: fetchedStudent.rollNumber,
                time: new Date().toLocaleTimeString()
            }, ...prev].slice(0, 5));

            // Close modal and reset
            setShowOnSpotModal(false);
            setFetchedStudent(null);
            setOnSpotScanning(false);

            alert(`✅ On-Spot Registration Successful!\n\n${fetchedStudent.fullName} has been registered and marked present.`);
            playAudio('success');

        } catch (error) {
            console.error("On-Spot Registration Error:", error);
            setOnSpotError('Failed to complete registration. Please try again.');
        } finally {
            setOnSpotLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('organizerToken');
        localStorage.removeItem('adminToken');
        setIsLoggedIn(false);
        setSelectedEvent(null);
    };

    if (!isLoggedIn) {
        return (
            <div className="h-[100dvh] w-full flex flex-col md:flex-row md:items-center justify-center bg-[#bfdbfe] overflow-hidden font-sans relative">

                {/* Page Background Abstract Waves */}
                <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                        <path d="M0,40 C30,20 70,60 100,30 L100,100 L0,100 Z" fill="#93c5fd" />
                        <path d="M0,60 C40,40 60,80 100,50 L100,100 L0,100 Z" fill="#60a5fa" />
                    </svg>
                </div>
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-400/20 blur-[120px] rounded-full z-0" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/20 blur-[120px] rounded-full z-0" />

                {/* MOBILE ONLY: Top Header Text */}
                <div className="flex md:hidden flex-col items-center text-center pt-10 pb-6 px-6 relative z-10 w-full">
                    <h2 className="text-[2.25rem] leading-[1.1] font-extrabold mb-3 tracking-tighter">
                        <span className="text-gray-700 font-bold text-[1.75rem]">Hello,</span><br/>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-800">Welcome Back!</span>
                    </h2>
                    <p className="text-[13.5px] text-gray-700/80 font-medium max-w-[280px] leading-relaxed">
                        Please enter your organizer credentials to access the check-in console.
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
                    <div className="hidden md:flex flex-col justify-center w-[48%] p-12 lg:p-14 relative overflow-hidden bg-[#2563eb] text-white">
                        {/* Darker Wave Overlay */}
                        <div className="absolute inset-0 z-0 opacity-100">
                            <svg viewBox="0 0 500 650" className="w-full h-full" preserveAspectRatio="none">
                                <path d="M0,250 C150,150 250,350 500,200 L500,650 L0,650 Z" fill="#1d4ed8" />
                                <path d="M0,450 C200,350 350,550 500,450 L500,650 L0,650 Z" fill="#1e40af" />
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

                        <div className="relative z-10 -mt-2">
                            <h2 className="text-[2.25rem] lg:text-[2.5rem] font-bold mb-3 leading-tight tracking-tight">Check-in<br/>Console</h2>
                            <p className="text-[0.95rem] lg:text-[1rem] text-white/90 max-w-[290px] leading-relaxed mb-8">
                                Securely authenticate to manage event check-ins and registrations.
                            </p>
                            <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                                <img src={checkinIllustration} alt="Scan ID Card" className="w-full h-full object-cover mix-blend-overlay opacity-90" />
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-transparent to-transparent" />
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Form (Mobile & Desktop) */}
                    <div className="w-full md:w-[52%] px-6 sm:px-10 py-8 md:p-10 lg:p-10 flex flex-col bg-[#fdfdfd] md:bg-white relative z-10 h-full overflow-y-auto">

                        {/* Confidential Sliding Ticker */}
                        <div className="absolute top-0 left-0 right-0 bg-blue-50/80 border-b border-blue-100 overflow-hidden py-1.5 z-20">
                            <marquee scrollamount="4" className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">
                                CHECK-IN &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; AUTHORIZED PERSONNEL ONLY &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; EVENT MANAGEMENT &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; CHECK-IN
                            </marquee>
                        </div>

                        {/* Logos */}
                        <div className="flex items-center justify-center md:justify-start gap-4 md:gap-5 mb-6 md:mb-5 mt-2 md:mt-0 opacity-100 w-full shrink-0">
                            <img src={ritLogo} alt="RIT Logo" className="h-10 sm:h-12 md:h-10 object-contain" />
                            <div className="w-[1.5px] h-8 md:h-6 bg-gray-300 md:bg-gray-200"></div>
                            <img src={techsparkLogo} alt="TechSpark Logo" className="h-7 sm:h-9 md:h-8 object-contain" />
                        </div>

                        <h2 className="hidden md:block text-[2.25rem] font-bold text-gray-700 mb-5 tracking-tight">Sign In</h2>

                        <form onSubmit={handleLogin} className="space-y-4">
                            {loginError && (
                                <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">
                                    {loginError}
                                </p>
                            )}

                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                                        <User className="w-[18px] h-[18px] text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Organizer ID"
                                        required
                                        value={loginData.username}
                                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                                        className="w-full bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border md:border-gray-200 md:shadow-none text-gray-700 placeholder:text-gray-400 pl-12 pr-6 py-[16px] md:py-[14px] rounded-2xl md:rounded-full outline-none focus:ring-2 focus:ring-[#243b55] md:focus:ring-[#2563eb] md:focus:border-[#2563eb] transition-all font-medium text-[14px]"
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                                        <Lock className="w-[18px] h-[18px] text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Access Passkey"
                                        required
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        className="w-full bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border md:border-gray-200 md:shadow-none text-gray-700 placeholder:text-gray-400 pl-12 pr-6 py-[16px] md:py-[14px] rounded-2xl md:rounded-full outline-none focus:ring-2 focus:ring-[#243b55] md:focus:ring-[#2563eb] md:focus:border-[#2563eb] transition-all font-medium text-[14px]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2 pt-2 md:pt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded-[4px] border-gray-300 text-[#243b55] md:text-[#2563eb] focus:ring-[#243b55] md:focus:ring-[#2563eb]" />
                                    <span className="text-[13px] text-gray-500 font-medium">Remember me</span>
                                </label>
                                <button type="button" onClick={() => setLoginError('Please contact the System Administrator to reset your credentials.')} className="text-[13px] text-gray-500 font-medium hover:text-[#243b55] md:hover:text-[#2563eb] transition-colors">
                                    Forgot Passkey?
                                </button>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-3">
                                <ShieldCheck className="w-[18px] h-[18px] text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700 leading-tight">
                                    <strong className="font-semibold block mb-0.5">Check-in Portal</strong>
                                    All scanning activity is logged and associated with your ID.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full bg-[#243b55] hover:bg-[#1a2a3d] md:bg-[#2563eb] md:hover:bg-[#1d4ed8] text-white font-medium py-[16px] md:py-[14px] rounded-2xl md:rounded-full shadow-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70 text-[15px] mt-4 mb-2 md:mb-0"
                            >
                                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="md:hidden">Log Me In</span>}{!isLoggingIn && <span className="hidden md:inline">Initialize Console</span>}
                            </button>
                        </form>

                        <div className="mt-auto pt-6 md:pt-0 md:mt-6 text-center text-[12px] font-medium text-gray-500 pb-4 md:pb-0">
                            Looking for Admin Portal? <span onClick={() => navigate('/admin/login')} className="text-[#243b55] md:text-[#2563eb] font-semibold cursor-pointer hover:underline ml-1">Go to Admin</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!selectedEvent) {
        return (
            <div className="min-h-screen bg-[#f4f7fb] p-6 lg:p-10 font-sans relative overflow-hidden">
                {/* Ambient Background Orbs */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-300/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-300/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none translate-x-1/3 translate-y-1/3" />

                <div className="max-w-6xl mx-auto relative z-10">
                    <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-16 bg-white/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        {/* 1. Logos (First) */}
                        <div className="flex items-center gap-4 sm:gap-5 shrink-0">
                            <img src={ritLogo} alt="RIT Logo" className="h-10 sm:h-12 object-contain" />
                            <div className="w-[1.5px] h-8 bg-slate-300"></div>
                            <img src={techsparkLogo} alt="TechSpark Logo" className="h-8 sm:h-10 object-contain" />
                        </div>

                        {/* 2. Title (Middle) */}
                        <div className="flex items-center gap-4 sm:gap-5">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                                <ScanLine className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Check-in Operations</h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Select an active mission to initialize scanner</p>
                            </div>
                        </div>

                        {/* 3. Button (End) */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 rounded-xl transition-all duration-300 shadow-sm shrink-0 w-full xl:w-auto"
                        >
                            <span className="text-xs sm:text-sm font-bold">End Session</span>
                            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </header>

                    {loadingEvents ? (
                        <div className="flex flex-col items-center justify-center py-32">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-400 blur-xl opacity-30 rounded-full"></div>
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative z-10" />
                            </div>
                            <p className="text-slate-500 font-bold tracking-widest text-xs mt-6 uppercase animate-pulse">Syncing Database...</p>
                        </div>
                    ) : events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                            {events.map((event, idx) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    whileHover={{ y: -8 }}
                                    className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.12)] transition-all duration-500 cursor-pointer group flex flex-col h-full relative overflow-hidden"
                                    onClick={() => startCheckin(event)}
                                >
                                    {/* Card Hover Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    
                                    <div className="relative z-10 flex-1">
                                        <div className="flex items-center justify-between mb-8">
                                            <span className="px-4 py-1.5 bg-blue-50/80 border border-blue-100 text-blue-700 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm">
                                                {event.type}
                                            </span>
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/30 group-hover:-rotate-6 border border-slate-100 group-hover:border-transparent">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-5 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                                            {event.title}
                                        </h3>
                                        
                                        <div className="space-y-3 mb-8">
                                            {event.date && (
                                                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="truncate">{event.date}</span>
                                                </div>
                                            )}
                                            {event.time && (
                                                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                                    <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="truncate">{event.time}</span>
                                                </div>
                                            )}
                                            {event.venue && (
                                                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="truncate">{event.venue}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                                <div className="w-6 h-6 rounded-md bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                                                    <Users className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="truncate">{event.attendeesCount || 0} Expected Attendees</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="relative z-10 w-full py-4 bg-slate-900 group-hover:bg-blue-600 text-white rounded-2xl font-bold text-[13px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
                                        <span>Start Check-in</span>
                                        <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-white/60 rounded-[3rem] border border-white shadow-sm backdrop-blur-md max-w-2xl mx-auto">
                            <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-200/50">
                                <Calendar className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-3">No Active Missions</h3>
                            <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">There are currently no events open for check-in. Please contact the administrator if this is an error.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen max-h-screen bg-[#f4f7fb] text-slate-800 overflow-hidden flex flex-col p-2 sm:p-4 lg:p-6 font-sans relative">
            {/* Ambient Background Orbs */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-300/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-300/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none translate-x-1/3 translate-y-1/3" />

            {/* Unified Frame */}
            <div className="w-full max-w-6xl mx-auto bg-white/60 backdrop-blur-xl rounded-[2rem] lg:rounded-[2.5rem] border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.05)] flex flex-col flex-1 relative z-10 overflow-hidden min-h-0">
                
                {/* Header inside frame */}
                <header className="px-4 py-3 lg:px-8 lg:py-4 border-b border-white/60 bg-white/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 shrink-0">
                    {/* Top Row on Mobile: Back & Title */}
                    <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                        <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200/60 shadow-sm text-slate-600 hover:text-blue-600 shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base lg:text-xl font-extrabold text-slate-800 tracking-tight leading-tight truncate">{selectedEvent.title}</h2>
                                <p className="text-[9px] lg:text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                                    Check-in Terminal
                                </p>
                            </div>
                        </div>
                        {/* Mobile On-Spot Button */}
                        {(selectedEvent.registrationOpen === false || selectedEvent.status === 'CLOSED') && (
                            <button
                                onClick={() => {
                                    setShowOnSpotModal(true);
                                    setOnSpotScanning(true);
                                    setFetchedStudent(null);
                                    setOnSpotError('');
                                }}
                                className="lg:hidden px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-md shrink-0"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                On-Spot
                            </button>
                        )}
                    </div>

                    {/* Center: Logos (Desktop Only) */}
                    <div className="hidden lg:flex items-center justify-center gap-6 flex-1 shrink-0">
                        <img src={ritLogo} alt="RIT" className="h-10 object-contain drop-shadow-sm" />
                        <div className="w-px h-8 bg-slate-300/50" />
                        <img src={techsparkLogo} alt="TechSpark" className="h-9 object-contain drop-shadow-sm" />
                    </div>

                    {/* Bottom Row on Mobile / Right on Desktop: Stats & Desktop Action */}
                    <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                        <div className="flex items-center justify-between w-full lg:w-auto gap-2 lg:gap-6 bg-white/80 px-3 lg:px-5 py-1.5 lg:py-2 rounded-xl lg:rounded-2xl border border-white shadow-sm flex-1 lg:flex-none">
                            <div className="text-center flex-1 lg:flex-none">
                                <p className="text-[8px] lg:text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Expected</p>
                                <p className="text-base lg:text-xl font-black text-slate-800 leading-none">{stats.total}</p>
                            </div>
                            <div className="w-px h-6 lg:h-8 bg-slate-200" />
                            <div className="text-center flex-1 lg:flex-none">
                                <p className="text-[8px] lg:text-[9px] text-blue-500 font-bold uppercase tracking-widest mb-0.5">Checked</p>
                                <p className="text-base lg:text-xl font-black text-blue-600 leading-none">{stats.present}</p>
                            </div>
                            <div className="w-px h-6 lg:h-8 bg-slate-200" />
                            <div className="text-center flex-1 lg:flex-none">
                                <p className="text-[8px] lg:text-[9px] text-emerald-500 font-bold uppercase tracking-widest mb-0.5">Balance</p>
                                <p className="text-base lg:text-xl font-black text-emerald-600 leading-none">{stats.total - stats.present}</p>
                            </div>
                        </div>
                        {/* Desktop On-Spot Button */}
                        {(selectedEvent.registrationOpen === false || selectedEvent.status === 'CLOSED') && (
                            <button
                                onClick={() => {
                                    setShowOnSpotModal(true);
                                    setOnSpotScanning(true);
                                    setFetchedStudent(null);
                                    setOnSpotError('');
                                }}
                                className="hidden lg:flex px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest items-center gap-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:-translate-y-0.5 shrink-0"
                            >
                                <UserPlus className="w-4 h-4" />
                                On-Spot
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content inside frame - completely fills remaining height without scrolling on desktop, scrolls on mobile */}
                <main className="flex-1 flex flex-col lg:flex-row p-4 lg:p-6 gap-4 lg:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden items-center lg:items-stretch">
                    
                    {/* Scanner Section Wrapper - Absorbs space */}
                    <div className="w-full lg:flex-1 flex flex-col items-center justify-center min-h-0 relative shrink-0 py-2 lg:py-0">
                        {/* Actual Scanner Container - STRICT sizes to prevent Flexbox squishing */}
                        <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] lg:w-[420px] lg:h-[420px] xl:w-[480px] xl:h-[480px] bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden border border-slate-200/50 shadow-xl ring-4 ring-white/50 shrink-0 mx-auto">
                        {isScanning ? (
                            <Scanner
                                onScan={(result) => {
                                    const val = result[0]?.rawValue;
                                    if (val) {
                                        if (val.includes('ims.ritchennai.edu.in') || val.includes('http')) {
                                            processQRUrl(val);
                                        } else {
                                            processCheckin(val);
                                        }
                                    }
                                }}
                                onError={(err) => console.error(err)}
                                styles={{
                                    container: { width: '100%', height: '100%' },
                                    video: { objectFit: 'cover', width: '100%', height: '100%' }
                                }}
                                allowMultiple={false}
                                scanDelay={3000}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 backdrop-blur-md z-20">
                                <AnimatePresence mode="wait">
                                    {feedback && (
                                        <motion.div
                                            key={feedback.type}
                                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.9, opacity: 0, y: -10 }}
                                            className="text-center p-8 w-full"
                                        >
                                            <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 shadow-xl ${
                                                feedback.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/40' :
                                                feedback.type === 'error' ? 'bg-red-500 shadow-red-500/40' :
                                                feedback.type === 'warning' ? 'bg-orange-500 shadow-orange-500/40' : 'bg-blue-600 shadow-blue-500/40'
                                            }`}>
                                                {feedback.type === 'success' && <CheckCircle2 className="w-8 h-8 text-white" />}
                                                {feedback.type === 'error' && <X className="w-8 h-8 text-white" />}
                                                {feedback.type === 'warning' && <AlertTriangle className="w-8 h-8 text-white" />}
                                                {feedback.type === 'loading' && <Loader2 className="w-8 h-8 text-white animate-spin" />}
                                            </div>
                                            <h3 className={`text-xl font-black uppercase tracking-tight mb-1.5 ${
                                                feedback.type === 'success' ? 'text-emerald-400' :
                                                feedback.type === 'error' ? 'text-red-400' :
                                                feedback.type === 'warning' ? 'text-orange-400' : 'text-blue-400'
                                            }`}>
                                                {feedback.message}
                                            </h3>
                                            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">{feedback.detail}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Scanner Decoration overlays */}
                        <div className="absolute inset-0 pointer-events-none p-6 z-10">
                            <div className="w-full h-full border-2 border-white/20 rounded-[1.5rem] relative">
                                <div className="absolute top-[-2px] left-[-2px] w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-[1.5rem]" />
                                <div className="absolute top-[-2px] right-[-2px] w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-[1.5rem]" />
                                <div className="absolute bottom-[-2px] left-[-2px] w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-[1.5rem]" />
                                <div className="absolute bottom-[-2px] right-[-2px] w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-[1.5rem]" />
                            </div>
                        </div>
                        {isScanning && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-scan z-10" />
                        )}
                        </div>
                    </div>

                    {/* Info Panel Section - Natural height on mobile, fixed height on desktop */}
                    <div className="w-full lg:w-80 flex flex-col shrink-0 flex-1 lg:flex-none lg:h-full">
                        <div className="bg-white/40 lg:bg-white/40 p-4 lg:p-5 rounded-[1.5rem] lg:rounded-[2rem] border border-white/60 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                            <h4 className="hidden lg:block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-5 shrink-0">Console Intelligence</h4>

                            <div className="hidden lg:block space-y-3 shrink-0">
                                <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Smartphone className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 truncate">Device Access</p>
                                        <p className="text-[11px] font-bold text-slate-800 truncate">Front Desk Terminal</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 truncate">Authorization</p>
                                        <p className="text-[11px] font-bold text-emerald-600 truncate">Secure Protocol Layer</p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:mt-6 flex-1 flex flex-col min-h-[300px] lg:min-h-0">
                                <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2 shrink-0">
                                    <Users className="w-3.5 h-3.5 text-blue-500" /> Recent Scans
                                </h5>
                                <div className="space-y-2.5 overflow-y-auto pr-1 pb-2 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                                    {recentScans.length > 0 ? recentScans.map((scan, i) => (
                                        <div key={i} className="p-3 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-between">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-bold text-slate-800 truncate">{scan.studentName}</p>
                                                <p className="text-[9px] font-semibold text-slate-500 uppercase mt-0.5 tracking-wider truncate">{scan.studentRoll} • {scan.time}</p>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl text-center">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">No recent scans</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-200/60 shrink-0">
                                <p className="text-[9px] text-slate-400 font-medium italic text-center uppercase tracking-widest">
                                    Managed by TechSpark Core Engine
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            {/* ON-SPOT REGISTRATION MODAL */}
            <AnimatePresence>
                {showOnSpotModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !onSpotLoading && setShowOnSpotModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-md bg-[#0f172a] rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                        <ScanLine className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base uppercase italic">On-Spot Registration</h3>
                                        <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Scan Student ID Card QR</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowOnSpotModal(false)}
                                    disabled={onSpotLoading}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="p-5 overflow-y-auto flex-1">
                                {onSpotScanning && !fetchedStudent ? (
                                    <div className="space-y-6">
                                        {!showManualEntry ? (
                                            <>
                                                {/* QR Scanner */}
                                                <div className="relative aspect-square max-w-xs mx-auto bg-black rounded-3xl overflow-hidden border-4 border-white/10">
                                                    <Scanner
                                                        onScan={(result) => {
                                                            const val = result[0]?.rawValue;
                                                            if (val) {
                                                                console.log("QR Scanned Value:", val);
                                                                // Try to extract any number (roll number) from the QR
                                                                const cleanedVal = val.trim();

                                                                // Direct roll number
                                                                if (/^\d+$/.test(cleanedVal)) {
                                                                    processOnSpotScan(cleanedVal);
                                                                } else {
                                                                    // Extract digits from URL or mixed content
                                                                    const digits = cleanedVal.match(/\d+/g);
                                                                    if (digits) {
                                                                        // Take the longest number sequence (likely roll number)
                                                                        const rollNumber = digits.sort((a, b) => b.length - a.length)[0];
                                                                        processOnSpotScan(rollNumber);
                                                                    } else {
                                                                        setOnSpotError(`QR scanned: "${cleanedVal.substring(0, 50)}..." - No roll number found. Use Manual Entry.`);
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        onError={(err) => console.error(err)}
                                                        styles={{
                                                            container: { width: '100%', height: '100%' },
                                                            video: { objectFit: 'cover' }
                                                        }}
                                                        allowMultiple={false}
                                                        scanDelay={1500}
                                                    />
                                                    {/* Scanner Frame */}
                                                    <div className="absolute inset-0 pointer-events-none p-6">
                                                        <div className="w-full h-full border-2 border-orange-500/30 rounded-2xl relative">
                                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    Point camera at Student ID Card QR Code
                                                </p>

                                                {/* Manual Entry Toggle */}
                                                <button
                                                    onClick={() => setShowManualEntry(true)}
                                                    className="w-full py-3 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                                >
                                                    📝 QR not working? Enter Roll Number Manually
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {/* Manual Entry Form */}
                                                <div className="space-y-4">
                                                    <div className="text-center mb-4">
                                                        <User className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                                                        <h4 className="text-white font-bold uppercase">Manual Entry</h4>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enter student roll number</p>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={manualRollNumber}
                                                        onChange={(e) => setManualRollNumber(e.target.value)}
                                                        placeholder="Enter Roll Number (e.g., 23CSR001)"
                                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-center text-lg placeholder:text-slate-600 outline-none focus:border-orange-500 transition-all"
                                                    />

                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => {
                                                                setShowManualEntry(false);
                                                                setManualRollNumber('');
                                                            }}
                                                            className="flex-1 py-3 bg-white/5 text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                                        >
                                                            Back to Scan
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (manualRollNumber.trim()) {
                                                                    processOnSpotScan(manualRollNumber.trim());
                                                                    setShowManualEntry(false);
                                                                }
                                                            }}
                                                            disabled={!manualRollNumber.trim() || onSpotLoading}
                                                            className="flex-1 py-3 bg-orange-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-50"
                                                        >
                                                            {onSpotLoading ? 'Searching...' : 'Search Student'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {onSpotLoading && (
                                            <div className="text-center">
                                                <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-2" />
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fetching Student Data...</p>
                                            </div>
                                        )}

                                        {onSpotError && (
                                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                                <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                                                <p className="text-xs text-red-400 font-bold">{onSpotError}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : fetchedStudent ? (
                                    <div className="space-y-6">
                                        {/* Student Data Card */}
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black">
                                                    {fetchedStudent.fullName?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-white uppercase">{fetchedStudent.fullName}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{fetchedStudent.rollNumber}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-white/5 rounded-xl">
                                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Department</p>
                                                    <p className="text-xs font-bold text-white uppercase">{fetchedStudent.department}</p>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-xl">
                                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Year</p>
                                                    <p className="text-xs font-bold text-white uppercase">{fetchedStudent.yearOfStudy}</p>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-xl col-span-2">
                                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Email</p>
                                                    <p className="text-xs font-bold text-white truncate">{fetchedStudent.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {onSpotError && (
                                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                                <p className="text-xs text-red-400 font-bold">{onSpotError}</p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => {
                                                    setFetchedStudent(null);
                                                    setOnSpotScanning(true);
                                                    setOnSpotError('');
                                                }}
                                                disabled={onSpotLoading}
                                                className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <ScanLine className="w-4 h-4" />
                                                Scan Again
                                            </button>
                                            <button
                                                onClick={confirmOnSpotRegistration}
                                                disabled={onSpotLoading}
                                                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {onSpotLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Register & Check-In
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CheckinConsole;

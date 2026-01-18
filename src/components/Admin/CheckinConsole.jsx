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
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where, updateDoc, doc, onSnapshot, orderBy, limit, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Scanner } from '@yudiel/react-qr-scanner';

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
        // Simple audio feedback can be added here if desired
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
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10"
                >
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Check-in Console</h2>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Authentication Required</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organizer ID</label>
                            <input
                                required
                                type="text"
                                value={loginData.username}
                                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700"
                                placeholder="Enter Username"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Passkey</label>
                            <input
                                required
                                type="password"
                                value={loginData.password}
                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                placeholder="••••••••"
                            />
                        </div>

                        {loginError && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase">{loginError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Console'}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    if (!selectedEvent) {
        return (
            <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-12 font-sans">
                <div className="max-w-4xl mx-auto">
                    <header className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#0f172a] text-white rounded-2xl flex items-center justify-center shadow-lg">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 uppercase italic">Check-in Operations</h1>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select an active mission</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </header>

                    {loadingEvents ? (
                        <div className="flex flex-col items-center py-20">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Scanning for live events...</p>
                        </div>
                    ) : events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {events.map((event) => (
                                <motion.div
                                    key={event.id}
                                    whileHover={{ y: -5 }}
                                    className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                                    onClick={() => startCheckin(event)}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                            {event.type}
                                        </span>
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                                        {event.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-8 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> {event.attendeesCount || 0} Expected
                                    </p>
                                    <button className="w-full py-4 bg-slate-900 group-hover:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                                        Start Check-in Process
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                            <LayoutDashboard className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                            <h3 className="text-slate-900 font-black uppercase text-xl">No Live Missions</h3>
                            <p className="text-slate-400 text-sm font-medium mt-2">There are currently no events requiring check-in verification.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white overflow-hidden flex flex-col font-sans">
            {/* Header */}
            <header className="p-6 lg:p-10 flex items-center justify-between bg-white/5 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedEvent(null)}
                        className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-black uppercase italic leading-tight">{selectedEvent.title}</h2>
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1">Check-in Terminal Active</p>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-8">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Expected</p>
                        <p className="text-2xl font-black text-white">{stats.total}</p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Checked-in</p>
                        <p className="text-2xl font-black text-white">{stats.present}</p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Balance</p>
                        <p className="text-2xl font-black text-white">{stats.total - stats.present}</p>
                    </div>
                    {/* On-Spot Registration Button - Only show when registration is closed */}
                    {(selectedEvent.registrationOpen === false || selectedEvent.status === 'CLOSED') && (
                        <>
                            <div className="w-px h-10 bg-white/10" />
                            <button
                                onClick={() => {
                                    setShowOnSpotModal(true);
                                    setOnSpotScanning(true);
                                    setFetchedStudent(null);
                                    setOnSpotError('');
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
                            >
                                <UserPlus className="w-4 h-4" />
                                On-Spot Register
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:flex-row p-6 lg:p-10 gap-10">
                {/* Scanner Section */}
                <div className="flex-1 flex flex-col">
                    <div className="relative aspect-square max-w-lg mx-auto w-full bg-black rounded-[3rem] overflow-hidden border-4 border-white/10 shadow-2xl">
                        {isScanning ? (
                            <Scanner
                                onScan={(result) => {
                                    const val = result[0]?.rawValue;
                                    if (val) {
                                        // Check if QR contains college ID verification URL or direct roll number
                                        if (val.includes('ims.ritchennai.edu.in') || val.includes('http')) {
                                            processQRUrl(val); // Handle URL-based QR code
                                        } else {
                                            processCheckin(val); // Handle direct roll number QR
                                        }
                                    }
                                }}
                                onError={(err) => console.error(err)}
                                styles={{
                                    container: { width: '100%', height: '100%' },
                                    video: { objectFit: 'cover' }
                                }}
                                allowMultiple={false}
                                scanDelay={3000}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]">
                                <AnimatePresence mode="wait">
                                    {feedback && (
                                        <motion.div
                                            key={feedback.type}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="text-center p-8 w-full"
                                        >
                                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl ${feedback.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/30' :
                                                feedback.type === 'error' ? 'bg-red-500 shadow-red-500/30' :
                                                    feedback.type === 'warning' ? 'bg-orange-500 shadow-orange-500/30' : 'bg-blue-500'
                                                }`}>
                                                {feedback.type === 'success' && <CheckCircle2 className="w-12 h-12 text-white" />}
                                                {feedback.type === 'error' && <X className="w-12 h-12 text-white" />}
                                                {feedback.type === 'warning' && <AlertTriangle className="w-12 h-12 text-white" />}
                                                {feedback.type === 'loading' && <Loader2 className="w-12 h-12 text-white animate-spin" />}
                                            </div>
                                            <h3 className={`text-4xl font-black uppercase italic mb-4 ${feedback.type === 'success' ? 'text-emerald-400' :
                                                feedback.type === 'error' ? 'text-red-400' :
                                                    feedback.type === 'warning' ? 'text-orange-400' : 'text-blue-400'
                                                }`}>
                                                {feedback.message}
                                            </h3>
                                            <p className="text-xl font-bold text-slate-300 uppercase tracking-tight">{feedback.detail}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Scanner Decoration */}
                        <div className="absolute inset-0 pointer-events-none p-10">
                            <div className="w-full h-full border-2 border-blue-500/30 rounded-[2rem] relative">
                                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                            </div>
                        </div>
                        {isScanning && (
                            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500/50 shadow-[0_0_20px_blue] animate-scan z-10" />
                        )}
                    </div>

                    <div className="mt-12 text-center lg:hidden">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-3xl">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Regs</p>
                                <p className="text-xl font-black">{stats.total}</p>
                            </div>
                            <div className="bg-blue-600/20 p-4 rounded-3xl border border-blue-500/20">
                                <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">In</p>
                                <p className="text-xl font-black text-blue-400">{stats.present}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-3xl">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Left</p>
                                <p className="text-xl font-black">{stats.total - stats.present}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Panel Section */}
                <div className="w-full lg:w-96 flex flex-col gap-6">
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 flex-1">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6">Console Intelligence</h4>

                        <div className="space-y-6">
                            <div className="p-5 bg-white/5 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-0.5">Device Access</p>
                                    <p className="text-xs font-bold uppercase">Front Desk Terminal #1</p>
                                </div>
                            </div>

                            <div className="p-5 bg-white/5 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-0.5">Authorization</p>
                                    <p className="text-xs font-bold uppercase italic">Secure Protocol Layer</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10">
                            <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Recent Operations
                            </h5>
                            <div className="space-y-3">
                                {recentScans.length > 0 ? recentScans.map((scan, i) => (
                                    <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase text-white truncate">{scan.studentName}</p>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase">{scan.studentRoll} • {scan.time}</p>
                                        </div>
                                        <button
                                            onClick={() => undoCheckin(scan.regId)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            title="Undo Check-in"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-[10px] text-slate-600 font-bold italic text-center py-4 border-2 border-dashed border-white/5 rounded-2xl">
                                        No recent scans in this session
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-10 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20">
                            <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Operational Guide</h5>
                            <ul className="space-y-3">
                                <li className="text-[10px] text-slate-400 font-bold flex gap-2">
                                    <span className="text-blue-500">01.</span> Position QR Code within frame for auto-detection.
                                </li>
                                <li className="text-[10px] text-slate-400 font-bold flex gap-2">
                                    <span className="text-blue-500">02.</span> Successful scan triggers instant DB verification.
                                </li>
                                <li className="text-[10px] text-slate-400 font-bold flex gap-2">
                                    <span className="text-blue-500">03.</span> Use the 'X' button above to undo accidental scans.
                                </li>
                            </ul>
                        </div>

                        <div className="mt-auto pt-10">
                            <p className="text-[9px] text-slate-600 font-medium italic text-center">
                                Managed by TechSpark Core Engine • V2.0.4
                            </p>
                        </div>
                    </div>
                </div>
            </main>

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

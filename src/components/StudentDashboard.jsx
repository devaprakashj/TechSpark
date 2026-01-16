import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import ritLogo from '../assets/rit-logo.png';
import tsLogo from '../assets/techspark-logo.png';
import {
    User,
    Mail,
    Hash,
    Building2,
    Calendar,
    Phone,
    CheckCircle,
    Clock,
    Award,
    BookOpen,
    Zap,
    ExternalLink,
    AlertCircle,
    Download,
    QrCode,
    Rocket,
    Settings,
    CodeXml,
    Brain,
    Crown,
    Sparkles,
    Lock,
    LogOut,
    ShieldCheck,
    Smartphone,
    X,
    Loader2,
    Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [availableEvents, setAvailableEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [eventToRegister, setEventToRegister] = useState(null);
    const [isRegLoading, setIsRegLoading] = useState(false);
    const [certificates, setCertificates] = useState([]);
    const [certsLoading, setCertsLoading] = useState(true);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [activeFeedbackEvent, setActiveFeedbackEvent] = useState(null);
    const [feedbackData, setFeedbackData] = useState({
        overallRating: 5,
        contentQuality: 5,
        speakerPerformance: 5,
        relevance: 5,
        timeManagement: 5,
        engagement: 5,
        coordination: 5,
        likedMost: '',
        improvements: '',
        recommend: 'Yes'
    });
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [regMode, setRegMode] = useState('INDIVIDUAL');
    const [teamName, setTeamName] = useState('');
    const [teamCodeInput, setTeamCodeInput] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const idCardRef = useRef(null);
    const navigate = useNavigate();

    const handleFeedbackSubmit = async () => {
        if (!activeFeedbackEvent || !user) return;
        setSubmittingFeedback(true);
        try {
            const feedbackId = `${activeFeedbackEvent.id}_${user.uid}`;
            await setDoc(doc(db, 'feedback', feedbackId), {
                eventId: activeFeedbackEvent.id,
                eventTitle: activeFeedbackEvent.title,
                studentId: user.uid,
                studentName: user.fullName,
                studentRoll: user.rollNumber,
                studentDept: user.department,
                studentYear: user.yearOfStudy,
                // New 10 Fields
                overallRating: feedbackData.overallRating,
                contentQuality: feedbackData.contentQuality,
                speakerPerformance: feedbackData.speakerPerformance,
                relevance: feedbackData.relevance,
                timeManagement: feedbackData.timeManagement,
                engagement: feedbackData.engagement,
                coordination: feedbackData.coordination,
                likedMost: feedbackData.likedMost,
                improvements: feedbackData.improvements,
                recommend: feedbackData.recommend,
                submittedAt: serverTimestamp()
            });

            // Update registration to mark feedback as submitted and set status to Completed
            const regId = registrations.find(r => r.eventId === activeFeedbackEvent.id).id;
            await updateDoc(doc(db, 'registrations', regId), {
                feedbackSubmitted: true,
                status: 'Completed',
                eligibleForCertificate: true
            });

            alert("Thank you! Feedback submitted. You are now eligible to receive your certificate. 🎓🚀");
            setShowFeedbackModal(false);
            setFeedbackData({
                overallRating: 5,
                contentQuality: 5,
                speakerPerformance: 5,
                relevance: 5,
                timeManagement: 5,
                engagement: 5,
                coordination: 5,
                likedMost: '',
                improvements: '',
                recommend: 'Yes'
            });
        } catch (error) {
            console.error("Feedback error:", error);
            alert("Failed to submit feedback. Try again.");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const handleDownloadCard = () => {
        if (idCardRef.current === null) return;

        toPng(idCardRef.current, { cacheBust: true, pixelRatio: 3 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `TS-ID-${user.rollNumber}.png`;
                link.href = dataUrl;
                link.click();
                alert("Your TechSpark Digital Identity has been downloaded! 🎊");
            })
            .catch((err) => {
                console.error('Error generating card:', err);
                alert("Failed to download card. Please try again.");
            });
    };

    useEffect(() => {
        if (!user) return;

        // Fetch Registrations - Removed orderBy to ensure instant local update even with pending serverTimestamp
        const qRegs = query(
            collection(db, 'registrations'),
            where('userId', '==', user.uid)
        );

        const unsubscribeRegs = onSnapshot(qRegs, (snapshot) => {
            const regs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort locally to handle the order
            const sortedRegs = regs.sort((a, b) => {
                const dateA = a.registeredAt?.toDate?.() || new Date();
                const dateB = b.registeredAt?.toDate?.() || new Date();
                return dateB - dateA;
            });
            setRegistrations(sortedRegs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching registrations:", error);
            setLoading(false);
        });

        // Fetch Available Events - Removed server-side where/orderBy to avoid index requirements & ensure instant visibility
        const qEvents = query(collection(db, 'events'));

        const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
            const evs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAllEvents(evs);

            // Filter and Sort locally: Only show LIVE/CLOSED and sort by newest
            const filteredEvents = evs
                .filter(e => ['LIVE', 'CLOSED'].includes(e.status))
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

            setAvailableEvents(filteredEvents);
        }, (error) => {
            console.error("Error fetching events:", error);
        });

        return () => {
            unsubscribeRegs();
            unsubscribeEvents();
        };
    }, [user]);

    // Fetch Certificates from GAS API
    useEffect(() => {
        if (!user?.rollNumber) return;

        const fetchCertificates = async () => {
            try {
                const savedUrl = localStorage.getItem('certApiUrl');
                const defaultUrl = 'https://script.google.com/macros/s/AKfycbxS_2h3kCOMCtzGf5u976FNcHjBlBsA1U0qO0ZeSkckanlGqiDmBYUoN73944hsyczpUA/exec';
                const apiUrl = (!savedUrl || savedUrl.includes('AKfycbxVm9lozobl') || savedUrl.includes('AKfycbzkMhn07pp') || savedUrl.includes('AKfycbS_2h3kCOMCtzGf'))
                    ? defaultUrl
                    : savedUrl.trim();

                const separator = apiUrl.includes('?') ? '&' : '?';
                const finalUrl = `${apiUrl}${separator}query=${encodeURIComponent(user.rollNumber)}`;

                const response = await fetch(finalUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setCertificates(data);
                    } else if (data && data.status !== 'not_found' && data.status !== 'error') {
                        setCertificates([data]);
                    }
                }
            } catch (error) {
                console.error("Error fetching certificates:", error);
            } finally {
                setCertsLoading(false);
            }
        };

        fetchCertificates();
    }, [user.rollNumber]);

    const handleRegister = async (event) => {
        if (!user) return;

        try {
            // 1. Check if already registered
            const regId = `${event.id}_${user.uid}`;
            const regRef = doc(db, 'registrations', regId);
            const regSnap = await getDoc(regRef);

            if (regSnap.exists()) {
                alert("You have already registered for this event! ✅");
                return;
            }

            // Open confirmation flow
            setEventToRegister(event);
            setRegMode(event.isTeamEvent ? 'TEAM_CREATE' : 'INDIVIDUAL');
            setTeamName('');
            setTeamCodeInput('');
            setVerificationError('');
            setIsConfirming(true);
        } catch (error) {
            console.error("Auth check error:", error);
        }
    };

    const handleVerifyTeamCode = async () => {
        if (!teamCodeInput || !eventToRegister) return;
        setVerificationError('');
        setIsRegLoading(true);
        try {
            const q = query(
                collection(db, 'registrations'),
                where('teamCode', '==', teamCodeInput.toUpperCase())
            );
            const querySnapshot = await getDocs(q);

            const teammates = querySnapshot.docs.filter(doc => doc.data().eventId === eventToRegister.id);
            const leaderDoc = teammates.find(doc => doc.data().teamRole === 'LEADER');

            if (!leaderDoc) {
                setVerificationError("Invalid Team Code for this event. Please verify with your leader.");
            } else {
                const teamData = leaderDoc.data();
                const currentSize = teammates.length;
                const maxSize = eventToRegister.maxTeamSize || 4;

                if (currentSize >= maxSize) {
                    setVerificationError(`This squad (${teamData.teamName}) is already full (${currentSize}/${maxSize}).`);
                    setTeamName('');
                } else {
                    setTeamName(teamData.teamName);
                    alert(`Team Found: ${teamData.teamName}. Current members: ${currentSize}/${maxSize}. Proceed to join!`);
                }
            }
        } catch (error) {
            console.error("Team Verification Error:", error);
            setVerificationError("Encryption breach during verification. Try again.");
        } finally {
            setIsRegLoading(false);
        }
    };

    const confirmRegistration = async () => {
        if (!user || !eventToRegister) return;
        setIsRegLoading(true);

        try {
            const regId = `${eventToRegister.id}_${user.uid}`;
            const regRef = doc(db, 'registrations', regId);

            let generatedTeamCode = '';
            if (regMode === 'TEAM_CREATE') {
                if (!teamName.trim()) {
                    alert("A squad name is required for tactical deployment!");
                    setIsRegLoading(false);
                    return;
                }
                generatedTeamCode = `TS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            }

            if (regMode === 'TEAM_JOIN' && !teamName) {
                alert("Please verify your squad code before authorizing.");
                setIsRegLoading(false);
                return;
            }

            // Register for the event
            await setDoc(regRef, {
                eventId: eventToRegister.id,
                eventTitle: eventToRegister.title,
                eventDate: eventToRegister.date,
                eventTime: eventToRegister.time || 'TBA',
                userId: user.uid,
                studentName: user.fullName,
                studentEmail: user.email,
                studentPhone: user.phone || 'N/A',
                studentRoll: user.rollNumber,
                studentDept: user.department,
                studentYear: user.yearOfStudy,
                studentSection: user.section || 'N/A',
                registeredAt: serverTimestamp(),
                status: 'Upcoming',

                // Team Info
                isTeamRegistration: regMode !== 'INDIVIDUAL',
                teamRole: regMode === 'TEAM_CREATE' ? 'LEADER' : (regMode === 'TEAM_JOIN' ? 'MEMBER' : 'INDIVIDUAL'),
                teamName: regMode !== 'INDIVIDUAL' ? (teamName || 'Solo Ops') : '',
                teamCode: regMode === 'TEAM_CREATE' ? generatedTeamCode : (regMode === 'TEAM_JOIN' ? teamCodeInput.toUpperCase() : '')
            });

            // 2. Update attendee count atomically
            const eventRef = doc(db, 'events', eventToRegister.id);
            await updateDoc(eventRef, {
                attendeesCount: increment(1)
            });

            // 3. Reward Participation Points (Spark Points)
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                points: increment(50),
                badges: (user.points + 50) >= 50 && !user.badges?.includes('active-spark')
                    ? [...(user.badges || []), 'active-spark']
                    : (user.badges || [])
            });

            setIsConfirming(false);

            if (regMode === 'TEAM_CREATE') {
                alert(`🚀 TEAM CREATED! Your Squad Name: ${teamName}. Share Code: ${generatedTeamCode} with your teammates.`);
            } else if (regMode === 'TEAM_JOIN') {
                alert(`🎉 Successfully joined squad: ${teamName}!`);
            } else {
                alert(`🎉 Successfully registered for ${eventToRegister.title}! +50 Spark Points gained. 🚀`);
            }
            setEventToRegister(null);
        } catch (error) {
            console.error("Registration error:", error);
            alert("Mission failed. Please try again.");
        } finally {
            setIsRegLoading(false);
        }
    };

    if (!user) return null;

    const effectivePoints = Math.max(user.points || 0, 10);

    const stats = [
        { label: 'Events Registered', value: registrations.length, icon: <Calendar className="w-5 h-5" />, color: 'blue' },
        { label: 'Participation Points', value: effectivePoints, icon: <Award className="w-5 h-5" />, color: 'purple' },
        { label: 'Badges Unlocked', value: 0, icon: <Sparkles className="w-5 h-5" />, color: 'orange' },
        { label: 'Rank', value: effectivePoints > 500 ? 'Pro' : 'Novice', icon: <Zap className="w-5 h-5" />, color: 'green' },
    ];

    const badgeMap = [
        {
            id: 'spark-starter',
            name: 'Spark Starter',
            icon: <Rocket className="w-5 h-5" />,
            description: 'New member joined the club',
            color: 'from-blue-400 to-yellow-400',
            glow: 'shadow-blue-200',
            unlocked: true
        },
        {
            id: 'active-spark',
            name: 'Active Spark',
            icon: <div className="relative"><Rocket className="w-5 h-5" /><Zap className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400 fill-yellow-400" /></div>,
            description: 'Regular logins & 1-2 events',
            color: 'from-blue-500 via-yellow-400 to-blue-600',
            glow: 'shadow-yellow-200',
            unlocked: (user.points >= 50 || user.badges?.includes('active-spark'))
        },
        {
            id: 'builder-spark',
            name: 'Builder Spark',
            icon: <div className="relative"><Settings className="w-5 h-5" /><CodeXml className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" /></div>,
            description: 'Submitted a project or hackathon',
            color: 'from-blue-600 via-indigo-600 to-yellow-500',
            glow: 'shadow-indigo-200',
            unlocked: (user.points >= 150 || user.badges?.includes('builder-spark'))
        },
        {
            id: 'pro-spark',
            name: 'Pro Spark',
            icon: <div className="relative"><BookOpen className="w-5 h-5" /><Brain className="w-3 h-3 absolute -top-1 -right-1 text-cyan-400" /></div>,
            description: 'Multiple projects & mentor',
            color: 'from-indigo-800 via-blue-700 to-cyan-400',
            glow: 'shadow-cyan-400/50',
            unlocked: (user.points >= 500 || user.badges?.includes('pro-spark'))
        },
        {
            id: 'spark-leader',
            name: 'Spark Leader',
            icon: <div className="relative"><Crown className="w-5 h-5" /><Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400" /></div>,
            description: 'Core team or admin role',
            color: 'from-blue-900 via-yellow-500 to-yellow-300',
            glow: 'shadow-yellow-400/50',
            unlocked: user.role === 'admin' || user.role === 'core' || user.badges?.includes('spark-leader')
        }
    ];

    stats[2].value = badgeMap.filter(b => b.unlocked).length;

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="relative z-10">
                        <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-4xl font-extrabold shadow-xl border-4 border-white">
                            {user.fullName?.charAt(0)}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.5 }}
                                className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full p-1 shadow-lg border border-slate-100 flex items-center justify-center group cursor-pointer"
                            >
                                <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center shadow-inner">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                    VERIFIED MEMBER
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="relative z-10 flex-1 text-center md:text-left space-y-3">
                        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                            Welcome back, <span className="text-blue-600">{user.fullName?.split(' ')[0]}!</span>
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-3 gap-x-4">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-200/50">
                                <Building2 className="w-3.5 h-3.5" /> {user.department || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-200/50">
                                <Hash className="w-3.5 h-3.5" /> Section {user.section || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-wider border border-blue-100">
                                <Zap className="w-3.5 h-3.5" /> Year {user.yearOfStudy || 'N/A'}
                            </span>
                            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                <Phone className="w-3.5 h-3.5" /> +91 {user.phone || 'XXXXXXXXXX'}
                            </span>
                        </div>
                    </div>

                    <div className="relative z-10 flex gap-3">
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats Grid */}
                        <div id="student-overview" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.map((stat, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-blue-50 text-blue-600 uppercase">
                                        {stat.icon}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                                    <div className="text-xs text-slate-500 font-medium mt-1">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Registered Events */}
                        <div id="registered-events" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Registered Events
                                </h2>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {registrations.length} Total
                                </span>
                            </div>
                            <div className="p-6">
                                {loading ? (
                                    <div className="flex flex-col items-center py-12 space-y-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                        <p className="text-sm text-slate-400">Loading your events...</p>
                                    </div>
                                ) : registrations.length > 0 ? (
                                    <div className="space-y-4">
                                        {registrations.map((reg, idx) => {
                                            const eventActualData = allEvents.find(e => e.id === reg.eventId);
                                            const isCheckedIn = reg.isAttended || reg.status === 'Present';
                                            const currentStatus = isCheckedIn ? 'CHECKED-IN' :
                                                (eventActualData?.status === 'COMPLETED' ? 'COMPLETED' :
                                                    (eventActualData?.status === 'CLOSED' ? 'CLOSED' : (reg.status || 'Upcoming')));

                                            return (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all duration-300">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold">
                                                            <span className="uppercase">{reg.eventDate?.split(' ')[0]}</span>
                                                            <span className="text-lg leading-none">{reg.eventDate?.split(' ')[1]?.replace(',', '')}</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{reg.eventTitle}</h3>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                                <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                                    <Clock className="w-3 h-3" /> {reg.eventTime}
                                                                </p>
                                                                {reg.isTeamRegistration && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase italic">
                                                                            Squad: {reg.teamName}
                                                                        </span>
                                                                        {reg.teamRole === 'LEADER' && (
                                                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase italic flex items-center gap-1">
                                                                                <Crown className="w-3 h-3" /> Code: {reg.teamCode}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {isCheckedIn && (
                                                                    <span className="text-[8px] text-emerald-600 flex items-center gap-0.5 font-black uppercase">
                                                                        <CheckCircle className="w-2 h-2" /> Verified Entry
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {eventActualData?.status === 'COMPLETED' ? (
                                                            isCheckedIn ? (
                                                                reg.feedbackSubmitted ? (
                                                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase border border-blue-100">
                                                                        COMPLETED
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveFeedbackEvent({ id: reg.eventId, title: reg.eventTitle });
                                                                            setShowFeedbackModal(true);
                                                                        }}
                                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                                                    >
                                                                        SUBMIT FEEDBACK
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <span className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-[10px] font-black uppercase border border-red-100 tracking-widest">
                                                                    ABSENT
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${isCheckedIn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                                                                currentStatus === 'Upcoming' ? 'bg-orange-50 text-orange-600' :
                                                                    'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                {currentStatus?.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-12 text-center space-y-3">
                                        <AlertCircle className="w-12 h-12 text-slate-200" />
                                        <p className="text-slate-500 font-medium">No registered events yet.</p>
                                        <button onClick={() => navigate('/events')} className="text-blue-600 text-sm font-bold hover:underline">
                                            Explore Events
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Opportunities or Confirmation Area */}
                        <div id="live-events" className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                            {isConfirming && eventToRegister ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 md:p-10 text-left h-full flex flex-col"
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Mission Briefing</h2>
                                                <p className="text-[8px] md:text-[10px] text-blue-600 font-bold tracking-widest uppercase">Verified Registration Process</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsConfirming(false)}
                                            className="px-3 py-1.5 md:px-4 md:py-2 text-[8px] md:text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-1 transition-colors border border-slate-100 rounded-lg sm:border-none"
                                        >
                                            <X className="w-4 h-4" /> ABORT
                                        </button>
                                    </div>

                                    <div className="space-y-6 md:space-y-8 flex-1">
                                        <div className="p-6 md:p-8 bg-blue-50 border border-blue-100 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform hidden md:block">
                                                <Rocket className="w-16 h-16 text-blue-600" />
                                            </div>
                                            <p className="text-[9px] md:text-[10px] text-blue-500 font-extrabold uppercase tracking-[0.2em] mb-4">Target Operation:</p>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 relative z-10">
                                                <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{eventToRegister.title}</h3>
                                                <p className="text-[10px] md:text-sm font-black text-blue-600 italic font-mono uppercase tracking-tighter bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-blue-100">{eventToRegister.date}</p>
                                            </div>
                                        </div>

                                        {eventToRegister.isTeamEvent && (
                                            <div className="space-y-4">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Team Deployment Strategy</p>
                                                <div className="flex bg-slate-100 p-1.5 rounded-[1.2rem] gap-1.5">
                                                    <button
                                                        onClick={() => setRegMode('TEAM_CREATE')}
                                                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${regMode === 'TEAM_CREATE' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                                    >
                                                        Create Team
                                                    </button>
                                                    <button
                                                        onClick={() => setRegMode('TEAM_JOIN')}
                                                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${regMode === 'TEAM_JOIN' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                                    >
                                                        Join Team
                                                    </button>
                                                </div>

                                                {regMode === 'TEAM_CREATE' ? (
                                                    <div className="animate-in fade-in slide-in-from-top-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block italic">Assign Squad Designation (Team Name)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. CYBER KNIGHTS"
                                                            value={teamName}
                                                            onChange={(e) => setTeamName(e.target.value)}
                                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all uppercase"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block italic">Enter Authorization Code (Team Code)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. TS-ABCD"
                                                                value={teamCodeInput}
                                                                onChange={(e) => {
                                                                    setTeamCodeInput(e.target.value);
                                                                    setTeamName('');
                                                                    setVerificationError('');
                                                                }}
                                                                className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all uppercase"
                                                            />
                                                            <button
                                                                onClick={handleVerifyTeamCode}
                                                                disabled={isRegLoading || !teamCodeInput}
                                                                className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-50"
                                                            >VERIFY</button>
                                                        </div>
                                                        {verificationError && <p className="text-[9px] text-red-500 font-bold ml-1 uppercase">{verificationError}</p>}
                                                        {teamName && <p className="text-[10px] text-emerald-600 font-black ml-1 uppercase italic flex items-center gap-2 tracking-widest">
                                                            <CheckCircle className="w-4 h-4" /> AUTHENTICATED: {teamName}
                                                        </p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Identity Profile</p>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Name</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">{user.fullName}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Hash className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Global ID</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">{user.rollNumber}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Mobile Link</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase">+91 {user.phone || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Digital Signal</p>
                                                                <p className="text-[10px] md:text-[11px] font-black text-slate-800 lowercase truncate">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Structural Data</p>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <Building2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Division</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">{user.department}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Phase System</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">YEAR {user.yearOfStudy} • SEC {user.section || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col lg:flex-row items-center gap-6 p-6 md:p-8 bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] border border-blue-500/20 shadow-xl">
                                            <div className="flex-1 text-center lg:text-left">
                                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Final Authorization Required</p>
                                                <p className="text-[9px] text-slate-500 italic max-w-sm mx-auto lg:mx-0">By authorizing, your secure profile signature will be transmitted for logistics and entry verification.</p>
                                            </div>
                                            <button
                                                onClick={confirmRegistration}
                                                disabled={isRegLoading}
                                                className="w-full lg:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-w-[240px] shadow-lg shadow-blue-500/20"
                                            >
                                                {isRegLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        AUTHORIZE SEAT <CheckCircle className="w-5 h-5" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <Rocket className="w-5 h-5 text-blue-600" />
                                            Live Opportunities
                                        </h2>
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">New Events Active</span>
                                    </div>
                                    <div className="p-6">
                                        {availableEvents.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {availableEvents.map((event) => {
                                                    const isRegistered = registrations.some(r => r.eventId === event.id || r.eventTitle === event.title);
                                                    return (
                                                        <div key={event.id} className="p-5 bg-white border border-slate-200 rounded-[2rem] hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[2rem] flex items-center justify-center -mr-2 -mt-2 group-hover:bg-blue-600 transition-colors">
                                                                <ExternalLink className="w-5 h-5 text-blue-200 group-hover:text-white" />
                                                            </div>
                                                            <div className="mb-4 text-left">
                                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">{event.type || 'WORKSHOP'}</span>
                                                                <h3 className="text-lg font-black text-slate-800 mt-2 uppercase leading-snug group-hover:text-blue-600 transition-colors">{event.title}</h3>
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" /> {event.date}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                                        <Building2 className="w-3 h-3" /> {event.venue}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isRegistered ? (
                                                                <div className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> REGISTERED
                                                                </div>
                                                            ) : event.status === 'CLOSED' ? (
                                                                <div className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 border border-slate-100">
                                                                    <Lock className="w-3.5 h-3.5" /> REGISTRATION CLOSED
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleRegister(event)}
                                                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-blue-600 transition-all"
                                                                >
                                                                    REGISTER NOW
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-12 flex flex-col items-center text-center">
                                                <Rocket className="w-12 h-12 text-slate-100 mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active opportunities just yet</p>
                                                <p className="text-slate-300 text-[10px] mt-2 italic font-medium">Keep an eye out for updates!</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Certificate Vault */}
                        <div id="certificate-vault" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/20">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    Certificate Vault
                                </h2>
                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                    {certificates.length} Verified
                                </span>
                            </div>
                            <div className="p-6">
                                {certsLoading ? (
                                    <div className="flex flex-col items-center py-8 space-y-3">
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accessing Secure Records...</p>
                                    </div>
                                ) : certificates.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {certificates.map((cert, idx) => (
                                            <div key={idx} className="p-5 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all group">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                        <Award className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg uppercase tracking-wider border border-slate-100">
                                                        {cert.certificateId || cert.certID || 'ID:N/A'}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-black text-slate-800 uppercase leading-snug mb-1 group-hover:text-blue-600 transition-colors">
                                                    {cert.eventName || cert.event || 'TechSpark Event'}
                                                </h3>
                                                <p className="text-[10px] text-slate-500 font-bold mb-4 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {typeof cert.date === 'object' ? new Date(cert.date).toLocaleDateString() : cert.date || 'Multiple'}
                                                </p>

                                                {(cert.certificateUrl || cert.link) && (
                                                    <a
                                                        href={cert.certificateUrl || cert.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Download className="w-3.5 h-3.5" /> Download PDF
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center space-y-3">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                                            <Award className="w-6 h-6 text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No certificates found in vault</p>
                                        <p className="text-slate-300 text-[9px] italic">Participate in events to earn certifications!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                Academic Profile
                            </h2>
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-600">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student Name</p>
                                        <p className="text-sm font-bold text-slate-700 uppercase">{user.fullName || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Reg Number</p>
                                        <p className="text-sm font-bold text-slate-700">{user.rollNumber || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Department</p>
                                        <p className="text-sm font-bold text-slate-700">{user.department || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Year</p>
                                        <p className="text-sm font-bold text-blue-600">Year {user.yearOfStudy || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Admission Batch</p>
                                        <p className="text-sm font-bold text-slate-700">{user.admissionYear || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                        <p className="text-xs font-bold text-slate-700 truncate">{user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                        <p className="text-xs font-bold text-slate-700">+91 {user.phone || 'XXXXXXXXXX'}</p>
                                    </div>
                                    <div className="mt-4 p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3 group hover:border-blue-400 transition-all">
                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                                            <QRCodeSVG value={user.rollNumber || "TECHSPARK-GUEST"} size={120} level={"H"} includeMargin={false} imageSettings={{ src: tsLogo, x: undefined, y: undefined, height: 24, width: 24, excavate: true }} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digital Entry QR</p>
                                            <p className="text-[9px] text-blue-600 font-medium font-mono">{user.rollNumber || 'NO-REG-DATA'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="digital-id-card" className="pt-6 border-t border-slate-100">
                                <button onClick={handleDownloadCard} className="w-full bg-blue-600 text-white p-6 rounded-2xl relative overflow-hidden group cursor-pointer text-left focus:outline-none shadow-lg shadow-blue-100">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
                                    <h3 className="text-lg font-bold mb-1">TS Digital Identity</h3>
                                    <p className="text-blue-100 text-xs mb-4 uppercase font-bold tracking-tight">Your official club member badge.</p>
                                    <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm group-hover:bg-white group-hover:text-blue-600 transition-all uppercase">
                                        DOWNLOAD CARD <Download className="w-3 h-3" />
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    Spark Badges
                                </h2>
                                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    {effectivePoints} XP
                                </div>
                            </div>
                            <div className="space-y-4">
                                {badgeMap.map((badge) => (
                                    <motion.div key={badge.id} whileHover={{ x: 4 }} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${badge.unlocked ? 'bg-slate-50 border-slate-100' : 'bg-white border-dashed border-slate-200 opacity-40 grayscale group'}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${badge.color} text-white shadow-lg ${badge.unlocked ? badge.glow : ''}`}>
                                            {badge.icon}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-sm font-bold text-slate-800 uppercase truncate">{badge.name}</h3>
                                                {!badge.unlocked && <Lock className="w-3 h-3 text-slate-400" />}
                                                {badge.unlocked && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium leading-tight">{badge.unlocked ? badge.description : `Unlock: ${badge.description}`}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-4">Points Progress</p>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((effectivePoints / 1000) * 100, 100)}%` }} className="h-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                    <span>{effectivePoints} XP</span>
                                    <span>1000 XP Goal</span>
                                </div>
                            </div>
                        </div>
                    </div >
                </div >

                {/* HIDDEN ID CARD TEMPLATE */}
                <div className="fixed -left-[2000px] top-0 pointer-events-none">
                    <div ref={idCardRef} className="w-[400px] h-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col relative" style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                        <div className="h-40 bg-gradient-to-br from-blue-700 to-indigo-900 p-6 flex flex-col justify-between items-center relative overflow-hidden text-center">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                            <div className="relative z-10 flex items-center justify-between w-full bg-white px-4 py-3 rounded-xl shadow-md border border-white/50">
                                <img src={ritLogo} alt="RIT" className="h-6 w-auto" />
                                <div className="w-px h-6 bg-slate-200 mx-2" />
                                <img src={tsLogo} alt="TechSpark" className="h-6 w-auto" />
                            </div>
                            <h2 className="relative z-10 text-white text-xs font-bold tracking-[0.2em] uppercase mt-4">OFFICIAL MEMBER IDENTITY</h2>
                        </div>
                        <div className="flex flex-col items-center -mt-14 relative z-20">
                            <div className="w-28 h-28 bg-white p-1 rounded-2xl shadow-xl">
                                <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-3xl overflow-hidden border border-slate-50 uppercase">
                                    {user.fullName?.charAt(0)}
                                </div>
                            </div>
                            <h1 className="text-xl font-extrabold text-slate-800 mt-4 uppercase">{user.fullName}</h1>
                            <p className="text-blue-600 text-[10px] font-bold tracking-widest uppercase">TECHSPARK CLUB MEMBER</p>
                        </div>
                        <div className="flex-1 p-8 pt-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Register Number</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5"><Hash className="w-3 h-3 text-blue-600" /> {user.rollNumber}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admission Year</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-600" /> {user.admissionYear}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5 uppercase"><Building2 className="w-3 h-3 text-blue-600" /> {user.department}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Section</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5 uppercase"><CheckCircle className="w-3 h-3 text-blue-600" /> {user.section}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="space-y-1 text-left">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Verification ID</p>
                                    <p className="text-[11px] text-slate-900 font-mono">TS-IDENTITY-{user.rollNumber?.slice(-4)}</p>
                                </div>
                                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center p-1 opacity-60">
                                    <QrCode className="w-full h-full text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-blue-600" /> IGNITING INNOVATION @ RIT CHENNAI
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feedback Modal */}
                <AnimatePresence>
                    {showFeedbackModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowFeedbackModal(false)}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                {/* Header */}
                                <div className="p-8 bg-blue-600 text-white text-left relative shrink-0">
                                    <button
                                        onClick={() => setShowFeedbackModal(false)}
                                        className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                        <Rocket className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Mission Feedback</h3>
                                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Refining future operations: {activeFeedbackEvent?.title}</p>
                                </div>

                                <div className="p-8 space-y-8 text-left overflow-y-auto custom-scrollbar">
                                    {/* Info Notice */}
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black text-amber-900 uppercase italic leading-tight">Certificate Requirement</p>
                                            <p className="text-[10px] text-amber-700 font-bold mt-1 uppercase leading-relaxed">
                                                Please complete this feedback form to unlock your event certificate. Every field is mandatory for mission debriefing.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 1. Overall Event Rating */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1️⃣ Overall Event Rating</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setFeedbackData({ ...feedbackData, overallRating: val })}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${feedbackData.overallRating >= val
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                                                        : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <Zap className={`w-5 h-5 ${feedbackData.overallRating >= val ? 'fill-current' : ''}`} />
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase italic text-center">
                                            {['Very Poor', 'Poor', 'Fair', 'Excellent', 'Absolute Brilliance!'][feedbackData.overallRating - 1]}
                                        </p>
                                    </div>

                                    {/* Reusable Linear Scale Renderer */}
                                    {[
                                        { id: 'contentQuality', num: '2️⃣', label: 'Session / Content Quality' },
                                        { id: 'speakerPerformance', num: '3️⃣', label: 'Speaker / Resource Person Performance' },
                                        { id: 'relevance', num: '4️⃣', label: 'Relevance to Learning / Career' },
                                        { id: 'timeManagement', num: '5️⃣', label: 'Time Management of the Event' },
                                        { id: 'engagement', num: '6️⃣', label: 'Interaction & Engagement Level' },
                                        { id: 'coordination', num: '7️⃣', label: 'Overall Coordination by TechSpark Team' }
                                    ].map((field) => (
                                        <div key={field.id} className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.num} {field.label}</label>
                                            <div className="flex items-center justify-between gap-2 px-2">
                                                {[1, 2, 3, 4, 5].map((val) => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setFeedbackData({ ...feedbackData, [field.id]: val })}
                                                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${feedbackData[field.id] === val
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex justify-between px-2 text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                                                <span>POOR/LOW</span>
                                                <span>EXCELLENT/HIGH</span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* 8. What did you like most? */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">8️⃣ What did you like most about the event?</label>
                                        <textarea
                                            value={feedbackData.likedMost}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, likedMost: e.target.value })}
                                            placeholder="Highlight the strongest points of this mission..."
                                            className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-slate-800 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                                        />
                                    </div>

                                    {/* 9. Improvements */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">9️⃣ What can be improved in future events?</label>
                                        <textarea
                                            value={feedbackData.improvements}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, improvements: e.target.value })}
                                            placeholder="How can we optimize the next deployment?"
                                            className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-slate-800 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                                        />
                                    </div>

                                    {/* 10. Recommend */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">🔟 Would you recommend TechSpark Club events to others?</label>
                                        <div className="flex gap-2">
                                            {['Yes', 'Maybe', 'No'].map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setFeedbackData({ ...feedbackData, recommend: opt })}
                                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${feedbackData.recommend === opt
                                                        ? opt === 'Yes' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' :
                                                            opt === 'Maybe' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' :
                                                                'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100'
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 sticky bottom-0 bg-white/80 backdrop-blur-sm -mx-8 px-8 pb-4">
                                        <button
                                            onClick={handleFeedbackSubmit}
                                            disabled={submittingFeedback}
                                            className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {submittingFeedback ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" /> DISPATCHING...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" /> TRANSMIT & UNLOCK CERTIFICATE
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudentDashboard;

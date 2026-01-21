import { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, Clock, Filter, Tag, Users, Rocket, X, ShieldCheck, Smartphone, Hash, Building2, GraduationCap, CheckCircle, Users as UsersIcon, Trophy, Plus, LogIn, Zap, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, query, orderBy, updateDoc, increment, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { AnimatePresence, motion } from 'framer-motion';

const Events = () => {
    const { user, openAuthModal } = useAuth();
    const [filter, setFilter] = useState('All');
    const [liveEvents, setLiveEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [eventToRegister, setEventToRegister] = useState(null);
    const [isRegLoading, setIsRegLoading] = useState(false);

    // Team Registration States
    const [regMode, setRegMode] = useState('INDIVIDUAL'); // INDIVIDUAL, TEAM_CREATE, TEAM_JOIN
    const [teamName, setTeamName] = useState('');
    const [teamCodeInput, setTeamCodeInput] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [selectedProblemStatement, setSelectedProblemStatement] = useState('');
    const [customProblemStatement, setCustomProblemStatement] = useState('');
    const [isCustomProblem, setIsCustomProblem] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLiveEvents(eventsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRegister = async (event) => {
        if (!user) {
            openAuthModal();
            return;
        }

        if (user.role === 'alumni') {
            alert("Sorry! This event is exclusive for current students.");
            return;
        }

        // Check if already registered first
        try {
            const regId = `${event.id}_${user.uid}`;
            const regRef = doc(db, 'registrations', regId);
            const regSnap = await getDoc(regRef);

            if (regSnap.exists()) {
                alert("You have already registered for this event! Check your dashboard. ✅");
                return;
            }

            // Open event details modal first
            setEventToRegister(event);
            setIsEventDetailsModalOpen(true);
        } catch (error) {
            console.error("Auth check error:", error);
        }
    };

    const handleVerifyTeamCode = async () => {
        if (!teamCodeInput) return;
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
            setVerificationError("Failed to verify code.");
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

            let registrationData = {
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
                problemStatement: eventToRegister.type === 'Hackathon' ? (isCustomProblem ? customProblemStatement : selectedProblemStatement) : ''
            };

            if (eventToRegister.isTeamEvent) {
                if (regMode === 'TEAM_CREATE') {
                    if (!teamName) {
                        alert("Please enter a team name!");
                        setIsRegLoading(false);
                        return;
                    }
                    const generatedCode = `TS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    registrationData = {
                        ...registrationData,
                        isTeamRegistration: true,
                        teamName: teamName,
                        teamCode: generatedCode,
                        teamRole: 'LEADER'
                    };
                } else {
                    if (!teamCodeInput || !teamName) {
                        alert("Please verify a team code first!");
                        setIsRegLoading(false);
                        return;
                    }
                    registrationData = {
                        ...registrationData,
                        isTeamRegistration: true,
                        teamName: teamName,
                        teamCode: teamCodeInput.toUpperCase(),
                        teamRole: 'MEMBER'
                    };
                }
            }

            await setDoc(regRef, registrationData);

            const eventRef = doc(db, 'events', eventToRegister.id);
            await updateDoc(eventRef, {
                attendeesCount: increment(1)
            });

            setIsConfirmModalOpen(false);
            if (registrationData.teamRole === 'LEADER') {
                alert(`🎉 Successfully created team "${registrationData.teamName}"!\n\nYOUR TEAM CODE: ${registrationData.teamCode}\n\nShare this code with your teammates so they can join your squad! 🚀`);
            } else if (registrationData.teamRole === 'MEMBER') {
                alert(`🎉 Successfully joined team "${registrationData.teamName}"! Check your dashboard. 🚀`);
            } else {
                alert(`🎉 Successfully registered for ${eventToRegister.title}! Check your dashboard.`);
            }
        } catch (error) {
            console.error("Registration finalization error:", error);
            alert("Something went wrong. Please try again later.");
        } finally {
            setIsRegLoading(false);
        }
    };

    const proceedToRegistration = () => {
        setIsEventDetailsModalOpen(false);
        setRegMode(eventToRegister?.isTeamEvent ? 'TEAM_CREATE' : 'INDIVIDUAL');
        setTeamName('');
        setTeamCodeInput('');
        setVerificationError('');
        setSelectedProblemStatement('');
        setCustomProblemStatement('');
        setIsCustomProblem(false);
        setIsConfirmModalOpen(true);
    };

    const types = ['All', 'WORKSHOP', 'COMPETITION', 'HACKATHON', 'SEMINAR'];

    // Filter events based on type AND department restrictions
    const filteredEvents = liveEvents.filter(event => {
        // Filter by event type
        const matchesType = filter === 'All' || event.type === filter;

        // Filter by department restriction (if set)
        let matchesDepartment = true;
        if (event.audienceType === 'Specific' && event.departments && event.departments.length > 0) {
            // If user is logged in, check their department
            if (user && user.department) {
                matchesDepartment = event.departments.includes(user.department);
            } else {
                // If not logged in, hide restricted events
                matchesDepartment = false;
            }
        }

        return matchesType && matchesDepartment;
    });

    const getColorClasses = (type) => {
        const colors = {
            WORKSHOP: 'bg-blue-100 text-blue-700',
            HACKATHON: 'bg-purple-100 text-purple-700',
            COMPETITION: 'bg-pink-100 text-pink-700',
            SEMINAR: 'bg-emerald-100 text-emerald-700',
        };
        return colors[type] || 'bg-slate-100 text-slate-700';
    };

    return (
        <section id="events" className="py-24 bg-slate-50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

            <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900 tracking-tight uppercase italic">
                        Live <span className="text-blue-600">Opportunities</span>
                    </h2>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                        Join us for exciting workshops, hackathons, and tech talks. Connect, learn, and grow with the community.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center mb-16">
                    {types.map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-6 py-2.5 rounded-2xl font-black text-xs tracking-widest transition-all duration-300 ${filter === type
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching Latest Events...</p>
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredEvents.map((event) => (
                            <div
                                key={event.id}
                                className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 relative flex flex-col h-full"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem] group-hover:bg-blue-600 transition-colors duration-500 flex items-center justify-center -mr-4 -mt-4">
                                    <Calendar className="w-8 h-8 text-blue-200 group-hover:text-white/40 transition-colors" />
                                </div>

                                <div className="p-8 pb-4 flex-1">
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase ${getColorClasses(event.type)}`}>
                                            {event.type}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                                            <Clock className="w-3.5 h-3.5" />
                                            {event.date}
                                        </span>
                                        {event.audienceType === 'Specific' && event.departments && event.departments.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-lg text-[8px] font-black tracking-widest uppercase bg-purple-100 text-purple-600 border border-purple-200">
                                                {event.departments.length === 1 ? event.departments[0] : `${event.departments.length} Depts`}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-800 mb-4 group-hover:text-blue-600 transition-colors uppercase leading-tight">
                                        {event.title}
                                    </h3>

                                    <p className="text-slate-500 text-sm font-medium mb-6 line-clamp-3 leading-relaxed">
                                        {event.description}
                                    </p>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                            <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <span>{event.venue}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                            <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <span>{event.attendeesCount || 0} Registered</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 pt-0 mt-auto">
                                    {(event.status === 'CLOSED' || event.registrationOpen === false) ? (
                                        <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 border border-slate-200">
                                            <Lock className="w-4 h-4" />
                                            Registration Closed
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleRegister(event)}
                                            className="w-full py-4 bg-slate-900 group-hover:bg-blue-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg shadow-slate-200 group-hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                                        >
                                            Register Now
                                            <Rocket className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <Tag className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">No Events Currently Live</h3>
                        <p className="text-slate-400 font-medium text-sm mt-2">We're planning something big! Stay tuned for upcoming {filter.toLowerCase()} events.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isEventDetailsModalOpen && eventToRegister && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEventDetailsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 z-10 p-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase mb-3 bg-white/20">
                                        {eventToRegister.type}
                                    </span>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">
                                        {eventToRegister.title}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setIsEventDetailsModalOpen(false)}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">About This Event</h3>
                                    <p className="text-slate-700 leading-relaxed">
                                        {eventToRegister.detailedDescription || eventToRegister.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Date & Time</span>
                                        </div>
                                        <p className="text-slate-800 font-bold text-sm">{eventToRegister.date}</p>
                                        <p className="text-slate-600 text-xs">{eventToRegister.time}</p>
                                    </div>

                                    <div className="bg-purple-50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                                            <MapPin className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Venue</span>
                                        </div>
                                        <p className="text-slate-800 font-bold text-sm">{eventToRegister.venue}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={proceedToRegistration}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-3"
                                >
                                    <Rocket className="w-5 h-5" />
                                    Register for This Event
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isConfirmModalOpen && eventToRegister && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isRegLoading && setIsConfirmModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                        <ShieldCheck className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-tight italic">Confirm Details</h3>
                                </div>
                                <button onClick={() => setIsConfirmModalOpen(false)} className="text-white/50 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1.5">You are registering for:</p>
                                    <h4 className="text-lg font-black text-slate-900 uppercase italic leading-none">{eventToRegister.title}</h4>
                                </div>

                                {eventToRegister.isTeamEvent && (
                                    <div className="space-y-4">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Team Strategy</p>
                                        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
                                            <button
                                                onClick={() => setRegMode('TEAM_CREATE')}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${regMode === 'TEAM_CREATE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Create Team
                                            </button>
                                            <button
                                                onClick={() => setRegMode('TEAM_JOIN')}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${regMode === 'TEAM_JOIN' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Join Team
                                            </button>
                                        </div>

                                        {regMode === 'TEAM_CREATE' ? (
                                            <input
                                                type="text"
                                                placeholder="SQUAD NAME"
                                                value={teamName}
                                                onChange={(e) => setTeamName(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-blue-500/5 transition-all uppercase"
                                            />
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="TEAM CODE"
                                                        value={teamCodeInput}
                                                        onChange={(e) => {
                                                            setTeamCodeInput(e.target.value);
                                                            setTeamName('');
                                                            setVerificationError('');
                                                        }}
                                                        className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-blue-500/5 transition-all uppercase"
                                                    />
                                                    <button onClick={handleVerifyTeamCode} className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Verify</button>
                                                </div>
                                                {verificationError && <p className="text-[9px] text-red-500 font-bold ml-1">{verificationError}</p>}
                                                {teamName && <p className="text-[10px] text-emerald-600 font-black ml-1 uppercase italic">AUTHENTICATED: {teamName}</p>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {eventToRegister.type === 'HACKATHON' && (
                                    <div className="space-y-4">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Problem Statement</p>
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {(eventToRegister.problemStatements || []).map((ps, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedProblemStatement(ps);
                                                        setIsCustomProblem(false);
                                                    }}
                                                    className={`p-4 rounded-2xl border text-left transition-all ${selectedProblemStatement === ps && !isCustomProblem ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}
                                                >
                                                    <p className="text-xs font-bold">{ps}</p>
                                                </button>
                                            ))}
                                            {eventToRegister.allowOpenStatement && (
                                                <div className="space-y-2.5">
                                                    <button
                                                        onClick={() => {
                                                            setIsCustomProblem(true);
                                                            setSelectedProblemStatement('');
                                                        }}
                                                        className={`w-full p-4 rounded-2xl border text-left transition-all ${isCustomProblem ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-800'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Zap size={16} />
                                                            <p className="text-xs font-black uppercase">Declare Own Statement</p>
                                                        </div>
                                                    </button>
                                                    {isCustomProblem && (
                                                        <textarea
                                                            placeholder="DESCRIBE YOUR CHALLENGE..."
                                                            value={customProblemStatement}
                                                            onChange={(e) => setCustomProblemStatement(e.target.value)}
                                                            className="w-full h-24 px-4 py-3 bg-white border-2 border-slate-900 rounded-xl outline-none font-bold text-xs transition-all resize-none italic uppercase"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Identity</p>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase truncate">
                                            {user.fullName}
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase">
                                            {user.rollNumber}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Academic</p>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase truncate">
                                            {user.department}
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase">
                                            YEAR {user.yearOfStudy}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 flex items-center gap-4">
                                    <button
                                        onClick={confirmRegistration}
                                        disabled={isRegLoading || (eventToRegister.type === 'HACKATHON' && !selectedProblemStatement && !customProblemStatement.trim())}
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {isRegLoading ? 'TRANSMITTING...' : (<>Authorize Seat <CheckCircle size={18} /></>)}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Events;

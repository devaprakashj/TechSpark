import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    LogIn,
    Star,
    CheckCircle,
    Users,
    ChevronRight,
    Send,
    LogOut,
    Award,
    Zap,
    AlertCircle,
    ScanLine,
    X
} from 'lucide-react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useSearchParams } from 'react-router-dom';
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';

const JudgePortal = () => {
    // Authentication state
    const [accessCode, setAccessCode] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();

    // Judge and event data
    const [judgeData, setJudgeData] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [teams, setTeams] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(false);

    // Scoring state
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [scores, setScores] = useState({});
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scoredTeams, setScoredTeams] = useState([]);

    // QR Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [scanError, setScanError] = useState('');

    // Protocol 2: Feel Protocol States
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [lastScoredTeam, setLastScoredTeam] = useState('');

    // Default scoring criteria
    const defaultCriteria = [
        { name: 'Innovation', maxScore: 10, description: 'Creativity and uniqueness of the solution' },
        { name: 'Technical Implementation', maxScore: 10, description: 'Code quality, complexity, and functionality' },
        { name: 'Presentation', maxScore: 10, description: 'Demo clarity, communication, and professionalism' },
        { name: 'Business Viability', maxScore: 10, description: 'Market potential and real-world applicability' },
        { name: 'UI/UX Design', maxScore: 10, description: 'User experience and visual appeal' }
    ];

    // Handle QR Scan
    const handleQRScan = (result) => {
        if (!result || !result[0]?.rawValue) return;

        const data = result[0].rawValue;
        console.log('Scanned QR:', data);

        // Parse the QR code data: TEAM|eventId|teamCode|teamName
        const parts = data.split('|');
        if (parts[0] !== 'TEAM' || parts.length < 4) {
            setScanError('Invalid QR code. Please scan a valid team QR code.');
            return;
        }

        const [_, scannedEventId, teamCode, teamName] = parts;

        // Verify the event matches
        if (eventData && scannedEventId !== eventData.id) {
            setScanError('This team is from a different event. Please scan a team from the same hackathon.');
            return;
        }

        // Find the team
        const team = teams.find(t => t.teamCode === teamCode);
        if (!team) {
            setScanError(`Team "${teamName}" not found. They may not be registered for this event.`);
            return;
        }

        // Check if already scored
        if (scoredTeams.includes(teamCode)) {
            setScanError(`You've already scored "${teamName}". Each team can only be scored once.`);
            return;
        }

        // Success! Select the team for scoring
        if (navigator.vibrate) navigator.vibrate([100]); // Haptic feedback
        setShowScanner(false);
        setScanError('');
        setSelectedTeam(team);
    };

    // Login with access code
    const handleLogin = async () => {
        if (!accessCode.trim()) {
            setError('Please enter your access code');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Find event with this judge access code
            const eventsQuery = query(collection(db, 'events'));
            const eventsSnap = await getDocs(eventsQuery);

            let foundJudge = null;
            let foundEvent = null;

            eventsSnap.docs.forEach(doc => {
                const event = { id: doc.id, ...doc.data() };
                if (event.judges && Array.isArray(event.judges)) {
                    const judge = event.judges.find(j => j.accessCode === accessCode.toUpperCase());
                    if (judge) {
                        foundJudge = judge;
                        foundEvent = event;
                    }
                }
            });

            if (!foundJudge || !foundEvent) {
                setError('Invalid access code. Please check with the organizer.');
                return;
            }

            if (!foundEvent.judgingEnabled) {
                setError('Judging is not yet enabled for this event. Please wait for the organizer to start judging.');
                return;
            }

            setJudgeData(foundJudge);
            setEventData(foundEvent);
            setIsAuthenticated(true);

            // Fetch teams and existing scores
            await fetchTeamsAndScores(foundEvent.id, foundJudge.id);

        } catch (err) {
            console.error('Login error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-login if code is in URL
    useEffect(() => {
        const urlCode = searchParams.get('code');
        if (urlCode && !isAuthenticated) {
            setAccessCode(urlCode.toUpperCase());
            // Small delay to ensure state is set before triggering
            setTimeout(() => {
                const triggerAutoLogin = async () => {
                    setIsLoading(true);
                    setError('');
                    try {
                        const eventsQuery = query(collection(db, 'events'));
                        const eventsSnap = await getDocs(eventsQuery);

                        let foundJudge = null;
                        let foundEvent = null;

                        eventsSnap.docs.forEach(doc => {
                            const event = { id: doc.id, ...doc.data() };
                            if (event.judges && Array.isArray(event.judges)) {
                                const judge = event.judges.find(j => j.accessCode === urlCode.toUpperCase());
                                if (judge) {
                                    foundJudge = judge;
                                    foundEvent = event;
                                }
                            }
                        });

                        if (foundJudge && foundEvent && foundEvent.judgingEnabled) {
                            setJudgeData(foundJudge);
                            setEventData(foundEvent);
                            setIsAuthenticated(true);
                            await fetchTeamsAndScores(foundEvent.id, foundJudge.id);
                        } else if (foundEvent && !foundEvent.judgingEnabled) {
                            setError('Judging is not yet enabled for this event.');
                        }
                    } catch (err) {
                        console.error('Auto-login error:', err);
                    } finally {
                        setIsLoading(false);
                    }
                };
                triggerAutoLogin();
            }, 500);
        }
    }, [searchParams]);

    // Fetch teams for the event
    const fetchTeamsAndScores = async (eventId, judgeId) => {
        setLoadingTeams(true);
        try {
            // Fetch registrations for the event
            const regsQuery = query(
                collection(db, 'registrations'),
                where('eventId', '==', eventId)
            );
            const regsSnap = await getDocs(regsQuery);
            const registrations = regsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Group by team
            const teamMap = new Map();
            registrations.forEach(r => {
                if (r.teamCode && !teamMap.has(r.teamCode)) {
                    teamMap.set(r.teamCode, {
                        teamCode: r.teamCode,
                        teamName: r.teamName || 'Unknown Team',
                        problemStatement: r.problemStatement || 'N/A',
                        members: [],
                        leader: null
                    });
                }
                if (r.teamCode) {
                    const team = teamMap.get(r.teamCode);
                    team.members.push(r);
                    if (r.teamRole === 'LEADER') {
                        team.leader = r;
                    }
                }
            });

            setTeams(Array.from(teamMap.values()));

            // Fetch existing scores by this judge
            const scoresQuery = query(
                collection(db, 'hackathonScores'),
                where('eventId', '==', eventId),
                where('judgeId', '==', judgeId)
            );
            const scoresSnap = await getDocs(scoresQuery);
            const existingScores = scoresSnap.docs.map(doc => doc.data().teamCode);
            setScoredTeams(existingScores);

        } catch (err) {
            console.error('Error fetching teams:', err);
        } finally {
            setLoadingTeams(false);
        }
    };

    // Handle score change
    const handleScoreChange = (criteriaName, value) => {
        const numValue = Math.min(Math.max(0, parseInt(value) || 0), 10);
        setScores(prev => ({
            ...prev,
            [criteriaName]: numValue
        }));
    };

    // Calculate total score
    const calculateTotalScore = () => {
        const criteria = eventData?.judgingCriteria || defaultCriteria;
        return criteria.reduce((sum, c) => sum + (scores[c.name] || 0), 0);
    };

    // Submit scores for a team
    const handleSubmitScore = async () => {
        if (!selectedTeam || !judgeData || !eventData) return;

        const criteria = eventData?.judgingCriteria || defaultCriteria;
        const missingScores = criteria.filter(c => scores[c.name] === undefined || scores[c.name] === '');

        if (missingScores.length > 0) {
            alert(`Please provide scores for all criteria: ${missingScores.map(c => c.name).join(', ')}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const scoreData = {
                eventId: eventData.id,
                eventTitle: eventData.title,
                teamCode: selectedTeam.teamCode,
                teamName: selectedTeam.teamName,
                judgeId: judgeData.id,
                judgeName: judgeData.name,
                judgeEmail: judgeData.email,
                scores: scores,
                totalScore: calculateTotalScore(),
                maxPossibleScore: criteria.reduce((sum, c) => sum + c.maxScore, 0),
                feedback: feedback.trim(),
                submittedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'hackathonScores'), scoreData);

            // Update local state
            setScoredTeams(prev => [...prev, selectedTeam.teamCode]);
            const teamName = selectedTeam.teamName;
            setLastScoredTeam(teamName);
            setSelectedTeam(null);
            setScores({});
            setFeedback('');

            // Protocol 2: Show Success Overlay
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            setShowSuccessOverlay(true);
            setTimeout(() => setShowSuccessOverlay(false), 3000);

        } catch (err) {
            console.error('Error submitting score:', err);
            alert('Failed to submit score. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Logout
    const handleLogout = () => {
        setIsAuthenticated(false);
        setJudgeData(null);
        setEventData(null);
        setTeams([]);
        setAccessCode('');
        setScoredTeams([]);
    };

    // Get scoring progress
    const getScoringProgress = () => {
        if (teams.length === 0) return 0;
        return Math.round((scoredTeams.length / teams.length) * 100);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <AnimatePresence mode="wait">
                {!isAuthenticated ? (
                    // Login Screen
                    <motion.div
                        key="login"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-screen flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 w-full max-w-md text-center"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/30">
                                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
                                Judge Portal
                            </h1>
                            <p className="text-purple-200 text-[10px] md:text-sm font-medium mb-8">
                                Enter your access code to start scoring teams
                            </p>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="JDG-XXXXXX"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white text-center text-xl font-black tracking-[0.3em] placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all uppercase"
                                />

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3"
                                    >
                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                        <p className="text-red-300 text-sm font-medium text-left">{error}</p>
                                    </motion.div>
                                )}

                                <button
                                    onClick={handleLogin}
                                    disabled={isLoading || !accessCode}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-purple-500/20"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <LogIn className="w-5 h-5" /> Access Portal
                                        </>
                                    )}
                                </button>
                            </div>

                            <p className="text-white/40 text-xs font-medium mt-8 uppercase tracking-widest">
                                TechSpark Hackathon Judging System
                            </p>
                        </motion.div>
                    </motion.div>
                ) : selectedTeam ? (
                    // Scoring Screen
                    <motion.div
                        key="scoring"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-screen p-4 md:p-8"
                    >
                        <div className="max-w-3xl mx-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-8">
                                <button
                                    onClick={() => setSelectedTeam(null)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    ← Back to Teams
                                </button>
                            </div>

                            {/* Team Info Card */}
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl p-5 md:p-8 mb-6 md:mb-8">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black text-white shrink-0">
                                        {selectedTeam.teamName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight truncate">
                                            {selectedTeam.teamName}
                                        </h2>
                                        <p className="text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-0.5 md:mt-1">
                                            {selectedTeam.teamCode} • {selectedTeam.members.length} Members
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-4">
                                    <p className="text-[9px] md:text-[10px] text-purple-300 font-black uppercase tracking-widest mb-1.5 md:mb-2 italic">Mission Objective</p>
                                    <p className="text-white text-xs md:text-sm font-medium leading-relaxed uppercase">{selectedTeam.problemStatement}</p>
                                </div>

                                {selectedTeam.leader && (
                                    <p className="text-purple-200 text-xs font-medium">
                                        <span className="text-purple-400">Team Leader:</span> {selectedTeam.leader.studentName}
                                    </p>
                                )}
                            </div>

                            {/* Scoring Form */}
                            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">
                                    Score This Team
                                </h3>

                                <div className="space-y-6 mb-8">
                                    {(eventData?.judgingCriteria || defaultCriteria).map((criteria, idx) => (
                                        <div key={idx} className="space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight">
                                                        {criteria.name}
                                                    </h4>
                                                    <p className="text-[10px] md:text-xs text-slate-400 font-medium">
                                                        {criteria.description}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={criteria.maxScore}
                                                        value={scores[criteria.name] || ''}
                                                        onChange={(e) => handleScoreChange(criteria.name, e.target.value)}
                                                        className="w-14 md:w-16 px-2 md:px-3 py-1.5 md:py-2 bg-slate-100 border border-slate-200 rounded-xl text-center text-base md:text-lg font-black text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/50"
                                                    />
                                                    <span className="text-xs md:text-sm text-slate-400 font-bold uppercase">/ {criteria.maxScore}</span>
                                                </div>
                                            </div>

                                            {/* Visual slider */}
                                            <div className="flex gap-1">
                                                {[...Array(criteria.maxScore)].map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleScoreChange(criteria.name, i + 1)}
                                                        className={`flex-1 h-3 rounded-full transition-all ${i < (scores[criteria.name] || 0)
                                                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                                            : 'bg-slate-200 hover:bg-slate-300'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total Score */}
                                <div className="p-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl text-white mb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-purple-200">Total Score</p>
                                            <p className="text-4xl font-black mt-1">{calculateTotalScore()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black uppercase tracking-widest text-purple-200">Max Possible</p>
                                            <p className="text-2xl font-black mt-1 text-purple-200">
                                                {(eventData?.judgingCriteria || defaultCriteria).reduce((sum, c) => sum + c.maxScore, 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback */}
                                <div className="mb-6">
                                    <label className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2 block">
                                        Feedback (Optional)
                                    </label>
                                    <textarea
                                        placeholder="Any comments or suggestions for the team..."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmitScore}
                                    disabled={isSubmitting}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-emerald-600 hover:to-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" /> Submit Score
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    // Teams List Screen
                    <motion.div
                        key="teams"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-screen p-4 md:p-8"
                    >
                        <div className="max-w-4xl mx-auto">
                            {/* Header */}
                            <div className="flex flex-col gap-6 mb-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/10">
                                            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight leading-none">
                                                {eventData?.title}
                                            </h1>
                                            <p className="text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                                                Agent {judgeData?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 md:px-4 md:py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/5"
                                    >
                                        <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Logout</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => { setScanError(''); setShowScanner(true); }}
                                    className="w-full py-4 md:py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-500/20 hover:from-purple-600 hover:to-indigo-700 active:scale-[0.98]"
                                >
                                    <ScanLine className="w-5 h-5" /> Scan Team QR
                                </button>
                            </div>

                            {/* Progress Card */}
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl p-5 md:p-6 mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] md:text-xs text-purple-300 font-black uppercase tracking-widest leading-none">Scoring Progress</p>
                                        <p className="text-2xl md:text-3xl font-black text-white mt-1.5 leading-none">
                                            {scoredTeams.length} / {teams.length}
                                        </p>
                                    </div>
                                    <div className="w-14 h-14 md:w-20 md:h-20 relative">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="50%"
                                                cy="50%"
                                                r="40%"
                                                stroke="rgba(255,255,255,0.1)"
                                                strokeWidth="6"
                                                fill="none"
                                            />
                                            <circle
                                                cx="50%"
                                                cy="50%"
                                                r="40%"
                                                stroke="url(#progressGradient)"
                                                strokeWidth="6"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeDashoffset={`${100 - getScoringProgress()}%`}
                                                style={{ strokeDasharray: '100%' }}
                                                className="transition-all duration-1000"
                                            />
                                            <defs>
                                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#a855f7" />
                                                    <stop offset="100%" stopColor="#6366f1" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-black text-white">{getScoringProgress()}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${getScoringProgress()}%` }}
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Teams Grid */}
                            <div className="mb-4">
                                <h2 className="text-xs text-purple-300 font-black uppercase tracking-widest mb-4">
                                    Teams to Score ({teams.length - scoredTeams.length} remaining)
                                </h2>
                            </div>

                            {loadingTeams ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-purple-300 text-xs font-black uppercase tracking-widest">Loading Teams...</p>
                                </div>
                            ) : teams.length === 0 ? (
                                <div className="bg-white/10 border-2 border-dashed border-white/20 rounded-3xl p-12 text-center">
                                    <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                                    <p className="text-white font-bold text-lg">No teams found</p>
                                    <p className="text-purple-300 text-sm mt-2">Teams will appear here when they register</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {teams.map((team) => {
                                        const isScored = scoredTeams.includes(team.teamCode);
                                        return (
                                            <motion.div
                                                key={team.teamCode}
                                                whileHover={{ scale: isScored ? 1 : 1.01 }}
                                                whileTap={{ scale: isScored ? 1 : 0.98 }}
                                                className={`rounded-2xl md:rounded-3xl p-4 md:p-6 transition-all cursor-pointer ${isScored
                                                    ? 'bg-emerald-500/10 border border-emerald-500/30 opacity-80'
                                                    : 'bg-white/10 border border-white/20 hover:bg-white/15 hover:border-purple-500/50 shadow-lg shadow-black/10'
                                                    }`}
                                                onClick={() => !isScored && setSelectedTeam(team)}
                                            >
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl font-black shrink-0 ${isScored
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                                                        }`}>
                                                        {isScored ? <CheckCircle className="w-5 h-5 md:w-7 md:h-7" /> : team.teamName.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                                            <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight truncate max-w-[120px] md:max-w-none">
                                                                {team.teamName}
                                                            </h3>
                                                            {isScored && (
                                                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[7px] md:text-[8px] font-black rounded uppercase">
                                                                    Scored
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-purple-300 text-[9px] md:text-xs font-bold mb-1.5 md:mb-2">
                                                            {team.teamCode} • {team.members.length} members
                                                        </p>
                                                        <p className="text-white/60 text-[10px] md:text-xs font-medium line-clamp-1 md:line-clamp-2 italic uppercase">
                                                            {team.problemStatement}
                                                        </p>
                                                    </div>
                                                    {!isScored && (
                                                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-purple-400 shrink-0 self-center" />
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* All Scored Message */}
                            {teams.length > 0 && scoredTeams.length === teams.length && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl p-8 text-center text-white"
                                >
                                    <Award className="w-16 h-16 mx-auto mb-4" />
                                    <h3 className="text-2xl font-black uppercase tracking-tight mb-2">All Teams Scored!</h3>
                                    <p className="text-emerald-100 font-medium">
                                        Thank you for completing the evaluation. Your scores have been submitted.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Protocol 2: Success Overlay */}
            <AnimatePresence>
                {showSuccessOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl"
                    >
                        <div className="text-center p-8">
                            <div className="w-64 h-64 mx-auto mb-6">
                                <DotLottiePlayer
                                    src="https://lottie.host/82548480-c116-4315-99d9-76088e89f925/9sO50A0Q0A.json"
                                    autoplay
                                    loop={false}
                                />
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Evaluation Recorded</h2>
                                <p className="text-emerald-400 font-black uppercase tracking-widest text-sm">
                                    "{lastScoredTeam}" successfully rated
                                </p>
                                <div className="mt-8 flex justify-center gap-2">
                                    {[...Array(3)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [1, 0.5, 1],
                                            }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                delay: i * 0.2,
                                            }}
                                            className="w-2 h-2 bg-emerald-500 rounded-full"
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Scanner Modal */}
            <AnimatePresence>
                {showScanner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex flex-col"
                    >
                        {/* Scanner Header */}
                        <div className="p-4 md:p-6 flex items-center justify-between bg-black/50 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                                    <ScanLine className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Scan Team QR</h2>
                                    <p className="text-purple-300 text-[10px] md:text-xs font-medium">Point camera at team's QR code</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowScanner(false); setScanError(''); }}
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Scanner View */}
                        <div className="flex-1 flex flex-col items-center justify-center p-6">
                            <div className="w-full max-w-md aspect-square relative rounded-3xl overflow-hidden border-4 border-purple-500/50">
                                <Scanner
                                    onScan={handleQRScan}
                                    onError={(err) => {
                                        console.error('Scanner error:', err);
                                        setScanError('Camera error. Please check permissions and try again.');
                                    }}
                                    constraints={{ facingMode: 'environment' }}
                                    styles={{
                                        container: { width: '100%', height: '100%' },
                                        video: { objectFit: 'cover' }
                                    }}
                                />
                                {/* Scan Overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-purple-500 rounded-tl-2xl" />
                                    <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-purple-500 rounded-tr-2xl" />
                                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-purple-500 rounded-bl-2xl" />
                                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-purple-500 rounded-br-2xl" />
                                    {/* Scan Line Animation */}
                                    <div className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse" style={{ top: '50%' }} />
                                </div>
                            </div>

                            {/* Error Message */}
                            {scanError && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center gap-3 max-w-md"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                    <p className="text-red-300 text-sm font-medium">{scanError}</p>
                                </motion.div>
                            )}

                            {/* Instructions */}
                            <p className="mt-8 text-purple-200 text-center text-xs md:text-sm font-medium max-w-xs md:max-w-md px-6">
                                Ask the team to show their <strong>Judging QR Code</strong> from their Student Dashboard.
                                <br /><br />
                                <span className="text-[10px] text-white/40 uppercase tracking-widest italic">Ensure stable internet & good lighting</span>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JudgePortal;

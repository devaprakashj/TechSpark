import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, RefreshCw, Crown, Medal, Award, Zap } from 'lucide-react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useSearchParams } from 'react-router-dom';

const HackathonLeaderboard = () => {
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('event');

    const [eventData, setEventData] = useState(null);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    // Fetch event and scores
    useEffect(() => {
        if (!eventId) {
            setError('No event specified. Add ?event=EVENT_ID to the URL.');
            setLoading(false);
            return;
        }

        const fetchEventData = async () => {
            try {
                const eventsQuery = query(collection(db, 'events'));
                const eventsSnap = await getDocs(eventsQuery);
                const event = eventsSnap.docs.find(doc => doc.id === eventId);

                if (!event) {
                    setError('Event not found.');
                    setLoading(false);
                    return;
                }

                setEventData({ id: event.id, ...event.data() });
            } catch (err) {
                console.error('Error fetching event:', err);
                setError('Failed to load event data.');
                setLoading(false);
            }
        };

        fetchEventData();
    }, [eventId]);

    // Real-time scores subscription
    useEffect(() => {
        if (!eventId || !eventData) return;

        // Subscribe to scores in real-time
        const scoresQuery = query(
            collection(db, 'hackathonScores'),
            where('eventId', '==', eventId)
        );

        const unsubscribe = onSnapshot(scoresQuery, async (snapshot) => {
            const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch registrations to get team details
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
                        memberCount: 0,
                        scores: [],
                        averageScore: 0,
                        totalScore: 0
                    });
                }
                if (r.teamCode) {
                    teamMap.get(r.teamCode).memberCount++;
                }
            });

            // Add scores to teams
            scores.forEach(score => {
                if (teamMap.has(score.teamCode)) {
                    teamMap.get(score.teamCode).scores.push(score);
                }
            });

            // Calculate averages and sort
            const teamsWithScores = Array.from(teamMap.values())
                .map(team => {
                    if (team.scores.length > 0) {
                        const totalPoints = team.scores.reduce((sum, s) => sum + (s.totalScore || 0), 0);
                        team.averageScore = totalPoints / team.scores.length;
                        team.totalScore = totalPoints;
                    }
                    return team;
                })
                .sort((a, b) => b.averageScore - a.averageScore);

            setTeams(teamsWithScores);
            setLastUpdated(new Date());
            setLoading(false);
        });

        return () => unsubscribe();
    }, [eventId, eventData]);

    // Get position styling
    const getPositionStyle = (index) => {
        switch (index) {
            case 0:
                return {
                    bg: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500',
                    icon: <Crown className="w-8 h-8" />,
                    badge: 'WINNER',
                    shadow: 'shadow-2xl shadow-yellow-500/30'
                };
            case 1:
                return {
                    bg: 'bg-gradient-to-r from-slate-400 via-gray-400 to-slate-500',
                    icon: <Medal className="w-7 h-7" />,
                    badge: '2ND',
                    shadow: 'shadow-xl shadow-slate-500/30'
                };
            case 2:
                return {
                    bg: 'bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500',
                    icon: <Award className="w-6 h-6" />,
                    badge: '3RD',
                    shadow: 'shadow-lg shadow-orange-500/30'
                };
            default:
                return {
                    bg: 'bg-slate-800',
                    icon: null,
                    badge: `#${index + 1}`,
                    shadow: ''
                };
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
                <div className="text-center">
                    <Trophy className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                    <h1 className="text-2xl font-black text-white uppercase mb-2">Leaderboard</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-8 md:mb-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-lg rounded-full border border-white/20 mb-6"
                >
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="text-white text-sm font-bold uppercase tracking-widest">Live Leaderboard</span>
                    {lastUpdated && (
                        <span className="text-white/50 text-xs">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight mb-4"
                >
                    {eventData?.title || 'Hackathon'}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-purple-300 text-lg font-medium"
                >
                    {teams.length} Teams Competing • {teams.filter(t => t.scores.length > 0).length} Scored
                </motion.p>
            </header>

            {/* Loading State */}
            {loading ? (
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-purple-300 text-sm font-bold uppercase tracking-widest">Loading Scores...</p>
                    </div>
                </div>
            ) : teams.length === 0 ? (
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white/10 border-2 border-dashed border-white/20 rounded-3xl p-16 text-center">
                        <Trophy className="w-20 h-20 text-white/30 mx-auto mb-6" />
                        <h2 className="text-2xl font-black text-white uppercase mb-2">No Teams Yet</h2>
                        <p className="text-purple-300">Teams will appear here when they register</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Top 3 Podium */}
                    {teams.filter(t => t.scores.length > 0).length >= 3 && (
                        <div className="max-w-4xl mx-auto mb-12">
                            <div className="flex items-end justify-center gap-4">
                                {/* 2nd Place */}
                                {teams[1] && teams[1].scores.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex-1 max-w-xs"
                                    >
                                        <div className="bg-gradient-to-t from-slate-400 to-gray-300 rounded-t-3xl p-6 text-center h-40 flex flex-col justify-end">
                                            <Medal className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                                            <h3 className="text-lg font-black text-slate-800 uppercase truncate">{teams[1].teamName}</h3>
                                            <p className="text-3xl font-black text-slate-700">{teams[1].averageScore.toFixed(1)}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 1st Place */}
                                {teams[0] && teams[0].scores.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="flex-1 max-w-xs"
                                    >
                                        <div className="bg-gradient-to-t from-yellow-400 to-amber-300 rounded-t-3xl p-8 text-center h-52 flex flex-col justify-end shadow-2xl shadow-yellow-500/30">
                                            <Crown className="w-14 h-14 text-yellow-700 mx-auto mb-3" />
                                            <h3 className="text-xl font-black text-yellow-900 uppercase truncate">{teams[0].teamName}</h3>
                                            <p className="text-4xl font-black text-yellow-800">{teams[0].averageScore.toFixed(1)}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 3rd Place */}
                                {teams[2] && teams[2].scores.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex-1 max-w-xs"
                                    >
                                        <div className="bg-gradient-to-t from-orange-400 to-amber-300 rounded-t-3xl p-6 text-center h-32 flex flex-col justify-end">
                                            <Award className="w-8 h-8 text-orange-700 mx-auto mb-2" />
                                            <h3 className="text-base font-black text-orange-900 uppercase truncate">{teams[2].teamName}</h3>
                                            <p className="text-2xl font-black text-orange-800">{teams[2].averageScore.toFixed(1)}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Full Rankings List */}
                    <div className="max-w-4xl mx-auto space-y-3">
                        <h2 className="text-xs text-purple-300 font-black uppercase tracking-widest mb-4">Full Rankings</h2>
                        <AnimatePresence>
                            {teams.map((team, idx) => {
                                const style = getPositionStyle(idx);
                                const hasScore = team.scores.length > 0;

                                return (
                                    <motion.div
                                        key={team.teamCode}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        layout
                                        className={`rounded-2xl p-4 md:p-5 flex items-center justify-between transition-all ${hasScore
                                                ? idx < 3
                                                    ? `${style.bg} text-white ${style.shadow}`
                                                    : 'bg-white/10 backdrop-blur-lg border border-white/20'
                                                : 'bg-white/5 border border-white/10 opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-black text-lg ${hasScore && idx < 3
                                                    ? 'bg-white/20'
                                                    : 'bg-white/10'
                                                }`}>
                                                {hasScore && style.icon ? style.icon : `#${idx + 1}`}
                                            </div>
                                            <div>
                                                <h3 className={`text-base md:text-lg font-black uppercase tracking-tight ${hasScore && idx < 3 ? '' : 'text-white'
                                                    }`}>
                                                    {team.teamName}
                                                </h3>
                                                <p className={`text-xs font-bold ${hasScore && idx < 3 ? 'opacity-80' : 'text-purple-300'
                                                    }`}>
                                                    {team.teamCode} • {team.memberCount} members
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            {hasScore ? (
                                                <>
                                                    <div className="flex items-center gap-1 justify-end mb-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-3 h-3 ${i < Math.round((team.averageScore / 50) * 5)
                                                                        ? idx < 3 ? 'text-white fill-white' : 'text-yellow-400 fill-yellow-400'
                                                                        : 'text-white/30'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className={`text-2xl md:text-3xl font-black ${hasScore && idx < 3 ? '' : 'text-white'
                                                        }`}>
                                                        {team.averageScore.toFixed(1)}
                                                    </p>
                                                    <p className={`text-[10px] font-bold uppercase ${hasScore && idx < 3 ? 'opacity-70' : 'text-purple-300'
                                                        }`}>
                                                        {team.scores.length} judge{team.scores.length !== 1 ? 's' : ''}
                                                    </p>
                                                </>
                                            ) : (
                                                <span className="text-xs text-white/40 font-bold uppercase">Not Scored</span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* Footer */}
            <footer className="max-w-6xl mx-auto mt-12 text-center">
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                    TechSpark Hackathon • Live Scoring System
                </p>
            </footer>
        </div>
    );
};

export default HackathonLeaderboard;

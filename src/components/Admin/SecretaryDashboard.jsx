import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Calendar,
    Settings,
    LogOut,
    Search,
    ShieldCheck,
    Plus,
    QrCode,
    TrendingUp,
    Award,
    CheckCircle,
    X,
    Eye,
    LayoutDashboard,
    UserCog,
    Shield,
    Key,
    BarChart3,
    ClipboardList,
    ShieldAlert,
    PieChart,
    ArrowRight,
    Download,
    Filter,
    Trash2,
    CalendarCheck,
    Briefcase,
    ExternalLink,
    Info,
    RefreshCw,
    AlertCircle,
    Activity,
    Terminal,
    RotateCcw,
    ChevronRight,
    HelpCircle,
    Clock,
    MapPin,
    UserCheck,
    FileText,
    Target
} from 'lucide-react';
import { collection, getDocs, query, orderBy, serverTimestamp, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ritLogo from '../../assets/rit-logo.png';
import techsparkLogo from '../../assets/techspark-logo.png';

const SecretaryDashboard = () => {
    const [secretary, setSecretary] = useState(null);
    const [students, setStudents] = useState([]);
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeEvents: 0,
        totalFeedback: 0,
        approvalQueue: 0
    });
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [registrations, setRegistrations] = useState([]);
    const [feedbackBase, setFeedbackBase] = useState([]);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [eventToApprove, setEventToApprove] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('organizerToken');
        if (!token) {
            navigate('/organizer/login');
            return;
        }
        const data = JSON.parse(token);
        if (data.role !== 'Secretary') {
            // If they are not Secretary, maybe they should be in Organizer dashboard
            // But we'll trust the login redirect for now.
        }
        setSecretary(data);
        fetchCoreData();
    }, [navigate]);

    const fetchCoreData = () => {
        setLoadingData(true);

        // Listen to Events
        const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(evts);

            setStats(prev => ({
                ...prev,
                activeEvents: evts.filter(e => e.status === 'LIVE').length,
                approvalQueue: evts.filter(e => e.status === 'PENDING').length
            }));
        });

        // Listen to Students
        const studentsQuery = query(collection(db, 'users'), orderBy('fullName', 'asc'));
        const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
            const studs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(studs);
            setStats(prev => ({ ...prev, totalMembers: studs.length }));
        });

        // Listen to Registrations
        const regsQuery = collection(db, 'registrations');
        const unsubscribeRegs = onSnapshot(regsQuery, (snapshot) => {
            setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Listen to Feedback
        const feedbackQuery = collection(db, 'feedback');
        const unsubscribeFeedback = onSnapshot(feedbackQuery, (snapshot) => {
            const fbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFeedbackBase(fbs);
            setStats(prev => ({ ...prev, totalFeedback: fbs.length }));
        });

        setLoadingData(false);
        return () => {
            unsubscribeEvents();
            unsubscribeStudents();
            unsubscribeRegs();
            unsubscribeFeedback();
        };
    };

    const handleLogout = () => {
        localStorage.removeItem('organizerToken');
        navigate('/organizer/login');
    };

    const generateEventReport = async (event) => {
        if (!event) return;
        console.log("INITIATING SECRETARY MASTER REPORT ASSEMBLY...", event.title);
        const eventRegs = registrations.filter(r => r.eventId === event.id);
        const eventFeedback = feedbackBase.filter(f => f.eventId === event.id);
        const presentCount = eventRegs.filter(r => r.isAttended || r.status === 'Present').length;
        const absentCount = eventRegs.length - presentCount;
        const attendanceRate = ((presentCount / (eventRegs.length || 1)) * 100).toFixed(1);

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const reportId = `TS-SEC-MASTER-${event.id.slice(0, 5).toUpperCase()}-${Math.floor(Date.now() / 10000)}`;

            // --- REUSABLE BRANDING HELPER ---
            const drawBranding = () => {
                doc.setFillColor(16, 185, 129); // TechSpark Green
                doc.rect(0, 0, 5, pageHeight, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.line(10, 25, pageWidth - 10, 25);
            };

            const addLogos = async () => {
                const loadImg = (path) => new Promise(res => {
                    const img = new Image();
                    img.onload = () => res(img);
                    img.onerror = () => res(null);
                    img.src = path;
                });
                const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);
                if (rit) doc.addImage(rit, 'PNG', 10, 8, 45, 12);
                if (ts) doc.addImage(ts, 'PNG', pageWidth - 55, 8, 45, 12);
            };

            const addWatermark = (text = 'OFFICIAL AUDIT') => {
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.03 }));
                doc.setFontSize(40);
                doc.setTextColor(150);
                doc.setFont('helvetica', 'bold');
                doc.text(text, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                doc.restoreGraphicsState();
            };

            await addLogos();
            drawBranding();

            // --- PAGE 1: COVER PAGE (SECTION 1) ---
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(32);
            doc.text('FINAL EVENT', pageWidth / 2, 80, { align: 'center' });
            doc.text('REPORT', pageWidth / 2, 95, { align: 'center' });

            doc.setFillColor(16, 185, 129);
            doc.rect(pageWidth / 2 - 40, 105, 80, 2, 'F');

            doc.setFontSize(18);
            doc.setTextColor(71, 85, 105);
            doc.text(event.title.toUpperCase(), pageWidth / 2, 130, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`${event.date} | ${event.venue || 'OFFLINE MODE'}`, pageWidth / 2, 140, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text('Organized by TechSpark Club', pageWidth / 2, 160, { align: 'center' });

            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8);
            doc.text('OFFICIAL INSTITUTIONAL RECORD - SECRETARY ARCHIVE', pageWidth / 2, pageHeight - 20, { align: 'center' });

            // --- PAGE 2: EXECUTIVE SUMMARY (SECTION 2) ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('EXECUTIVE SUMMARY');

            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text('SECTION II: EXECUTIVE SUMMARY', 15, 45);

            autoTable(doc, {
                startY: 55,
                body: [
                    ['TOTAL REGISTERED PARTICIPANTS', eventRegs.length.toString()],
                    ['CONFIRMED ATTENDANCE (PRESENT)', presentCount.toString()],
                    ['ABSENTEE COUNT', absentCount.toString()],
                    ['FEEDBACK LOGS RECEIVED', eventFeedback.length.toString()],
                    ['FINAL ATTENDANCE RATE', `${attendanceRate}%`]
                ],
                theme: 'striped',
                styles: { fontSize: 10, cellPadding: 8 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
            });

            // --- PAGE 3: ATTACHMENT 1 - REGISTRATION LOG (SECTION 3) ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('REGISTRATION LOG');

            doc.setFontSize(14);
            doc.text('ATTACHMENT – I : REGISTRATION LOG', 15, 45);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total documented registrations: ${eventRegs.length}`, 15, 52);

            const isHackathon = event.type === 'Hackathon';
            const regTableData = eventRegs.map((r, i) => [
                i + 1,
                r.studentRoll,
                (r.studentName || 'N/A').toUpperCase(),
                r.isTeamRegistration ? `${r.teamName} (${r.teamRole})` : 'INDIVIDUAL',
                ...(isHackathon ? [r.problemStatement || 'N/A'] : []),
                r.registeredAt?.toDate ? new Date(r.registeredAt.toDate()).toLocaleString() : 'SYSTEM VERIFIED'
            ]);

            autoTable(doc, {
                startY: 60,
                head: [[
                    'S.NO', 'ROLL NO', 'FULL NAME', 'SQUAD/TEAM',
                    ...(isHackathon ? ['PROBLEM'] : []),
                    'TIMESTAMP'
                ]],
                body: regTableData,
                headStyles: { fillColor: [15, 23, 42] },
                styles: { fontSize: 7 } // Slightly smaller font to fit more columns
            });

            // --- PAGE 4: ATTACHMENT 2 - ATTENDANCE AUDIT (SECTION 4) ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('ATTENDANCE AUDIT');

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('ATTACHMENT – II : ATTENDANCE AUDIT', 15, 45);

            const attendedList = eventRegs.filter(r => r.isAttended || r.status === 'Present').map((r, i) => [
                i + 1,
                r.studentName.toUpperCase(),
                r.studentRoll,
                r.isTeamRegistration ? r.teamName : 'N/A',
                r.studentDept,
                ...(isHackathon ? [r.problemStatement || 'N/A'] : []),
                'PRESENT'
            ]);

            autoTable(doc, {
                startY: 55,
                head: [[
                    '#', 'STUDENT NAME', 'ROLL NO', 'SQUAD', 'DEPT',
                    ...(isHackathon ? ['PROBLEM'] : []),
                    'STATUS'
                ]],
                body: attendedList,
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 7 }
            });

            // --- PAGE 5: ATTACHMENT 3 - FEEDBACK ANALYSIS (SECTION 5) ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('FEEDBACK INSIGHTS');

            doc.setFontSize(14);
            doc.text('ATTACHMENT – III : FEEDBACK ANALYSIS', 15, 45);

            const avgRating = (eventFeedback.reduce((acc, curr) => acc + (curr.rating || 0), 0) / (eventFeedback.length || 1)).toFixed(1);
            const recommendationRate = ((eventFeedback.filter(f => f.rating >= 4).length / (eventFeedback.length || 1)) * 100).toFixed(1);

            autoTable(doc, {
                startY: 55,
                head: [['METRIC TYPE', 'RATING / SCORE', 'VISUAL PERFORMANCE']],
                body: [
                    ['AVERAGE USER RATING', `${avgRating} / 5.0`, '★★★★★'.slice(0, Math.round(avgRating))],
                    ['RECOMMENDATION RATE', `${recommendationRate}%`, 'HIGHLY RECOMMENDED'],
                    ['TOTAL LOGS ANALYZED', eventFeedback.length.toString(), 'STRATEGIC DATA']
                ],
                headStyles: { fillColor: [124, 58, 237] }
            });

            // --- LAST PAGE: DECLARATION (SECTION 6) ---
            doc.addPage();
            drawBranding();
            await addLogos();

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('SECTION VI: DECLARATION & AUDIT', 15, 45);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('This is to certify that the event mentioned in this report was successfully conducted following all institutional protocols. The data presented here has been extracted directly from the TechSpark Event Management System and verified for accuracy.', 15, 60, { maxWidth: pageWidth - 30 });

            doc.setFont('helvetica', 'bold');
            doc.text('Data Verified by TechSpark Club Secretary', 15, 90);

            // Digital Signature Space
            doc.setDrawColor(200);
            doc.line(15, 120, 70, 120);
            doc.setFontSize(8);
            doc.text('Authorized Secretary Electronic Signature', 15, 125);

            // System Footer
            doc.setFillColor(248, 250, 252);
            doc.rect(10, pageHeight - 50, pageWidth - 20, 35, 'F');
            doc.setTextColor(100);
            doc.setFontSize(7);
            doc.text(`REPORT ID: ${reportId}`, 15, pageHeight - 40);
            doc.text(`GENERATED BY: ${(secretary?.username || 'SECRETARY').toUpperCase()}`, 15, pageHeight - 35);
            doc.text(`VERIFICATION TIMESTAMP: ${new Date().toLocaleString().toUpperCase()}`, 15, pageHeight - 30);
            doc.setFont('helvetica', 'italic');
            doc.text('Generated by TechSpark Club Event Management System. Digital verification active.', 15, pageHeight - 20);

            // FINAL SAVE
            doc.save(`${event.title.replace(/\s+/g, '_')}_Official_Secretary_Report.pdf`);
        } catch (error) {
            console.error("MASTER REPORT FAILURE:", error);
            alert("The Master Report assembly system encountered a terminal error.");
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Active Members', value: stats.totalMembers, icon: <Users />, color: 'blue', desc: 'Registered Students' },
                                { label: 'Live Operations', value: stats.activeEvents, icon: <Activity />, color: 'emerald', desc: 'Running Events' },
                                { label: 'Approval Queue', value: stats.approvalQueue, icon: <Target />, color: 'orange', desc: 'Pending Verification' },
                                { label: 'Feedback Logs', value: stats.totalFeedback, icon: <ClipboardList />, color: 'purple', desc: 'Total Intelligence' }
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -5 }}
                                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600 mb-6`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-3xl font-black text-slate-800 tabular-nums">{stat.value}</h3>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Units</span>
                                        </div>
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-tighter mt-1">{stat.label}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest opacity-60">{stat.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Recent Activity & Approval Preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div>
                                        <h3 className="font-black text-slate-800 text-lg uppercase italic flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-blue-600" /> Recent Event Lifecycle
                                        </h3>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Real-time tactical event tracking</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-5 italic">Tactical Name</th>
                                                <th className="px-8 py-5">Originator</th>
                                                <th className="px-8 py-5 text-center">Protocol Status</th>
                                                <th className="px-8 py-5 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {events.slice(0, 6).map((event) => (
                                                <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{event.title}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{event.date}</p>
                                                    </td>
                                                    <td className="px-8 py-5 text-[10px] font-black text-blue-600 uppercase italic underline decoration-blue-100 underline-offset-4">{event.createdBy}</td>
                                                    <td className="px-8 py-5 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${event.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                            event.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                'bg-slate-50 text-slate-400 border border-slate-100'
                                                            }`}>
                                                            {event.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <button
                                                            onClick={() => generateEventReport(event)}
                                                            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all duration-300"
                                                            title="Generate Official Audit"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                                <Activity className="absolute -top-10 -right-10 w-48 h-48 opacity-5 group-hover:rotate-12 transition-transform duration-1000" />
                                <h3 className="text-xl font-black italic uppercase italic mb-6">Secretary's Brief</h3>
                                <div className="space-y-6 relative">
                                    <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Documentation Protocol</p>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"Ensure all reports are generated post-event. Attendance audits must be verified within 24 hours of landing."</p>
                                    </div>
                                    <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Pending Approvals</p>
                                        <p className="text-3xl font-black mb-2 italic tabular-nums">{stats.approvalQueue}</p>
                                        <button
                                            onClick={() => setActiveTab('approvals')}
                                            className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 flex items-center gap-2"
                                        >
                                            View Authorization Queue <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'approvals':
                const pendingEvents = events.filter(e => e.status === 'PENDING');
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
                        <div className="flex items-center justify-between px-2">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase italic">Authorization Queue</h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Verifying upcoming deployments for club integrity</p>
                            </div>
                            <div className="bg-amber-50 text-amber-600 px-6 py-3 rounded-2xl border border-amber-100 flex items-center gap-3">
                                <ShieldAlert className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-widest">{pendingEvents.length} Pending Actions</span>
                            </div>
                        </div>

                        {pendingEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingEvents.map((event) => (
                                    <div key={event.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
                                        <div className="p-8 pb-4">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                                                    {event.type?.[0] || 'E'}
                                                </div>
                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100 italic">AWAITING REVIEW</span>
                                            </div>
                                            <h4 className="text-lg font-black text-slate-800 uppercase leading-tight italic line-clamp-2 min-h-[3.5rem] tracking-tight">{event.title}</h4>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100 italic">{event.type}</span>
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 italic">{event.createdBy}</span>
                                            </div>
                                        </div>
                                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 space-y-4 flex-1">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <p className="text-xs font-bold text-slate-600">{event.date}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                                <p className="text-xs font-bold text-slate-600 uppercase">{event.venue || 'TBA'}</p>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic line-clamp-3">"{event.description}"</p>
                                        </div>
                                        <div className="p-8 pt-4 bg-slate-50 border-t border-slate-100">
                                            <button
                                                onClick={() => {
                                                    setEventToApprove(event);
                                                    setShowApproveModal(true);
                                                }}
                                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3"
                                            >
                                                <Eye className="w-4 h-4" /> Review & Authorize
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-[3rem] p-20 text-center animate-pulse">
                                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                                <h3 className="text-2xl font-black text-emerald-800 uppercase italic">Protocol Clear</h3>
                                <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mt-2 italic">Zero entries requiring immediate authorization</p>
                            </div>
                        )}
                    </div>
                );
            case 'directory':
                const filteredStudents = students.filter(s =>
                    s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
                );
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h3 className="font-black text-slate-800 text-xl uppercase italic flex items-center gap-3">
                                        <Users className="w-6 h-6 text-blue-600" /> Master Personnel Directory
                                    </h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Authorized access to {students.length} personnel profiles</p>
                                </div>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by Identity or Register..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-xs"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-6">Student Identity</th>
                                            <th className="px-8 py-6">Intelligence Profile</th>
                                            <th className="px-8 py-6">Batch Data</th>
                                            <th className="px-8 py-6 text-right">Service Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs uppercase italic drop-shadow-sm">
                                                            {student.fullName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.fullName}</p>
                                                            <p className="text-[10px] text-blue-600 font-mono font-bold italic">{student.rollNumber}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Contact Trace</p>
                                                    <p className="text-xs font-bold text-slate-600 lowercase">{student.email}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                                        {student.department} • Year {student.yearOfStudy}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 italic">Active Member</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'reports':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((event) => (
                                <motion.div
                                    key={event.id}
                                    whileHover={{ y: -5 }}
                                    className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col gap-6 group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <FileText className="w-24 h-24 text-slate-900" />
                                    </div>
                                    <div className="flex-1">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border italic mb-4 block w-fit ${event.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            event.status === 'LIVE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                            {event.status} Protocol
                                        </span>
                                        <h4 className="text-lg font-black text-slate-800 uppercase leading-tight italic line-clamp-2 mb-4 tracking-tight">{event.title}</h4>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                                <Calendar className="w-3 h-3" /> Event Identity: {event.date}
                                            </p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                                <Target className="w-3 h-3" /> Data Points: {registrations.filter(r => r.eventId === event.id).length} Units
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => generateEventReport(event)}
                                        className="w-full py-4 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 italic"
                                    >
                                        <Download className="w-4 h-4" /> Export Intelligence Report
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (loadingData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse italic">Synchronizing Secretary Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfdfe] flex text-left">
            {/* Tactical Sidebar */}
            <aside className="w-80 bg-slate-900 text-white flex flex-col sticky top-0 h-screen shrink-0 border-r border-slate-800 shadow-2xl z-50">
                <div className="p-8 border-b border-slate-800/50">
                    <div className="flex items-center gap-4 mb-8">
                        <img src={techsparkLogo} alt="Logo" className="h-10 w-auto object-contain filter brightness-0 invert opacity-90 drop-shadow-xl" />
                        <div className="w-px h-8 bg-white/10 mx-1" />
                        <div>
                            <h2 className="text-xl font-black tracking-tighter italic uppercase text-white leading-none">Secretary</h2>
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1 italic">Intelligence Ops</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-5 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic shadow-lg shadow-blue-500/20">D</div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic uppercase">Authenticated as</p>
                                <p className="text-sm font-black text-white italic truncate uppercase">{secretary?.username}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                    {[
                        { id: 'overview', label: 'Tactical Overview', icon: <LayoutDashboard /> },
                        { id: 'approvals', label: 'Approval Queue', icon: <ShieldCheck />, badge: stats.approvalQueue },
                        { id: 'directory', label: 'Student Intelligence', icon: <Users /> },
                        { id: 'reports', label: 'Official Reports', icon: <FileText /> },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                                    {item.icon}
                                </span>
                                <span className="text-[11px] font-black uppercase tracking-[0.1em] italic">{item.label}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === item.id ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                                    } shadow-sm italic`}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-800/50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest italic group"
                    >
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Sign Out Protocol
                    </button>
                    <p className="text-center text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mt-6 italic opacity-50 underline decoration-slate-800 underline-offset-4">Sec Ops v2.0</p>
                </div>
            </aside>

            {/* Main Operational Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Header */}
                <header className="p-10 pb-0 sticky top-0 bg-[#fcfdfe]/80 backdrop-blur-md z-40">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                                {activeTab === 'overview' && 'Intelligence Terminal'}
                                {activeTab === 'approvals' && 'Authorization Desk'}
                                {activeTab === 'directory' && 'Personnel Intel'}
                                {activeTab === 'reports' && 'Strategic Archives'}
                            </h1>
                            <div className="flex items-center gap-4 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 pulse"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">System Online</span>
                                </div>
                                <span className="text-slate-200">|</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-10 pt-0">
                    {renderContent()}
                </div>
            </main>

            {/* Event Authorization Review Modal */}
            <AnimatePresence>
                {showApproveModal && eventToApprove && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowApproveModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
                        >
                            {/* Header */}
                            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between font-black uppercase tracking-widest italic">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">Secretary Authorization Desk</h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Vetting tactical deployment data for {eventToApprove.createdBy}</p>
                                </div>
                                <button onClick={() => setShowApproveModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            {/* Detailed Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-left bg-[#fcfdfe]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Core Details */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tactical Objective</label>
                                            <p className="text-xl font-black text-slate-800 uppercase leading-tight italic">{eventToApprove.title}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operation Type</label>
                                                <span className="block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black w-fit uppercase italic">{eventToApprove.type}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Originator</label>
                                                <p className="text-sm font-bold text-slate-700 uppercase italic underline decoration-slate-200 underline-offset-4">{eventToApprove.createdBy}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Intelligence Summary</label>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium italic">"{eventToApprove.description}"</p>
                                        </div>
                                    </div>

                                    {/* Logistics */}
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-blue-600">
                                                    <Calendar className="w-4 h-4" />
                                                    <label className="text-[10px] font-black uppercase tracking-widest italic">Date</label>
                                                </div>
                                                <p className="text-sm font-black text-slate-800 italic">{eventToApprove.date}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Clock className="w-4 h-4" />
                                                    <label className="text-[10px] font-black uppercase tracking-widest italic">Time</label>
                                                </div>
                                                <p className="text-sm font-black text-slate-800 italic">{eventToApprove.time || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <MapPin className="w-4 h-4" />
                                                <label className="text-[10px] font-black uppercase tracking-widest italic">Venue / Base</label>
                                            </div>
                                            <p className="text-sm font-black text-slate-800 uppercase italic">{eventToApprove.venue || 'NOT SPECIFIED'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Personnel Capacity</label>
                                                <p className="text-sm font-black text-slate-800 italic">{eventToApprove.maxNo || 100} Members</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                                <button
                                    onClick={async () => {
                                        const remarks = prompt("Enter rejection/revert remarks (MANDATORY):");
                                        if (!remarks) return alert("Remarks are mandatory for rejection.");
                                        await updateDoc(doc(db, 'events', eventToApprove.id), {
                                            status: 'REJECTED',
                                            remarks,
                                            lastActionBy: secretary.username,
                                            lastActionAt: serverTimestamp()
                                        });
                                        setShowApproveModal(false);
                                    }}
                                    className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2 italic"
                                >
                                    <Trash2 className="w-4 h-4" /> Deny Authorization
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm("Authorize this event for LIVE broadcast? This will be logged under Secretary credentials.")) return;
                                        await updateDoc(doc(db, 'events', eventToApprove.id), {
                                            status: 'LIVE',
                                            remarks: 'Authorized by Club Secretary after documentation review',
                                            lastActionBy: secretary.username,
                                            lastActionAt: serverTimestamp()
                                        });
                                        setShowApproveModal(false);
                                    }}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 italic"
                                >
                                    <ShieldCheck className="w-5 h-5" /> Grant Live Protocol
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SecretaryDashboard;

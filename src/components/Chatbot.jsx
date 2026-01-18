import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hey! I'm Sparky, your TechSpark helper. How can I assist you today?", sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    const qaPairs = [
        // Club Identity & Basic Info
        { keywords: ['who are you', 'sparky', 'what are you'], response: "I'm Sparky, the Official AI Helper for TechSpark Club! I know everything about our events, team, and projects. How can I spark your curiosity today?" },
        { keywords: ['club', 'what is techspark', 'about'], response: "TechSpark is the premier technical club of RIT Chennai. We are a vibrant ecosystem where students transform ideas into impact through workshops, hackathons, and real-world projects!" },
        { keywords: ['vision'], response: "Our vision is to create a dynamic ecosystem where students at RIT Chennai can innovate and build technology for a better tomorrow." },
        { keywords: ['mission'], response: "Our mission is to empower students with cutting-edge technical skills, foster creativity through hands-on learning, and bridge the gap between academia and industry." },

        // Membership & Joining
        { keywords: ['join', 'membership', 'how to register', 'sign up'], response: "Joining is easy! Just use the 'Join Our Community' button and sign in with your ritchennai.edu.in email. If you're a student, you'll get access to the dashboard, events, and certificates!" },
        { keywords: ['email', 'login problem', 'denied'], response: "Only @ritchennai.edu.in emails are allowed. If you're using your college email and still can't log in, try clearing your cache or contact the Social Media Head (Harivasan V)." },

        // Team & Leaders
        { keywords: ['coordinator', 'teacher', 'faculty', 'pandiyarajan'], response: "Our Club Coordinator is Mr. Pandiyarajan. He provides the guidance and support that keeps TechSpark running smoothly!" },
        { keywords: ['president', 'abinaya'], response: "Our President is Abinaya M. She leads the club with vision and ensures all teams are aligned towards our goals." },
        { keywords: ['vice president', 'vp', 'devaprakash'], response: "Our Vice President is Devaprakash J. He's a core strategist and helps manage the overall operations of the club." },
        { keywords: ['secretary', 'kanishga'], response: "Our Secretary is Kanishga S. She handles the official documentation and internal communications of the club." },
        { keywords: ['social media', 'instagram', 'harivasan'], response: "Our Social Media Head is Harivasan V. He manages our presence on platforms like Instagram to keep everyone updated!" },
        { keywords: ['creative', 'praveen'], response: "Praveen M is our Creative Head. He's the brain behind the beautiful designs you see across TechSpark!" },
        { keywords: ['graphics', 'anto'], response: "Anto Jenishia A is our Graphic Designer. She builds the stunning visual assets for our events and website." },
        { keywords: ['pro', 'public relations', 'pallavi'], response: "Our PRO is Pallavi S. She handles public relations and ensures TechSpark is well-represented within and outside the college." },
        { keywords: ['report', 'jananishree'], response: "Jananishree M is our Report Head. She documents our progress and maintains the records of our events." },
        { keywords: ['content', 'mugesh'], response: "Mugesh M is our Content Writer. He crafts the words that describe our vision and tell our stories." },
        { keywords: ['organizer', 'barath'], response: "Barath S is our Event Organizer. He ensures our events are planned and executed to perfection!" },
        { keywords: ['photography', 'thendralraja'], response: "Thendralraja M J is our Photography Head. He captures the moments that make TechSpark special!" },
        { keywords: ['volunteer', 'monesh'], response: "Monesh Raj J handles Volunteer Management. He coordinates the amazing students who help us during events!" },
        { keywords: ['vignesh'], response: "Vignesh K is our Event Coordinator. He works closely with the organizer to manage on-ground logistics." },

        // Events & Proctoring
        { keywords: ['event', 'workshop', 'hackathon', 'seminar'], response: "We host high-impact workshops (e.g., Web Dev, AI/ML), 24-48 hour Hackathons, and technical competitions. Check the 'Events' section for live opportunities!" },
        { keywords: ['proctor', 'tab switch', 'violation', 'rules'], response: "Our quiz system has built-in proctoring. Warning: If you switch tabs more than 3 times during a quiz, your session will be automatically terminated!" },
        { keywords: ['register event', 'how to register'], response: "Go to the Events page, click 'Register Now' on your desired event, and fill in your team details (if it's a team event) or register individually." },

        // Certificates & Points
        { keywords: ['certificate', 'verify', 'download', 'vault'], response: "Certificates are automatically generated after you participate in an event. You can find them in your 'Certificate Vault' on the Student Dashboard. Every certificate has a unique QR code for verification!" },
        { keywords: ['points', 'xp', 'rank'], response: "You earn points for every event you attend. These points unlock badges like 'Spark Starter', 'Rising Catalyst', and eventually 'Institutional Legend'. High points improve your rank!" },

        // Projects & Innovation
        { keywords: ['project', 'team', 'incubation', 'idea'], response: "TechSpark is an incubator! If you have a project idea (like our Smart Campus App or AI Study Buddy), join a team or start your own. You can even 'Like' your favorite projects in the Innovation Hub!" },
        { keywords: ['smart campus'], response: "The Smart Campus App is our flagship project for campus navigation and services. It's currently in the 'Ongoing' phase!" },
        { keywords: ['ai study buddy'], response: "AI Study Buddy is an ML-powered personalized learning assistant built by Team Beta. Check it out in the Projects grid!" },

        // Tech Info
        { keywords: ['tech stack', 'built with', 'how was this made'], response: "This website is built using the 'MERN' spirit but optimized with React.js, Tailwind CSS, Framer Motion for animations, and Firebase for real-time data and authentication!" },

        // Greetings
        { keywords: ['hi', 'hello', 'hey', 'namaste'], response: "Hello! Sparky here. Ready to level up your technical skills with TechSpark?" },
        { keywords: ['help', 'what can you do'], response: "I can tell you about our core team members, explain how to register for events, find your certificates, or tell you about namma club's vision!" },
    ];

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Process response
        setTimeout(() => {
            const botResponse = processMessage(input);
            setMessages(prev => [...prev, { id: Date.now() + 1, text: botResponse, sender: 'bot' }]);
            setIsTyping(false);
        }, 1000);
    };

    const processMessage = (text) => {
        const lowerText = text.toLowerCase();
        for (const pair of qaPairs) {
            if (pair.keywords.some(k => lowerText.includes(k))) {
                return pair.response;
            }
        }
        return "I'm not sure about that. Try asking about events, certificates, or how to join! Or you can contact a core member for more details.";
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white/95 backdrop-blur-xl w-[380px] h-[580px] rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col overflow-hidden mb-6 mr-2"
                    >
                        {/* Premium Header */}
                        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 p-7 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
                            {/* Animated background element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-2xl border border-white/20 shadow-inner">
                                    <Bot className="w-7 h-7 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-base tracking-tight italic uppercase">Sparky <span className="text-blue-400">AI</span></h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
                                        <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Core Intelligence Active</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2.5 hover:bg-white/10 rounded-2xl transition-all active:scale-90"
                            >
                                <X className="w-5 h-5 text-white/50" />
                            </button>
                        </div>

                        {/* Messages Area - Glassy background */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-slate-50/50 to-white">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-semibold leading-relaxed shadow-sm transition-all hover:shadow-md ${m.sender === 'user'
                                            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none'
                                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                        }`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white px-5 py-4 rounded-[1.5rem] rounded-tl-none border border-slate-100 shadow-sm flex gap-1.5 items-center">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Premium Input Section */}
                        <div className="p-5 bg-white border-t border-slate-50 flex gap-3 shrink-0 items-center">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type your message..."
                                    className="w-full bg-slate-100/50 border border-slate-200/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none placeholder:text-slate-400"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    >
                                        <Sparkles className="w-4 h-4 text-blue-400/50" />
                                    </motion.div>
                                </div>
                            </div>
                            <button
                                onClick={handleSend}
                                className="bg-slate-900 text-white p-3.5 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-90 flex items-center justify-center"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <div className="relative">
                {/* Sonar Pulse Effect */}
                {!isOpen && (
                    <motion.div
                        animate={{
                            scale: [1, 1.5, 2],
                            opacity: [0.3, 0.1, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeOut",
                        }}
                        className="absolute inset-0 bg-blue-400 rounded-3xl z-[-1]"
                    />
                )}

                <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.3)] border-2 transition-all duration-500 ${isOpen
                        ? 'bg-slate-900 border-slate-800 rotate-90 shadow-none'
                        : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 border-blue-400/30'
                        }`}
                >
                    {isOpen ? (
                        <X className="w-7 h-7 text-white" />
                    ) : (
                        <div className="relative group">
                            {/* Main Bot Icon */}
                            <Bot className="w-8 h-8 text-white drop-shadow-md group-hover:rotate-12 transition-transform duration-300" />

                            {/* Notification Badge - More Premium */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-3 -right-3 w-7 h-7 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-blue-100"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-blue-600 fill-blue-50" />

                                {/* Inner Soft Glow */}
                                <div className="absolute inset-0 bg-blue-400/20 rounded-2xl animate-pulse" />
                            </motion.div>
                        </div>
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default Chatbot;

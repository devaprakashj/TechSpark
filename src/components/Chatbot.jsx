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
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-white w-[350px] h-[500px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden mb-4"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Sparky AI</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm ${m.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                        }`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask Sparky anything..."
                                className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            />
                            <button
                                onClick={handleSend}
                                className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${isOpen ? 'bg-slate-900 rotate-90' : 'bg-blue-600'
                    }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <div className="relative">
                        <MessageSquare className="w-6 h-6 text-white" />
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                        >
                            <Sparkles className="w-3 h-3 text-white" />
                        </motion.div>
                    </div>
                )}
            </motion.button>
        </div>
    );
};

export default Chatbot;

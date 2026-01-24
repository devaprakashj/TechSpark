import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import TypewriterText from './TypewriterText';
import CountUp from './CountUp';
import RotatingText from './RotatingText';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import ritLogo from '../assets/rit-logo.png';
import tsLogo from '../assets/techspark-logo.png';
const Hero = () => {
    const { isAuthenticated, openAuthModal } = useAuth();
    const navigate = useNavigate();
    const [memberCount, setMemberCount] = useState(500); // Default fallback

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const coll = collection(db, "users");
                const snapshot = await getCountFromServer(coll);
                const count = snapshot.data().count;
                if (count > 0) setMemberCount(count);
            } catch (err) {
                console.error("Error fetching member count:", err);
            }
        };
        fetchCounts();
    }, []);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleJoinClick = () => {
        if (!isAuthenticated) {
            openAuthModal();
        } else {
            navigate('/dashboard');
        }
    };

    const stats = [
        {
            value: memberCount,
            suffix: '+',
            label: 'Active Members',
            section: 'team',
        },
        {
            value: 50,
            suffix: '+',
            label: 'Events Hosted',
            section: 'events',
        },
        {
            value: 25,
            suffix: '+',
            label: 'Projects Built',
            section: 'projects',
        },
    ];

    return (
        <section id="home" className="pt-24 pb-20 lg:pt-32 lg:pb-32 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="container-custom relative z-10">
                <div className="max-w-4xl mx-auto text-center animate-fade-in">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-blue-100 rounded-full mb-8 shadow-sm hover:shadow-md transition-shadow">
                        <img src={ritLogo} alt="RIT Logo" className="h-5 w-auto object-contain" />
                        <div className="w-px h-4 bg-gray-200" />
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                            Official Technical Club of RIT Chennai
                        </span>
                    </div>

                    {/* Headline for SEO */}
                    <h1 className="sr-only">TechSpark Club - Rajalakshmi Institute of Technology (RIT), Chennai</h1>

                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 letter-tight leading-snug flex flex-col items-center">
                        <TypewriterText
                            text="Welcome to TechSpark"
                            speed={80}
                            className="gradient-text"
                            aria-label="Welcome to TechSpark Club RIT Chennai"
                        />
                        <div className="flex items-center justify-center gap-3 md:gap-4 -mt-2">

                            <RotatingText
                                texts={['Think', 'Build', 'Spark']}
                                mainClassName="text-blue-600 overflow-hidden justify-center"
                                staggerFrom={"last"}
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "-120%", opacity: 0 }}
                                staggerDuration={0.025}
                                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                rotationInterval={2000}
                            />
                        </div>
                    </h2>

                    {/* Subheading */}
                    <p className="text-lg lg:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto px-4 md:px-0">
                        Igniting innovation and building tomorrow's technology leaders through hands-on projects, cutting-edge workshops, and collaborative excellence
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center px-6 sm:px-0">
                        <button
                            onClick={handleJoinClick}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            Join Our Community
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scrollToSection('events')}
                            className="btn-secondary"
                        >
                            Explore Events
                        </button>
                    </div>

                    {/* Interactive Stats */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 mt-16 md:mt-20 max-w-2xl mx-auto px-4">
                        {stats.map((stat, index) => (
                            <button
                                key={index}
                                onClick={() => scrollToSection(stat.section)}
                                className={`text-center group cursor-pointer transition-all duration-300 hover:scale-110 focus:outline-none ${index === 2 ? 'xs:col-span-2 sm:col-span-1' : ''}`}
                            >
                                <div className="text-3xl md:text-5xl font-extrabold gradient-text mb-2 group-hover:scale-105 transition-transform">
                                    <CountUp
                                        end={stat.value}
                                        suffix={stat.suffix}
                                        duration={2500}
                                    />
                                </div>
                                <div className="text-xs md:text-base text-gray-600 font-medium group-hover:text-blue-600 transition-colors uppercase tracking-wider">
                                    {stat.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;

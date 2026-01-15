import { useState, useEffect } from 'react';
import { Zap, Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { isAuthenticated, user, logout, openAuthModal } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        // If not on home page, navigate to home first
        if (location.pathname !== '/') {
            navigate('/', { replace: true });
            // Wait for navigation to complete, then scroll
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                setIsMobileMenuOpen(false);
            }, 300);
        } else {
            // Already on home page, just scroll
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setIsMobileMenuOpen(false);
            }
        }
    };

    // Effect to handle scrolling when navigating back to home from dashboard
    useEffect(() => {
        if (location.pathname === '/' && location.state?.scrollTo) {
            const id = location.state.scrollTo;
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    // Clear the state
                    window.history.replaceState({}, document.title);
                }
            }, 100);
        }
    }, [location]);

    const handleJoinClick = () => {
        if (!isAuthenticated) {
            openAuthModal();
        } else {
            navigate('/dashboard');
        }
        setIsMobileMenuOpen(false);
    };

    const menuItems = [
        { name: 'Home', id: 'home' },
        { name: 'About', id: 'about' },
        { name: 'Events', id: 'events' },
        { name: 'Projects', id: 'projects' },
        { name: 'Team', id: 'team' },
        { name: 'Verify', id: 'verify', link: '/certificateverify' },
    ];

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
                ? 'glass shadow-lg'
                : 'bg-white/80 backdrop-blur-xl shrink-navbar'
                } border-b border-gray-100`}
        >
            <div className="container-custom">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center cursor-pointer"
                        onClick={() => scrollToSection('home')}
                    >
                        <img src={logo} alt="TechSpark Logo" className="h-12 w-auto object-contain" />
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-2">
                        {menuItems.map((item) => (
                            item.link ? (
                                <Link
                                    key={item.id}
                                    to={item.link}
                                    className="nav-card-item text-gray-700 hover:text-blue-600 font-medium"
                                >
                                    {item.name}
                                </Link>
                            ) : (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className="nav-card-item text-gray-700 hover:text-blue-600 font-medium"
                                >
                                    {item.name}
                                </button>
                            )
                        ))}
                    </div>

                    {/* CTA Button - Desktop */}
                    <div className="hidden md:block">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/dashboard"
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full font-bold shadow-md hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span>Dashboard</span>
                                </Link>
                                <div className="w-px h-6 bg-gray-200 mx-1" />
                                <button
                                    onClick={logout}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleJoinClick}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full font-semibold shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
                            >
                                Join Now
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6" />
                        ) : (
                            <Menu className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                            className="md:hidden overflow-hidden bg-white/95 backdrop-blur-2xl border-t border-gray-100/50"
                        >
                            <div className="py-8 px-4 flex flex-col gap-2">
                                {menuItems.map((item, index) => (
                                    item.link ? (
                                        <motion.div
                                            key={item.id}
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
                                        >
                                            <Link
                                                to={item.link}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="text-left text-gray-800 hover:text-blue-600 font-bold text-lg tracking-tight transition-all duration-300 py-4 px-5 rounded-2xl hover:bg-blue-50/80 flex items-center justify-between group active:scale-[0.98] w-full"
                                            >
                                                <span className="relative z-10">{item.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Open</span>
                                                    <Zap className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12" />
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ) : (
                                        <motion.button
                                            key={item.id}
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
                                            onClick={() => scrollToSection(item.id)}
                                            className="text-left text-gray-800 hover:text-blue-600 font-bold text-lg tracking-tight transition-all duration-300 py-4 px-5 rounded-2xl hover:bg-blue-50/80 flex items-center justify-between group active:scale-[0.98]"
                                        >
                                            <span className="relative z-10">{item.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Navigate</span>
                                                <Zap className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12" />
                                            </div>
                                        </motion.button>
                                    )
                                ))}

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 + menuItems.length * 0.1, duration: 0.5 }}
                                    className="mt-6 pt-6 border-t border-gray-100 space-y-4"
                                >
                                    {isAuthenticated ? (
                                        <div className="flex flex-col gap-3">
                                            <Link
                                                to="/dashboard"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-extrabold flex items-center justify-center gap-3 shadow-xl shadow-blue-200 active:scale-95 transition-all"
                                            >
                                                <LayoutDashboard className="w-6 h-6" />
                                                GO TO DASHBOARD
                                            </Link>
                                            <button
                                                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                                className="w-full py-4 px-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                                            >
                                                <LogOut className="w-5 h-5" />
                                                LOGOUT ACCOUNT
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleJoinClick}
                                            className="w-full py-5 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 text-white rounded-3xl font-black text-lg shadow-2xl shadow-blue-200 hover:shadow-cyan-200 active:scale-95 transition-all duration-300 text-center tracking-tighter uppercase"
                                        >
                                            Join Community Now
                                        </button>
                                    )}

                                    <div className="flex justify-center gap-6 py-4">
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
};

export default Navbar;

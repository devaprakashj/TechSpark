import { Zap, Linkedin, Instagram, Mail, ArrowUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

const Footer = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToSection = (id) => {
        // If not on home page, navigate to home first
        if (location.pathname !== '/') {
            navigate('/', { state: { scrollTo: id } });
        } else {
            // Already on home page, just scroll
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    return (
        <footer className="bg-gray-50 border-t border-gray-200 mt-20">
            <div className="container-custom py-16">
                {/* Main Footer Content */}
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* About Column */}
                    <div className="md:col-span-2">
                        <div className="flex items-center cursor-pointer mb-6" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <img src={logo} alt="TechSpark Logo" className="h-12 w-auto object-contain" />
                        </div>
                        <p className="text-gray-600 leading-relaxed mb-6 max-w-md">
                            Igniting innovation and building tomorrow's technology leaders through hands-on projects, cutting-edge workshops, and collaborative excellence.
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="#"
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-blue-600 hover:border-blue-600 hover:text-white flex items-center justify-center transition-all duration-300"
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-pink-600 hover:border-pink-600 hover:text-white flex items-center justify-center transition-all duration-300"
                                aria-label="Instagram"
                            >
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a
                                href="mailto:techspark@college.edu"
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-900 hover:border-gray-900 hover:text-white flex items-center justify-center transition-all duration-300"
                                aria-label="Email"
                            >
                                <Mail className="w-5 h-5" />
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-900 hover:border-gray-900 hover:text-white flex items-center justify-center transition-all duration-300"
                                aria-label="GitHub"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links Column */}
                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            <li>
                                <button
                                    onClick={() => scrollToSection('home')}
                                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                                >
                                    Home
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('about')}
                                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                                >
                                    About Us
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('events')}
                                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                                >
                                    Events
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('projects')}
                                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                                >
                                    Projects
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('team')}
                                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                                >
                                    Team
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('contact')}
                                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                                >
                                    Contact
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* WhatsApp Community Column */}
                    <div>
                        <h4 className="font-bold text-gray-900 mb-4 tracking-tight">Join Our Community</h4>
                        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                            Stay instantly updated with event alerts, workshop materials, and tech discussions.
                        </p>
                        <a
                            href="https://chat.whatsapp.com/I8B5Wdybrew2dYYdRE4PGR"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold text-sm shadow-xl shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.45L0 24l7.105-1.864a11.834 11.834 0 005.45 1.387h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Connect on WhatsApp
                        </a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500 text-center md:text-left">
                        © 2026 TechSpark Club. All rights reserved. Made with ❤️ by TechSpark Team
                    </p>
                    <button
                        onClick={scrollToTop}
                        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all duration-300 hover:scale-110"
                        aria-label="Scroll to top"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

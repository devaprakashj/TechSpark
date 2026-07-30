import { Linkedin, Mail, Github, Instagram } from 'lucide-react';
import ProfileCard from './ProfileCard';
import avudaiSelviImg from '../assets/team/avudai-selvi.jpeg';
import praveenImg from '../assets/team/praveen.png';
import barathImg from '../assets/team/barath.png';
import moneshImg from '../assets/team/monesh.png';
import devaprakashImg from '../assets/team/devaprakash_new.png';
import pallaviImg from '../assets/team/pallavi.png';
import jananishreeImg from '../assets/team/jananishree.png';
import thendralrajaImg from '../assets/team/thendralraja.jpg';
import abinayaImg from '../assets/team/abinaya.jpg';
import kanishgaImg from '../assets/team/kanishga.png';
import vigneshImg from '../assets/team/vignesh.png';
import antoImg from '../assets/team/anto.jpg';
import mugkeshImg from '../assets/team/mugkesh.png';
import harivasanImg from '../assets/team/harivasan.png';
import krishanthImg from '../assets/team/krishanth.jpeg';
import ramyaImg from '../assets/team/ramya.png';
import divyadarshiniImg from '../assets/team/divyadarshini.jpeg';
import ajithaImg from '../assets/team/ajitha.jpeg';
import lavanyaImg from '../assets/team/lavanya.jpeg';

const Team = () => {
    // Lead Members (Coordinator & President)
    const leads = [
        {
            name: 'AVUDAI SELVI S',
            role: 'Club Coordinator',
            emoji: '👩‍🏫',
            image: avudaiSelviImg,
            gradient: 'from-purple-600 to-pink-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/avudai-selvi-42349b109',
                email: 'coordinator@techspark.edu',
            },
        },
        {
            name: 'DEVAPRAKASH J',
            role: 'President',
            emoji: '👨‍💼',
            image: devaprakashImg,
            gradient: 'from-blue-600 to-cyan-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/devaprakashj?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'president@techspark.edu',
            },
        },
    ];

    const coreTeam = [
        {
            name: 'BARATH S',
            role: 'Vice President',
            emoji: '👨‍💼',
            image: barathImg,
            gradient: 'from-purple-600 to-pink-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/barath-s-52910431a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'vp@techspark.edu',
            },
        },
        {
            name: 'PRAVEEN M',
            role: 'Secretary',
            emoji: '📝',
            image: praveenImg,
            gradient: 'from-cyan-600 to-blue-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/praveen-manthiramoorthi-899438309?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'secretary@techspark.edu',
            },
        },
        {
            name: 'HARIVASAN V',
            role: 'PRO',
            emoji: '📢',
            image: harivasanImg,
            gradient: 'from-pink-600 to-rose-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/hari-vasan-6ba71232b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'pro@techspark.edu',
            },
        },
        {
            name: 'DIVYADARSHINI D',
            role: 'Report Head',
            emoji: '📊',
            image: divyadarshiniImg,
            gradient: 'from-indigo-600 to-purple-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/divyadarshini-dhanasekaran-218785365',
                email: 'reports@techspark.edu',
            },
        },
        {
            name: 'AJITHA V',
            role: 'Content Writer',
            emoji: '✍️',
            image: ajithaImg,
            gradient: 'from-green-600 to-emerald-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/ajitha-vishwanath-079a21402',
                email: 'content@techspark.edu',
            },
        },
        {
            name: 'MONESH RAJ J',
            role: 'Photography Head',
            emoji: '📸',
            image: moneshImg,
            gradient: 'from-yellow-600 to-orange-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/monesh-raj-j-35a80a371?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'photography@techspark.edu',
            },
        },
        {
            name: 'ANTO JENISHIA A',
            role: 'Event Organiser',
            emoji: '🎯',
            image: antoImg,
            gradient: 'from-red-600 to-pink-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/anto-jenishia-aa0415314?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'events@techspark.edu',
            },
        },
        {
            name: 'LAVANYA S',
            role: 'Creative Head',
            emoji: '🎨',
            image: lavanyaImg,
            gradient: 'from-violet-600 to-purple-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/s-lavanya-1684792b2',
                email: 'creative@techspark.edu',
            },
        },
        {
            name: 'RAMYA K N',
            role: 'Social Media Head',
            emoji: '📱',
            image: ramyaImg,
            gradient: 'from-blue-600 to-indigo-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/ramya-k-n-04402537b',
                email: 'socialmedia@techspark.edu',
                instagram: '#',
            },
        },
        {
            name: 'VIGNESH K',
            role: 'Event Coordinator',
            emoji: '🎪',
            image: vigneshImg,
            gradient: 'from-teal-600 to-cyan-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/k-vignesh-ab7712324?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'coordinator@techspark.edu',
            },
        },
        {
            name: 'KRISHANTH R',
            role: 'Design Head',
            emoji: '🎨',
            image: krishanthImg,
            gradient: 'from-fuchsia-600 to-pink-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/krishanth-r007/',
                email: 'design@techspark.edu',
            },
        },
        {
            name: 'MUGESH M',
            role: 'Operation Head',
            emoji: '🤝',
            image: mugkeshImg,
            gradient: 'from-lime-600 to-green-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/mugesh-m-50403232b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'volunteers@techspark.edu',
            },
        },
    ];

    return (
        <section id="team" className="section">
            <div className="container-custom">
                {/* Section Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900 letter-tight">
                        Meet Our <span className="gradient-text">Team</span>
                    </h2>
                    <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Passionate leaders driving innovation and excellence
                    </p>
                </div>

                {/* Lead Members (Coordinator & President) - 2 Cards Row */}
                <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-10 mb-12">
                    {leads.map((member, index) => (
                        <div key={index} className="w-full sm:w-[calc(50%-1rem)] lg:w-[320px] flex justify-center">
                            <ProfileCard
                                name={member.name}
                                title={member.role}
                                handle={member.name.toLowerCase().replace(/\s/g, '')}
                                status="Active"
                                contactText="LinkedIn"
                                avatarUrl={member.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                                showUserInfo={true}
                                enableTilt={true}
                                onContactClick={() => {
                                    if (member.social.linkedin !== '#') {
                                        window.open(member.social.linkedin, '_blank');
                                    } else {
                                        window.location.href = `mailto:${member.social.email}`;
                                    }
                                }}
                                className="w-full max-w-[320px]"
                            />
                        </div>
                    ))}
                </div>

                {/* Core Members Grid - 3 Columns (4 Rows) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mb-16 max-w-6xl mx-auto justify-items-center">
                    {coreTeam.map((member, index) => (
                        <div key={index} className="flex justify-center w-full">
                            <ProfileCard
                                name={member.name}
                                title={member.role}
                                handle={member.name.toLowerCase().replace(/\s/g, '')}
                                status="Active"
                                contactText="LinkedIn"
                                avatarUrl={member.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                                showUserInfo={true}
                                enableTilt={true}
                                onContactClick={() => {
                                    if (member.social.linkedin !== '#') {
                                        window.open(member.social.linkedin, '_blank');
                                    } else {
                                        window.location.href = `mailto:${member.social.email}`;
                                    }
                                }}
                                className="w-full max-w-[320px]"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Team;

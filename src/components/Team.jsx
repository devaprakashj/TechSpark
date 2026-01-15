import { Linkedin, Mail, Github, Instagram } from 'lucide-react';
import ProfileCard from './ProfileCard';
import pandiyarajanImg from '../assets/team/pandiyarajan.png';
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

const Team = () => {
    // Lead Members (Coordinator & President)
    const leads = [
        {
            name: 'PANDIYARAJAN',
            role: 'Club Coordinator',
            emoji: '👨‍🏫',
            image: pandiyarajanImg,
            gradient: 'from-purple-600 to-pink-600',
            social: {
                linkedin: '#',
                email: 'coordinator@techspark.edu',
            },
        },
        {
            name: 'ABINAYA M',
            role: 'President',
            emoji: '👩‍💼',
            image: abinayaImg,
            gradient: 'from-blue-600 to-cyan-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/abinaya-m-880297291?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'president@techspark.edu',
            },
        },
    ];

    // Core Members (Remaining 12)
    const coreTeam = [
        {
            name: 'DEVAPRAKASH J',
            role: 'Vice President',
            emoji: '👨‍💼',
            image: devaprakashImg,
            gradient: 'from-purple-600 to-pink-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/devaprakashj?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'vp@techspark.edu',
            },
        },
        {
            name: 'KANISHGA S',
            role: 'Secretary',
            emoji: '📝',
            image: kanishgaImg,
            gradient: 'from-cyan-600 to-blue-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/kanishga-shanmugam-7211a7283?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'secretary@techspark.edu',
            },
        },
        {
            name: 'PALLAVI S',
            role: 'PRO',
            emoji: '📢',
            image: pallaviImg,
            gradient: 'from-pink-600 to-rose-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/pallavi-s-aa61a1337?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'pro@techspark.edu',
            },
        },
        {
            name: 'JANANISHREE M',
            role: 'Report Head',
            emoji: '📊',
            image: jananishreeImg,
            gradient: 'from-indigo-600 to-purple-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/janani-shree-535926299?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'reports@techspark.edu',
            },
        },
        {
            name: 'MUGESH M',
            role: 'Content Writer',
            emoji: '✍️',
            image: mugkeshImg,
            gradient: 'from-green-600 to-emerald-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/mugesh-m-50403232b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'content@techspark.edu',
            },
        },
        {
            name: 'THENDRALRAJA M J',
            role: 'Photography Head',
            emoji: '📸',
            image: thendralrajaImg,
            gradient: 'from-yellow-600 to-orange-600',
            social: {
                linkedin: '#',
                email: 'photography@techspark.edu',
            },
        },
        {
            name: 'BARATH S',
            role: 'Event Organiser',
            emoji: '🎯',
            image: barathImg,
            gradient: 'from-red-600 to-pink-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/barath-s-52910431a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'events@techspark.edu',
            },
        },
        {
            name: 'PRAVEEN M',
            role: 'Creative Head',
            emoji: '🎨',
            image: praveenImg,
            gradient: 'from-violet-600 to-purple-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/praveen-manthiramoorthi-899438309?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'creative@techspark.edu',
            },
        },
        {
            name: 'HARIVASAN V',
            role: 'Social Media Head',
            emoji: '📱',
            image: harivasanImg,
            gradient: 'from-blue-600 to-indigo-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/hari-vasan-6ba71232b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
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
            name: 'ANTO JENISHIA A',
            role: 'Graphic Designer',
            emoji: '🎨',
            image: antoImg,
            gradient: 'from-fuchsia-600 to-pink-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/anto-jenishia-aa0415314?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
                email: 'graphics@techspark.edu',
            },
        },
        {
            name: 'MONESH RAJ J',
            role: 'Volunteer Management',
            emoji: '🤝',
            image: moneshImg,
            gradient: 'from-lime-600 to-green-600',
            social: {
                linkedin: 'https://www.linkedin.com/in/monesh-raj-j-35a80a371?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
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

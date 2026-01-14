import { Target, Lightbulb, Users } from 'lucide-react';

const About = () => {
    const cards = [
        {
            icon: <Target className="w-6 h-6 text-white" />,
            title: 'Our Vision',
            description: 'Create a vibrant ecosystem where students transform ideas into impact through technology and innovation',
            gradient: 'from-blue-600 to-cyan-600',
        },
        {
            icon: <Lightbulb className="w-6 h-6 text-white" />,
            title: 'Our Mission',
            description: 'Empower students with cutting-edge technical skills, foster creativity, and build real-world solutions',
            gradient: 'from-purple-600 to-pink-600',
        },
        {
            icon: <Users className="w-6 h-6 text-white" />,
            title: 'Our Community',
            description: 'A diverse network of passionate technologists, innovators, and problem-solvers united by curiosity',
            gradient: 'from-cyan-600 to-blue-600',
        },
    ];

    return (
        <section id="about" className="section bg-gray-50">
            <div className="container-custom">
                {/* Section Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900 letter-tight">
                        About <span className="gradient-text">TechSpark</span>
                    </h2>
                    <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Where passion meets purpose, and innovation becomes reality
                    </p>
                </div>

                {/* Cards with ScrollStack Effect */}
                <div className="scroll-stack-container max-w-3xl mx-auto">
                    {cards.map((card, index) => (
                        <div
                            key={index}
                            className="scroll-stack-item card p-8 lg:p-10"
                        >
                            <div className={`icon-box-gradient bg-gradient-to-br ${card.gradient} mb-6`}>
                                {card.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-900">
                                {card.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {card.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Additional Info */}
                <div className="mt-16 bg-white p-8 lg:p-12 rounded-3xl shadow-sm max-w-4xl mx-auto">
                    <h3 className="text-2xl lg:text-3xl font-bold mb-6 text-gray-900 text-center">
                        What We Do
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 text-gray-600 leading-relaxed">
                        <div className="fade-in-up">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                Technical Workshops
                            </h4>
                            <p className="mb-4">
                                Hands-on sessions covering web development, AI/ML, blockchain, cloud computing, and emerging technologies
                            </p>
                        </div>
                        <div className="fade-in-up">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                                Hackathons & Competitions
                            </h4>
                            <p className="mb-4">
                                24-48 hour coding marathons where teams build innovative solutions to real-world problems
                            </p>
                        </div>
                        <div className="fade-in-up">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-cyan-600 rounded-full"></span>
                                Project Incubation
                            </h4>
                            <p className="mb-4">
                                Mentorship and resources for students to develop their own tech projects and startups
                            </p>
                        </div>
                        <div className="fade-in-up">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-pink-600 rounded-full"></span>
                                Industry Connect
                            </h4>
                            <p className="mb-4">
                                Guest lectures, webinars, and networking opportunities with industry professionals
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;

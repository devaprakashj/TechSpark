import { Users, ExternalLink } from 'lucide-react';

const Projects = () => {
    const projects = [
        {
            id: 1,
            title: 'Smart Campus App',
            emoji: '🚀',
            description: 'Comprehensive mobile application for campus navigation, event management, and student services integration',
            team: 'Team Alpha',
            status: 'Ongoing',
            statusColor: 'yellow',
            featured: true,
            bgGradient: 'from-blue-50 to-cyan-50',
        },
        {
            id: 2,
            title: 'AI Study Buddy',
            emoji: '🤖',
            description: 'ML-powered personalized learning assistant that adapts to individual study patterns',
            team: 'Team Beta',
            status: 'Completed',
            statusColor: 'green',
            featured: false,
            bgGradient: 'white',
        },
        {
            id: 3,
            title: 'EcoTrack',
            emoji: '🌱',
            description: 'Carbon footprint tracker and sustainability recommendation engine',
            team: 'Team Gamma',
            status: 'Ongoing',
            statusColor: 'yellow',
            featured: false,
            bgGradient: 'white',
        },
        {
            id: 4,
            title: 'CodeCollab',
            emoji: '💻',
            description: 'Real-time collaborative coding platform with integrated version control',
            team: 'Team Delta',
            status: 'Planning',
            statusColor: 'blue',
            featured: false,
            bgGradient: 'white',
        },
        {
            id: 5,
            title: 'HealthHub',
            emoji: '❤️',
            description: 'Student wellness dashboard tracking mental health, fitness, and nutrition',
            team: 'Team Epsilon',
            status: 'Completed',
            statusColor: 'green',
            featured: false,
            bgGradient: 'from-purple-50 to-pink-50',
        },
    ];

    const getStatusClasses = (color) => {
        const classes = {
            yellow: 'bg-yellow-100 text-yellow-700',
            green: 'bg-green-100 text-green-700',
            blue: 'bg-blue-100 text-blue-700',
        };
        return classes[color] || classes.blue;
    };

    return (
        <section id="projects" className="section bg-gray-50">
            <div className="container-custom">
                {/* Section Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900 letter-tight">
                        Our <span className="gradient-text">Projects</span>
                    </h2>
                    <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Innovative solutions built by our talented members
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {projects.map((project, index) => (
                        <div
                            key={project.id}
                            className={`${project.featured ? 'md:col-span-2' : ''
                                } ${project.bgGradient === 'white' ? 'bg-white' : `bg-gradient-to-br ${project.bgGradient}`
                                } p-8 lg:p-10 rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative group`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Status Badge */}
                            <span className={`absolute top-6 right-6 badge ${getStatusClasses(project.statusColor)}`}>
                                {project.status}
                            </span>

                            {/* Emoji Icon */}
                            <div className={`${project.featured ? 'text-6xl lg:text-7xl' : 'text-5xl lg:text-6xl'} mb-6`}>
                                {project.emoji}
                            </div>

                            {/* Project Title */}
                            <h3 className={`${project.featured ? 'text-3xl lg:text-4xl' : 'text-2xl lg:text-3xl'} font-extrabold mb-4 text-gray-900`}>
                                {project.title}
                            </h3>

                            {/* Description */}
                            <p className={`text-gray-600 mb-6 leading-relaxed ${project.featured ? 'max-w-2xl text-lg' : ''}`}>
                                {project.description}
                            </p>

                            {/* Team Info */}
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                                    <Users className="w-4 h-4" />
                                    {project.team}
                                </span>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center">
                                    <ExternalLink className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-sm max-w-2xl mx-auto">
                        <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                            Have a Project Idea?
                        </h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Join TechSpark and bring your innovative ideas to life with our support and resources
                        </p>
                        <button
                            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-primary"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Projects;

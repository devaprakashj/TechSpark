import { useEffect, useRef } from 'react';

const ScrollVelocity = () => {
    const scrollerRef = useRef(null);

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        // Clone items for infinite scroll
        const scrollerInner = scroller.querySelector('.scroller-inner');
        const scrollerContent = Array.from(scrollerInner.children);

        scrollerContent.forEach((item) => {
            const duplicatedItem = item.cloneNode(true);
            duplicatedItem.setAttribute('aria-hidden', true);
            scrollerInner.appendChild(duplicatedItem);
        });
    }, []);

    const items = [
        { icon: '⚡', text: 'AI & Machine Learning' },
        { icon: '🌐', text: 'Web Development' },
        { icon: '📱', text: 'Mobile Apps' },
        { icon: '☁️', text: 'Cloud Computing' },
        { icon: '🔗', text: 'Blockchain' },
        { icon: '🎨', text: 'UI/UX Design' },
        { icon: '🤖', text: 'Robotics' },
        { icon: '💻', text: 'Full Stack' },
        { icon: '🔐', text: 'Cybersecurity' },
        { icon: '📊', text: 'Data Science' },
    ];

    return (
        <div className="py-12 bg-gradient-to-r from-blue-50 via-purple-50 to-cyan-50 overflow-hidden">
            <div ref={scrollerRef} className="scroller">
                <div className="scroller-inner flex gap-8 animate-scroll">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-sm border border-gray-100 whitespace-nowrap"
                        >
                            <span className="text-2xl">{item.icon}</span>
                            <span className="text-gray-700 font-medium">{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScrollVelocity;

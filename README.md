<<<<<<< HEAD
# TechSpark Club - Official Website

![TechSpark Club](https://img.shields.io/badge/TechSpark-2026-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff?style=for-the-badge&logo=vite)

## 🎨 Design Philosophy

This website is inspired by **stunning.so's** premium design philosophy:
- ✨ **Minimalism First** - Clean, uncluttered layouts with generous whitespace
- 🔤 **Bold Typography** - Large, confident headlines with clear hierarchy
- 💫 **Smooth Micro-interactions** - Subtle hover effects and transitions
- 🎭 **Premium Feel** - High-quality gradients and glass effects
- 🌈 **Modern Aesthetics** - Sophisticated color palettes and spacing

## 🚀 Features

### ✅ Fully Implemented Sections
- **Hero Section** - Eye-catching gradient headline with animated background
- **About Section** - Vision, Mission, Community cards + What We Do
- **Events Section** - Filterable event cards with detailed information
- **Projects Section** - Bento-style grid showcasing club projects
- **Team Section** - Core team members + Faculty coordinator
- **Contact Section** - Registration form + Contact information
- **Footer** - Links, newsletter signup, social media

### 🎯 Technical Features
- ✨ Smooth scroll animations using Intersection Observer
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🎨 Custom Tailwind CSS design system
- ⚡ Lightning-fast performance with Vite
- 🔤 Inter font family for modern typography
- 🌊 Gradient text effects and animated backgrounds
- 💫 Hover micro-animations on all interactive elements
- 🎪 Glass morphism effects on navigation
- 📝 SEO-optimized with meta tags

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:5173/`

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#2563EB) to Cyan (#06B6D4) gradients
- **Secondary**: Purple (#8B5CF6) to Pink (#EC4899)
- **Text**: Near Black (#0F172A) / Medium Gray (#64748B)
- **Background**: Pure White (#FFFFFF) / Light Gray (#FAFAFA)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)

### Typography
- **Font Family**: Inter
- **Headings**: 800-700 weight, tight letter-spacing
- **Body**: 400 weight, 1.7 line-height
- **Sizes**: 5xl-7xl for hero, 2xl-4xl for sections

### Components
All components use custom Tailwind classes defined in `src/index.css`:
- `.gradient-text` - Primary gradient text effect
- `.card` - Premium card with shadow and hover effects
- `.btn-primary` - Primary gradient button
- `.input-field` - Form input with focus states
- `.badge-gradient` - Gradient badge/pill
- `.social-icon` - Social media icon with hover effect

## 📁 Project Structure

```
TechSpark/
├── public/              # Static assets
├── src/
│   ├── components/     # React components
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── About.jsx
│   │   ├── Events.jsx
│   │   ├── Projects.jsx
│   │   ├── Team.jsx
│   │   ├── Contact.jsx
│   │   └── Footer.jsx
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Design system & Tailwind
├── index.html          # HTML template
├── tailwind.config.js  # Tailwind configuration
├── postcss.config.js   # PostCSS configuration
└── package.json
```

## 👥 Team Data

The website includes actual TechSpark Club team members:

**Core Team:**
- ABINAYA M - President
- SANTHOSH V - Vice President
- DEVA PRAKASH R - Secretary
- VISHWA S - Treasurer
- RITHANYA G - Technical Lead
- SWETHA M - Events Coordinator
- PRATHAP RAJ P - Marketing Head
- DHARANI M - Design Lead

**Faculty:**
- Dr. RAJENDRAN K - Faculty Coordinator (Dept. of CSE)

## 🎯 Customization

### Adding/Editing Events
Edit `src/components/Events.jsx`:
```javascript
const events = [
  {
    title: 'Your Event',
    date: 'Date',
    type: 'Workshop', // or 'Competition', 'Webinar'
    // ... more fields
  },
];
```

### Adding/Editing Projects
Edit `src/components/Projects.jsx`:
```javascript
const projects = [
  {
    title: 'Project Name',
    emoji: '🚀',
    featured: true, // for larger card
    // ... more fields
  },
];
```

### Modifying Team Members
Edit `src/components/Team.jsx` - update `coreTeam` and `faculty` arrays

### Changing Colors
Edit `tailwind.config.js` or `src/index.css` for custom color schemes

## 🌐 Deployment

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify
```bash
# Build
npm run build

# Deploy the 'dist' folder to Netlify
```

### Deploy to GitHub Pages
1. Update `vite.config.js`:
```javascript
export default {
  base: '/your-repo-name/',
}
```
2. Build: `npm run build`
3. Deploy the `dist` folder to GitHub Pages

## ✨ Performance

- ⚡ First Contentful Paint: < 1s
- 📱 Mobile-friendly and touch-optimized
- 🎨 Smooth 60 FPS animations
- 📦 Optimized bundle size
- 🔍 SEO-ready with meta tags

## 🎓 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

## 📝 License

© 2026 TechSpark Club. All rights reserved.

## 🤝 Contributing

This is the official TechSpark Club website. For contributions or updates, contact the Technical Lead or Web Development Team.

## 📧 Contact

- **Email**: techspark@college.edu
- **Phone**: +91 98765 43210
- **Location**: Computer Science Department, Main Campus

---

**Made with ❤️ by TechSpark Team**

*Igniting innovation and building tomorrow's technology leaders*
=======
# TechSpark
>>>>>>> 69ac671410623d8e65357cc34a642dd45d59b671

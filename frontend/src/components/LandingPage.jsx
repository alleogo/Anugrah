import React, { useEffect, useRef } from 'react';
import AnugrahLogo from './AnugrahLogo';
import {
  Sun,
  Moon,
  ArrowRight,
  Briefcase,
  UserPlus,
  ShieldCheck,
  Users,
  MessageSquare,
  Lock,
  Scale,
} from 'lucide-react';

// The real sign-up-to-chat flow of the platform
const STEPS = [
  {
    Icon: UserPlus,
    title: 'Create your account',
    body: 'Sign up as a mentee or a mentor. We confirm your email with a one-time code.',
  },
  {
    Icon: ShieldCheck,
    title: 'Get verified',
    body: 'An admin reviews every new profile before any mentoring starts.',
  },
  {
    Icon: Users,
    title: 'Request a match',
    body: 'Rank the mentors you prefer, or ask the admin to pick one for you.',
  },
  {
    Icon: MessageSquare,
    title: 'Start talking',
    body: 'Once the admin approves the pair, you chat directly on the platform.',
  },
];

const STATS = [
  ['approvedMentors', 'Verified mentors'],
  ['activeMentees', 'Mentees'],
  ['allottedMatches', 'Active matches'],
  ['organizationsCount', 'Organizations'],
];

// Fade sections in as they scroll into view (skipped when the user prefers reduced motion)
function useRevealOnScroll() {
  const rootRef = useRef(null);

  useEffect(() => {
    const items = rootRef.current?.querySelectorAll('[data-reveal]') || [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return rootRef;
}

function BrandMark({ size }) {
  return (
    <div className="brand-logo">
      <div className="brand-icon">
        <AnugrahLogo size={size} />
      </div>
      <span className="brand-title">ANUGRAH</span>
    </div>
  );
}

export default function LandingPage({ theme, onToggleTheme, onOpenAuth, stats }) {
  const rootRef = useRevealOnScroll();
  const isDark = theme === 'dark';

  const applyAsMentee = () => onOpenAuth('signup', 'Mentee');
  const applyAsMentor = () => onOpenAuth('signup', 'Mentor');

  return (
    <div className="landing-page-container" ref={rootRef}>
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <BrandMark size={24} />

          <div className="landing-nav-actions">
            <button
              type="button"
              onClick={onToggleTheme}
              className="btn-theme-toggle"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
              <span className="btn-theme-label">{isDark ? 'Light' : 'Dark'}</span>
            </button>
            <button type="button" onClick={() => onOpenAuth('login')} className="btn-secondary landing-nav-btn">
              Sign In
            </button>
            <button type="button" onClick={applyAsMentee} className="btn-primary landing-nav-btn">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: message and CTAs on the left, live platform numbers on the right */}
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="hero-eyebrow hero-enter" style={{ '--i': 0 }}>
              Mentorship & Advisory Platform
            </p>
            <h1 className="hero-headline hero-enter" style={{ '--i': 1 }}>
              Direct, high-impact mentorship from vetted leaders.
            </h1>
            <p className="hero-subtitle hero-enter" style={{ '--i': 2 }}>
              Get paired with a verified mentor in your field. Every match is reviewed by an admin before it starts.
            </p>
            <div className="hero-cta-group hero-enter" style={{ '--i': 3 }}>
              <button type="button" onClick={applyAsMentee} className="btn-primary hero-btn">
                <span>Apply as Mentee</span>
                <ArrowRight size={16} />
              </button>
              <button type="button" onClick={applyAsMentor} className="btn-secondary hero-btn">
                <Briefcase size={16} />
                <span>Apply as Mentor</span>
              </button>
            </div>
          </div>

          <aside className="hero-panel hero-enter" style={{ '--i': 2 }} aria-label="Platform numbers">
            <div className="hero-panel-head">
              <AnugrahLogo size={34} />
              <div>
                <h2 className="hero-panel-title">ANUGRAH at a glance</h2>
                <p className="hero-panel-note">Live numbers from the platform</p>
              </div>
            </div>
            <dl className="hero-stats">
              {STATS.map(([key, label]) => (
                <div key={key} className="hero-stat">
                  <dt>{label}</dt>
                  <dd>{stats ? stats[key] : <span className="stat-skeleton" aria-label="Loading" />}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        {/* How it works: the four real steps, in order */}
        <section id="how-it-works" className="landing-section" data-reveal>
          <h2 className="section-title">How a match is made</h2>
          <ol className="steps-row">
            {STEPS.map(({ Icon, title, body }, index) => (
              <li key={title} className="step" style={{ '--i': index }}>
                <span className="step-icon">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Platform standards: one large tile and two smaller ones */}
        <section id="why-anugrah" className="landing-section" data-reveal>
          <h2 className="section-title">Governed 1-on-1 mentorship</h2>
          <p className="section-description">Clear rules on who mentors whom, and who can see your contact details.</p>

          <div className="standards-bento">
            <article className="bento-tile bento-tile-feature">
              <div>
                <Scale size={28} className="bento-icon" />
                <h3>Admin-reviewed matches</h3>
              </div>
              <p>
                Mentees rank the mentors they want, and mentors can offer to guide a student. An admin approves every
                pairing, so each mentee has exactly one mentor at a time.
              </p>
            </article>
            <article className="bento-tile bento-tile-soft">
              <MessageSquare size={22} className="bento-icon" />
              <h3>Direct 1-on-1 chat</h3>
              <p>Verified mentors and mentees message each other inside the platform.</p>
            </article>
            <article className="bento-tile bento-tile-plain">
              <Lock size={22} className="bento-icon" />
              <h3>Private phone numbers</h3>
              <p>A mentor's phone number is shown only to their own mentees.</p>
            </article>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="landing-closing" data-reveal>
          <h2>Ready to find your mentor?</h2>
          <div className="hero-cta-group">
            <button type="button" onClick={applyAsMentee} className="btn-primary hero-btn">
              <span>Apply as Mentee</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" onClick={applyAsMentor} className="btn-secondary hero-btn">
              <Briefcase size={16} />
              <span>Apply as Mentor</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand-col">
            <BrandMark size={22} />
            <p className="footer-tagline">
              Mentorship, guided by intent and grace. Verified mentors, admin-reviewed matches.
            </p>
          </div>

          <nav className="footer-links-group" aria-label="Footer">
            <div className="footer-col">
              <span className="footer-col-title">Platform</span>
              <a href="#how-it-works" className="footer-link">
                How it works
              </a>
              <a href="#why-anugrah" className="footer-link">
                Platform Standards
              </a>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Community</span>
              <button type="button" className="footer-link" onClick={applyAsMentor}>
                Apply as Mentor
              </button>
              <button type="button" className="footer-link" onClick={applyAsMentee}>
                Apply as Mentee
              </button>
              <button type="button" className="footer-link" onClick={() => onOpenAuth('login')}>
                Sign In
              </button>
            </div>
          </nav>
        </div>

        <div className="footer-bottom-bar">
          <p>&copy; {new Date().getFullYear()} ANUGRAH Mentorship Platform. All rights reserved.</p>
          <div className="footer-legal-links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Code of Conduct</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { Github, Linkedin, Twitter, Mail, MapPin, Phone, ShieldCheck, ArrowUpRight } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Smooth scroll to a section anchor
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Product links mapped to page section anchors
  const productLinks = [
    { label: 'Live Detection',  action: () => scrollTo('features') },
    { label: 'Analytics Dash', action: () => scrollTo('insights') },
    { label: 'Alert Engine',   action: () => scrollTo('features') },
    { label: 'Get Connected',  action: () => scrollTo('contact') },
    { label: 'About Project',  action: () => scrollTo('about') },
  ];

  // Company links mapped to external or section anchors
  const companyLinks = [
    { label: 'About Us',        action: () => scrollTo('about') },
    { label: 'How It Works',    action: () => scrollTo('insights') },
    { label: 'Features',        action: () => scrollTo('features') },
    { label: 'Contact',         action: () => scrollTo('contact') },
    {
      label: 'GitHub Repo',
      action: () => window.open('https://github.com/Uday531/MajorProject', '_blank'),
      external: true,
    },
  ];

  // Social media links
  const socialLinks = [
    {
      Icon: Twitter,
      href: 'https://twitter.com',    // placeholder — no handle provided
      label: 'Twitter',
    },
    {
      Icon: Github,
      href: 'https://github.com/Uday531/MajorProject',
      label: 'GitHub',
    },
    {
      Icon: Linkedin,
      href: 'https://www.linkedin.com/in/pavan-kalyan-0b9736265/',
      label: 'LinkedIn',
    },
  ];

  return (
    <footer className="bg-[var(--bg-color)] border-t border-[var(--glass-border)] pt-20 pb-10 transition-colors duration-500 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* ── Brand ── */}
          <div className="space-y-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 group"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-[var(--text-primary)] uppercase">
                FlareSense
              </span>
            </button>

            <p className="text-[var(--text-secondary)] leading-relaxed max-w-xs text-sm">
              Advanced AI visual detection for fire safety. Empowering residential and
              commercial properties with lightning-fast anomaly scanning and multi-channel alerts.
            </p>

            {/* Social Icons */}
            <div className="flex gap-3">
              {socialLinks.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)] transition-all"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* ── Product ── */}
          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-6 text-sm uppercase tracking-widest">
              Product
            </h4>
            <ul className="space-y-4">
              {productLinks.map(({ label, action }) => (
                <li key={label}>
                  <button
                    onClick={action}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors text-sm font-medium text-left"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Company ── */}
          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-6 text-sm uppercase tracking-widest">
              Company
            </h4>
            <ul className="space-y-4">
              {companyLinks.map(({ label, action, external }) => (
                <li key={label}>
                  <button
                    onClick={action}
                    className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors text-sm font-medium text-left"
                  >
                    {label}
                    {external && <ArrowUpRight size={13} className="opacity-60" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ── */}
          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-6 text-sm uppercase tracking-widest">
              Contact
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:codewithpavan29@gmail.com"
                  className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors text-sm"
                >
                  <Mail size={16} className="text-[var(--accent-blue)] shrink-0" />
                  codewithpavan29@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+918790102300"
                  className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors text-sm"
                >
                  <Phone size={16} className="text-[var(--accent-blue)] shrink-0" />
                  +91 8790102300
                </a>
              </li>
              <li className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
                <MapPin size={16} className="text-[var(--accent-blue)] shrink-0" />
                Langer Houz, Hyderabad
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/pavan-kalyan-0b9736265/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors text-sm"
                >
                  <Linkedin size={16} className="text-[var(--accent-blue)] shrink-0" />
                  LinkedIn Profile
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="pt-8 border-t border-[var(--glass-border)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-widest">
            © {currentYear} FlareSense Security. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6 justify-center">
            <a
              href="https://github.com/Uday531/MajorProject"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] text-xs transition-colors font-bold uppercase tracking-widest"
            >
              <Github size={14} /> View on GitHub
            </a>
            <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">
              Privacy Policy
            </span>
            <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">
              Terms of Service
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

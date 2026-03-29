import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/hydroleap-logo.png";
import heroVideo from "../assets/sea_1.mp4";
import "./Landing.css";

const NAV_LINKS = ["About", "Features", "How it works", "Contact"];

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Real-time IoT Monitoring",
    desc: "Live sensor data from every water system — flow, level, pressure, and temperature streamed continuously.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    ),
    title: "Smart Water Management",
    desc: "Track flow rates, reservoir levels, and quality metrics across all your projects from a single dashboard.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Secure Access Control",
    desc: "Role-based permissions with admin approvals, OTP verification, and full audit trails out of the box.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: "Analytics & Reports",
    desc: "Generate professional PDF audit reports with time-filtered graphs and historical trend analysis.",
  },
];

const STEPS = [
  { num: "01", title: "Register & get approved", desc: "Create your account and receive admin approval to access your assigned projects." },
  { num: "02", title: "Connect your devices",    desc: "Your IoT sensors stream data automatically. No manual setup needed on the dashboard." },
  { num: "03", title: "Monitor & act",            desc: "View live readings, receive alerts, and export reports — all from one place." },
];

const STATS = [
  { val: "99.9%", label: "Uptime" },
  { val: "<1 s",  label: "Data latency" },
  { val: "8+",    label: "Sensor metrics" },
  { val: "100%",  label: "Audit coverage" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="ld-root">

      {/* ── Navbar ── */}
      <nav className="ld-nav">
        <div className="ld-nav-inner">
          <div className="ld-brand">
            <img src={logo} alt="Hydroleap logo" className="ld-brand-logo" />
            <span className="ld-brand-name">Hydroleap</span>
          </div>
          <div className="ld-nav-links">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="ld-nav-link">{l}</a>
            ))}
          </div>
          <div className="ld-nav-actions">
            <button className="ld-btn-ghost" onClick={() => navigate("/login")}>Sign in</button>
            <button className="ld-btn-cta"   onClick={() => navigate("/register")}>Get started</button>
          </div>
          <button
            className="ld-nav-hamburger"
            onClick={() => setMobileNavOpen(o => !o)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
        {mobileNavOpen && (
          <div className="ld-mobile-nav">
            {NAV_LINKS.map(l => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="ld-mobile-nav-link"
                onClick={() => setMobileNavOpen(false)}
              >{l}</a>
            ))}
            <div className="ld-mobile-nav-actions">
              <button className="ld-btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate("/login")}>Sign in</button>
              <button className="ld-btn-cta"   style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate("/register")}>Get started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="ld-hero">
        <video className="ld-hero-video" src={heroVideo} autoPlay muted loop playsInline />
        <div className="ld-hero-overlay" />
        <div className="ld-hero-content">
          <div className="ld-hero-badge">
            <span className="ld-hero-badge-dot" />
            Live IoT water monitoring
          </div>
          <h1 className="ld-hero-headline">
            Intelligent water<br />
            <span className="ld-hero-accent">management</span>, simplified.
          </h1>
          <p className="ld-hero-sub">
            Monitor flow, pressure, temperature, and levels across all your water
            infrastructure — in real time, from anywhere.
          </p>
          <div className="ld-hero-actions">
            <button className="ld-btn-cta ld-btn-lg" onClick={() => navigate("/register")}>
              Get started free
            </button>
            <button className="ld-btn-outline ld-btn-lg" onClick={() => navigate("/login")}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="ld-stats-bar">
        {STATS.map(s => (
          <div key={s.label} className="ld-stat-item">
            <div className="ld-stat-val">{s.val}</div>
            <div className="ld-stat-lbl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section id="features" className="ld-section">
        <div className="ld-section-inner">
          <div className="ld-section-label">Platform features</div>
          <h2 className="ld-section-title">
            Everything you need to manage water systems at scale
          </h2>
          <div className="ld-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="ld-feature-card">
                <div className="ld-feature-icon">{f.icon}</div>
                <h3 className="ld-feature-title">{f.title}</h3>
                <p className="ld-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="ld-section ld-section--alt">
        <div className="ld-section-inner">
          <div className="ld-section-label">How it works</div>
          <h2 className="ld-section-title">Up and running in minutes</h2>
          <div className="ld-steps">
            {STEPS.map((s, i) => (
              <div key={s.num} className="ld-step">
                <div className="ld-step-num">{s.num}</div>
                {i < STEPS.length - 1 && <div className="ld-step-connector" />}
                <h3 className="ld-step-title">{s.title}</h3>
                <p className="ld-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="ld-section">
        <div className="ld-section-inner">
          <div className="ld-section-label">About Hydroleap</div>
          <h2 className="ld-section-title">Reimagining water treatment through electrochemical innovation</h2>

          <div className="ld-about-grid">
            <div className="ld-about-text">
              <p className="ld-about-para">
                Hydroleap is a Singapore-based greentech company delivering next-generation wastewater
                treatment through chemical-free electrochemical technology. We replace conventional,
                chemical-intensive processes with automated, modular systems that are more cost-effective,
                energy-efficient, and environmentally compliant.
              </p>
              <p className="ld-about-para">
                Our platform serves industries ranging from data centres and pharmaceuticals to food &amp;
                beverage and palm oil — empowering operators to reduce costs, meet regulations, and
                optimise water reuse without operational complexity.
              </p>

              <div className="ld-about-techs">
                {[
                  { code: "HL-EC", name: "Electro-coagulation", desc: "Removes suspended solids and contaminants" },
                  { code: "HL-EO", name: "Electro-oxidation",   desc: "Advanced organic pollutant treatment" },
                  { code: "HL-EO-CT", name: "Cooling Tower EO", desc: "Water reuse for data centre cooling systems" },
                ].map(t => (
                  <div key={t.code} className="ld-about-tech">
                    <span className="ld-about-tech-code">{t.code}</span>
                    <div>
                      <div className="ld-about-tech-name">{t.name}</div>
                      <div className="ld-about-tech-desc">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ld-about-right">
              <div className="ld-about-award-card">
                <div className="ld-about-award-label">Recognition &amp; awards</div>
                {[
                  "2025 Emerging Enterprise Award — EnterpriseSG APAC25",
                  "Tech Plan Demo Day — Overall winner",
                  "SEA Market Readiness Award — Overall winner",
                  "Global Prize for Innovation in Desalination — Finalist",
                  "IAA Business as a Force for Good — Ultimate champion",
                ].map(a => (
                  <div key={a} className="ld-about-award-row">
                    <span className="ld-about-award-dot" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>

              <div className="ld-about-milestones">
                <div className="ld-about-milestone">
                  <div className="ld-about-milestone-val">US$1.9M</div>
                  <div className="ld-about-milestone-lbl">Seed funding · 2019</div>
                </div>
                <div className="ld-about-milestone">
                  <div className="ld-about-milestone-val">US$4.4M</div>
                  <div className="ld-about-milestone-lbl">Series A · 2025</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ld-cta-section">
        <div className="ld-cta-inner">
          <h2 className="ld-cta-title">Ready to take control of your water systems?</h2>
          <p className="ld-cta-sub">Join operators already monitoring their infrastructure with Hydroleap.</p>
          <div className="ld-cta-actions">
            <button className="ld-btn-cta ld-btn-lg" onClick={() => navigate("/register")}>
              Create an account
            </button>
            <button className="ld-btn-ghost-light ld-btn-lg" onClick={() => navigate("/login")}>
              Sign in instead
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="ld-footer">
        <div className="ld-footer-inner">
          <div className="ld-footer-left">
            <div className="ld-brand">
              <img src={logo} alt="Hydroleap" className="ld-brand-logo ld-brand-logo--sm" />
              <span className="ld-brand-name ld-brand-name--sm">Hydroleap</span>
            </div>
            <p className="ld-footer-copy">© {new Date().getFullYear()} Hydroleap Pte Ltd. All rights reserved.</p>
          </div>

          <div className="ld-footer-contacts">
            <div className="ld-footer-col">
              <div className="ld-footer-col-title">Singapore</div>
              <div className="ld-footer-detail">84 Toh Guan Rd E, #03-08/09</div>
              <div className="ld-footer-detail">Singapore Water Exchange, 608501</div>
              <div className="ld-footer-detail">+65 6429 6824</div>
              <div className="ld-footer-detail">+65 8817 6832 (WhatsApp)</div>
            </div>
            <div className="ld-footer-col">
              <div className="ld-footer-col-title">Australia</div>
              <div className="ld-footer-detail">Unit 126, 170 Forster Road</div>
              <div className="ld-footer-detail">Mount Waverley, VIC 3149</div>
            </div>
            <div className="ld-footer-col">
              <div className="ld-footer-col-title">Get in touch</div>
              <a href="mailto:contact.us@hydroleap.com" className="ld-footer-link">contact.us@hydroleap.com</a>
              <a href="https://www.linkedin.com/company/hydroleap" target="_blank" rel="noreferrer" className="ld-footer-link">LinkedIn</a>
              <a href="https://www.youtube.com/@hydroleap-pte-ltd" target="_blank" rel="noreferrer" className="ld-footer-link">YouTube</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

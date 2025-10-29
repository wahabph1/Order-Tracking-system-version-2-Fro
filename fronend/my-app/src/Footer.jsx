import React from 'react';

function Footer() {
  const projectName = 'TrackMate UAE';
  const developerName = 'Abdul Wahab Shaikh';
  const contactEmail = 'aw599822@gmail.com';
  const githubLink = 'https://github.com/YourUsername';
  const linkedinLink = 'https://www.linkedin.com/in/yourprofile';
  const xLink = 'https://x.com/yourhandle';

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      {/* Animated background elements */}
      <div className="footer-bg-animation">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
      </div>
      
      <div className="footer-content">
        {/* Hero Section */}
        <div className="footer-hero">
          <div className="brand-section">
            <div className="brand-wrapper">
              <div className="f-brand-logo-container">
                <span className="f-brand-logo" aria-hidden>TM</span>
                <div className="logo-glow"></div>
              </div>
              <div className="brand-text">
                <h3 className="f-brand-name">{projectName}</h3>
                <p className="brand-tagline">Smart Tracking • Real Results</p>
              </div>
            </div>
            <p className="footer-desc">
              Empowering UAE businesses with intelligent order management and real-time tracking solutions.
            </p>
          </div>
          
          <div className="footer-stats">
            <div className="stat-item">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Orders Tracked</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support</div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="footer-bottom">
          <div className="copyright-section">
            <p className="copyright">
              © {year} {projectName} • Made with ❤️ in UAE
            </p>
            <p className="developer-credit">
              Crafted by <span className="dev-name">{developerName}</span>
            </p>
          </div>
          
          <div className="footer-actions">
            <a href={`mailto:${contactEmail}`} className="contact-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 8l7.89 7.89a1 1 0 001.42 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Get in Touch
            </a>
            
            <div className="social-links">
              <a href={githubLink} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="social-link">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-3.162 19.496c.5.092.683-.216.683-.48 0-.237-.01-1.024-.015-1.86-2.78.604-3.366-1.19-3.366-1.19-.455-1.157-1.11-1.466-1.11-1.466-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.087.636-1.337-2.22-.253-4.555-1.11-4.555-4.944 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.203 2.397.1 2.65.64.699 1.028 1.592 1.028 2.683 0 3.842-2.338 4.688-4.566 4.937.36.31.68.92.68 1.855 0 1.338-.012 2.417-.012 2.744 0 .266.18.577.688.479A10.002 10.002 0 0 0 12 2z"/>
                </svg>
              </a>
              <a href={linkedinLink} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="social-link">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.54V23h-4V8z"/>
                </svg>
              </a>
              <a href={xLink} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="social-link">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M18.244 2H21l-6.743 7.71L22 22h-6.906l-4.57-6.006L4.9 22H2.14l7.2-8.23L2 2h6.97l4.13 5.59L18.245 2zM8.03 3.65H5.32l10.73 14.67h2.77L8.03 3.65z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

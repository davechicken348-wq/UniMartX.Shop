import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthFrameProps {
  eyebrow: string;
  headline: ReactNode;
  description: string;
  children: ReactNode;
  variant?: 'login' | 'seller';
}

export default function AuthFrame({ eyebrow, headline, description, children, variant = 'login' }: AuthFrameProps) {
  return (
    <main className={`auth-layout auth-layout--${variant}`}>
      <aside className="auth-visual" aria-label="UniMartX community">
        <Link className="auth-brand" to="/marketing" aria-label="UniMartX home">
          <span className="auth-brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 17h28l-2.5 25h-23L10 17Z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/></svg></span>
        </Link>
        <div className="auth-visual-copy">
          <span className="auth-visual-pill"><i /> MADE HERE · FOUND EVERYWHERE</span>
          <p>{variant === 'seller' ? 'Creation starts here' : 'Welcome back'}</p>
          <h1>{headline}</h1>
          <span className="auth-visual-note">{variant === 'seller' ? 'Give your ideas a place to grow, and let your community find what you make.' : 'Your community is here. Sign in and pick up where you left off.'}</span>
        </div>
        <span className="auth-visual-index"><span>INDEPENDENT FINDS · STUDENT OWNED</span><b>ACCRA, GHANA&nbsp; ✳</b></span>
      </aside>
      <section className="auth-main">
        <div className="auth-topline"><Link className="auth-back" to="/marketing"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 7-7-7 7-7"/></svg> Back to UniMartX</Link><span>MADE FOR THE MAKERS</span></div>
        <div className="auth-card-wrap">
          <div className="auth-heading">
            <p className="auth-eyebrow">{eyebrow}</p>
            <h2>{description}</h2>
          </div>
          {children}
        </div>
        <footer className="auth-footer">© {new Date().getFullYear()} UniMartX <span>·</span> Made with care in Ghana</footer>
      </section>
    </main>
  );
}

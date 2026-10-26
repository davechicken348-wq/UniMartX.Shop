import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthFrame from '../../components/auth/AuthFrame';
import { postApi, saveSession, type AuthUser } from '../../lib/auth';

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!event.currentTarget.checkValidity()) {
      setError(forgotMode ? 'Enter a valid email address to reset your password.' : 'Enter a valid email address and password to sign in.');
      return;
    }
    setBusy(true);
    try {
      if (forgotMode) {
        await postApi('/auth/forgot-password', { email });
        setMessage('If an account exists for that email, we’ve sent a password reset link.');
      } else {
        const result = await postApi<LoginResponse>('/auth/login', { email, password });
        saveSession(result.token, result.user);
        const requestedPath = (location.state as { from?: unknown } | null)?.from;
        const destination = typeof requestedPath === 'string' && requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : result.user.role === 'seller' ? '/seller/overview' : '/shop';
        navigate(destination, { replace: true });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      variant="login"
      eyebrow="WELCOME BACK"
      headline={<>Your people.<br/><em>Your next move.</em></>}
      description="Welcome back"
    >
      <div className="auth-mode-switch" aria-label="Account type">
        <span className="is-selected">Shopper</span>
        <Link to="/auth/seller/register">Seller</Link>
      </div>
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="auth-form-title">
          <h3>{forgotMode ? 'Reset your password' : 'Good to have you back.'}</h3>
          <p>{forgotMode ? 'We’ll email you a link to choose a new password.' : 'Use the email and password linked to your account.'}</p>
        </div>
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={100}/>
        {!forgotMode && <>
          <div className="auth-label-row"><label htmlFor="login-password">Password</label><button type="button" className="auth-text-button" onClick={() => { setForgotMode(true); setError(''); setMessage(''); }}>Forgot password?</button></div>
          <div className="auth-password-field"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} required/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? 'Hide' : 'Show'}</button></div>
        </>}
        {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
        {message && <div className="auth-alert auth-alert--success" role="status"><span>✓</span>{message}<Link to="/marketing">Continue to UniMartX →</Link></div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : forgotMode ? 'Send reset link' : 'Sign in'} <span>↗</span></button>
        {forgotMode && <button className="auth-text-button auth-back-to-login" type="button" onClick={() => { setForgotMode(false); setError(''); setMessage(''); }}>← Back to sign in</button>}
      </form>
      <div className="auth-switch-copy">New to UniMartX? <Link to="/marketing">Explore the marketplace</Link></div>
      <div className="auth-seller-callout"><span className="auth-callout-icon">✳</span><div><b>Building something of your own?</b><small>Give your idea a place to grow.</small></div><Link to="/auth/seller/register" aria-label="Register as a seller">↗</Link></div>
    </AuthFrame>
  );
}

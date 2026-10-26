import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthFrame from '../../components/auth/AuthFrame';
import CustomSelect from '../../components/ui/CustomSelect';
import { postApi, saveSession, type AuthUser } from '../../lib/auth';

type SellerType = 'campus' | 'independent';
interface SellerForm {
  name: string; email: string; phone: string; password: string; confirmPassword: string;
  sellerType: SellerType; university: string; studentId: string; studentEmail: string;
  verificationMethod: '' | 'student_id' | 'student_email' | 'both';
  businessType: 'individual' | 'small-business'; currentPlatform: string;
  storeName: string; category: string; storeDescription: string; country: string; city: string;
  campus: string; pickupLocation: string;
}
interface RegisterResponse { token: string; user: AuthUser; }

const initialForm: SellerForm = {
  name: '', email: '', phone: '', password: '', confirmPassword: '', sellerType: 'campus',
  university: '', studentId: '', studentEmail: '', verificationMethod: '', businessType: 'individual',
  currentPlatform: 'none', storeName: '', category: '', storeDescription: '', country: 'Ghana',
  city: '', campus: '', pickupLocation: '',
};

const categories = [
  ['electronics', 'Electronics'], ['fashion', 'Fashion & accessories'], ['home', 'Home & living'],
  ['beauty', 'Beauty'], ['sports', 'Sports'], ['books', 'Books & stationery'],
  ['services', 'Services'], ['food', 'Food & treats'], ['other', 'Other'],
];
const registrationSteps = [
  { title: 'Account', description: 'Your details' },
  { title: 'Seller profile', description: 'How you sell' },
  { title: 'Storefront', description: 'Your shop basics' },
];
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function SellerRegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const update = (field: keyof SellerForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const stepIcons = [
    <><circle cx="12" cy="8" r="3.25"/><path d="M5.5 20v-1.2a6.5 6.5 0 0 1 13 0V20z"/></>,
    <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.7-1.4 1.7-2 3-2s2.3.6 3 2M14 10h4M14 14h4"/></>,
    <><path d="M3 10h18l-1.5 10h-15z"/><path d="M5 10l1.5-6h11L19 10M9 20v-6h6v6"/></>,
  ];

  function goNext() {
    if (!formRef.current?.checkValidity()) {
      setError('Please complete the required fields with valid details before continuing.');
      formRef.current?.querySelector<HTMLElement>(':invalid')?.focus();
      return;
    }
    if (step === 1 && !strongPassword.test(form.password)) {
      setError('Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol (@$!%*?&).');
      return;
    }
    if (step === 1 && form.password !== form.confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, registrationSteps.length));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!formRef.current?.checkValidity()) {
      setError('Please complete the required fields with valid details before creating your store.');
      formRef.current?.querySelector<HTMLElement>(':invalid')?.focus();
      return;
    }
    if (!form.category) {
      setError('Choose a category for your store.');
      return;
    }
    if (!strongPassword.test(form.password)) {
      setError('Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol (@$!%*?&).');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = await postApi<RegisterResponse>('/seller-auth/register', form);
      saveSession(result.token, result.user);
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return <AuthFrame variant="seller" eyebrow="YOU’RE IN" headline={<>A little idea.<br/><em>A big beginning.</em></>} description="Your seller account is ready.">
      <div className="register-success"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span><h3>Welcome to the marketplace, {form.name.split(' ')[0]}.</h3><p>We’ve sent a verification email to <b>{form.email}</b>. Confirm your email to keep your account secure.</p><Link className="auth-submit auth-submit-link" to="/seller/builder">Build your storefront <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link></div>
    </AuthFrame>;
  }

  return (
    <AuthFrame variant="seller" eyebrow="SELL WITH UNIMARTX" headline={<>Your idea<br/><em>deserves a shelf.</em></>} description="Join UniMartX">
      <div className="register-progress" aria-label={`Step ${step} of ${registrationSteps.length}`}>
        <div className="register-progress-track"><i style={{ width: `${(step / registrationSteps.length) * 100}%` }}/></div>
        <ol className="register-step-list">
          {registrationSteps.map((item, index) => {
            const number = index + 1;
            const state = number < step ? 'complete' : number === step ? 'active' : 'upcoming';
            return <li className={`register-step register-step--${state}`} key={item.title} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="register-step-marker"><svg viewBox="0 0 24 24" aria-hidden="true">{state === 'complete' ? <path d="m5 12 4 4L19 6"/> : stepIcons[index]}</svg></span>
              <span className="register-step-copy"><b>{item.title}</b><small>{item.description}</small></span>
            </li>;
          })}
        </ol>
      </div>
      <form className={`auth-form seller-form seller-form--step-${step}`} ref={formRef} noValidate onSubmit={handleSubmit}>
        <div className="seller-step-content" key={step}>
        {step === 1 ? <>
          <div className="auth-form-title"><h3>Let’s create your seller account.</h3><p>These details keep your account safe and help customers connect with your store.</p></div>
          <div className="auth-field-grid">
            <div className="auth-field auth-field--wide"><label htmlFor="seller-name">Full name</label><input id="seller-name" name="name" autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} required minLength={2} maxLength={100} placeholder="e.g. Ama Mensah"/></div>
            <div className="auth-field"><label htmlFor="seller-email">Email address</label><input id="seller-email" name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} required maxLength={100} placeholder="you@example.com"/></div>
            <div className="auth-field"><label htmlFor="seller-phone">Phone number</label><input id="seller-phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} required minLength={7} maxLength={20} placeholder="024 000 0000"/></div>
            <div className="auth-field"><label htmlFor="seller-password">Password</label><div className="auth-password-field"><input id="seller-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} required minLength={8} placeholder="Create a strong password"/><button type="button" onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? 'Hide' : 'Show'}</button></div><small className="password-hint">Use uppercase and lowercase letters, a number, and a symbol (@$!%*?&).</small></div>
            <div className="auth-field"><label htmlFor="seller-confirm-password">Confirm password</label><input id="seller-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} required minLength={8} placeholder="Enter it again"/></div>
          </div>
          {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
          <div className="auth-form-actions"><span className="register-actions-note"><i/> Next: seller profile</span><button className="auth-submit" type="button" onClick={goNext}>Continue to seller profile <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>
        </> : step === 2 ? <>
          <div className="auth-form-title"><h3>Tell us what kind of seller you are.</h3><p>This helps us tailor your storefront and verification options.</p></div>
          <div className="seller-type-options">
            <label className={form.sellerType === 'campus' ? 'is-selected' : ''}><input type="radio" name="sellerType" value="campus" checked={form.sellerType === 'campus'} onChange={() => update('sellerType', 'campus')}/><span className="seller-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5M22 9v6"/></svg></span><b>Campus seller</b><small>I’m a student or part of a campus community.</small></label>
            <label className={form.sellerType === 'independent' ? 'is-selected' : ''}><input type="radio" name="sellerType" value="independent" checked={form.sellerType === 'independent'} onChange={() => update('sellerType', 'independent')}/><span className="seller-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V5h8v3M3 12h18M10 12v2h4v-2"/></svg></span><b>Independent</b><small>I run a small business outside campus.</small></label>
          </div>
          {form.sellerType === 'campus' ? <div className="auth-field auth-field--wide"><label htmlFor="seller-university">University or campus <span>Optional</span></label><input id="seller-university" name="university" value={form.university} onChange={(event) => update('university', event.target.value)} placeholder="e.g. University of Ghana"/></div> : <div className="auth-field auth-field--wide"><label>Business type</label><CustomSelect value={form.businessType} onChange={(value) => update('businessType', value)} ariaLabel="Business type" options={[{ value: 'individual', label: 'Individual' }, { value: 'small-business', label: 'Small business' }]}/></div>}
          {form.sellerType === 'campus' && <div className="auth-field-grid auth-field-grid--seller-verification">
            <div className="auth-field"><label htmlFor="student-id">Student ID <span>Optional</span></label><input id="student-id" name="studentId" value={form.studentId} onChange={(event) => update('studentId', event.target.value)} placeholder="Your student ID"/></div>
            <div className="auth-field"><label htmlFor="student-email">Student email <span>Optional</span></label><input id="student-email" name="studentEmail" type="email" value={form.studentEmail} onChange={(event) => update('studentEmail', event.target.value)} placeholder="name@university.edu.gh"/></div>
            <div className="auth-field auth-field--wide"><label>Preferred student verification <span>Optional</span></label><CustomSelect value={form.verificationMethod} onChange={(value) => update('verificationMethod', value)} ariaLabel="Preferred student verification" options={[{ value: '', label: 'Choose later' }, { value: 'student_id', label: 'Student ID' }, { value: 'student_email', label: 'Student email' }, { value: 'both', label: 'Both' }]}/></div>
          </div>}
          {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
          <div className="auth-form-actions"><button className="auth-secondary-button" type="button" onClick={() => { setStep(1); setError(''); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 7-7-7 7-7"/></svg>Back</button><span className="register-actions-note">Next: storefront</span><button className="auth-submit" type="button" onClick={goNext}>Continue <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>
        </> : <>
          <div className="auth-form-title"><h3>Let’s set up your storefront.</h3><p>Add the basics so shoppers can find and understand your business. You can add products later.</p></div>
          <div className="auth-field-grid">
            <div className="auth-field auth-field--wide"><label htmlFor="store-name">Store name</label><input id="store-name" name="storeName" value={form.storeName} onChange={(event) => update('storeName', event.target.value)} required minLength={2} maxLength={100} placeholder="e.g. The Little Things Studio"/></div>
            <div className="auth-field"><label>What do you sell?</label><CustomSelect value={form.category} onChange={(value) => update('category', value)} ariaLabel="Store category" options={[{ value: '', label: 'Choose a category' }, ...categories.map(([value, label]) => ({ value, label }))]}/></div>
            <div className="auth-field"><label htmlFor="store-city">City or town</label><input id="store-city" name="city" value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="e.g. Accra"/></div>
            <div className="auth-field"><label htmlFor="store-country">Country</label><input id="store-country" name="country" value={form.country} onChange={(event) => update('country', event.target.value)} minLength={2}/></div>
            {form.sellerType === 'campus' && <div className="auth-field"><label htmlFor="store-campus">Campus name <span>Optional</span></label><input id="store-campus" name="campus" value={form.campus} onChange={(event) => update('campus', event.target.value)} placeholder="Where can customers find you?"/></div>}
            <div className="auth-field"><label htmlFor="pickup-location">Pickup location <span>Optional</span></label><input id="pickup-location" name="pickupLocation" value={form.pickupLocation} onChange={(event) => update('pickupLocation', event.target.value)} placeholder="e.g. Legon campus"/></div>
            <div className="auth-field auth-field--wide"><label htmlFor="store-description">A little about the store <span>Optional</span></label><textarea id="store-description" name="storeDescription" value={form.storeDescription} onChange={(event) => update('storeDescription', event.target.value)} rows={3} maxLength={300} placeholder="What makes your products special?"/><small className="auth-character-count">{form.storeDescription.length}/300</small></div>
            <div className="auth-field"><label>Where do you sell now?</label><CustomSelect value={form.currentPlatform} onChange={(value) => update('currentPlatform', value)} ariaLabel="Where do you sell now?" options={[{ value: 'none', label: 'I’m just starting' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'instagram', label: 'Instagram' }, { value: 'facebook', label: 'Facebook' }, { value: 'physical', label: 'In person' }, { value: 'other', label: 'Somewhere else' }]}/></div>
          </div>
          <label className="auth-terms"><input type="checkbox" required/><span>I agree to the <a href="/public/info/terms.html">terms</a> and <a href="/public/info/privacy.html">privacy policy</a>.</span></label>
          {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
          <div className="auth-form-actions"><button className="auth-secondary-button" type="button" onClick={() => { setStep(2); setError(''); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 7-7-7 7-7"/></svg>Back</button><span className="register-actions-note">One last step</span><button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Creating your store…' : 'Create my storefront'} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>
        </>}
        </div>
      </form>
      <div className="auth-switch-copy">Already have an account? <Link to="/auth/login">Sign in</Link></div>
    </AuthFrame>
  );
}

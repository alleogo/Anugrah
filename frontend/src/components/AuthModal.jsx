import React, { useState } from 'react';
import AnugrahLogo from './AnugrahLogo';
import { Alert } from './Shared';
import { api } from '../services/api';
import {
  INVALID_EMAIL_MESSAGE,
  INVALID_MOBILE_MESSAGE,
  STORAGE_KEYS,
  isValidEmail,
  isValidMobile,
  COLLEGE_YEARS,
  storage,
} from '../utils/helpers';
import { X, CheckCircle2, Zap, Shield, Mail, Sparkles } from 'lucide-react';

// 1-click login for test accounts. Development only: the accounts and their shared password
// come from frontend/.env.local (never committed), and production builds leave this out entirely.
// Format: VITE_QUICK_LOGIN_MENTORS="Name:email, Name:email"
const parseAccounts = (list) =>
  (list || '')
    .split(',')
    .map((entry) => entry.split(':').map((part) => part.trim()))
    .filter(([name, email]) => name && email)
    .map(([name, email]) => ({ name, email }));

const QUICK_LOGIN_PASSWORD = import.meta.env.DEV ? import.meta.env.VITE_QUICK_LOGIN_PASSWORD || '' : '';
const QUICK_LOGIN_GROUPS = import.meta.env.DEV
  ? [
      { title: 'Admin', color: '#dc2626', accounts: parseAccounts(import.meta.env.VITE_QUICK_LOGIN_ADMINS) },
      { title: 'Mentors', color: '#d4a017', accounts: parseAccounts(import.meta.env.VITE_QUICK_LOGIN_MENTORS) },
      { title: 'Mentees', color: '#10b981', accounts: parseAccounts(import.meta.env.VITE_QUICK_LOGIN_MENTEES) },
    ].filter((group) => group.accounts.length > 0)
  : [];
const showQuickLogin = Boolean(QUICK_LOGIN_PASSWORD) && QUICK_LOGIN_GROUPS.length > 0;

export default function AuthModal({ onClose, onLoginSuccess, initialTab = 'login', initialRole = 'Mentee' }) {
  const [isLogin, setIsLogin] = useState(initialTab !== 'signup');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [role, setRole] = useState(initialRole);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [collegeYear, setCollegeYear] = useState('');

  // Confirmation screen state for mentor signup
  const [mentorSignupConfirmed, setMentorSignupConfirmed] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  // Clear the form when switching between Sign In and Create Account
  const handleSwitchTab = (loginMode) => {
    setIsLogin(loginMode);
    setFirstname('');
    setLastname('');
    setEmail('');
    setMobileNumber('');
    setPassword('');
    setOtp('');
    setError('');
    setSuccessMsg('');
    setMentorSignupConfirmed(false);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to receive the verification code.');
      return;
    }
    if (!isValidEmail(email)) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }
    setError('');
    setSuccessMsg('');
    setOtp('');
    setOtpLoading(true);
    try {
      const res = await api.sendOtp(email.trim());
      setSuccessMsg(res.message || `Verification code sent to ${email.trim()}. Please check your email inbox.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // Save the token from a login/signup response
  const saveToken = (res) => {
    if (res.token) storage.set(STORAGE_KEYS.token, res.token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!isLogin && role === 'Mentee' && !collegeYear) {
      setError('Select your current year in college.');
      return;
    }
    if (!isLogin && !isValidMobile(mobileNumber)) {
      setError(INVALID_MOBILE_MESSAGE);
      return;
    }
    if (!isValidEmail(email)) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }
    if (!isLogin && !otp.trim()) {
      setError('Email verification code is required. Please click "Send Code" to receive your code via email.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ email: email.trim(), password });
        saveToken(res);
        onLoginSuccess(res.user);
      } else {
        const res = await api.signup({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          password,
          role,
          otp: otp.trim(),
          collegeYear: role === 'Mentee' ? collegeYear : undefined,
        });
        saveToken(res);

        // Mentors see a confirmation screen first; mentees go straight in
        if (role === 'Mentor') {
          setRegisteredUser(res.user);
          setMentorSignupConfirmed(true);
        } else {
          onLoginSuccess(res.user);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (accountEmail) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.login({ email: accountEmail, password: QUICK_LOGIN_PASSWORD });
      saveToken(res);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(28, 22, 10, 0.40)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '30px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '6px',
              borderRadius: '50%',
            }}
          >
            <X size={18} />
          </button>
        )}

        {mentorSignupConfirmed ? (
          <div style={{ textAlign: 'center', padding: '12px 6px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: '#d4a017',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '2px solid rgba(245, 158, 11, 0.4)',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: '0 0 10px 0',
                letterSpacing: '-0.01em',
              }}
            >
              Your mentor account is ready
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Thank you for applying to mentor. An admin will review your account. Until then, you can't offer to mentor
              students.
            </p>

            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                textAlign: 'left',
                marginBottom: '22px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                }}
              >
                <Shield size={14} color="#d4a017" />
                <span>Waiting for admin review</span>
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                Account: <strong style={{ color: 'var(--text-main)' }}>{registeredUser?.email}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLoginSuccess(registeredUser)}
              className="btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.9rem', justifyContent: 'center' }}
            >
              Continue to Mentor Dashboard
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(145deg, #181512 0%, #291e14 100%)',
                  border: '1.5px solid rgba(245, 158, 11, 0.45)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), 0 0 12px rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <AnugrahLogo size={28} />
              </div>
              <h2
                style={{
                  fontSize: '1.45rem',
                  color: '#f59e0b',
                  margin: '0 0 6px 0',
                  fontFamily: "'Cinzel Variable', serif",
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                {isLogin ? 'Sign In to ANUGRAH' : 'Join ANUGRAH'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                {isLogin ? 'Enter your credentials to continue' : 'Create an account as Mentee or Mentor'}
              </p>
            </div>

            {/* Tab switch */}
            <div className="tabs-nav" style={{ marginBottom: '18px' }}>
              <button
                type="button"
                className={`tab-btn ${isLogin ? 'active' : ''}`}
                onClick={() => handleSwitchTab(true)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => handleSwitchTab(false)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Create Account
              </button>
            </div>

            {showQuickLogin && (
              <>
                {/* 1-Click Login for Configured Accounts */}
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px dashed var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        color: '#d4a017',
                        fontWeight: 600,
                      }}
                    >
                      <Zap size={14} /> Quick login
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Test accounts</span>
                  </div>

                  {QUICK_LOGIN_GROUPS.map((group) => (
                    <div key={group.title} style={{ marginBottom: '8px' }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: group.color,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                        }}
                      >
                        {group.title} ({group.accounts.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {group.accounts.map((account) => (
                          <button
                            key={account.email}
                            type="button"
                            disabled={loading}
                            onClick={() => handleQuickLogin(account.email)}
                            className="btn-secondary"
                            style={{
                              width: '100%',
                              fontSize: '0.82rem',
                              padding: '6px 10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span>{account.name}</span>
                            <span className="quick-login-email">{account.email}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Alert type="error" message={error} />
            <Alert type="success" message={successMsg} />

            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {!isLogin && (
                <>
                  {/* Role selection */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                      }}
                    >
                      Select Account Role:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['Mentee', 'Mentor'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 'var(--radius-md)',
                            border: role === r ? '1px solid #f59e0b' : '1px solid var(--border-glass)',
                            background: role === r ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.03)',
                            color: role === r ? '#d4a017' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Welcoming Banner for Mentor Sign-up */}
                  {role === 'Mentor' && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Sparkles size={16} color="#d4a017" style={{ flexShrink: 0 }} />
                      <span
                        style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500, lineHeight: 1.4 }}
                      >
                        Thank you for giving back and extending your mentorship to our community.
                      </span>
                    </div>
                  )}

                  {/* Names */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '4px',
                        }}
                      >
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        placeholder="Alice"
                        className="input-field"
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '4px',
                        }}
                      >
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        placeholder="Smith"
                        className="input-field"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  {/* Mentees: current year in college (required) */}
                  {role === 'Mentee' && (
                    <div>
                      <label
                        htmlFor="signup-college-year"
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: '4px',
                        }}
                      >
                        Current Year in College (Required)
                      </label>
                      <select
                        id="signup-college-year"
                        required
                        value={collegeYear}
                        onChange={(e) => setCollegeYear(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select your year</option>
                        {COLLEGE_YEARS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mobile Number with Privacy Micro-Copy */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                      }}
                    >
                      Mobile Number (Required)
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      maxLength={16}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="98765 43210"
                      className="input-field"
                      autoComplete="tel"
                      aria-invalid={Boolean(mobileNumber) && !isValidMobile(mobileNumber)}
                    />
                    {mobileNumber && !isValidMobile(mobileNumber) ? (
                      <p className="field-error">{INVALID_MOBILE_MESSAGE}</p>
                    ) : (
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.3,
                        }}
                      >
                        10 digits.{' '}
                        {role === 'Mentor'
                          ? 'Only your own mentees and admins can see it.'
                          : 'Verified mentors and admins can see it.'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label
                  style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="input-field"
                  autoComplete="off"
                  aria-invalid={!isLogin && Boolean(email) && !isValidEmail(email)}
                />
                {!isLogin && email && !isValidEmail(email) && <p className="field-error">{INVALID_EMAIL_MESSAGE}</p>}
              </div>

              {/* Mandatory Email OTP during signup */}
              {!isLogin && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Email Verification Code (Required)
                    </label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || !email.trim()}
                      style={{
                        background: 'var(--primary-light)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        color: '#d4a017',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        cursor: otpLoading || !email.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Mail size={13} />
                      <span>{otpLoading ? 'Sending Email...' : otp ? 'Resend Code' : 'Send Code to Email'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code sent to your email"
                    className="input-field"
                    maxLength={6}
                    autoComplete="off"
                  />
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Click <strong>"Send Code to Email"</strong> to receive your 6-digit code via email.
                  </p>
                </div>
              )}

              {/* Password */}
              <div>
                <label
                  style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}
                >
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ marginTop: '8px', width: '100%', padding: '12px' }}
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : `Register as ${role}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

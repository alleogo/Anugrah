import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { Alert } from './Shared';
import { INVALID_EMAIL_MESSAGE, isValidEmail } from '../utils/helpers';

// Two steps: get a code by email, then enter the code with a new password.
export default function ForgotPasswordForm({ initialEmail = '', onDone, onCancel }) {
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const sendCode = async (e) => {
    e?.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setInfo(res.message);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword({ email: email.trim(), code: code.trim(), newPassword });
      onDone(email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-form">
      <button type="button" className="link-button forgot-back" onClick={onCancel}>
        <ArrowLeft size={14} /> Back to sign in
      </button>
      <h2>Reset your password</h2>

      {step === 'email' ? (
        <form onSubmit={sendCode}>
          <p className="forgot-help">Enter the email you signed up with. We will send you a 6-digit code.</p>
          <Alert type="error" message={error} />
          <label htmlFor="forgot-email" className="form-label">
            Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="input-field"
            autoComplete="email"
            autoFocus
          />
          <button type="submit" className="btn-primary forgot-submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword}>
          <Alert type="success" message={info} />
          <Alert type="error" message={error} />
          <label htmlFor="forgot-code" className="form-label">
            6-digit code
          </label>
          <input
            id="forgot-code"
            type="text"
            inputMode="numeric"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code from the email"
            className="input-field"
            autoComplete="one-time-code"
            autoFocus
          />
          <label htmlFor="forgot-new" className="form-label">
            New password
          </label>
          <input
            id="forgot-new"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="input-field"
            autoComplete="new-password"
          />
          <label htmlFor="forgot-confirm" className="form-label">
            Confirm new password
          </label>
          <input
            id="forgot-confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            autoComplete="new-password"
          />
          <button type="submit" className="btn-primary forgot-submit" disabled={loading}>
            {loading ? 'Saving...' : 'Set new password'}
          </button>
          <button type="button" className="link-button forgot-resend" onClick={sendCode} disabled={loading}>
            Didn't get a code? Send again
          </button>
        </form>
      )}
    </div>
  );
}

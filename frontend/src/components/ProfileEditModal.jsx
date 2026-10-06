import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import ImageCropperModal from './ImageCropperModal';
import { Alert, Avatar, LinkedInIcon } from './Shared';
import {
  COLLEGE_YEARS,
  INTEREST_LEVELS,
  INVALID_MOBILE_MESSAGE,
  isValidMobile,
  readImageFile,
  useEscapeKey,
} from '../utils/helpers';
import { X, Save, Sparkles, Camera, Loader, Crop, Trash2 } from 'lucide-react';

// Form values taken from the saved user
const formFromUser = (user) => ({
  firstname: user?.firstname || '',
  lastname: user?.lastname || '',
  mobileNumber: user?.mobileNumber || '',
  organization: user?.organization || '',
  domain: user?.domain || '',
  skills: Array.isArray(user?.skills) ? user.skills.join(', ') : '',
  experienceYears: user?.experienceYears !== undefined ? String(user.experienceYears) : '',
  // Mentees: year in college and each interest with a level. Older profiles start from their plain interests.
  collegeYear: user?.collegeYear || '',
  interests: user?.interestLevels?.length
    ? user.interestLevels.map((i) => ({ name: i.name, level: i.level }))
    : (user?.skills?.length ? user.skills : ['']).map((name) => ({ name, level: '' })),
  bio: user?.bio || '',
  linkedinUrl: user?.linkedinUrl || '',
});

// Asks for the password before permanently deleting the user's own account
function DeleteAccountDialog({ role, onCancel, onDeleted }) {
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  useEscapeKey(onCancel);

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleting(true);
    setError('');
    try {
      await api.deleteMyAccount(password);
      onDeleted();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && !deleting && onCancel()}>
      <form
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onSubmit={handleDelete}
      >
        <h2 id="delete-account-title">Delete your account?</h2>
        <p>This permanently removes:</p>
        <ul className="dialog-list">
          <li>your profile and photo</li>
          <li>your mentorship requests and chat messages</li>
          <li>
            {role === 'Mentor' ? 'your link to your mentees (they will need a new mentor)' : 'your link to your mentor'}
          </li>
        </ul>
        <p>This cannot be undone.</p>
        <label className="dialog-note">
          <span>Enter your password to confirm</span>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        {error && <p className="field-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="submit" className="btn-danger" disabled={deleting || !password}>
            {deleting ? 'Deleting...' : 'Delete account'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfileEditModal({ onClose, currentUser, onProfileUpdated, onAccountDeleted }) {
  // The modal is mounted fresh each time it opens, so the form is filled once from the saved user
  const [form, setForm] = useState(() => formFromUser(currentUser));
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');

  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cropperOpen, setCropperOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  useEscapeKey(onClose);

  // onChange handler for a form field
  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Open the cropper with the picked image
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setRawImageSrc(await readImageFile(file));
      setCropperOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCropComplete = async (croppedBase64) => {
    setAvatar(croppedBase64);
    setAvatarUploading(true);
    setError('');
    try {
      const res = await api.uploadAvatar(croppedBase64);
      if (res.avatar) {
        setAvatar(res.avatar);
        setSuccess('Profile picture cropped and saved successfully!');
        if (res.user) onProfileUpdated(res.user);
      }
    } catch (err) {
      setError(`Failed to save avatar: ${err.message}`);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    setError('');
    try {
      const res = await api.removeAvatar();
      setAvatar('');
      setSuccess('Profile picture removed successfully!');
      if (res.user) onProfileUpdated(res.user);
    } catch (err) {
      setError(`Failed to remove avatar: ${err.message}`);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Editing the mentee's interest rows
  const updateInterest = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  const addInterest = () => setForm((prev) => ({ ...prev, interests: [...prev.interests, { name: '', level: '' }] }));
  const removeInterest = (index) =>
    setForm((prev) => ({ ...prev, interests: prev.interests.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.firstname.trim() || !form.lastname.trim()) {
      setError('First name and last name are required.');
      return;
    }
    const interests = form.interests.map((i) => ({ name: i.name.trim(), level: i.level })).filter((i) => i.name);
    if (role === 'Mentee') {
      if (!form.collegeYear) {
        setError('Select your current year in college.');
        return;
      }
      if (!interests.length) {
        setError('Add at least one area of interest.');
        return;
      }
      if (interests.some((i) => !i.level)) {
        setError('Choose your level for every area of interest.');
        return;
      }
    }
    if (!isValidMobile(form.mobileNumber)) {
      setError(INVALID_MOBILE_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateProfile({
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        mobileNumber: form.mobileNumber.trim(),
        organization: form.organization.trim(),
        domain: form.domain.trim(),
        ...(role === 'Mentee'
          ? { collegeYear: form.collegeYear, interestLevels: interests }
          : {
              skills: form.skills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            }),
        ...(role === 'Mentor' && { experienceYears: Number(form.experienceYears) || 0 }),
        bio: form.bio.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
      });
      setSuccess(res.message || 'Profile saved successfully!');
      if (res.user) onProfileUpdated(res.user);
      setTimeout(onClose, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const role = currentUser?.role;

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
        zIndex: 2400,
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
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

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4a017',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', color: '#d4a017', margin: 0 }}>Edit profile</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Keep your details up to date.
              </p>
            </div>
          </div>
        </div>

        <Alert type="error" message={error} style={{ marginBottom: '16px' }} />
        <Alert type="success" message={success} style={{ marginBottom: '16px' }} />

        {/* Avatar Upload / Crop Preview Section */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Avatar user={currentUser} src={avatar} size={68} shadow />

            {avatarUploading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Loader className="spin" size={20} />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '3px' }}>
              Profile Picture
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Upload your photo. Use manual cropping to center and adjust your picture.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Camera size={13} />
                <span>{avatarUploading ? 'Uploading...' : 'Choose Photo'}</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => {
                    setRawImageSrc(avatar);
                    setCropperOpen(true);
                  }}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Crop & Reposition current profile photo"
                >
                  <Crop size={13} color="var(--primary)" />
                  <span>Crop / Reposition</span>
                </button>
              )}

              {avatar && (
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={handleRemoveAvatar}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#ef4444',
                    borderColor: 'rgba(239,68,68,0.35)',
                  }}
                  title="Remove profile picture"
                >
                  <Trash2 size={13} color="#ef4444" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Manual Image Cropper Modal */}
        {cropperOpen && rawImageSrc && (
          <ImageCropperModal
            imageSrc={rawImageSrc}
            onClose={() => setCropperOpen(false)}
            onCropComplete={handleCropComplete}
          />
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name Row */}
          <div className="form-row-2">
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
                First Name
              </label>
              <input
                type="text"
                required
                value={form.firstname}
                onChange={setField('firstname')}
                className="input-field"
              />
            </div>
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
                Last Name
              </label>
              <input
                type="text"
                required
                value={form.lastname}
                onChange={setField('lastname')}
                className="input-field"
              />
            </div>
          </div>

          {/* Mobile Number & Email */}
          <div className="form-row-2">
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
                value={form.mobileNumber}
                onChange={setField('mobileNumber')}
                placeholder="98765 43210"
                className="input-field"
                aria-invalid={Boolean(form.mobileNumber) && !isValidMobile(form.mobileNumber)}
              />
              {form.mobileNumber && !isValidMobile(form.mobileNumber) ? (
                <p className="field-error">{INVALID_MOBILE_MESSAGE}</p>
              ) : (
                <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {role === 'Mentor'
                    ? 'Only your own mentees and admins can see it.'
                    : 'Verified mentors and admins can see it.'}
                </p>
              )}
            </div>
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
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={currentUser?.email || ''}
                className="input-field"
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* Organization & Domain */}
          <div className="form-row-2">
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
                Organization / Company / College
              </label>
              <input
                type="text"
                value={form.organization}
                onChange={setField('organization')}
                placeholder={
                  role === 'Mentor'
                    ? 'e.g. Stripe, Google, Spotify'
                    : role === 'Admin'
                      ? 'e.g. Platform Administration, University'
                      : 'e.g. Stanford, IIT, Tech Corp'
                }
                className="input-field"
              />
            </div>
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
                Domain / Field
              </label>
              <input
                type="text"
                value={form.domain}
                onChange={setField('domain')}
                placeholder={
                  role === 'Admin'
                    ? 'e.g. Platform Operations & Admissions'
                    : 'e.g. Engineering, Product, AI / ML, Design'
                }
                className="input-field"
              />
            </div>
          </div>

          {role === 'Mentee' ? (
            <>
              {/* Mentees: current year in college (required) */}
              <div>
                <label htmlFor="edit-college-year" className="form-label">
                  Current Year in College (Required)
                </label>
                <select
                  id="edit-college-year"
                  required
                  value={form.collegeYear}
                  onChange={setField('collegeYear')}
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

              {/* Mentees: areas of interest, each with a level (required) */}
              <div>
                <span className="form-label">Areas of Interest and Your Level (Required)</span>
                <div className="interest-rows">
                  {form.interests.map((item, index) => (
                    <div key={index} className="interest-row">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateInterest(index, 'name', e.target.value)}
                        placeholder="e.g. Web Development"
                        className="input-field"
                        aria-label={`Area of interest ${index + 1}`}
                      />
                      <select
                        value={item.level}
                        onChange={(e) => updateInterest(index, 'level', e.target.value)}
                        className="input-field"
                        aria-label={`Your level in area ${index + 1}`}
                      >
                        <option value="">Level</option>
                        {INTEREST_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="interest-remove"
                        onClick={() => removeInterest(index)}
                        disabled={form.interests.length === 1}
                        aria-label={`Remove area ${index + 1}`}
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn-secondary interest-add" onClick={addInterest}>
                  + Add another area
                </button>
              </div>
            </>
          ) : (
            <div className={role === 'Mentor' ? 'form-row-2' : undefined}>
              {/* Mentors and admins: comma-separated skills */}
              <div>
                <label htmlFor="edit-skills" className="form-label">
                  {role === 'Admin' ? 'Administrative Focus (Comma-separated)' : 'Skills & Expertise (Comma-separated)'}
                </label>
                <input
                  id="edit-skills"
                  type="text"
                  value={form.skills}
                  onChange={setField('skills')}
                  placeholder={
                    role === 'Admin'
                      ? 'e.g. Community Operations, Program Leadership'
                      : 'e.g. System Design, Python, React, Leadership'
                  }
                  className="input-field"
                />
              </div>

              {/* Mentors: years of experience, shown on their profile card */}
              {role === 'Mentor' && (
                <div>
                  <label htmlFor="edit-experience" className="form-label">
                    Experience (Years)
                  </label>
                  <input
                    id="edit-experience"
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    value={form.experienceYears}
                    onChange={setField('experienceYears')}
                    placeholder="e.g. 8"
                    className="input-field"
                  />
                </div>
              )}
            </div>
          )}

          {/* Bio */}
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
              Biography & Summary
            </label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={setField('bio')}
              placeholder="Describe your professional journey, key milestones, and guidance focus."
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* LinkedIn URL */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              <LinkedInIcon size={13} /> LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={setField('linkedinUrl')}
              placeholder="https://linkedin.com/in/yourprofile"
              className="input-field"
            />
          </div>

          {/* Form Action Buttons (Automated verification: no manual submit for verification button) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              borderTop: '1px solid var(--border-glass)',
              paddingTop: '16px',
              marginTop: '8px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '9px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} />
              <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>

        {/* Delete account (not offered to admins, so the platform always keeps an admin) */}
        {role !== 'Admin' && (
          <section className="danger-zone">
            <div>
              <h3>Delete account</h3>
              <p>Permanently remove your account and all of its data.</p>
            </div>
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
              <span>Delete account</span>
            </button>
          </section>
        )}

        {confirmDelete && (
          <DeleteAccountDialog role={role} onCancel={() => setConfirmDelete(false)} onDeleted={onAccountDeleted} />
        )}
      </div>
    </div>
  );
}

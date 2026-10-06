import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import ImageCropperModal from './ImageCropperModal';
import { Alert, Avatar, LinkedInIcon, RoleBadge } from './Shared';
import { isVerified, readImageFile, useEscapeKey } from '../utils/helpers';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Edit3,
  ExternalLink,
  MessageSquare,
  Lock,
  Award,
  Camera,
  Loader,
  Crop,
} from 'lucide-react';

const VERIFICATION_BADGE_STYLE = { display: 'inline-flex', alignItems: 'center', gap: '4px' };

export default function UserProfileModal({
  user,
  onClose,
  currentUser,
  onEditProfile,
  onToggleApproval,
  onOpenChat,
  onProfileUpdated,
}) {
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ type: '', text: '' });
  const [displayAvatar, setDisplayAvatar] = useState(user?.avatar || '');

  useEffect(() => {
    setDisplayAvatar(user?.avatar || '');
    setAvatarMsg({ type: '', text: '' });
  }, [user]);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);

  // Open the cropper with the picked image
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setRawImageSrc(await readImageFile(file));
      setCropperOpen(true);
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.message });
    }
  };

  const handleCropComplete = async (croppedBase64) => {
    setDisplayAvatar(croppedBase64);
    setAvatarUploading(true);
    setAvatarMsg({ type: '', text: '' });
    try {
      const res = await api.uploadAvatar(croppedBase64);
      if (res.avatar) {
        setDisplayAvatar(res.avatar);
        setAvatarMsg({ type: 'success', text: 'Profile picture cropped and saved successfully!' });
        if (res.user) onProfileUpdated(res.user);
      }
    } catch (err) {
      setAvatarMsg({ type: 'error', text: `Failed to upload avatar: ${err.message}` });
    } finally {
      setAvatarUploading(false);
    }
  };

  useEscapeKey(onClose);

  if (!user) return null;

  const isOwnProfile = Boolean(currentUser && String(currentUser._id) === String(user._id));
  const isAdmin = currentUser?.role === 'Admin';
  // Admins count as verified, matching the server's chat rules
  const canMessage = isVerified(currentUser) && isVerified(user);
  const showChatButton = !isOwnProfile && onOpenChat && !(currentUser?.role === 'Mentee' && user.role === 'Mentee');

  // Interests with levels for mentees; plain skills otherwise
  const chips =
    user.role === 'Mentee' && user.interestLevels?.length
      ? user.interestLevels
      : (user.skills || []).map((name) => ({ name }));

  const verificationBadge = user.isApproved ? (
    <span className="badge badge-emerald" style={VERIFICATION_BADGE_STYLE}>
      <ShieldCheck size={13} /> Verified
    </span>
  ) : user.verificationRequested ? (
    <span className="badge badge-amber" style={VERIFICATION_BADGE_STYLE}>
      <Clock size={13} /> Reviewing
    </span>
  ) : (
    <span className="badge badge-coral" style={VERIFICATION_BADGE_STYLE}>
      <ShieldAlert size={13} /> Unverified
    </span>
  );

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
        zIndex: 2300,
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          position: 'relative',
        }}
      >
        {/* Close button */}
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

        {/* Direct Photo Upload Alert */}
        <Alert
          type={avatarMsg.type}
          message={avatarMsg.text}
          style={{ marginBottom: '14px', padding: '8px 14px', fontSize: '0.82rem' }}
        />

        {/* Profile Header with Avatar & Manual Cropping Upload */}
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', marginBottom: '22px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {isOwnProfile && (
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFileSelect}
              />
            )}

            <Avatar user={user} src={displayAvatar} size={74} shadow />

            {avatarUploading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Loader className="spin" size={20} />
              </div>
            )}

            {isOwnProfile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                title="Click to choose & upload a new profile picture"
                style={{
                  position: 'absolute',
                  bottom: '-3px',
                  right: '-3px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: '2px solid var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <Camera size={13} />
              </button>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                {user.firstname} {user.lastname}
              </h2>
              <RoleBadge role={user.role} />
              {verificationBadge}
            </div>

            {user.organization && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.84rem',
                }}
              >
                {user.role === 'Mentor' ? (
                  <Briefcase size={14} color="var(--primary)" />
                ) : (
                  <GraduationCap size={14} color="var(--primary)" />
                )}
                <span style={{ fontWeight: 600 }}>{user.organization}</span>
                {user.domain && <span style={{ color: 'var(--text-muted)' }}>• {user.domain}</span>}
              </div>
            )}

            {user.role === 'Mentee' && user.collegeYear && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                <GraduationCap size={13} color="#10b981" />
                <span>{user.collegeYear} in college</span>
              </div>
            )}
            {user.role === 'Mentor' && user.experienceYears > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Award size={13} color="#f59e0b" />
                <span>{user.experienceYears} years of experience</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact details (a mentor's phone number is only sent to their own mentees) */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            Contact
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.86rem',
                color: 'var(--text-main)',
              }}
            >
              <Phone size={15} color="#10b981" />
              <span>
                <strong>Mobile: </strong>
                {user.role === 'Mentor' ? (
                  user.mobileNumber ? (
                    <span>{user.mobileNumber}</span>
                  ) : (
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                      }}
                    >
                      <Lock size={12} color="#f59e0b" /> Private
                    </span>
                  )
                ) : user.mobileNumber ? (
                  <span>{user.mobileNumber}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Not specified</span>
                )}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.86rem',
                color: 'var(--text-main)',
              }}
            >
              <Mail size={15} color="var(--text-muted)" />
              {/* Long emails wrap instead of running out of the box */}
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <strong>Email:</strong> {user.email}
              </span>
            </div>
          </div>
        </div>

        {/* Skills / Expertise Tags if present */}
        {chips.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <h4
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              {user.role === 'Mentee' ? 'Interests' : 'Skills'}
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {chips.map((chip, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  {chip.name}
                  {chip.level && <span className="chip-level">| {chip.level}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio / About */}
        <div style={{ marginBottom: '20px' }}>
          <h4
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            About
          </h4>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '0.88rem',
              color: 'var(--text-main)',
              lineHeight: 1.6,
            }}
          >
            {user.bio ? (
              user.bio
            ) : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No bio provided yet.</span>
            )}
          </div>
        </div>

        {/* LinkedIn Link */}
        {user.linkedinUrl && (
          <div style={{ marginBottom: '20px' }}>
            <h4
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              LinkedIn
            </h4>
            <div>
              <a
                href={user.linkedinUrl.startsWith('http') ? user.linkedinUrl : `https://${user.linkedinUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LinkedInIcon />
                <span>LinkedIn Profile</span>
                <ExternalLink size={12} style={{ opacity: 0.7 }} />
              </a>
            </div>
          </div>
        )}

        {/* Mentorship Associations */}
        {user.role === 'Mentee' && user.mentor && (
          <div
            style={{
              marginBottom: '20px',
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.06)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Mentor</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '2px' }}>
              {typeof user.mentor === 'object' && user.mentor?.firstname
                ? `${user.mentor.firstname} ${user.mentor.lastname || ''} ${user.mentor.email ? `(${user.mentor.email})` : ''}`.trim()
                : 'Mentor Assigned'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            marginTop: '10px',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '16px',
            flexWrap: 'wrap',
          }}
        >
          {isOwnProfile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="btn-secondary"
                style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera size={14} color="var(--primary)" />
                <span>{avatarUploading ? 'Uploading...' : displayAvatar ? 'Change Photo' : 'Add Profile Picture'}</span>
              </button>

              {displayAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setRawImageSrc(displayAvatar);
                    setCropperOpen(true);
                  }}
                  disabled={avatarUploading}
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Crop and reposition current photo"
                >
                  <Crop size={14} color="var(--primary)" />
                  <span>Crop / Reposition</span>
                </button>
              )}
            </div>
          )}

          {/* Image Cropper Modal */}
          {cropperOpen && rawImageSrc && (
            <ImageCropperModal
              imageSrc={rawImageSrc}
              onClose={() => setCropperOpen(false)}
              onCropComplete={handleCropComplete}
            />
          )}

          {isOwnProfile && (
            <button
              onClick={() => {
                onClose();
                onEditProfile();
              }}
              className="btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </button>
          )}

          {/* Chat button (mentees cannot message other mentees) */}
          {showChatButton && (
            <button
              onClick={() => {
                onClose();
                onOpenChat(user);
              }}
              disabled={!canMessage}
              className={canMessage ? 'btn-primary' : 'btn-secondary'}
              style={{
                fontSize: '0.85rem',
                opacity: canMessage ? 1 : 0.6,
                cursor: canMessage ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title={
                !isVerified(currentUser)
                  ? 'Your account must be verified to start a chat'
                  : !isVerified(user)
                    ? 'This user is not yet verified by an Administrator'
                    : `Start / view chat thread with ${user.firstname}`
              }
            >
              {canMessage ? <MessageSquare size={15} /> : <Lock size={14} />}
              <span>{canMessage ? `Message ${user.firstname}` : 'Chat (Verification Required)'}</span>
            </button>
          )}

          {isAdmin && !isOwnProfile && (
            <button
              onClick={() => onToggleApproval(user._id, user.isApproved)}
              className={user.isApproved ? 'btn-secondary' : 'btn-primary'}
              style={{ fontSize: '0.85rem' }}
            >
              <ShieldCheck size={15} />
              <span>{user.isApproved ? 'Unverify Account' : 'Approve & Verify Profile'}</span>
            </button>
          )}

          <button onClick={onClose} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

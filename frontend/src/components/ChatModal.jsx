import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Alert, Avatar, RoleBadge } from './Shared';
import { isVerified, useEscapeKey } from '../utils/helpers';
import { Send, X, MessageSquare, ShieldCheck, Lock, Phone } from 'lucide-react';

const POLL_INTERVAL_MS = 3000;

export default function ChatModal({ currentUser, targetUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const isVerifiedSender = isVerified(currentUser);
  const isVerifiedReceiver = isVerified(targetUser);
  const isMenteeToMentee = currentUser?.role === 'Mentee' && targetUser?.role === 'Mentee';
  const canChat = isVerifiedSender && isVerifiedReceiver && !isMenteeToMentee;

  const fetchChat = async () => {
    if (!targetUser?._id) return;
    try {
      const res = await api.getMessages(targetUser._id);
      setMessages(res.messages || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEscapeKey(onClose);

  // Load messages, then poll for new ones
  useEffect(() => {
    if (!canChat) return;
    fetchChat();
    const timer = setInterval(fetchChat, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [targetUser?._id, canChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    if (!canChat) {
      setError('Direct messaging is only available between verified Anugrah accounts.');
      return;
    }

    const content = text.trim();
    setText('');
    setLoading(true);
    setError('');

    try {
      const res = await api.sendMessage(targetUser._id, content);
      setMessages((prev) => [...prev, res.data]);
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
        backgroundColor: 'rgba(28, 22, 10, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        padding: '16px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '640px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
        }}
      >
        {/* Chat Header */}
        <div className="chat-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar user={targetUser} size={40} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {targetUser.firstname} {targetUser.lastname}
                </h4>
                <RoleBadge role={targetUser.role} />
                {isVerifiedReceiver && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#059669',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                {targetUser.organization}
                {currentUser?.role === 'Mentor' && targetUser?.role === 'Mentee' && targetUser?.mobileNumber ? (
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Phone size={11} /> {targetUser.mobileNumber}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
            title="Close chat (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Verification Alert if either account is unverified */}
        {!canChat && (
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.84rem',
              color: '#dc2626',
            }}
          >
            <Lock size={16} />
            <span>
              {isMenteeToMentee
                ? 'Mentees cannot message other mentees. Messages are allowed between mentors and mentees, or between mentors.'
                : !isVerifiedSender
                  ? 'Your account is not verified yet. Complete and submit your profile for Admin verification to send and receive messages.'
                  : `${targetUser.firstname}'s account is not yet verified. Chat unlocks once both accounts are verified by an Administrator.`}
            </span>
          </div>
        )}

        <Alert type="error" message={error} style={{ margin: '12px 16px 0 16px' }} />

        {/* Chat Body */}
        <div className="chat-body" style={{ height: '390px', padding: '16px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', padding: '40px 20px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: '#d4a017',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <MessageSquare size={26} />
              </div>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>No messages yet</h5>
              <p style={{ fontSize: '0.84rem', maxWidth: '340px', margin: '0 auto', color: 'var(--text-secondary)' }}>
                {canChat
                  ? `Say hello to start your conversation with ${targetUser.firstname}.`
                  : 'Chat is available once both accounts are verified.'}
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = String(m.sender?._id || m.sender) === String(currentUser._id);

              return (
                <div key={m._id} className={`chat-bubble ${isMe ? 'sent' : 'received'}`}>
                  <div>{m.message}</div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      opacity: 0.7,
                      marginTop: '4px',
                      textAlign: isMe ? 'right' : 'left',
                    }}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Footer */}
        <form
          onSubmit={handleSend}
          className="chat-footer"
          style={{ padding: '14px 18px', borderTop: '1px solid var(--border-glass)' }}
        >
          <input
            type="text"
            className="input-field"
            placeholder={
              canChat ? `Type message to ${targetUser.firstname}...` : 'Chat disabled for unverified accounts'
            }
            value={text}
            disabled={!canChat || loading}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            disabled={!canChat || loading || !text.trim()}
            className="btn-primary"
            style={{ padding: '10px 18px' }}
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';
import { Alert, Avatar, LoadingBlocks, RoleBadge } from './Shared';
import { fullName, useEscapeKey } from '../utils/helpers';

// "Today 14:05", "Yesterday", or a date
const formatWhen = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
};

// Inbox: everyone the user has a conversation with, newest first. Clicking one opens the chat.
// `refreshKey` changes when a chat closes, so the list (and unread counts) reload.
export default function MessagesModal({ onClose, onOpenChat, refreshKey, chatOpen }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // While a chat is open on top, Escape closes only the chat
  useEscapeKey(chatOpen ? () => {} : onClose);

  useEffect(() => {
    api
      .getConversations()
      .then((res) => setConversations(res.conversations || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="dialog-backdrop messages-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog messages-dialog" role="dialog" aria-modal="true" aria-labelledby="messages-title">
        <div className="messages-header">
          <h2 id="messages-title">Messages</h2>
          <button type="button" className="messages-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <Alert type="error" message={error} />

        {loading ? (
          <LoadingBlocks rows={3} />
        ) : conversations.length === 0 ? (
          <p className="messages-empty">
            No messages yet. When someone, including the admin, messages you, it shows up here.
          </p>
        ) : (
          <ul className="messages-list">
            {conversations.map(({ user, lastMessage, lastMessageAt, lastMessageFromMe, unreadCount }) => (
              <li key={user._id}>
                <button type="button" className="messages-row" onClick={() => onOpenChat(user)}>
                  <Avatar user={user} size={40} />
                  <div className="messages-row-main">
                    <div className="messages-row-top">
                      <span className="messages-name">{fullName(user)}</span>
                      <RoleBadge role={user.role} style={{ fontSize: '0.65rem', padding: '1px 6px' }} />
                      <span className="messages-time">{formatWhen(lastMessageAt)}</span>
                    </div>
                    <div className={`messages-preview ${unreadCount ? 'unread' : ''}`}>
                      {lastMessageFromMe && 'You: '}
                      {lastMessage}
                    </div>
                  </div>
                  {unreadCount > 0 && <span className="messages-unread">{unreadCount}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

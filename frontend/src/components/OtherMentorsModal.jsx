import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Avatar, LoadingBlocks } from './Shared';
import { fullName, matchesSearch } from '../utils/helpers';
import { X, Users, Search, ShieldCheck, Clock, Briefcase, Eye } from 'lucide-react';

export default function OtherMentorsModal({ onClose, onViewProfile }) {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .getOtherMentors()
      .then((res) => setMentors(res.mentors || []))
      .catch((err) => console.error('Error fetching other mentors:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredMentors = mentors.filter((mentor) =>
    matchesSearch(search, [fullName(mentor), mentor.email, mentor.organization])
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
        backgroundColor: 'rgba(28, 22, 10, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2200,
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
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

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4a017',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: '#d4a017', margin: 0 }}>Other Mentors</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Connect, view profiles, and message verified mentors.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search other mentors by name, organization, email..."
            className="input-field"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Mentor Cards Grid */}
        {loading ? (
          <LoadingBlocks />
        ) : filteredMentors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p>{search.trim() ? 'No mentors matched your search query.' : 'No other mentors are registered yet.'}</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredMentors.map((mentor) => {
              return (
                <div
                  key={mentor._id}
                  className="glass-card"
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    {/* Top Row: Avatar & Badges */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <Avatar user={mentor} size={44} />

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className="badge badge-amber">Mentor</span>
                        {mentor.isApproved ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <ShieldCheck size={11} /> Verified
                          </span>
                        ) : mentor.verificationRequested ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#d4a017',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Clock size={11} /> Reviewing
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Pending</span>
                        )}
                      </div>
                    </div>

                    {/* Mentor Details */}
                    <h4 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--text-main)' }}>
                      {mentor.firstname} {mentor.lastname}
                    </h4>

                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {mentor.email}
                    </p>

                    {mentor.organization && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginTop: '6px',
                          color: 'var(--text-secondary)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <Briefcase size={12} color="#a0896b" />
                        <span>
                          {[
                            mentor.organization,
                            mentor.experienceYears > 0 && `${mentor.experienceYears} yrs experience`,
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </span>
                      </div>
                    )}

                    {mentor.bio && (
                      <p
                        style={{
                          margin: '8px 0 0 0',
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                        }}
                      >
                        {mentor.bio}
                      </p>
                    )}
                  </div>

                  {/* Actions: View Profile opens designated modal where chat lives */}
                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                    <button
                      onClick={() => {
                        onClose();
                        onViewProfile(mentor);
                      }}
                      className="btn-secondary"
                      style={{
                        width: '100%',
                        fontSize: '0.82rem',
                        padding: '7px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Eye size={14} />
                      <span>View Profile</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Alert, Avatar, ConfirmDialog, LoadingBlocks, PageHeader } from './Shared';
import { useToast } from '../utils/toast';
import { fullName, matchesSearch } from '../utils/helpers';
import {
  Users,
  UserPlus,
  MessageSquare,
  Clock,
  Eye,
  GraduationCap,
  UserMinus,
  Search,
  Phone,
  Mail,
} from 'lucide-react';

// The mentee field is either a populated object or a plain id
const menteeIdOf = (request) => request.mentee?._id || request.mentee;

export default function MentorDashboard({ currentUser: user, onViewProfile, onOpenChat, onPendingChange }) {
  const [myMentees, setMyMentees] = useState([]);
  const [unallottedMentees, setUnallottedMentees] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(''); // only for loading failures; actions use notifications
  const [removalTarget, setRemovalTarget] = useState(null); // mentee picked for "Remove"
  const showToast = useToast();

  // Search query for unallotted mentees
  const [searchQuery, setSearchQuery] = useState('');

  // The loading placeholder only shows on the first load; later refreshes keep the page in place
  const loadData = async () => {
    try {
      const [myRes, unallottedRes, requestsRes] = await Promise.all([
        api.getMyMentees(),
        api.getUnallottedMentees(),
        api.getMyMentorRequests().catch(() => ({ requests: [] })),
      ]);

      setMyMentees(myRes.mentees || []);
      setUnallottedMentees(unallottedRes.mentees || []);
      setMyRequests(requestsRes.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingRequests = myRequests.filter((r) => r.status === 'Pending');

  // The sidebar lists requests that are still waiting for the admin
  useEffect(() => {
    onPendingChange?.(
      pendingRequests.map((r) => ({
        id: r._id,
        label: r.requestType === 'Removal' ? 'Removal request' : 'Mentoring offer',
        name: typeof r.mentee === 'object' ? fullName(r.mentee) : 'Student',
      }))
    );
  }, [myRequests]);
  const pendingRemovalMenteeIds = new Set(pendingRequests.filter((r) => r.requestType === 'Removal').map(menteeIdOf));
  const pendingMenteeIds = new Set(pendingRequests.filter((r) => r.requestType !== 'Removal').map(menteeIdOf));

  // Run an action, show its result as a notification, then refresh the lists
  const runAction = async (apiCall) => {
    setActionLoading(true);
    try {
      const res = await apiCall();
      showToast(res.message);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectMentee = (menteeId) => runAction(() => api.selectMentee(menteeId));

  const handleConfirmRemoval = (note) => {
    const mentee = removalTarget;
    setRemovalTarget(null);
    runAction(() => api.requestMenteeRemoval(mentee._id, note));
  };

  const filteredUnallottedMentees = useMemo(
    () => unallottedMentees.filter((m) => matchesSearch(searchQuery, [fullName(m), m.organization, m.email])),
    [unallottedMentees, searchQuery]
  );

  if (loading) {
    return <LoadingBlocks />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Alert type="error" message={error} style={{ padding: '9px 14px', fontSize: '0.85rem' }} />

      {removalTarget && (
        <ConfirmDialog
          title={`Ask to stop mentoring ${fullName(removalTarget)}?`}
          message="The admin will review your request. Until then, you stay their mentor."
          noteLabel="Note for the admin (optional)"
          confirmLabel="Send request"
          danger
          onConfirm={handleConfirmRemoval}
          onCancel={() => setRemovalTarget(null)}
        />
      )}

      <PageHeader title={`Welcome back, ${user.firstname}`} />

      {/* Shown until an admin verifies this mentor */}
      {!user.isApproved && (
        <div
          className="glass-card"
          style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b', background: 'var(--bg-surface)' }}
        >
          <h2 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 4px 0' }}>
            Your account is waiting for verification
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            An admin reviews every new mentor. Until then you can browse students, but you can't offer to mentor them.
          </p>
        </div>
      )}

      {/* Active Mentees */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              My mentees ({myMentees.length})
            </h3>
          </div>
        </div>

        {myMentees.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '24px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <Users size={24} color="var(--primary)" style={{ opacity: 0.7, marginBottom: '6px' }} />
            <h5 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 3px 0', color: 'var(--text-main)' }}>
              No Mentees Assigned Yet
            </h5>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0 }}>
              Select available students from the candidate pool below to request mentorship.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {myMentees.map((mentee) => (
              <div
                key={mentee._id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <Avatar user={mentee} size={34} />
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          lineHeight: 1.2,
                        }}
                      >
                        {mentee.firstname} {mentee.lastname}
                      </h4>
                      {mentee.organization ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '1px',
                            color: 'var(--primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          <GraduationCap size={11} />
                          <span>{[mentee.organization, mentee.collegeYear].filter(Boolean).join(' | ')}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Mentee</span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      marginTop: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={12} color="var(--primary)" /> {mentee.email}
                    </span>
                    {mentee.mobileNumber ? (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Phone size={12} /> {mentee.mobileNumber}
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                        <Phone size={12} /> No phone provided
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={() => onViewProfile(mentee)}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Eye size={13} />
                    <span>View Profile</span>
                  </button>

                  {onOpenChat && (
                    <button
                      onClick={() => onOpenChat(mentee)}
                      className="btn-secondary"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                      title={`Chat directly with ${mentee.firstname}`}
                    >
                      <MessageSquare size={13} color="var(--primary)" />
                      <span>Chat</span>
                    </button>
                  )}

                  {pendingRemovalMenteeIds.has(mentee._id) ? (
                    <button
                      disabled
                      className="btn-secondary"
                      style={{
                        padding: '5px 8px',
                        fontSize: '0.72rem',
                        opacity: 0.8,
                        cursor: 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Removal request submitted. Awaiting Admin confirmation."
                    >
                      <Clock size={11} color="var(--primary)" />
                      <span>Pending</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setRemovalTarget(mentee)}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{
                        padding: '5px 8px',
                        fontSize: '0.72rem',
                        color: '#dc2626',
                        borderColor: 'rgba(239, 68, 68, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Request removal of mentee"
                    >
                      <UserMinus size={11} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Students without a mentor */}
      <section id="candidate-pool-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              Candidate pool ({filteredUnallottedMentees.length})
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
              Students who don't have a mentor yet. Offer to mentor one and the admin will review it.
            </p>
          </div>

          {/* Compact Search Bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search student or college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '28px', fontSize: '0.8rem', padding: '6px 10px 6px 28px' }}
            />
          </div>
        </div>

        {filteredUnallottedMentees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {searchQuery
                ? 'No unallotted mentees match your search.'
                : 'No candidates currently waiting in the pool.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {filteredUnallottedMentees.map((mentee) => (
              <div
                key={mentee._id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <Avatar user={mentee} size={34} />
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            lineHeight: 1.2,
                          }}
                        >
                          {mentee.firstname} {mentee.lastname}
                        </h4>
                        {mentee.organization ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '1px',
                              color: 'var(--primary)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <GraduationCap size={11} />
                            <span>{[mentee.organization, mentee.collegeYear].filter(Boolean).join(' | ')}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Mentee</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      marginTop: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={12} /> {mentee.email}
                    </span>
                    {mentee.mobileNumber ? (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Phone size={12} /> {mentee.mobileNumber}
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                        <Phone size={12} /> {user.isApproved ? 'No phone provided' : 'Phone shown after verification'}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={() => onViewProfile(mentee)}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Eye size={12} />
                    <span>View Profile</span>
                  </button>

                  {pendingMenteeIds.has(mentee._id) ? (
                    <button
                      disabled
                      className="btn-secondary"
                      style={{
                        flex: 1.4,
                        padding: '6px 8px',
                        fontSize: '0.75rem',
                        opacity: 0.8,
                        cursor: 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                      title="Mentorship offer submitted. Awaiting Admin confirmation."
                    >
                      <Clock size={12} color="var(--primary)" />
                      <span>Offered</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectMentee(mentee._id)}
                      disabled={actionLoading || !user.isApproved}
                      className={user.isApproved ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        flex: 1.4,
                        padding: '6px 8px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        opacity: user.isApproved ? 1 : 0.6,
                        cursor: user.isApproved ? 'pointer' : 'not-allowed',
                      }}
                      title={
                        user.isApproved
                          ? 'Offer to mentor this student'
                          : 'Verification required before offering mentorship'
                      }
                    >
                      <UserPlus size={12} />
                      <span>{user.isApproved ? 'Offer to mentor' : 'Verification required'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

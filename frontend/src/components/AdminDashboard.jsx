import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Alert, Avatar, ConfirmDialog, LoadingBlocks, PageHeader } from './Shared';
import { useToast } from '../utils/toast';
import { fullName, isAutoNote, matchesSearch } from '../utils/helpers';
import {
  ShieldCheck,
  Check,
  X,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Briefcase,
  GraduationCap,
  MessageSquare,
  Search,
  UserMinus,
  Sparkles,
} from 'lucide-react';

// Filter buttons above the user lists: [key, label, test]
const MENTOR_FILTERS = [
  ['ALL', 'All', () => true],
  ['Verified', 'Verified', (u) => u.isApproved],
  ['Unverified', 'Unverified', (u) => !u.isApproved],
];
const MENTEE_FILTERS = [
  ['ALL', 'All', () => true],
  ['Allotted', 'Allotted', (u) => u.mentor],
  ['Unallotted', 'Unallotted', (u) => !u.mentor],
  ['Verified', 'Verified', (u) => u.isApproved],
  ['Unverified', 'Unverified', (u) => !u.isApproved],
];

// Users that pass the selected filter button and the search box
const filterUsers = (users, filters, filterKey, query) => {
  const test = filters.find(([key]) => key === filterKey)[2];
  return users.filter((u) => test(u) && matchesSearch(query, [fullName(u), u.email, u.organization, u.mobileNumber]));
};

// Mentor pre-selected in the "Allot to" dropdown: the requesting mentor, else the mentee's first choice
// Only verified mentors can be allotted
const isVerifiedMentor = (mentorId, mentors) => mentors.some((m) => m._id === mentorId && m.isApproved);

// Pre-selected: the requesting mentor, else the mentee's highest verified choice, else the first verified mentor
const defaultMentorIdFor = (req, mentors) =>
  [req.requestedByMentor?._id, ...(req.preferredMentors || []).map((m) => m._id)].find((mid) =>
    isVerifiedMentor(mid, mentors)
  ) || mentors.find((m) => m.isApproved)?._id;

// Action buttons on a user card, in a 2-column grid.
// "Reject" only appears while the user is waiting for verification; Delete then spans the full row.
function UserActions({ user, onViewProfile, onOpenChat, onToggleApproval, onRejectVerification, onDelete }) {
  const awaitingReview = !user.isApproved && user.verificationRequested;
  return (
    <div className="admin-actions">
      <button type="button" className="act act-neutral" onClick={() => onViewProfile(user)}>
        <Eye size={14} /> Profile
      </button>
      <button
        type="button"
        className="act act-chat"
        onClick={() => onOpenChat(user)}
        title={`Chat with ${user.firstname}`}
      >
        <MessageSquare size={14} /> Chat
      </button>
      <button
        type="button"
        className={`act ${user.isApproved ? 'act-muted' : 'act-verify'}`}
        onClick={() => onToggleApproval(user._id, user.isApproved)}
      >
        <ShieldCheck size={14} /> {user.isApproved ? 'Unverify' : 'Verify'}
      </button>
      {awaitingReview && (
        <button type="button" className="act act-reject" onClick={() => onRejectVerification(user)}>
          <X size={14} /> Reject
        </button>
      )}
      <button
        type="button"
        className={`act act-delete ${awaitingReview ? 'act-wide' : ''}`}
        onClick={() => onDelete(user)}
        title={`Delete ${fullName(user)}'s account`}
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}

export default function AdminDashboard({
  currentUser,
  onViewProfile,
  onOpenChat,
  activeTab,
  onTabChange: setActiveTab,
}) {
  const [mentors, setMentors] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // only for loading failures; actions use notifications
  const [pendingConfirm, setPendingConfirm] = useState(null); // { title, message, confirmLabel, run }
  const showToast = useToast();

  // Mentors search and filter
  const [mentorSearch, setMentorSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState('ALL');

  // Mentees search and filter
  const [menteeSearch, setMenteeSearch] = useState('');
  const [menteeFilter, setMenteeFilter] = useState('ALL');

  // Mentor chosen in the "Allot to" dropdown, per request id
  const [allotmentChoices, setAllotmentChoices] = useState({});

  // The loading placeholder only shows on the first load; later refreshes keep the page in place
  const loadData = async () => {
    try {
      const [usersRes, requestsRes] = await Promise.all([api.getUsers(), api.getRequests()]);

      setMentors(usersRes.mentors || []);
      setMentees(usersRes.mentees || []);
      setRequests(requestsRes.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run an admin API call, show its result message and reload the lists
  const runAction = async (apiCall) => {
    try {
      const res = await apiCall();
      showToast(res.message);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResolve = (req, action) =>
    runAction(() =>
      api.resolveRequest(req._id, {
        action,
        allottedMentorId: allotmentChoices[req._id] || defaultMentorIdFor(req, mentors),
      })
    );

  const handleToggleApproval = (userId, currentStatus) => runAction(() => api.toggleApproval(userId, !currentStatus));

  const handleDeleteUser = (user) =>
    setPendingConfirm({
      title: `Delete ${fullName(user)}'s account?`,
      message:
        'This also deletes their requests and messages, and unlinks their mentor or mentees. It cannot be undone.',
      confirmLabel: 'Delete account',
      run: () => api.deleteUser(user._id),
    });

  const handleRejectVerification = (user) =>
    setPendingConfirm({
      title: `Reject ${fullName(user)}'s verification request?`,
      message: 'Their account stays unverified. They can update their profile and ask again.',
      confirmLabel: 'Reject request',
      run: () => api.rejectVerification(user._id),
    });

  const handleDirectRemoveAllotment = (menteeId, mentorId) =>
    setPendingConfirm({
      title: 'Remove this mentee from their mentor?',
      message: 'The mentee will be without a mentor and can request a new one.',
      confirmLabel: 'Remove',
      run: () => api.removeMenteeAllotment(menteeId, mentorId),
    });

  if (loading) {
    return <LoadingBlocks />;
  }

  // Pending requests, newest first, with each mentee's competing requests kept next to each other
  const pending = requests.filter((r) => r.status === 'Pending');
  const menteeOrder = [...new Set(pending.map((r) => r.mentee?._id))];
  const unsettledRequests = [...pending].sort(
    (a, b) => menteeOrder.indexOf(a.mentee?._id) - menteeOrder.indexOf(b.mentee?._id)
  );
  const unverifiedMentors = mentors.filter((m) => !m.isApproved);
  const unverifiedMentees = mentees.filter((m) => !m.isApproved);
  const filteredMentors = filterUsers(mentors, MENTOR_FILTERS, mentorFilter, mentorSearch);
  const filteredMentees = filterUsers(mentees, MENTEE_FILTERS, menteeFilter, menteeSearch);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Alert type="error" message={error} />

      {pendingConfirm && (
        <ConfirmDialog
          title={pendingConfirm.title}
          message={pendingConfirm.message}
          confirmLabel={pendingConfirm.confirmLabel}
          danger
          onConfirm={() => {
            runAction(pendingConfirm.run);
            setPendingConfirm(null);
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      <PageHeader title={`Welcome back, ${currentUser?.firstname}`} />

      {/* Tabs Switcher */}
      <div className="tabs-nav" style={{ margin: 0 }}>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Clock size={16} />
          <span>Pending requests ({unsettledRequests.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'mentors' ? 'active' : ''}`}
          onClick={() => setActiveTab('mentors')}
        >
          <Briefcase size={16} />
          <span>Mentors ({mentors.length})</span>
          {unverifiedMentors.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
              {unverifiedMentors.length} Unverified
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'mentees' ? 'active' : ''}`}
          onClick={() => setActiveTab('mentees')}
        >
          <GraduationCap size={16} />
          <span>Mentees ({mentees.length})</span>
          {unverifiedMentees.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
              {unverifiedMentees.length} Unverified
            </span>
          )}
        </button>
      </div>

      {/* Pending requests tab */}
      {activeTab === 'requests' && (
        <div>
          {unsettledRequests.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '36px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-glass)',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '8px' }} />
              <p style={{ color: 'var(--text-main)', fontWeight: 500, margin: '0 0 4px 0' }}>No pending requests.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>
                Past decisions are under Settled Requests in the sidebar.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {unsettledRequests.map((req) => (
                <div
                  key={req._id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => onViewProfile(req.mentee)}
                            title="View profile"
                          >
                            {fullName(req.mentee)}
                          </button>
                        </h4>
                        {req.mentee && !req.mentee.isApproved && (
                          <span className="badge badge-amber" title="This mentee's account is not verified yet">
                            Unverified mentee
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                        {req.mentee?.email} {req.mentee?.mobileNumber && `• ${req.mentee?.mobileNumber}`}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {req.requestType === 'Removal' ? (
                        <span
                          className="badge badge-coral"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <UserMinus size={11} /> Removal request
                        </span>
                      ) : req.requestedByRole === 'Mentor' || req.requestedByMentor ? (
                        <span
                          className="badge badge-amber"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Briefcase size={11} /> Mentor offer
                        </span>
                      ) : req.isGeneralAllotment || !req.preferredMentors || req.preferredMentors.length === 0 ? (
                        <span
                          className="badge badge-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Sparkles size={11} /> General request
                        </span>
                      ) : (
                        <span
                          className="badge badge-neutral"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <GraduationCap size={11} /> Mentee preferences
                        </span>
                      )}

                      {(() => {
                        if (req.requestType === 'Removal') return null;
                        const menteeId = req.mentee?._id;
                        const competing = unsettledRequests.filter(
                          (r) => r._id !== req._id && r.mentee?._id === menteeId && r.requestType !== 'Removal'
                        ).length;
                        return competing > 0 ? (
                          <span
                            className="badge badge-amber"
                            title="Approving this request will automatically reject the other pending allotment requests for this mentee."
                          >
                            {competing} competing request{competing > 1 ? 's' : ''}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Request Details: Removal vs Allotment */}
                  {req.requestType === 'Removal' ? (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <button
                          type="button"
                          className="link-button"
                          style={{ fontWeight: 700, color: 'var(--text-main)' }}
                          onClick={() => onViewProfile(req.requestedByMentor)}
                        >
                          {fullName(req.requestedByMentor)}
                        </button>{' '}
                        asked to stop mentoring{' '}
                        <button
                          type="button"
                          className="link-button"
                          style={{ fontWeight: 700, color: 'var(--text-main)' }}
                          onClick={() => onViewProfile(req.mentee)}
                        >
                          {fullName(req.mentee)}
                        </button>
                        .
                      </p>
                      {req.notes && !isAutoNote(req) && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <strong>Reason:</strong> {req.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Preferred Mentors Order or Mentor Proposal for Allotment */
                    <div>
                      {req.requestedByRole === 'Mentor' || req.requestedByMentor ? (
                        <div>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              display: 'block',
                              marginBottom: '6px',
                            }}
                          >
                            Requested by
                          </span>
                          <span
                            className="preference-tag"
                            onClick={() => onViewProfile(req.requestedByMentor)}
                            title="Click to view mentor profile"
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Briefcase size={12} color="#d4a017" />
                            <span>
                              {req.requestedByMentor?.firstname} {req.requestedByMentor?.lastname} (
                              {req.requestedByMentor?.organization || req.requestedByMentor?.email})
                            </span>
                            <Eye size={11} style={{ opacity: 0.7 }} />
                          </span>
                          {req.notes && !isAutoNote(req) && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {req.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              display: 'block',
                              marginBottom: '6px',
                            }}
                          >
                            Preferred mentors, in order
                          </span>
                          {req.preferredMentors?.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {req.preferredMentors.map((m, idx) => (
                                <span
                                  key={m._id}
                                  className="preference-tag"
                                  onClick={() => onViewProfile(m)}
                                  title="Click to view mentor profile"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <span className="preference-rank">#{idx + 1}</span>
                                  <span>
                                    {m.firstname} {m.lastname}
                                  </span>
                                  <Eye size={11} style={{ marginLeft: '4px', opacity: 0.7 }} />
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div
                              style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '10px 14px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: 'var(--primary)',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  marginBottom: '4px',
                                }}
                              >
                                <Sparkles size={14} />
                                <span>General Mentor Allotment Request</span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Mentee has requested the administrator to match and allot an appropriate mentor.
                              </p>
                              {req.guidanceDomain && (
                                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                  <strong>Preferred Domain:</strong>{' '}
                                  <span
                                    className="badge badge-neutral"
                                    style={{ fontSize: '0.72rem', padding: '1px 6px', marginLeft: '4px' }}
                                  >
                                    {req.guidanceDomain}
                                  </span>
                                </p>
                              )}
                              {req.notes && (
                                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <strong>Mentee Goals / Notes:</strong> {req.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions for Pending Requests */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end', // the mentor choice sits right next to Approve / Reject
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '14px',
                      marginTop: '4px',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    {req.requestType === 'Removal' ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleResolve(req, 'accept')}
                          className="btn-danger"
                          style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <UserMinus size={15} /> Approve Removal
                        </button>
                        <button
                          onClick={() => handleResolve(req, 'reject')}
                          className="btn-secondary"
                          style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <X size={15} /> Reject
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="allot-choice">
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Allot to:</span>
                          <select
                            className="input-field"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            value={allotmentChoices[req._id] || defaultMentorIdFor(req, mentors) || ''}
                            onChange={(e) => setAllotmentChoices({ ...allotmentChoices, [req._id]: e.target.value })}
                          >
                            {/* If requested by mentor, highlight that mentor first */}
                            {req.requestedByMentor && (
                              <optgroup label="Requesting Mentor">
                                <option value={req.requestedByMentor._id}>
                                  {fullName(req.requestedByMentor)} (requested)
                                </option>
                              </optgroup>
                            )}

                            {/* If mentee preferences exist, list them */}
                            {req.preferredMentors?.length > 0 && (
                              <optgroup label="Mentee Preferences">
                                {req.preferredMentors.map((m, idx) => (
                                  <option key={m._id} value={m._id} disabled={!isVerifiedMentor(m._id, mentors)}>
                                    #{idx + 1}: {m.firstname} {m.lastname}
                                    {isVerifiedMentor(m._id, mentors) ? '' : ' (not verified)'}
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            <optgroup label="All verified mentors">
                              {mentors
                                .filter((m) => m.isApproved)
                                .map((m) => (
                                  <option key={m._id} value={m._id}>
                                    {m.firstname} {m.lastname} ({m.email})
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleResolve(req, 'accept')}
                            className="btn-primary"
                            style={{ padding: '7px 14px' }}
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button
                            onClick={() => handleResolve(req, 'reject')}
                            className="btn-danger"
                            style={{ padding: '7px 14px' }}
                          >
                            <X size={16} /> Reject
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mentors tab */}
      {activeTab === 'mentors' && (
        <div>
          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
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
                value={mentorSearch}
                onChange={(e) => setMentorSearch(e.target.value)}
                placeholder="Search mentors by name, organization, email, mobile..."
                className="input-field"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {MENTOR_FILTERS.map(([key, label, test]) => (
                <button
                  key={key}
                  onClick={() => setMentorFilter(key)}
                  className={`tab-btn ${mentorFilter === key ? 'active' : ''}`}
                  style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                >
                  {label} ({mentors.filter(test).length})
                </button>
              ))}
            </div>
          </div>

          {/* Mentors List */}
          {filteredMentors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <p>No mentors matched the current filter or search query.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMentors.map((mentor) => {
                return (
                  <div
                    key={mentor._id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: !mentor.isApproved
                        ? '1px solid rgba(245, 158, 11, 0.35)'
                        : '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
                      <Avatar user={mentor} size={42} />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                            {mentor.firstname} {mentor.lastname}
                          </h4>
                          <span className="badge badge-amber">Mentor</span>
                          {mentor.isApproved ? (
                            <span
                              className="badge badge-emerald"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ShieldCheck size={11} /> Verified
                            </span>
                          ) : (
                            <span
                              className="badge badge-neutral"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <AlertCircle size={11} /> Unverified
                            </span>
                          )}
                        </div>

                        {mentor.organization && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: 'var(--text-secondary)',
                              fontSize: '0.82rem',
                              marginTop: '3px',
                            }}
                          >
                            <Briefcase size={12} color="#a0896b" />
                            <span>{mentor.organization}</span>
                          </div>
                        )}

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '3px 0 0 0' }}>
                          {mentor.email} {mentor.mobileNumber && `• Mobile: ${mentor.mobileNumber}`}
                        </p>

                        {/* Mentees assigned to this mentor */}
                        <div
                          style={{
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {mentor.mentee && mentor.mentee.length > 0 ? (
                            <>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Allotted Mentees ({mentor.mentee.length}):
                              </span>
                              {mentor.mentee.map((m) => (
                                <span
                                  key={m._id}
                                  className="preference-tag"
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <span
                                    onClick={() => onViewProfile(m)}
                                    style={{ cursor: 'pointer' }}
                                    title="Click to view mentee profile"
                                  >
                                    {m.firstname} {m.lastname}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDirectRemoveAllotment(m._id, mentor._id);
                                    }}
                                    title="Remove/de-allot this mentee from this mentor"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      padding: '0 2px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <X size={11} />
                                  </button>
                                </span>
                              ))}
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              No mentees currently allotted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <UserActions
                      user={mentor}
                      onViewProfile={onViewProfile}
                      onOpenChat={onOpenChat}
                      onToggleApproval={handleToggleApproval}
                      onRejectVerification={handleRejectVerification}
                      onDelete={handleDeleteUser}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mentees tab */}
      {activeTab === 'mentees' && (
        <div>
          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
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
                value={menteeSearch}
                onChange={(e) => setMenteeSearch(e.target.value)}
                placeholder="Search mentees by name, organization, email, mobile..."
                className="input-field"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {MENTEE_FILTERS.map(([key, label, test]) => (
                <button
                  key={key}
                  onClick={() => setMenteeFilter(key)}
                  className={`tab-btn ${menteeFilter === key ? 'active' : ''}`}
                  style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                >
                  {label} ({mentees.filter(test).length})
                </button>
              ))}
            </div>
          </div>

          {/* Mentees List */}
          {filteredMentees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <p>No mentees matched the current filter or search query.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMentees.map((mentee) => {
                return (
                  <div
                    key={mentee._id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: !mentee.isApproved
                        ? '1px solid rgba(245, 158, 11, 0.35)'
                        : '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
                      <Avatar user={mentee} size={42} />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                            {mentee.firstname} {mentee.lastname}
                          </h4>
                          <span className="badge badge-emerald">Mentee</span>
                          {mentee.isApproved ? (
                            <span
                              className="badge badge-emerald"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ShieldCheck size={11} /> Verified
                            </span>
                          ) : (
                            <span
                              className="badge badge-neutral"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <AlertCircle size={11} /> Unverified
                            </span>
                          )}
                        </div>

                        {mentee.organization && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: 'var(--text-secondary)',
                              fontSize: '0.82rem',
                              marginTop: '3px',
                            }}
                          >
                            <GraduationCap size={12} color="#a0896b" />
                            <span>{[mentee.organization, mentee.collegeYear].filter(Boolean).join(' | ')}</span>
                          </div>
                        )}

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '3px 0 0 0' }}>
                          {mentee.email} {mentee.mobileNumber && `• Mobile: ${mentee.mobileNumber}`}
                        </p>

                        {/* Allotted Mentor Info */}
                        <div
                          style={{
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mentorship:</span>
                          {mentee.mentor ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => onViewProfile(mentee.mentor)}
                                className="preference-tag"
                                style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '0.72rem' }}
                                title="Click to view mentor profile"
                              >
                                <span>
                                  Allotted Mentor: {mentee.mentor.firstname} {mentee.mentor.lastname}
                                </span>
                                <Eye size={10} style={{ marginLeft: '4px', opacity: 0.7 }} />
                              </button>
                              <button
                                onClick={() => handleDirectRemoveAllotment(mentee._id, mentee.mentor._id)}
                                className="btn-secondary"
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  color: '#dc2626',
                                  borderColor: 'rgba(239, 68, 68, 0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Remove this mentee allotment"
                              >
                                <UserMinus size={11} />
                                <span>Remove Allotment</span>
                              </button>
                            </div>
                          ) : (
                            <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                              Unallotted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <UserActions
                      user={mentee}
                      onViewProfile={onViewProfile}
                      onOpenChat={onOpenChat}
                      onToggleApproval={handleToggleApproval}
                      onRejectVerification={handleRejectVerification}
                      onDelete={handleDeleteUser}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Alert, Avatar, LoadingBlocks, PageHeader } from './Shared';
import { useToast } from '../utils/toast';
import { fullName, isMenteeProfileComplete, matchesSearch } from '../utils/helpers';
import {
  Send,
  Clock,
  Plus,
  Trash2,
  ShieldCheck,
  Eye,
  Briefcase,
  Search,
  Users,
  Check,
  Phone,
  Mail,
  Sparkles,
  X,
  SlidersHorizontal,
  RotateCcw,
  MessageSquare,
  Camera,
} from 'lucide-react';

// Standard disciplines offered when requesting a general allotment
const STANDARD_DOMAINS = [
  'Software Engineering',
  'Full Stack Web Development',
  'Frontend Development',
  'Backend & Distributed Systems',
  'AI, Machine Learning & Data Science',
  'Cloud, DevOps & Infrastructure',
  'System Design & Architecture',
  'Product Management',
  'Cybersecurity & Network Security',
  'Mobile Application Development',
  'Career Transition & Tech Leadership',
];

// How each request status is shown in "Your requests"
const REQUEST_STATUS = {
  Pending: { label: 'Waiting for admin', badge: 'badge-amber' },
  Approved: { label: 'Approved', badge: 'badge-emerald' },
  Rejected: { label: 'Not approved', badge: 'badge-neutral' },
  Ended: { label: 'Pairing ended', badge: 'badge-neutral' },
};

// Unique, trimmed list of domains from the given base list plus each mentor's domain
const collectDomains = (base, mentors) => {
  const domains = new Set(base);
  mentors.forEach((m) => m.domain?.trim() && domains.add(m.domain.trim()));
  return [...domains];
};

export default function MenteeDashboard({
  currentUser: user,
  activeView: currentView,
  onViewChange: setCurrentView,
  onViewProfile,
  onOpenChat,
  openGeneralModalTrigger,
  onCanRequestChange,
  onOpenEditProfile,
}) {
  const [allottedMentor, setAllottedMentor] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // only for loading failures; actions use notifications
  const showToast = useToast();

  // Search & Filter state for Find a Mentor
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedExperience, setSelectedExperience] = useState('All');
  const [sortBy, setSortBy] = useState('recommended');

  // Preference selection state
  const [selectedMentorIds, setSelectedMentorIds] = useState([]);
  const [submittingPreferences, setSubmittingPreferences] = useState(false);

  // General allotment modal state
  const [showGeneralRequestModal, setShowGeneralRequestModal] = useState(false);
  const [generalDomain, setGeneralDomain] = useState('');
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');
  const [submittingGeneralRequest, setSubmittingGeneralRequest] = useState(false);

  // Open general allotment modal when triggered externally (e.g. from Sidebar)
  useEffect(() => {
    if (openGeneralModalTrigger) {
      setShowGeneralRequestModal(true); // the sidebar only offers this when a request is possible
    }
  }, [openGeneralModalTrigger]);

  // The loading placeholder only shows on the first load; later refreshes keep the page in place
  const loadDashboardData = async () => {
    try {
      const [mentorRes, mentorsListRes, requestsRes] = await Promise.all([
        api.getMyMentor(),
        api.getAllMentors(),
        api.getMyRequests(),
      ]);

      setAllottedMentor(mentorRes.mentor || null);
      setMentors(mentorsListRes.mentors || []);
      setMyRequests(requestsRes.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAddPreference = (mentorId) => {
    if (!selectedMentorIds.includes(mentorId)) {
      setSelectedMentorIds([...selectedMentorIds, mentorId]);
    }
  };

  const handleRemovePreference = (mentorId) => {
    setSelectedMentorIds(selectedMentorIds.filter((id) => id !== mentorId));
  };

  const handleClearPreferences = () => setSelectedMentorIds([]);

  const handleSubmitPreferences = async () => {
    setSubmittingPreferences(true);
    try {
      await api.requestMentor({ preferredMentorIds: selectedMentorIds });
      showToast('Your mentor preferences were sent to the admin.');
      setSelectedMentorIds([]);
      setCurrentView('dashboard');
      loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingPreferences(false);
    }
  };

  const pendingReq = myRequests.find((r) => r.status === 'Pending' && !r.requestedByMentor);
  const hasPendingRequest = Boolean(pendingReq);
  const isPendingGeneral = Boolean(
    pendingReq && (pendingReq.isGeneralAllotment || !pendingReq.preferredMentors?.length)
  );

  // A new request is only possible with no mentor and no pending request; the sidebar uses this
  const canRequestMentor = !allottedMentor && !hasPendingRequest;
  useEffect(() => {
    if (!loading) onCanRequestChange?.(canRequestMentor);
  }, [loading, canRequestMentor]);

  const handleSubmitGeneralRequest = async (e) => {
    e.preventDefault();
    setSubmittingGeneralRequest(true);
    try {
      const res = await api.requestGeneralAllotment({
        guidanceDomain: generalDomain,
        notes: generalNotes,
      });
      showToast(res.message);
      setShowGeneralRequestModal(false);
      setGeneralDomain('');
      setIsCustomDomain(false);
      setGeneralNotes('');
      setCurrentView('dashboard');
      loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingGeneralRequest(false);
    }
  };

  // Domain chips for the search page, and options for the general request form
  const domainsList = useMemo(() => collectDomains(['All'], mentors), [mentors]);
  const allotmentDomainOptions = useMemo(() => collectDomains(STANDARD_DOMAINS, mentors), [mentors]);

  // Mentors matching the search box, domain chip and experience filter, in the chosen order
  const filteredMentors = useMemo(() => {
    const minYears = parseInt(selectedExperience, 10) || 0; // 'All' -> 0, '5+' -> 5
    const years = (m) => Number(m.experienceYears) || 0;

    const list = mentors.filter(
      (m) =>
        matchesSearch(searchQuery, [fullName(m), m.organization, m.email, m.domain, m.bio, ...(m.skills || [])]) &&
        (selectedDomain === 'All' || m.domain === selectedDomain) &&
        years(m) >= minYears
    );

    if (sortBy === 'experience') list.sort((a, b) => years(b) - years(a));
    if (sortBy === 'name') list.sort((a, b) => fullName(a).localeCompare(fullName(b)));
    if (sortBy === 'recommended') list.sort((a, b) => Number(b.isApproved) - Number(a.isApproved)); // verified first
    return list;
  }, [mentors, searchQuery, selectedDomain, selectedExperience, sortBy]);

  const hasActiveFilters =
    searchQuery || selectedDomain !== 'All' || selectedExperience !== 'All' || sortBy !== 'recommended';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDomain('All');
    setSelectedExperience('All');
    setSortBy('recommended');
  };

  if (loading) {
    return <LoadingBlocks />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Alerts ── */}
      <Alert type="error" message={error} style={{ padding: '10px 14px', fontSize: '0.85rem' }} />

      {/* ── View 1: Mentee Dashboard View ── */}
      {currentView === 'dashboard' ? (
        <>
          <PageHeader title={`Welcome back, ${user.firstname}`} />

          {/* Year in college and leveled interests are needed before requesting a mentor */}
          {!isMenteeProfileComplete(user) && (
            <div className="dashboard-notice notice-required">
              <div>
                <strong>Complete your profile to request a mentor</strong>
                <p>Add your current year in college and your areas of interest with your level in each.</p>
              </div>
              <button type="button" className="btn-primary" onClick={onOpenEditProfile}>
                Complete profile
              </button>
            </div>
          )}

          {/* Tip shown until the mentee adds a photo */}
          {!user.avatar && (
            <div className="dashboard-notice notice-tip">
              <Camera size={18} className="notice-icon" />
              <div>
                <strong>Add a profile picture</strong>
                <p>Profiles with a photo are more likely to get a mentor.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={onOpenEditProfile}>
                Add photo
              </button>
            </div>
          )}

          {/* Overview: current mentor (or request status) next to the request history */}
          <div className="mentee-overview">
            <section className="glass-card mentor-card">
              <h2 className="section-heading">Your mentor</h2>

              {allottedMentor ? (
                <>
                  <div className="mentor-card-person">
                    <Avatar user={allottedMentor} size={52} />
                    <div style={{ minWidth: 0 }}>
                      <div className="mentor-card-name">{fullName(allottedMentor)}</div>
                      {(allottedMentor.organization || allottedMentor.domain) && (
                        <div className="mentor-card-org">
                          {[allottedMentor.organization, allottedMentor.domain].filter(Boolean).join(' | ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {allottedMentor.bio && <p className="mentor-card-bio">{allottedMentor.bio}</p>}

                  <dl className="mentor-card-contact">
                    <div>
                      <dt>
                        <Phone size={14} /> Phone
                      </dt>
                      <dd>{allottedMentor.mobileNumber || 'Not shared'}</dd>
                    </div>
                    <div>
                      <dt>
                        <Mail size={14} /> Email
                      </dt>
                      <dd>{allottedMentor.email}</dd>
                    </div>
                  </dl>

                  <div className="mentor-card-actions">
                    {onOpenChat && (
                      <button onClick={() => onOpenChat(allottedMentor)} className="btn-primary">
                        <MessageSquare size={14} />
                        <span>Message</span>
                      </button>
                    )}
                    <button onClick={() => onViewProfile(allottedMentor)} className="btn-secondary">
                      <Eye size={14} />
                      <span>View profile</span>
                    </button>
                  </div>
                </>
              ) : hasPendingRequest ? (
                <>
                  <p className="mentor-card-status">Your request is with the admin</p>
                  <p className="mentor-card-text">
                    {isPendingGeneral
                      ? 'The admin will pick a verified mentor who fits your field and goals.'
                      : 'The admin is reviewing your mentor preferences. Your mentor will appear here once the pair is approved.'}
                  </p>
                  {isPendingGeneral && pendingReq.guidanceDomain && (
                    <p className="mentor-card-text">
                      <strong>Field:</strong> {pendingReq.guidanceDomain}
                    </p>
                  )}
                  {isPendingGeneral && pendingReq.notes && (
                    <p className="mentor-card-text">
                      <strong>Your note:</strong> {pendingReq.notes}
                    </p>
                  )}
                  <p className="mentor-card-meta">
                    <Clock size={13} /> Submitted on {new Date(pendingReq.createdAt).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="mentor-card-status">You don't have a mentor yet</p>
                  <p className="mentor-card-text">
                    Pick the mentors you would like to work with, or ask the admin to choose one for you.
                  </p>
                  <div className="mentor-card-actions">
                    <button onClick={() => setCurrentView('find-mentor')} className="btn-primary">
                      <SlidersHorizontal size={14} />
                      <span>Choose mentors</span>
                    </button>
                    <button onClick={() => setShowGeneralRequestModal(true)} className="btn-secondary">
                      <Sparkles size={14} />
                      <span>Let the admin choose</span>
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* Every request this mentee has made, newest first */}
            {myRequests.length > 0 && (
              <section className="glass-card" style={{ padding: '20px' }}>
                <h2 className="section-heading" style={{ marginBottom: '12px' }}>
                  Your requests
                </h2>
                <ul className="request-history">
                  {myRequests.map((req) => {
                    // An approved match whose mentor is no longer this mentee's mentor has ended
                    const ended =
                      req.status === 'Approved' &&
                      req.allottedMentor &&
                      String(req.allottedMentor._id) !== String(allottedMentor?._id);
                    const status = REQUEST_STATUS[ended ? 'Ended' : req.status];
                    return (
                      <li key={req._id}>
                        <div>
                          <div className="request-history-title">
                            {req.isGeneralAllotment || !req.preferredMentors?.length
                              ? `General request${req.guidanceDomain ? ` (${req.guidanceDomain})` : ''}`
                              : `Preferred: ${req.preferredMentors.map(fullName).join(', ')}`}
                          </div>
                          <div className="request-history-meta">
                            Sent on {new Date(req.createdAt).toLocaleDateString()}
                            {req.status === 'Approved' &&
                              req.allottedMentor &&
                              ` | ${ended ? 'Was matched with' : 'Matched with'} ${fullName(req.allottedMentor)}`}
                          </div>
                        </div>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          {/* Mentors picked on the search page but not sent yet */}
          {!allottedMentor && selectedMentorIds.length > 0 && (
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}
              >
                <h4
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={16} color="var(--primary)" />
                  <span>Selected Preferences ({selectedMentorIds.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleClearPreferences}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 10px',
                    color: 'var(--text-main)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  Clear All
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                {selectedMentorIds.map((id, index) => {
                  const m = mentors.find((item) => item._id === id);
                  return (
                    <div
                      key={id}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        #{index + 1} {m ? fullName(m) : 'Mentor'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreference(id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '3px',
                        }}
                        title="Remove preference"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSubmitPreferences}
                disabled={submittingPreferences}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={13} />
                <span>{submittingPreferences ? 'Submitting...' : 'Submit Preferences to Administrator'}</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* ── View 2: Find a mentor ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PageHeader
            title="Find a mentor"
            subtitle={
              canRequestMentor
                ? `${filteredMentors.length} ${filteredMentors.length === 1 ? 'mentor' : 'mentors'}. Select the ones you would like, in order of preference.`
                : `${filteredMentors.length} ${filteredMentors.length === 1 ? 'mentor' : 'mentors'}`
            }
          />

          {/* Search and filters */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            {/* Main Search Input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--primary)',
                }}
              />
              <input
                type="text"
                placeholder="Search mentors by name, company, domain, or skills (e.g. System Design, React, AWS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: '36px',
                  paddingRight: searchQuery ? '36px' : '12px',
                  fontSize: '0.9rem',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Domain Filter Chips (ADPList style) */}
            {domainsList.length > 1 && (
              <div style={{ marginBottom: '14px' }}>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Domain
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {domainsList.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDomain(d)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: selectedDomain === d ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: selectedDomain === d ? 'var(--primary-light)' : 'var(--bg-surface)',
                        color: selectedDomain === d ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: selectedDomain === d ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Controls: Experience, Sort, & Reset */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SlidersHorizontal size={13} color="var(--primary)" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Experience:
                  </span>
                  <select
                    value={selectedExperience}
                    onChange={(e) => setSelectedExperience(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: 'var(--radius-sm)', width: 'auto' }}
                  >
                    <option value="All">All Levels</option>
                    <option value="3+">3+ Years</option>
                    <option value="5+">5+ Years</option>
                    <option value="8+">8+ Years</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: 'var(--radius-sm)', width: 'auto' }}
                  >
                    <option value="recommended">Recommended</option>
                    <option value="experience">Experience (High to Low)</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Mentor cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {filteredMentors.length === 0 ? (
              <div
                className="glass-card"
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '50px 20px',
                  color: 'var(--text-muted)',
                }}
              >
                <Users size={32} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '10px' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  No Mentors Matched Your Search
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Try broadening your search query or resetting active filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredMentors.map((m) => {
                const isSelected = selectedMentorIds.includes(m._id);
                const rank = selectedMentorIds.indexOf(m._id) + 1;

                return (
                  <div
                    key={m._id}
                    className="glass-card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-glass)',
                      boxShadow: isSelected ? '0 0 0 1px var(--primary)' : 'none',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div>
                      {/* Top Header: Avatar + Name + Organization */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Avatar user={m} size={42} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '4px',
                            }}
                          >
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '0.96rem',
                                fontWeight: 700,
                                color: 'var(--text-main)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {m.firstname} {m.lastname}
                            </h4>
                            {m.isApproved && (
                              <span
                                className="badge badge-emerald"
                                style={{ padding: '1px 6px', fontSize: '0.65rem', flexShrink: 0 }}
                              >
                                <ShieldCheck size={10} /> Verified
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px',
                              color: 'var(--primary)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            {m.organization && <Briefcase size={11} />}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.organization}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Domain and Experience Badges */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                          marginTop: '10px',
                        }}
                      >
                        {m.domain && (
                          <span className="badge badge-primary" style={{ padding: '2px 7px', fontSize: '0.7rem' }}>
                            {m.domain}
                          </span>
                        )}
                        {m.experienceYears > 0 && (
                          <span className="badge badge-neutral" style={{ padding: '2px 7px', fontSize: '0.7rem' }}>
                            {m.experienceYears} yrs experience
                          </span>
                        )}
                      </div>

                      {/* Bio snippet */}
                      {m.bio && (
                        <p
                          style={{
                            margin: '8px 0 0 0',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.45,
                          }}
                        >
                          {m.bio}
                        </p>
                      )}

                      {/* Skills Tags */}
                      {Array.isArray(m.skills) && m.skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                          {m.skills.slice(0, 3).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.7rem',
                                fontWeight: 500,
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                          {m.skills.length > 3 && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              +{m.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onViewProfile(m)}
                        className="btn-secondary"
                        style={{
                          flex: 1,
                          fontSize: '0.76rem',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={12} />
                        <span>View Profile</span>
                      </button>

                      {!allottedMentor &&
                        !hasPendingRequest &&
                        (isSelected ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePreference(m._id)}
                            className="btn-secondary"
                            style={{
                              flex: 1.2,
                              fontSize: '0.75rem',
                              padding: '6px 10px',
                              background: 'var(--primary-light)',
                              borderColor: 'var(--primary)',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                            title="Click to remove from selected preferences"
                          >
                            <Check size={12} />
                            <span>Choice #{rank}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddPreference(m._id)}
                            className="btn-primary"
                            style={{
                              flex: 1.2,
                              fontSize: '0.75rem',
                              padding: '6px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus size={12} />
                            <span>Select</span>
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Alternative to picking mentors: let the admin choose */}
          {canRequestMentor && (
            <div className="find-alt-prompt">
              <span>Not sure who to pick? The admin can choose a mentor for you.</span>
              <button type="button" onClick={() => setShowGeneralRequestModal(true)} className="btn-secondary">
                Let the admin choose
              </button>
            </div>
          )}

          {/* Sticky Floating Bottom Bar for Submitting Preferences */}
          {!allottedMentor && !hasPendingRequest && selectedMentorIds.length > 0 && (
            <div
              className="glass-card"
              style={{
                position: 'sticky',
                bottom: '16px',
                zIndex: 100,
                padding: '14px 20px',
                background: 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid var(--primary)',
                boxShadow: 'var(--shadow-lift)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'var(--primary-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  {selectedMentorIds.length}
                </div>
                <div>
                  <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedMentorIds.length} Preferred Mentor{selectedMentorIds.length > 1 ? 's' : ''} Selected
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ready to submit to the Administrator for matching
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleClearPreferences}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '7px 14px',
                    color: 'var(--text-main)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={handleSubmitPreferences}
                  disabled={submittingPreferences}
                  className="btn-primary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '7px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={13} />
                  <span>{submittingPreferences ? 'Submitting...' : 'Submit Preferences to Admin'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* General Mentor Allotment Request Modal */}
      {showGeneralRequestModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingGeneralRequest) {
              setShowGeneralRequestModal(false);
            }
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
            zIndex: 2000,
            padding: '20px',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => !submittingGeneralRequest && setShowGeneralRequestModal(false)}
              className="btn-secondary"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '6px',
                borderRadius: '50%',
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 700, paddingRight: '40px' }}>
              Ask the admin to pick a mentor
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              Instead of choosing mentors yourself, the admin will match you with a verified mentor.
            </p>

            <form
              onSubmit={handleSubmitGeneralRequest}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  Field (optional)
                </label>
                <select
                  value={isCustomDomain ? '__custom__' : generalDomain}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      setIsCustomDomain(true);
                      setGeneralDomain('');
                    } else {
                      setIsCustomDomain(false);
                      setGeneralDomain(val);
                    }
                  }}
                  className="input-field"
                  style={{
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                  }}
                >
                  <option value="">Any field</option>
                  {allotmentDomainOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="__custom__">Other (type your own)</option>
                </select>

                {isCustomDomain && (
                  <input
                    type="text"
                    value={generalDomain}
                    onChange={(e) => setGeneralDomain(e.target.value)}
                    placeholder="Your field"
                    className="input-field"
                    style={{ marginTop: '8px', fontSize: '0.86rem' }}
                    autoFocus
                  />
                )}

                <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Helps the admin find a mentor in your field.
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  What do you want help with? (optional)
                </label>
                <textarea
                  rows={3}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="For example: system design, resume feedback, moving into cloud engineering"
                  className="input-field"
                  style={{ resize: 'vertical', fontSize: '0.86rem' }}
                />
              </div>

              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span>Mentors and admins can see your phone number.</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowGeneralRequestModal(false)}
                  disabled={submittingGeneralRequest}
                  className="btn-secondary"
                  style={{ fontSize: '0.84rem', padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGeneralRequest}
                  className="btn-primary"
                  style={{
                    fontSize: '0.84rem',
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={13} />
                  <span>{submittingGeneralRequest ? 'Sending...' : 'Send request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

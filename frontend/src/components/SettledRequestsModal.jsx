import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LoadingBlocks } from './Shared';
import { fullName, isAutoNote, matchesSearch, useEscapeKey } from '../utils/helpers';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Briefcase,
  GraduationCap,
  Eye,
  FileCheck,
  RefreshCw,
  UserCheck,
  UserMinus,
  Sparkles,
} from 'lucide-react';

export default function SettledRequestsModal({ onClose, onViewProfile }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Approved' | 'Rejected'
  const [refreshing, setRefreshing] = useState(false);

  const fetchSettledRequests = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getRequests();
      // Keep only settled requests (Approved or Rejected)
      setRequests((res.requests || []).filter((r) => r.status !== 'Pending'));
    } catch (err) {
      console.error('Error fetching settled requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettledRequests();
  }, []);

  useEscapeKey(onClose);

  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  const filteredRequests = requests.filter(
    (req) =>
      (statusFilter === 'ALL' || req.status === statusFilter) &&
      matchesSearch(search, [
        fullName(req.mentee),
        req.mentee?.email,
        req.mentee?.organization,
        fullName(req.allottedMentor),
        req.allottedMentor?.email,
        fullName(req.requestedByMentor),
      ])
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
          maxWidth: '900px',
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
          title="Close"
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
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <FileCheck size={24} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '1.4rem',
                    color: 'var(--text-main)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>Settled requests</span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.8rem' }}>
                    {requests.length} total
                  </span>
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Past decisions on allotment and removal requests.
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchSettledRequests(true)}
              className="btn-secondary"
              title="Refresh requests"
              disabled={refreshing}
              style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              <span className="hide-on-mobile">Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Pills and Search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`btn-secondary ${statusFilter === 'ALL' ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                borderColor: statusFilter === 'ALL' ? 'var(--primary)' : 'var(--border-glass)',
                background: statusFilter === 'ALL' ? 'rgba(245, 158, 11, 0.15)' : undefined,
                color: statusFilter === 'ALL' ? '#d4a017' : 'var(--text-secondary)',
              }}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setStatusFilter('Approved')}
              className={`btn-secondary ${statusFilter === 'Approved' ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                borderColor: statusFilter === 'Approved' ? '#10b981' : 'var(--border-glass)',
                background: statusFilter === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : undefined,
                color: statusFilter === 'Approved' ? '#059669' : 'var(--text-secondary)',
              }}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('Rejected')}
              className={`btn-secondary ${statusFilter === 'Rejected' ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                borderColor: statusFilter === 'Rejected' ? '#dc2626' : 'var(--border-glass)',
                background: statusFilter === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : undefined,
                color: statusFilter === 'Rejected' ? '#dc2626' : 'var(--text-secondary)',
              }}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={15}
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
              placeholder="Search by mentee or mentor name/email..."
              className="input-field"
              style={{ paddingLeft: '34px', fontSize: '0.84rem' }}
            />
          </div>
        </div>

        {/* Body content */}
        {loading ? (
          <LoadingBlocks />
        ) : filteredRequests.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-glass)',
            }}
          >
            <CheckCircle2 size={36} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '10px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 4px 0', fontWeight: 500 }}>
              {search.trim() || statusFilter !== 'ALL'
                ? 'No settled requests match your filters.'
                : 'No settled allotment requests yet.'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              When allotment requests are approved or rejected, they will be archived here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredRequests.map((req) => {
              const isApproved = req.status === 'Approved';

              return (
                <div
                  key={req._id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: isApproved ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Card Header: Mentee Info & Status Badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          {req.mentee ? `${req.mentee.firstname} ${req.mentee.lastname}` : 'Mentee Account Removed'}
                        </h4>
                        {onViewProfile && req.mentee && (
                          <button
                            onClick={() => onViewProfile(req.mentee)}
                            className="btn-secondary"
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="View Mentee Profile"
                          >
                            <Eye size={12} /> View profile
                          </button>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '3px 0 0 0' }}>
                        {req.mentee?.email} {req.mentee?.mobileNumber && `• ${req.mentee?.mobileNumber}`}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {req.requestType === 'Removal' ? (
                        <span
                          className="badge badge-coral"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        >
                          <UserMinus size={11} /> Removal request
                        </span>
                      ) : req.requestedByRole === 'Mentor' || req.requestedByMentor ? (
                        <span
                          className="badge badge-amber"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        >
                          <Briefcase size={11} /> Mentor offer
                        </span>
                      ) : req.isGeneralAllotment || !req.preferredMentors || req.preferredMentors.length === 0 ? (
                        <span
                          className="badge badge-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        >
                          <Sparkles size={11} /> General request
                        </span>
                      ) : (
                        <span
                          className="badge badge-neutral"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        >
                          <GraduationCap size={11} /> Mentee preferences
                        </span>
                      )}

                      <span
                        className={`badge ${isApproved ? 'badge-emerald' : 'badge-coral'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          padding: '3px 10px',
                        }}
                      >
                        {isApproved ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Removal Request Detail */}
                  {req.requestType === 'Removal' && (
                    <div
                      style={{
                        background: isApproved ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: isApproved ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-glass)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <strong>{fullName(req.requestedByMentor) || 'A mentor'}</strong> asked to stop mentoring{' '}
                        <strong>{fullName(req.mentee)}</strong>.{' '}
                        {isApproved ? 'The pairing was ended.' : 'They are still paired.'}
                      </p>
                    </div>
                  )}

                  {/* Allotted Mentor Detail (if approved and allotment request) */}
                  {req.requestType !== 'Removal' && isApproved && req.allottedMentor && (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={16} color="#059669" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Matched with{' '}
                          <strong style={{ color: '#059669' }}>
                            {req.allottedMentor.firstname} {req.allottedMentor.lastname}
                          </strong>{' '}
                          ({req.allottedMentor.email})
                          {req.allottedMentor.organization && ` • ${req.allottedMentor.organization}`}
                        </span>
                      </div>

                      {onViewProfile && (
                        <button
                          onClick={() => onViewProfile(req.allottedMentor)}
                          className="btn-secondary"
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.74rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={12} /> View profile
                        </button>
                      )}
                    </div>
                  )}

                  {/* Notes / Context if present */}
                  {req.notes && !isAutoNote(req) && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-surface)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <strong>Note:</strong> {req.notes}
                    </div>
                  )}

                  {/* Request Preferences Context if applicable */}
                  {req.preferredMentors?.length > 0 && !req.requestedByMentor && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        fontSize: '0.78rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>Preferences:</span>
                      {req.preferredMentors.map((m, idx) => (
                        <span
                          key={m._id}
                          className="preference-tag"
                          style={{ padding: '2px 8px', fontSize: '0.74rem', cursor: 'pointer' }}
                          onClick={() => onViewProfile && onViewProfile(m)}
                          title="Click to view profile"
                        >
                          <span className="preference-rank">#{idx + 1}</span>
                          <span>
                            {m.firstname} {m.lastname}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Footer: Timestamps */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>
                        Settled on{' '}
                        {new Date(req.resolvedAt || req.updatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {req.resolvedBy && (
                      <span>
                        Decided by {req.resolvedBy.firstname || 'Admin'} {req.resolvedBy.lastname || ''}
                      </span>
                    )}
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

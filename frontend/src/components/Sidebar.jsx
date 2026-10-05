import React from 'react';
import AnugrahLogo from './AnugrahLogo';
import { RoleBadge, roleGradient } from './Shared';
import { fullName, getInitials } from '../utils/helpers';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  User,
  Edit3,
  Users,
  Search,
  Sparkles,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  UserPlus,
  AlertCircle,
  X,
} from 'lucide-react';

export default function Sidebar({
  user,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  onOpenMyProfile,
  onOpenEditProfile,
  onOpenOtherMentors,
  onOpenSettledRequests,
  onGoHome,
  activeMenteeView = 'dashboard',
  onSelectMenteeView,
  theme = 'light',
  onToggleTheme,
  onOpenGeneralRequest,
  mentorPending = [],
  onRequestVerification,
}) {
  if (!user) return null;

  // Run a nav action, then close the mobile menu
  const handleNavClick = (action) => {
    action?.();
    if (isMobileOpen) onCloseMobile?.();
  };

  const isDashboardActive = user.role !== 'Mentee' || activeMenteeView === 'dashboard';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && <div onClick={onCloseMobile} className="sidebar-mobile-backdrop" aria-hidden="true" />}

      {/* Main Retractable Sidebar */}
      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Sidebar navigation"
      >
        {/* ── Top Header / Brand Section ── */}
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => handleNavClick(onGoHome)}
            style={{ cursor: onGoHome ? 'pointer' : 'default' }}
            title="Anugrah Platform Home"
          >
            <div className="sidebar-brand-icon">
              <AnugrahLogo size={24} />
            </div>
            {!isCollapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-title">ANUGRAH</span>
                <span className="sidebar-brand-subtitle">Mentorship</span>
              </div>
            )}
          </div>

          {/* Toggle / Retract Button (Desktop) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="sidebar-toggle-btn desktop-only"
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Close Button (Mobile Only) */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="sidebar-toggle-btn mobile-only"
            title="Close menu"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── User Profile Card (Moved from Navbar) ── */}
        <div className="sidebar-profile-section">
          <div
            className="sidebar-profile-card"
            onClick={() => handleNavClick(onOpenMyProfile)}
            title="Click to view & edit your profile"
          >
            <div className="sidebar-avatar-wrap">
              {user.avatar ? (
                <img src={user.avatar} alt={fullName(user)} className="sidebar-avatar-img" />
              ) : (
                <div className="sidebar-avatar-fallback" style={{ background: roleGradient(user.role) }}>
                  {getInitials(user)}
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="sidebar-profile-meta">
                <div className="sidebar-profile-name" title={fullName(user)}>
                  {fullName(user)}
                </div>
                <div className="sidebar-profile-badges">
                  <RoleBadge role={user.role} style={{ fontSize: '0.68rem', padding: '1px 6px' }} />
                  {user.isApproved ? (
                    <span className="sidebar-verify-chip verified">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  ) : user.verificationRequested ? (
                    <span className="sidebar-verify-chip pending">
                      <Clock size={10} /> Pending
                    </span>
                  ) : (
                    <span className="sidebar-verify-chip unverified">
                      <AlertCircle size={10} /> Verify
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable Nav Links Area ── */}
        <div className="sidebar-nav-scroll">
          {/* Main Navigation Group */}
          <div className="sidebar-group">
            {/* Dashboard / Home */}
            <button
              type="button"
              onClick={() => handleNavClick(onGoHome)}
              className={`sidebar-nav-item ${isDashboardActive ? 'active' : ''}`}
              title="Dashboard"
            >
              <span className="sidebar-nav-icon">
                <LayoutDashboard size={18} />
              </span>
              {!isCollapsed && <span className="sidebar-nav-label">Dashboard</span>}
            </button>

            {/* View Profile */}
            <button
              type="button"
              onClick={() => handleNavClick(onOpenMyProfile)}
              className="sidebar-nav-item"
              title="My profile"
            >
              <span className="sidebar-nav-icon">
                <User size={18} />
              </span>
              {!isCollapsed && <span className="sidebar-nav-label">My Profile</span>}
            </button>

            {/* Edit Profile */}
            <button
              type="button"
              onClick={() => handleNavClick(onOpenEditProfile)}
              className="sidebar-nav-item"
              title="Edit profile"
            >
              <span className="sidebar-nav-icon">
                <Edit3 size={18} />
              </span>
              {!isCollapsed && <span className="sidebar-nav-label">Edit Profile</span>}
            </button>
          </div>

          {/* ── Role-Specific Actions ── */}
          <div className="sidebar-group">
            {/* Mentee Actions */}
            {user.role === 'Mentee' && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick(() => onSelectMenteeView('find-mentor'))}
                  className={`sidebar-nav-item ${activeMenteeView === 'find-mentor' ? 'active' : ''}`}
                  title="Browse & Search Verified Mentors"
                >
                  <span className="sidebar-nav-icon">
                    <Search size={18} color="var(--primary)" />
                  </span>
                  {!isCollapsed && <span className="sidebar-nav-label">Browse Mentors</span>}
                </button>

                {onOpenGeneralRequest && (
                  <button
                    type="button"
                    onClick={() => handleNavClick(onOpenGeneralRequest)}
                    className="sidebar-nav-item"
                    title="Request General Mentor Allotment"
                  >
                    <span className="sidebar-nav-icon">
                      <Sparkles size={18} color="#d4a017" />
                    </span>
                    {!isCollapsed && <span className="sidebar-nav-label">General Allotment</span>}
                  </button>
                )}
              </>
            )}

            {/* Mentor Actions */}
            {user.role === 'Mentor' && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick(onOpenOtherMentors)}
                  className="sidebar-nav-item"
                  title="Explore and Message Other Mentors"
                >
                  <span className="sidebar-nav-icon">
                    <Users size={18} color="#d4a017" />
                  </span>
                  {!isCollapsed && <span className="sidebar-nav-label">Other Mentors</span>}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleNavClick(() =>
                      document.getElementById('candidate-pool-section')?.scrollIntoView({ behavior: 'smooth' })
                    )
                  }
                  className="sidebar-nav-item"
                  title="Review Unallotted Candidate Pool"
                >
                  <span className="sidebar-nav-icon">
                    <UserPlus size={18} color="var(--accent-emerald)" />
                  </span>
                  {!isCollapsed && <span className="sidebar-nav-label">Candidate Pool</span>}
                </button>

                {/* Requests this mentor sent that the admin hasn't decided yet */}
                {mentorPending.length > 0 &&
                  (isCollapsed ? (
                    <div
                      className="sidebar-nav-item sidebar-pending-collapsed"
                      title={`Waiting for the admin: ${mentorPending.length}`}
                    >
                      <span className="sidebar-nav-icon">
                        <Clock size={18} color="var(--primary)" />
                        <span className="sidebar-pending-count">{mentorPending.length}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="sidebar-pending">
                      <div className="sidebar-pending-title">
                        <Clock size={14} /> Waiting for the admin ({mentorPending.length})
                      </div>
                      <ul>
                        {mentorPending.map((item) => (
                          <li key={item.id}>
                            <span>{item.label}</span>
                            <strong>{item.name}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </>
            )}

            {/* Admin Actions */}
            {user.role === 'Admin' && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick(onOpenSettledRequests)}
                  className="sidebar-nav-item"
                  title="Settled requests"
                >
                  <span className="sidebar-nav-icon">
                    <CheckCircle2 size={18} color="#059669" />
                  </span>
                  {!isCollapsed && <span className="sidebar-nav-label">Settled Requests</span>}
                </button>
              </>
            )}
          </div>

          {/* Account Verification Prompt (if not verified) */}
          {!user.isApproved && (
            <div className="sidebar-group">
              {!isCollapsed && !user.verificationRequested ? (
                // Not verified and no request waiting (e.g. the admin rejected it): let the user ask again
                <div className="sidebar-verification-card" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <AlertCircle size={15} color="var(--accent-coral)" />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>Not verified</span>
                  </div>
                  <p
                    style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}
                  >
                    Your last request wasn't approved. Update your profile, then ask again.
                  </p>
                  <button
                    type="button"
                    className="act act-verify"
                    style={{ width: '100%' }}
                    onClick={() => handleNavClick(onRequestVerification)}
                  >
                    Ask for verification
                  </button>
                </div>
              ) : !isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick(onOpenEditProfile)}
                  className="sidebar-verification-card"
                  title="Edit your profile"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <AlertCircle size={15} color="#d4a017" />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      Waiting for verification
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    An admin will review your account. Completing your profile helps.
                  </p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick(onOpenEditProfile)}
                  className="sidebar-nav-item"
                  title="Waiting for verification. Click to edit your profile."
                >
                  <span className="sidebar-nav-icon">
                    <AlertCircle size={18} color="#d4a017" />
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Section: Theme & Logout (Moved from Navbar) ── */}
        <div className="sidebar-footer">
          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="sidebar-footer-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="sidebar-nav-icon">
                {theme === 'dark' ? (
                  <Sun size={17} color="#f59e0b" />
                ) : (
                  <Moon size={17} color="var(--text-secondary)" />
                )}
              </span>
              {!isCollapsed && <span className="sidebar-nav-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
            </button>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="sidebar-footer-btn logout-btn"
            title="Sign Out from Anugrah"
          >
            <span className="sidebar-nav-icon">
              <LogOut size={17} />
            </span>
            {!isCollapsed && <span className="sidebar-nav-label">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

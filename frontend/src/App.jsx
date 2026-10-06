import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AnugrahLogo from './components/AnugrahLogo';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import MenteeDashboard from './components/MenteeDashboard';
import MentorDashboard from './components/MentorDashboard';
import AdminDashboard from './components/AdminDashboard';
import UserProfileModal from './components/UserProfileModal';
import ProfileEditModal from './components/ProfileEditModal';
import OtherMentorsModal from './components/OtherMentorsModal';
import SettledRequestsModal from './components/SettledRequestsModal';
import ChatModal from './components/ChatModal';
import { api } from './services/api';
import { STORAGE_KEYS, storage } from './utils/helpers';
import { useToast } from './utils/toast';
import { ArrowLeft, Menu } from 'lucide-react';

const EMPTY_STATS = { approvedMentors: 0, activeMentees: 0, allottedMatches: 0, organizationsCount: 0 };

// Read the user saved by the last session, if any
const loadSavedUser = () => {
  try {
    const saved = storage.get(STORAGE_KEYS.user);
    return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(loadSavedUser);
  const showToast = useToast();
  // Saved choice first, otherwise follow the operating system setting
  const [theme, setTheme] = useState(
    () =>
      storage.get(STORAGE_KEYS.theme) ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  const [liveStats, setLiveStats] = useState(null); // null while loading

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [authModalRole, setAuthModalRole] = useState('Mentee');

  // Apply the theme to <html data-theme> and remember it
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    storage.set(STORAGE_KEYS.theme, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Modal states
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [otherMentorsModalOpen, setOtherMentorsModalOpen] = useState(false);
  const [settledRequestsModalOpen, setSettledRequestsModalOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState(null);
  const [menteeView, setMenteeView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState('requests');

  // In-app "pages" (mentee view, admin tab) are saved in the browser history,
  // so the back arrow and the browser's own back button both return to the previous view.
  const [historyDepth, setHistoryDepth] = useState(0);

  const navigate = (next) => {
    const view = { menteeView, adminTab, ...next };
    if (view.menteeView === menteeView && view.adminTab === adminTab) return;
    setMenteeView(view.menteeView);
    setAdminTab(view.adminTab);
    window.history.pushState({ anugrahView: view, depth: historyDepth + 1 }, '');
    setHistoryDepth(historyDepth + 1);
  };
  const goToMenteeView = (view) => navigate({ menteeView: view });
  const goToAdminTab = (tab) => navigate({ adminTab: tab });
  const goBack = () => window.history.back();

  useEffect(() => {
    window.history.replaceState({ anugrahView: { menteeView: 'dashboard', adminTab: 'requests' }, depth: 0 }, '');
    const handlePopState = (e) => {
      const saved = e.state?.anugrahView;
      if (!saved) return;
      setMenteeView(saved.menteeView);
      setAdminTab(saved.adminTab);
      setHistoryDepth(e.state.depth);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [generalModalTrigger, setGeneralModalTrigger] = useState(0);
  const [menteeCanRequest, setMenteeCanRequest] = useState(false); // set by MenteeDashboard
  const [mentorPending, setMentorPending] = useState([]); // set by MentorDashboard, shown in the sidebar

  // Sidebar collapsed state is remembered across sessions
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => storage.get(STORAGE_KEYS.sidebarCollapsed) === 'true');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      storage.set(STORAGE_KEYS.sidebarCollapsed, String(!prev));
      return !prev;
    });
  };

  // Ctrl+B / Cmd+B toggles the sidebar
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Save the logged-in user in state and localStorage
  const saveUser = (user) => {
    setCurrentUser(user);
    storage.set(STORAGE_KEYS.user, JSON.stringify(user));
  };

  // On load: refresh the session and fetch landing-page stats
  useEffect(() => {
    api
      .getMe()
      .then((res) => res.user && saveUser(res.user))
      .catch(() => {
        setCurrentUser(null);
        storage.remove(STORAGE_KEYS.user);
      });

    api
      .getPublicStats()
      .then((res) => setLiveStats({ ...EMPTY_STATS, ...res.stats }))
      .catch((err) => {
        console.warn('Could not load public stats:', err);
        setLiveStats(EMPTY_STATS);
      });
  }, []);

  const openAuth = (tab = 'login', role = 'Mentee') => {
    setAuthModalTab(tab);
    setAuthModalRole(role);
    setAuthModalOpen(true);
  };

  const handleLoginSuccess = (user) => {
    saveUser(user);
    setAuthModalOpen(false);
  };

  // Clear the session locally (the server has already cleared its cookie)
  const clearSession = () => {
    setCurrentUser(null);
    storage.remove(STORAGE_KEYS.user, STORAGE_KEYS.token);
    setAuthModalOpen(false);
  };

  // A user whose verification was rejected asks the admin again
  const handleRequestVerification = async () => {
    try {
      const res = await api.requestVerification();
      if (res.user) saveUser(res.user);
      showToast('Verification requested. An admin will review your account.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAccountDeleted = () => {
    setEditProfileModalOpen(false);
    clearSession();
    showToast('Your account has been deleted.');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearSession();
  };

  // Show the profile right away, then replace it with the full version from the server
  const handleViewProfile = (targetUser) => {
    if (!targetUser) return;
    setSelectedProfileUser(targetUser);
    setProfileModalOpen(true);

    if (targetUser._id) {
      api
        .getUserProfile(targetUser._id)
        .then((res) => res.user && setSelectedProfileUser(res.user))
        .catch((err) => console.warn('Could not load profile:', err));
    }
  };

  const handleOpenMyProfile = () => {
    if (!currentUser) return;
    setSelectedProfileUser(currentUser);
    setProfileModalOpen(true);
  };

  const handleOpenEditProfile = () => setEditProfileModalOpen(true);

  const handleOpenChat = (targetUser) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    setChatTargetUser(targetUser);
  };

  const handleProfileUpdated = (updatedUser) => {
    saveUser(updatedUser);
    setSelectedProfileUser(updatedUser);
  };

  const handleToggleApprovalFromModal = async (userId, currentStatus) => {
    try {
      const res = await api.toggleApproval(userId, !currentStatus);
      if (res.user) setSelectedProfileUser(res.user);
    } catch (err) {
      console.error('Approval toggle error:', err);
    }
  };

  return (
    <div className={currentUser ? 'app-authenticated-root' : 'landing-root'}>
      {currentUser ? (
        <div className="app-shell">
          {/* Retractable Sidebar with profile, logout, and essential buttons */}
          <Sidebar
            user={currentUser}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            isMobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onLogout={handleLogout}
            onOpenMyProfile={handleOpenMyProfile}
            onOpenEditProfile={handleOpenEditProfile}
            onOpenOtherMentors={() => setOtherMentorsModalOpen(true)}
            onOpenSettledRequests={() => setSettledRequestsModalOpen(true)}
            mentorPending={mentorPending}
            onRequestVerification={handleRequestVerification}
            onOpenGeneralRequest={
              menteeCanRequest
                ? () => {
                    goToMenteeView('dashboard');
                    setGeneralModalTrigger((prev) => prev + 1);
                  }
                : undefined
            }
            onGoHome={() => {
              if (currentUser.role === 'Mentee') goToMenteeView('dashboard');
              if (currentUser.role === 'Admin') goToAdminTab('requests');
            }}
            activeMenteeView={menteeView}
            onSelectMenteeView={goToMenteeView}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          {/* Main workspace */}
          <div className="app-main-content">
            {/* Phone-only top bar: the sidebar is hidden off-screen until opened */}
            <header className="mobile-topbar">
              <div className="mobile-topbar-brand">
                <AnugrahLogo size={22} />
                <span>ANUGRAH</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="mobile-topbar-menu"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            </header>

            <main className="app-page">
              {historyDepth > 0 && (
                <button type="button" className="back-button" onClick={goBack} aria-label="Go back" title="Go back">
                  <ArrowLeft size={18} />
                </button>
              )}
              {currentUser.role === 'Mentee' && (
                <MenteeDashboard
                  currentUser={currentUser}
                  activeView={menteeView}
                  onViewChange={goToMenteeView}
                  onViewProfile={handleViewProfile}
                  onOpenChat={handleOpenChat}
                  openGeneralModalTrigger={generalModalTrigger}
                  onCanRequestChange={setMenteeCanRequest}
                  onOpenEditProfile={handleOpenEditProfile}
                />
              )}
              {currentUser.role === 'Mentor' && (
                <MentorDashboard
                  currentUser={currentUser}
                  onPendingChange={setMentorPending}
                  onViewProfile={handleViewProfile}
                  onOpenChat={handleOpenChat}
                />
              )}
              {currentUser.role === 'Admin' && (
                <AdminDashboard
                  currentUser={currentUser}
                  onViewProfile={handleViewProfile}
                  onOpenChat={handleOpenChat}
                  activeTab={adminTab}
                  onTabChange={goToAdminTab}
                />
              )}
            </main>

            <footer className="app-footer">
              &copy; {new Date().getFullYear()} ANUGRAH Mentorship Platform. All rights reserved.
            </footer>
          </div>
        </div>
      ) : (
        <LandingPage theme={theme} onToggleTheme={toggleTheme} onOpenAuth={openAuth} stats={liveStats} />
      )}

      {/* Auth Modal Overlay */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          initialTab={authModalTab}
          initialRole={authModalRole}
        />
      )}

      {/* User Profile View Modal (Anyone's profile) */}
      {profileModalOpen && (
        <UserProfileModal
          user={selectedProfileUser}
          currentUser={currentUser}
          onClose={() => setProfileModalOpen(false)}
          onEditProfile={() => {
            setProfileModalOpen(false);
            handleOpenEditProfile();
          }}
          onToggleApproval={handleToggleApprovalFromModal}
          onOpenChat={handleOpenChat}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Create / Edit Profile for Verification Modal */}
      {editProfileModalOpen && (
        <ProfileEditModal
          currentUser={currentUser}
          onClose={() => setEditProfileModalOpen(false)}
          onProfileUpdated={handleProfileUpdated}
          onAccountDeleted={handleAccountDeleted}
        />
      )}

      {/* Other Mentors Modal (Accessible to Mentors via Navbar) */}
      {otherMentorsModalOpen && (
        <OtherMentorsModal onClose={() => setOtherMentorsModalOpen(false)} onViewProfile={handleViewProfile} />
      )}

      {/* Settled Requests Modal (Accessible to Admin via Navbar) */}
      {settledRequestsModalOpen && (
        <SettledRequestsModal onClose={() => setSettledRequestsModalOpen(false)} onViewProfile={handleViewProfile} />
      )}

      {/* Global Direct Chat Modal */}
      {chatTargetUser && (
        <ChatModal currentUser={currentUser} targetUser={chatTargetUser} onClose={() => setChatTargetUser(null)} />
      )}
    </div>
  );
}

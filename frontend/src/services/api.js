import { STORAGE_KEYS, storage } from '../utils/helpers';

const API_BASE = '/api/v1';

// Call the backend. Sends the auth cookie plus a Bearer token when one is saved.
// Throws an Error with the server's message when the response is not OK.
async function request(endpoint, method = 'GET', body) {
  const token = storage.get(STORAGE_KEYS.token);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

export const api = {
  // Auth & profile
  sendOtp: (email) => request('/auth/send-otp', 'POST', { email }),
  signup: (payload) => request('/auth/signup', 'POST', payload),
  login: (credentials) => request('/auth/login', 'POST', credentials),
  logout: () => request('/auth/logout', 'POST'),
  getMe: () => request('/auth/me'),
  deleteMyAccount: (password) => request('/auth/me', 'DELETE', { password }),
  updateProfile: (payload) => request('/auth/profile', 'PUT', payload),
  uploadAvatar: (image) => request('/auth/avatar', 'POST', { image }),
  removeAvatar: () => request('/auth/avatar', 'DELETE'),
  getPublicStats: () => request('/auth/public-stats'),
  getUserProfile: (userId) => request(`/auth/user/${userId}`),
  requestVerification: () => request('/auth/request-verification', 'POST', {}),

  // Mentee
  getAllMentors: () => request('/mentee/mentors'),
  getMyMentor: () => request('/mentee/my-mentor'),
  requestMentor: (payload) => request('/mentee/request-mentor', 'POST', payload),
  requestGeneralAllotment: (payload) => request('/mentee/request-general-allotment', 'POST', payload),
  getMyRequests: () => request('/mentee/my-requests'),

  // Mentor
  getUnallottedMentees: () => request('/mentor/unallotted-mentees'),
  getMyMentees: () => request('/mentor/my-mentees'),
  getOtherMentors: () => request('/mentor/other-mentors'),
  getMyMentorRequests: () => request('/mentor/my-requests'),
  selectMentee: (menteeId) => request('/mentor/select-mentee', 'POST', { menteeId }),
  requestMenteeRemoval: (menteeId, reason) => request('/mentor/request-removal', 'POST', { menteeId, reason }),

  // Chat
  sendMessage: (receiverId, message) => request('/communication/send', 'POST', { receiverId, message }),
  getMessages: (otherUserId) => request(`/communication/messages/${otherUserId}`),

  // Admin
  getUsers: () => request('/admin/users'),
  getRequests: () => request('/admin/requests'),
  resolveRequest: (requestId, payload) => request(`/admin/requests/${requestId}/resolve`, 'PUT', payload),
  removeMenteeAllotment: (menteeId, mentorId) => request('/admin/remove-allotment', 'POST', { menteeId, mentorId }),
  toggleApproval: (userId, isApproved) => request(`/admin/users/${userId}/approval`, 'PATCH', { isApproved }),
  rejectVerification: (userId) =>
    request(`/admin/users/${userId}/approval`, 'PATCH', { isApproved: false, reject: true }),
  deleteUser: (userId) => request(`/admin/users/${userId}`, 'DELETE'),
};

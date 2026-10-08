import api from './api'

export async function getCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data.user
}

export async function loginWithGoogle(credential, requestedRole = 'USER') {
  const response = await api.post('/auth/google', { credential, requested_role: requestedRole })
  return response.data.user
}

export async function logout() {
  await api.post('/auth/logout')
}
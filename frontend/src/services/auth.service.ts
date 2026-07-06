import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// ⚠️ Remplace par l'IP de ton Mac (pas localhost)
const API_URL = 'http://192.168.1.5:3000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Intercepteur réponse — refresh token automatique
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = await SecureStore.getItemAsync('refreshToken')
      if (!refreshToken) throw error

      try {
        const res = await api.post('/auth/refresh-token', { refreshToken })
        const newAccessToken = res.data.accessToken

        await SecureStore.setItemAsync('accessToken', newAccessToken)
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`

        return api(originalRequest)
      } catch {
        await SecureStore.deleteItemAsync('accessToken')
        await SecureStore.deleteItemAsync('refreshToken')
        await SecureStore.deleteItemAsync('user')
        throw error
      }
    }
    throw error
  }
)

// Intercepteur requête — injection du token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ─── AUTH ──────────────────────────────────────────────────────────────────────

export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password })
  const { accessToken, refreshToken, user } = response.data
  await SecureStore.setItemAsync('accessToken', accessToken)
  await SecureStore.setItemAsync('refreshToken', refreshToken)
  await SecureStore.setItemAsync('user', JSON.stringify(user))
  return { accessToken, refreshToken, user }
}

export const logoutUser = async () => {
  const refreshToken = await SecureStore.getItemAsync('refreshToken')
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken })
  }
  await SecureStore.deleteItemAsync('accessToken')
  await SecureStore.deleteItemAsync('refreshToken')
  await SecureStore.deleteItemAsync('user')
}

export const getStoredUser = async () => {
  const user = await SecureStore.getItemAsync('user')
  return user ? JSON.parse(user) : null
}

export const forgotPasswordAPI = async (emailOrUsername: string) => {
  const response = await api.post('/auth/forgot-password', { emailOrUsername })
  return response.data
}

export const verifyOTPAPI = async (userId: string, otpCode: string) => {
  const response = await api.post('/auth/verify-otp', { userId, otpCode })
  return response.data
}

export const resetPasswordAPI = async (userId: string, otpCode: string, newPassword: string) => {
  const response = await api.post('/auth/reset-password', { userId, otpCode, newPassword })
  return response.data
}

export const resendOTPAPI = async (userId: string) => {
  const response = await api.post('/auth/resend-otp', { userId })
  return response.data
}

export const verifyResetOTPAPI = async (userId: string, otpCode: string) => {
  const response = await api.post('/auth/verify-reset-otp', { userId, otpCode })
  return response.data
}

export const registerUser = async (data: {
  nom: string
  prenom: string
  email: string
  password: string
  role: 'STUDENT' | 'PARENT'
  phone?: string
}) => {
  const response = await api.post('/auth/register', data)
  return response.data
}

export const changePasswordAPI = async (currentPassword: string, newPassword: string) => {
  const response = await api.put('/users/change-password', { currentPassword, newPassword })
  return response.data
}

// ─── SUPER ADMIN ───────────────────────────────────────────────────────────────

// GET /api/v1/admin/dashboard — KPIs du dashboard
export const fetchAdminDashboard = async () => {
  const response = await api.get('/admin/dashboard')
  return response.data
}

// GET /api/v1/admin/stats?period=week|month — statistiques d'utilisation
export const fetchAdminStats = async (period: 'week' | 'month' = 'week') => {
  const response = await api.get(`/admin/stats?period=${period}`)
  return response.data
}

// GET /api/v1/admin/meetings — liste globale de tous les meetings
export const fetchAdminMeetings = async (statut?: string) => {
  const url = statut ? `/admin/meetings?statut=${statut}` : '/admin/meetings'
  const response = await api.get(url)
  return response.data
}

// POST /api/v1/admin/notifications/broadcast — envoi de notif en masse
export const broadcastNotification = async (data: {
  target: 'ALL' | 'STUDENT' | 'PROFESSOR' | 'COLLEGE_STUDENT' | 'ADMIN'
  title: string
  message: string
  channel: 'PUSH' | 'EMAIL' | 'SMS'
  scheduledAt?: string
}) => {
  const response = await api.post('/admin/notifications/broadcast', data)
  return response.data
}

// GET /api/v1/users — tous les utilisateurs (ADMIN/SUPER_ADMIN)
export const fetchAllUsers = async () => {
  const response = await api.get('/users')
  return response.data
}

// GET /api/v1/users/role/:role — utilisateurs filtrés par rôle
export const fetchUsersByRole = async (role: string) => {
  const response = await api.get(`/users/role/${role}`)
  return response.data
}

// DELETE /api/v1/users/:id — supprimer un utilisateur
export const deleteUserById = async (userId: string) => {
  const response = await api.delete(`/users/${userId}`)
  return response.data
}

// POST /api/v1/users/create-user — créer un utilisateur (admin)
export const createUserByAdmin = async (data: {
  nom: string
  prenom: string
  email: string
  password: string
  role: 'STUDENT' | 'PROFESSOR' | 'COLLEGE_STUDENT' | 'ADMIN'
  telephone?: string
  sendCredentialsByEmail?: boolean
}) => {
  const response = await api.post('/users/create-user', data)
  return response.data
}

// ─── SIGNALEMENTS ──────────────────────────────────────────────────────────────

// GET /api/v1/reports — liste des signalements (À CRÉER côté backend)
export const fetchReports = async (statut?: string) => {
  const url = statut ? `/reports?statut=${statut}` : '/reports'
  const response = await api.get(url)
  return response.data
}

// PUT /api/v1/reports/:id/resolve — traiter ou rejeter un signalement
export const resolveReport = async (reportId: string, action: 'TRAITE' | 'REJETE') => {
  const response = await api.put(`/reports/${reportId}/resolve`, { action })
  return response.data
}

// ─── PAIEMENTS ADMIN ───────────────────────────────────────────────────────────

// GET /api/v1/admin/payments — vue globale des paiements (À CRÉER côté backend)
export const fetchAdminPayments = async () => {
  const response = await api.get('/admin/payments')
  return response.data
}

export default api
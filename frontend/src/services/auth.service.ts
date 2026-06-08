import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// ⚠️ Remplace par l'IP de ton Mac (pas localhost)
const API_URL = 'http://192.168.1.5:3000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Après la création de `api`, ajoute :
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw error;

      try {
        const res = await api.post('/auth/refresh-token', { refreshToken });
        const newAccessToken = res.data.accessToken;

        await SecureStore.setItemAsync('accessToken', newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return api(originalRequest); // Relance la requête originale
      } catch {
        // Refresh token expiré → déconnecter
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('user');
        throw error;
      }
    }
    throw error;
  }
);

// Intercepteur pour injecter le token automatiquement
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password })
  const { accessToken, refreshToken, user } = response.data

  // Sauvegarder les tokens en sécurisé
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
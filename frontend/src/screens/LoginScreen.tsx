import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  FlatList,
  ScrollView,           // ✅ AJOUT 1 — pour que l'erreur reste visible avec le clavier
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { loginUser } from '../services/auth.service'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { Ionicons } from '@expo/vector-icons'

// ─── Types ──────────────────────────────────────────────────────────────────
type SavedAccount = {
  email: string
  name: string
  initials: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const ACCOUNTS_KEY = 'saved_accounts' // JSON array of SavedAccount

async function loadSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

async function saveAccount(account: SavedAccount) {
  const list = await loadSavedAccounts()
  const filtered = list.filter((a) => a.email !== account.email)
  await SecureStore.setItemAsync(
    ACCOUNTS_KEY,
    JSON.stringify([account, ...filtered])
  )
}

async function removeAccount(email: string) {
  const list = await loadSavedAccounts()
  await SecureStore.setItemAsync(
    ACCOUNTS_KEY,
    JSON.stringify(list.filter((a) => a.email !== email))
  )
}

function makeInitials(user: any): string {
  const p = user?.prenom || user?.firstName || ''
  const n = user?.nom || user?.lastName || ''
  return ([p[0], n[0]].filter(Boolean).join('').toUpperCase()) || 'U'
}

function makeName(user: any): string {
  return [user?.prenom || user?.firstName, user?.nom || user?.lastName]
    .filter(Boolean)
    .join(' ') || user?.email || 'Utilisateur'
}

function emailToKey(email: string): string {
  return email.replace(/[^a-zA-Z0-9._-]/g, '_')
}

const API_URL = 'http://192.168.1.5:3000/api/v1'

const checkTokenValid = async (email: string): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(`token_${emailToKey(email)}`)
    if (!token) return false
    const response = await fetch(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.status !== 401
  } catch {
    return false
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
const { width } = Dimensions.get('window')

export default function LoginScreen({
  onFinish,
  onRegister,
  onForgot,
}: {
  onFinish: (role: string) => void
  onRegister: () => void
  onForgot: () => void
}) {
  const insets = useSafeAreaInsets()

  // form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [error, setError] = useState('')

  // ✅ AJOUT 2 — deux états d'erreur séparés (champ vide vs réponse API)
  const [fieldError, setFieldError] = useState('')
  const [apiError, setApiError] = useState('')

  // remembered account (selected via sheet)
  const [activeAccount, setActiveAccount] = useState<SavedAccount | null>(null)

  // bottom sheet
  const [sheetVisible, setSheetVisible] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const slideAnim = useRef(new Animated.Value(400)).current

  // biometric available AND enabled by user in settings
  const [bioAvailable, setBioAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  // true while we check SecureStore on startup (avoid flash of wrong mode)
  const [initializing, setInitializing] = useState(true)

  // ── init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        // 1. check biometric hardware availability
        const enrolled = await LocalAuthentication.isEnrolledAsync()
        setBioAvailable(enrolled)

        // Only show biometric button if user explicitly enabled it in profile
        const bioEnabledFlag = await SecureStore.getItemAsync('biometric_enabled')
        setBiometricEnabled(bioEnabledFlag === 'true')

        // 2. check remember_me flag
        const rememberFlag = await SecureStore.getItemAsync('remember_me')
        if (rememberFlag !== 'true') return // no remembered account → normal mode

        // 3. load the last remembered email + matching saved account
        const rememberedEmail = await SecureStore.getItemAsync('remembered_email')
        if (!rememberedEmail) return

        const accounts = await loadSavedAccounts()
        const found = accounts.find((a) => a.email === rememberedEmail)

       if (found) {
  setActiveAccount(found)
  setEmail(found.email)

  const storedUser = await SecureStore.getItemAsync(`user_${emailToKey(found.email)}`)
  if (storedUser) {
    const parsedUser = JSON.parse(storedUser)
    const bioKey = parsedUser.id
      ? `biometric_enabled_${parsedUser.id}`
      : `biometric_enabled_${emailToKey(found.email)}`
    const bioFlag = await SecureStore.getItemAsync(bioKey)
    
    if (bioFlag === 'true') {
      // ✅ Vérifier si le token est encore valide
      const tokenValid = await checkTokenValid(found.email)
      setBiometricEnabled(tokenValid) // ← bio visible seulement si token valide
      
      if (!tokenValid) {
        // Nettoyer les tokens expirés
        await SecureStore.deleteItemAsync('accessToken')
        await SecureStore.deleteItemAsync('refreshToken')
      }
    }
  }
}
      } finally {
        setInitializing(false)
      }
    })()
  }, [])

  const triggerBio = async (user: any, email: string) => {
  try {
    setBioLoading(true)
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Connexion par empreinte",
      disableDeviceFallback: true,
    })
    if (result.success) {
      await SecureStore.setItemAsync('user', JSON.stringify(user))
      
      const token = await SecureStore.getItemAsync(`token_${emailToKey(email)}`)
      const refresh = await SecureStore.getItemAsync(`refresh_${emailToKey(email)}`)
      
      if (token) await SecureStore.setItemAsync('accessToken', token)
      if (refresh) await SecureStore.setItemAsync('refreshToken', refresh) // ← nouveau
      
      onFinish(user.role)
    }
  } catch (e) {
    console.log('Bio error:', e)
  } finally {
    setBioLoading(false)
  }

}

  // ── open sheet ──────────────────────────────────────────────────────────
  const openSheet = async () => {
    const accounts = await loadSavedAccounts()
    setSavedAccounts(accounts)
    setSheetVisible(true)
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start()
  }

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSheetVisible(false))
  }

  // ── select account from sheet ────────────────────────────────────────────
  const handleSelectAccount = (account: SavedAccount) => {
    closeSheet()
    setActiveAccount(account)
    setEmail(account.email)
    setPassword('')
    setError('')
    setFieldError('')  // ✅ AJOUT 3 — reset des deux états
    setApiError('')
  }

  // ── add new account ──────────────────────────────────────────────────────
  const handleAddAccount = () => {
    closeSheet()
    setActiveAccount(null)
    setEmail('')
    setPassword('')
    setError('')
    setFieldError('')  // ✅ AJOUT 4
    setApiError('')
  }

  // ── remove account from sheet ────────────────────────────────────────────
  const handleRemoveAccount = async (email: string) => {
    await removeAccount(email)
    if (activeAccount?.email === email) {
      setActiveAccount(null)
      setEmail('')
    }
    const updated = await loadSavedAccounts()
    setSavedAccounts(updated)
  }

  // ── login ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const loginEmail = activeAccount ? activeAccount.email : email.trim()

    // ✅ MODIF 5 — validation champs avec fieldError (jaune) au lieu de error (rouge)
    if (!loginEmail) {
      setFieldError("L'adresse email est requise")
      setApiError('')
      return
    }
    if (!loginEmail.includes('@')) {
      setFieldError("L'adresse email n'est pas valide")
      setApiError('')
      return
    }
    if (!password) {
      setFieldError('Le mot de passe est requis')
      setApiError('')
      return
    }

    setLoading(true)
    setError('')
    setFieldError('')
    setApiError('')

    try {
      const { user, accessToken, refreshToken } = await loginUser(loginEmail, password)
      // loginUser a déjà sauvegardé accessToken, refreshToken, user globalement

      // Sauvegarder par email pour la bio
      await SecureStore.setItemAsync(`user_${emailToKey(loginEmail)}`, JSON.stringify(user))
      await SecureStore.setItemAsync(`token_${emailToKey(loginEmail)}`, accessToken)
      await SecureStore.setItemAsync(`refresh_${emailToKey(loginEmail)}`, refreshToken)

      if (rememberMe || activeAccount) {
        const acc: SavedAccount = {
          email: loginEmail,
          name: makeName(user),
          initials: makeInitials(user),
        }
        await saveAccount(acc)
        await SecureStore.setItemAsync('remember_me', 'true')
        await SecureStore.setItemAsync('remembered_email', loginEmail)
      }

      onFinish(user.role)
    } catch (e: any) {
      console.log('Login error:', e?.message, e?.response?.data)

      // ✅ MODIF 6 — messages d'erreur précis selon le code HTTP
      const status  = e?.response?.status
      const message = e?.response?.data?.message

      if (status === 401) {
        setApiError('Email ou mot de passe incorrect')
      } else if (status === 400) {
        setApiError(message ?? 'Données invalides')
      } else if (status === 403) {
        setApiError('Votre compte est suspendu. Contactez un administrateur.')
      } else if (!e?.response) {
        setApiError('Impossible de joindre le serveur. Vérifiez votre connexion.')
      } else {
        setApiError(message ?? 'Une erreur est survenue, réessayez.')
      }

      // on garde aussi l'ancien error pour compatibilité
      setError(e?.response?.data?.message || e?.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // ── biometric for active remembered account ──────────────────────────────
  // ✅ handleBiometric unifié
const handleBiometric = async () => {
  if (!activeAccount) return

  const storedUser = await SecureStore.getItemAsync(`user_${emailToKey(activeAccount.email)}`)
  if (!storedUser) {
    setError('Session expirée, veuillez vous reconnecter avec votre mot de passe.')
    setApiError('Session expirée, veuillez vous reconnecter avec votre mot de passe.')
    return
  }

  const parsedUser = JSON.parse(storedUser)
  const bioKey = parsedUser.id
    ? `biometric_enabled_${parsedUser.id}`
    : `biometric_enabled_${emailToKey(activeAccount.email)}`

  const bioEnabled = await SecureStore.getItemAsync(bioKey)
  if (bioEnabled !== 'true') {
    setError('Empreinte non activée pour ce compte.')
    setApiError('Empreinte non activée pour ce compte.')
    return
  }

  triggerBio(parsedUser, activeAccount.email) // ← passer l'email
}

  // ── render ───────────────────────────────────────────────────────────────
  // Don't render until SecureStore init is done (avoids mode flash)
  if (initializing) return null

  const isRememberedMode = !!activeAccount

  // ✅ AJOUT 7 — composant ErrorBox inline (champ = jaune, API = rouge)
  const ErrorBox = () => {
    const msg = fieldError || apiError
    if (!msg) return null
    const isField = !!fieldError
    return (
      <View style={[
        styles.errorBox,
        isField ? styles.errorBoxField : styles.errorBoxApi,
      ]}>
        <Ionicons
          name={isField ? 'alert-circle-outline' : 'close-circle-outline'}
          size={16}
          color={isField ? '#D4A017' : '#E24B4A'}
        />
        <Text style={[
          styles.errorText,
          isField ? styles.errorTextField : styles.errorTextApi,
        ]}>
          {msg}
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Switch Account FAB ── */}
      <TouchableOpacity
        style={[styles.floatingSwitchBtn, { top: insets.top + 60 }]}
        onPress={openSheet}
      >
        <Ionicons name="person-add-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ✅ MODIF 8 — ScrollView remplace View pour que l'erreur reste visible avec le clavier */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { paddingTop: insets.top + 70 }]}>
          {/* ── Brand ── */}
          <Image
            source={require('../assets/logo1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>BOSTON</Text>
          <Text style={styles.brandSub}>SCIENCE & TECH SCHOOL</Text>
          <View style={styles.goldLine} />

          {/* ── Form ── */}
          {isRememberedMode ? (
            // ── REMEMBERED MODE: avatar + password only ──────────────────
            <View style={{ width: '100%' }}>
              <View style={styles.rememberedCard}>
                <View style={styles.rememberedAvatar}>
                  <Text style={styles.rememberedInitials}>
                    {activeAccount.initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rememberedTitle}>
                    Bon retour, {activeAccount.name.split(' ')[0]}
                  </Text>
                  <Text style={styles.rememberedSub}>
                    Connectez-vous pour continuer
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setActiveAccount(null)
                    setEmail('')
                    setPassword('')
                    setFieldError('')   // ✅ AJOUT 9
                    setApiError('')
                  }}>
                    <Text style={styles.switchAccountTextInline}>
                      Changer de compte
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password input */}
              {/* ✅ MODIF 10 — bordure rouge si erreur */}
              <View style={[
                styles.inputWrapper,
                !!(fieldError || apiError) && styles.inputWrapperError,
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color="#AAAAAA"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v)
                    setFieldError('')   // ✅ AJOUT 11 — reset erreur en tapant
                    setApiError('')
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#AAA"
                  />
                </TouchableOpacity>
              </View>

              {/* ✅ AJOUT 12 — ErrorBox ici, AVANT le bouton, visible sous le champ */}
              <ErrorBox />

              {/* Sign In + Biometric (only in remembered mode) */}
              <View style={styles.signInRow}>
                <TouchableOpacity
                  style={styles.signInBtn}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInText}>Se connecter →</Text>
                  )}
                </TouchableOpacity>
                {(bioAvailable && biometricEnabled) && (
                  <TouchableOpacity
                    style={styles.fingerprintBtn}
                    onPress={handleBiometric}
                    disabled={bioLoading}
                  >
                    {bioLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Ionicons
                        name="finger-print-outline"
                        size={26}
                        color="#FFFFFF"
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            // ── NORMAL MODE: email + password, NO biometric ──────────────
            <View style={{ width: '100%' }}>
              <Text style={styles.welcomeTitle}>Bienvenue</Text>
              <Text style={styles.welcomeGold}>de retour</Text>
              <Text style={styles.welcomeSub}>
                Connectez-vous pour continuer
              </Text>

              {/* Email */}
              {/* ✅ MODIF 13 — bordure rouge si erreur */}
              <View style={[
                styles.inputWrapper,
                !!(fieldError || apiError) && styles.inputWrapperError,
              ]}>
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color="#AAAAAA"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v)
                    setFieldError('')   // ✅ AJOUT 14 — reset erreur en tapant
                    setApiError('')
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password */}
              <View style={[
                styles.inputWrapper,
                !!(fieldError || apiError) && styles.inputWrapperError,
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color="#AAAAAA"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v)
                    setFieldError('')   // ✅ AJOUT 15 — reset erreur en tapant
                    setApiError('')
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#AAA"
                  />
                </TouchableOpacity>
              </View>

              {/* ✅ AJOUT 16 — ErrorBox ici, AVANT les options remember/forgot */}
              <ErrorBox />

              {/* Remember + Forgot */}
              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.rememberLeft}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxActive,
                    ]}
                  >
                    {rememberMe && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.rememberText}>Se souvenir de moi</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onForgot}>
                  <Text style={styles.forgotText}>
                    Mot de passe oublié ?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign In only — no biometric in normal mode */}
              <View style={styles.signInRow}>
                <TouchableOpacity
                  style={[styles.signInBtn, { flex: 1 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInText}>Se connecter →</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ancien error text conservé pour compatibilité */}
          {error !== '' && !fieldError && !apiError && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        {/* ── Bottom wave + Create Account ── */}
        <View style={styles.bottomShapes}>
          <Svg
            width={width}
            height={220}
            viewBox={`0 0 ${width} 160`}
            style={StyleSheet.absoluteFill}
          >
            <Path
              d={`M0,80 Q${width * 0.2},10 ${width * 0.5},50 Q${width * 0.75},90 ${width},30 L${width},160 L0,160 Z`}
              fill="#0D6B5E"
            />
          </Svg>
          <View style={styles.createAccountRow}>
            <Ionicons name="person-outline" size={24} color="#FFFFFF" />
            <View>
              <Text style={styles.noAccountText}>
                Pas encore de compte ?
              </Text>
              <TouchableOpacity onPress={onRegister}>
                <Text style={styles.createAccountText}>
                  Créer un compte →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── User Switcher Bottom Sheet ── */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        {/* backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closeSheet}
        />

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16 },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Utilisateurs</Text>
              <Text style={styles.sheetSub}>
                Sélectionnez un profil utilisateur
              </Text>
            </View>
            <TouchableOpacity style={styles.sheetClose} onPress={closeSheet}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Accounts list */}
          {savedAccounts.length === 0 ? (
            <Text style={styles.noAccountsText}>
              Aucun compte enregistré
            </Text>
          ) : (
            <FlatList
              data={savedAccounts}
              keyExtractor={(item) => item.email}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.accountRow}
                  onPress={() => handleSelectAccount(item)}
                  activeOpacity={0.75}
                >
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountInitials}>
                      {item.initials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>{item.name}</Text>
                    <Text style={styles.accountEmail}>{item.email}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveAccount(item.email)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="#999" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Add new account */}
          <TouchableOpacity
            style={styles.addAccountBtn}
            onPress={handleAddAccount}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addAccountText}>
              Ajouter un utilisateur
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width * 0.07,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: width * 0.22,
    height: width * 0.22,
    marginBottom: 8,
    marginTop: -35
  },
  brandTitle: {
    fontSize: width * 0.05,
    fontWeight: '800',
    color: '#0D6B5E',
    letterSpacing: 3,
  },
  brandSub: {
    fontSize: width * 0.03,
    color: '#0D6B5E',
    letterSpacing: 1,
    fontWeight: '500',
  },
  goldLine: {
    width: width * 0.12,
    height: 4,
    backgroundColor: '#D4A017',
    marginVertical: 14,
  },
  welcomeTitle: {
    fontSize: width * 0.09,
    fontWeight: '700',
    color: '#2C2C2A',
    alignSelf: 'center',
  },
  welcomeGold: {
    fontSize: width * 0.09,
    fontWeight: '700',
    color: '#D4A017',
    marginTop: -8,
    alignSelf: 'center',
  },
  welcomeSub: {
    fontSize: width * 0.035,
    color: '#888780',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 14,
  },
  // ✅ AJOUT 17 — bordure rouge sur les champs en erreur
  inputWrapperError: {
    borderColor: '#E24B4A',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: width * 0.038,
    color: '#2C2C2A',
  },
  // ✅ AJOUT 18 — styles ErrorBox (remplace l'ancien errorText seul)
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    width: '100%',
  },
  errorBoxField: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F5E6B0',
  },
  errorBoxApi: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F5C0C0',
  },
  errorTextField: {
    color: '#D4A017',
    flex: 1,
    fontSize: width * 0.033,
    fontWeight: '500',
  },
  errorTextApi: {
    color: '#E24B4A',
    flex: 1,
    fontSize: width * 0.033,
    fontWeight: '500',
  },
  // ancien style conservé
  errorText: {
    color: '#E24B4A',
    fontSize: width * 0.035,
    marginTop: 8,
    textAlign: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  rememberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0D6B5E',
    borderColor: '#0D6B5E',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rememberText: {
    fontSize: width * 0.035,
    color: '#2C2C2A',
  },
  forgotText: {
    fontSize: width * 0.035,
    color: '#D4A017',
    fontWeight: '600',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 8,
  },
  signInBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6B5E',
    borderRadius: 50,
    paddingVertical: 18,
  },
  signInText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  fingerprintBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0D6B5E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomShapes: {
    height: 220,
    width: width,
    backgroundColor: '#FFFFFF',
  },
  createAccountRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingTop: 8,
    gap: 12,
    height: 180,
  },
  noAccountText: {
    fontSize: width * 0.037,
    color: '#FFFFFF',
  },
  createAccountText: {
    fontSize: width * 0.04,
    color: '#D4A017',
    fontWeight: '700',
  },

  // ── Remembered card ──────────────────────────────────────────────────────
  rememberedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
  },
  rememberedAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0D6B5E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberedInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0D6B5E',
  },
  rememberedTitle: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  rememberedSub: {
    fontSize: width * 0.032,
    color: '#888780',
    marginTop: 2,
  },
  switchAccountTextInline: {
    fontSize: width * 0.03,
    color: '#D4A017',
    fontWeight: '600',
    marginTop: 4,
    textDecorationLine: 'underline',
  },

  // ── FAB ──────────────────────────────────────────────────────────────────
  floatingSwitchBtn: {
    position: 'absolute',
    right: width * 0.07,
    backgroundColor: '#0D6B5E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  // ── Bottom Sheet ─────────────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: width * 0.055,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  sheetSub: {
    fontSize: width * 0.033,
    color: '#888780',
    marginTop: 2,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  accountAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#0D6B5E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D6B5E',
  },
  accountName: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#2C2C2A',
  },
  accountEmail: {
    fontSize: width * 0.03,
    color: '#888780',
    marginTop: 1,
  },
  noAccountsText: {
    fontSize: width * 0.035,
    color: '#888780',
    textAlign: 'center',
    marginVertical: 20,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6B5E',
    borderRadius: 50,
    paddingVertical: 16,
    marginTop: 20,
    gap: 8,
  },
  addAccountText: {
    fontSize: width * 0.04,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
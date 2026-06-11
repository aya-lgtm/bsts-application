import React, { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Text, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// ─── DIAGNOSTIC: on importe un par un et on affiche quel screen plante ───────
// Si l'erreur disparaît → le dernier import commenté est le coupable

import SplashScreen from './src/screens/SplashScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import OTPScreen from './src/screens/OTPScreen'
import ResetPasswordScreen from './src/screens/ResetPasswordScreen'
import PasswordResetSuccessScreen from './src/screens/PasswordResetSuccessScreen'
import RegisterOTPScreen from './src/screens/RegisterOTPScreen'
import ParentNavigator from './src/screens/parent/ParentNavigator'

// ─── Vérification au démarrage ─────────────────────────────────────────────
const screens: Record<string, any> = {
  SplashScreen,
  OnboardingScreen,
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  OTPScreen,
  ResetPasswordScreen,
  PasswordResetSuccessScreen,
  RegisterOTPScreen,
  ParentNavigator,
}

const invalidScreens = Object.entries(screens)
  .filter(([, comp]) => typeof comp !== 'function')
  .map(([name]) => name)

if (invalidScreens.length > 0) {
  console.error('❌ SCREENS INVALIDES (retournent un objet au lieu d\'une fonction):', invalidScreens)
} else {
  console.log('✅ Tous les screens sont valides')
}

// ─────────────────────────────────────────────────────────────────────────────

type Screen =
  | 'splash' | 'onboarding' | 'login'
  | 'home_student' | 'home_admin' | 'home_professor' | 'home_parent'
  | 'register' | 'forgot_password' | 'otp'
  | 'reset_password' | 'password_success' | 'register_otp'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetUserId, setResetUserId] = useState('')
  const [resetOtpCode, setResetOtpCode] = useState('')
  const [registerUserId, setRegisterUserId] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((value) => {
      setOnboardingDone(value === 'true')
    })
  }, [])

  const handleSplashFinish = () => {
    setScreen(onboardingDone ? 'login' : 'onboarding')
  }

  const handleOnboardingFinish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true')
    setScreen('login')
  }

  const handleLoginFinish = async () => {
    const userStr = await SecureStore.getItemAsync('user')
    if (!userStr) { setScreen('login'); return }
    const user = JSON.parse(userStr)
    switch (user.role) {
      case 'ADMIN':     setScreen('home_admin'); break
      case 'PROFESSOR': setScreen('home_professor'); break
      case 'PARENT':    setScreen('home_parent'); break
      default:          setScreen('home_student'); break
    }
  }

  // ── Si un screen est invalide, afficher un écran de diagnostic ──────────
  if (invalidScreens.length > 0) {
    return (
      <SafeAreaProvider>
        <View style={[styles.container, { backgroundColor: '#1a1a1a', padding: 20 }]}>
          <Text style={[styles.text, { fontSize: 14, color: '#FF5555', marginBottom: 10 }]}>
            ❌ Import(s) invalide(s) :
          </Text>
          {invalidScreens.map(name => (
            <Text key={name} style={[styles.text, { fontSize: 13, color: '#FFB86C' }]}>
              • {name}
            </Text>
          ))}
          <Text style={[styles.text, { fontSize: 12, color: '#888', marginTop: 16 }]}>
            Vérifie que chaque fichier a bien un "export default function"
          </Text>
        </View>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      {screen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
      {screen === 'onboarding' && <OnboardingScreen onFinish={handleOnboardingFinish} />}
      {screen === 'login' && (
        <LoginScreen
          onFinish={handleLoginFinish}
          onRegister={() => setScreen('register')}
          onForgot={() => setScreen('forgot_password')}
        />
      )}
      {screen === 'home_student' && (
        <View style={[styles.container, { backgroundColor: '#0D6B5E' }]}>
          <Text style={styles.text}>🎓 Dashboard Étudiant</Text>
        </View>
      )}
      {screen === 'home_admin' && (
        <View style={[styles.container, { backgroundColor: '#1a1a2e' }]}>
          <Text style={styles.text}>⚙️ Dashboard Admin</Text>
        </View>
      )}
      {screen === 'home_professor' && (
        <View style={[styles.container, { backgroundColor: '#2c3e50' }]}>
          <Text style={styles.text}>📚 Dashboard Professeur</Text>
        </View>
      )}
      {screen === 'home_parent' && (
        <ParentNavigator onLogout={() => setScreen('login')} />
      )}
      {screen === 'register' && (
        <RegisterScreen
          onBack={() => setScreen('login')}
          onFinish={(userId: string, email: string) => {
            setRegisterUserId(userId)
            setRegisterEmail(email)
            setScreen('register_otp')
          }}
        />
      )}
      {screen === 'forgot_password' && (
        <ForgotPasswordScreen
          onBack={() => setScreen('login')}
          onSent={(email: string, userId: string) => {
            setResetEmail(email)
            setResetUserId(userId)
            setScreen('otp')
          }}
        />
      )}
      {screen === 'otp' && (
        <OTPScreen
          email={resetEmail}
          userId={resetUserId}
          onBack={() => setScreen('forgot_password')}
          onSuccess={(userId: string, otpCode: string) => {
            setResetUserId(userId)
            setResetOtpCode(otpCode)
            setScreen('reset_password')
          }}
        />
      )}
      {screen === 'reset_password' && (
        <ResetPasswordScreen
          userId={resetUserId}
          otpCode={resetOtpCode}
          onBack={() => setScreen('login')}
          onSuccess={() => setScreen('password_success')}
        />
      )}
      {screen === 'password_success' && (
        <PasswordResetSuccessScreen onBack={() => setScreen('login')} />
      )}
      {screen === 'register_otp' && (
        <RegisterOTPScreen
          email={registerEmail}
          userId={registerUserId}
          onBack={() => setScreen('register')}
          onSuccess={() => setScreen('login')}
        />
      )}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontSize: 18 },
})
import React, { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Text, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

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
import ProfessorNavigator from './src/screens/professor/ProfessorNavigator'
import StudentNavigator from './src/screens/student/StudentNavigator'
import CollegeStudentNavigator from './src/screens/COLLEGE_STUDENT/CollegeStudentNavigator'
import SuperAdminNavigator from './src/screens/SUPER_ADMIN/SuperAdminNavigator'

// ─── Vérification au démarrage ────────────────────────────────────────────────
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
  ProfessorNavigator,
  StudentNavigator,
  CollegeStudentNavigator,
  SuperAdminNavigator,
}

const invalidScreens = Object.entries(screens)
  .filter(([, comp]) => typeof comp !== 'function')
  .map(([name]) => name)

if (invalidScreens.length > 0) {
  console.error('❌ SCREENS INVALIDES :', invalidScreens)
} else {
  console.log('✅ Tous les screens sont valides')
}

// ─────────────────────────────────────────────────────────────────────────────

type Screen =
  | 'splash' | 'onboarding' | 'login'
  | 'home_student' | 'home_admin' | 'home_professor'
  | 'home_parent'  | 'home_college_student'
  | 'home_super_admin'
  | 'register' | 'forgot_password' | 'otp'
  | 'reset_password' | 'password_success' | 'register_otp'

// ✅ FIX — fonction pure qui mappe un role → Screen, sans lire SecureStore
function roleToScreen(role: string): Screen {
  switch (role) {
    case 'SUPER_ADMIN':     return 'home_super_admin'
    case 'ADMIN':           return 'home_admin'
    case 'PROFESSOR':       return 'home_professor'
    case 'PARENT':          return 'home_parent'
    case 'COLLEGE_STUDENT': return 'home_college_student'
    default:                return 'home_student'
  }
}

export default function App() {
  const [screen, setScreen]                 = useState<Screen>('splash')
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [resetEmail, setResetEmail]         = useState('')
  const [resetUserId, setResetUserId]       = useState('')
  const [resetOtpCode, setResetOtpCode]     = useState('')
  const [registerUserId, setRegisterUserId] = useState('')
  const [registerEmail, setRegisterEmail]   = useState('')

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

  // ✅ FIX — reçoit le role directement depuis LoginScreen (plus de relecture SecureStore)
  // LoginScreen appelle onFinish(user.role) → on utilise ce role immédiatement
  // Pas de race condition possible entre l'écriture et la lecture SecureStore
  const handleLoginFinish = (role: string) => {
    console.log('🔍 ROLE REÇU dans handleLoginFinish:', role)
    const targetScreen = roleToScreen(role)
    console.log('🔍 REDIRECTION VERS:', targetScreen)
    setScreen(targetScreen)
  }

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
        <StudentNavigator onLogout={() => setScreen('login')} />
      )}
      {screen === 'home_admin' && (
        <View style={[styles.container, { backgroundColor: '#1a1a2e' }]}>
          <Text style={styles.text}>⚙️ Dashboard Admin</Text>
        </View>
      )}
      {screen === 'home_professor' && (
        <ProfessorNavigator onLogout={() => setScreen('login')} />
      )}
      {screen === 'home_parent' && (
        <ParentNavigator onLogout={() => setScreen('login')} />
      )}
      {screen === 'home_college_student' && (
        <CollegeStudentNavigator onLogout={() => setScreen('login')} />
      )}
      {screen === 'home_super_admin' && (
        <SuperAdminNavigator onLogout={() => setScreen('login')} />
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
  text:      { color: '#FFFFFF', fontSize: 18 },
})
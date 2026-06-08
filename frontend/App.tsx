import { useState, useEffect } from 'react'
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

type Screen = 'splash' | 'onboarding' | 'login' | 'home_student' | 'home_admin' | 'home_professor' | 'home_parent' | 'register' | 'forgot_password' | 'otp' | 'reset_password' | 'password_success'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [resetEmail, setResetEmail] = useState('')

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((value) => {
      setOnboardingDone(value === 'true')
    })
  }, [])

  const handleSplashFinish = () => {
    if (onboardingDone) {
      setScreen('login')
    } else {
      setScreen('onboarding')
    }
  }

  const handleOnboardingFinish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true')
    setScreen('login')
  }

  // Redirection selon le rôle après login
  const handleLoginFinish = async () => {
    const userStr = await SecureStore.getItemAsync('user')
    if (!userStr) {
      setScreen('login')
      return
    }
    const user = JSON.parse(userStr)
    switch (user.role) {
      case 'ADMIN':      setScreen('home_admin'); break
      case 'PROFESSOR':  setScreen('home_professor'); break
      case 'PARENT':     setScreen('home_parent'); break
      case 'STUDENT':
      default:           setScreen('home_student'); break
    }
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
        <View style={[styles.container, { backgroundColor: '#6c3483' }]}>
          <Text style={styles.text}>👨‍👩‍👧 Dashboard Parent</Text>
        </View>
      )}
      {screen === 'register' && (
        <RegisterScreen
          onBack={() => setScreen('login')}
          onFinish={() => setScreen('login')}
        />
      )}
      {screen === 'forgot_password' && (
        <ForgotPasswordScreen
          onBack={() => setScreen('login')}
          onSent={(email) => {
            setResetEmail(email)
            setScreen('otp')
          }}
        />
      )}
      {screen === 'otp' && (
        <OTPScreen
          email={resetEmail}
          onBack={() => setScreen('forgot_password')}
          onSuccess={() => setScreen('reset_password')}
        />
      )}
      {screen === 'reset_password' && (
        <ResetPasswordScreen
          onBack={() => setScreen('login')}
          onSuccess={() => setScreen('password_success')}
        />
      )}
      {screen === 'password_success' && (
        <PasswordResetSuccessScreen onBack={() => setScreen('login')} />
      )}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontSize: 18 },
})
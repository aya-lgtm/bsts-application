import { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Text, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import SplashScreen from './src/screens/SplashScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import LoginScreen from './src/screens/LoginScreen'

type Screen = 'splash' | 'onboarding' | 'login' | 'home'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

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

  return (
    <SafeAreaProvider>
      {screen === 'splash' && (
        <SplashScreen onFinish={handleSplashFinish} />
      )}
      {screen === 'onboarding' && (
        <OnboardingScreen onFinish={handleOnboardingFinish} />
      )}
      {screen === 'login' && (
        <LoginScreen onFinish={() => setScreen('home')} />
      )}
      {screen === 'home' && (
        <View style={styles.container}>
          <Text style={styles.text}>Home arrive ici ✅</Text>
        </View>
      )}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D6B5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
  },
})
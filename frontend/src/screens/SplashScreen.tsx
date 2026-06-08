import { useEffect, useRef } from 'react'
import {
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width, height } = Dimensions.get('window')

export default function AnimatedSplash({
  onFinish,
}: {
  onFinish: () => void
}) {
  const insets = useSafeAreaInsets()

  const bgOpacity = useRef(new Animated.Value(0)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.7)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const lineOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: 0.08,
      duration: 1500,
      useNativeDriver: true,
    }).start()

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),

        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),

      Animated.timing(lineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        onFinish()
      }, 2000)
    })
  }, [])

  return (
    <LinearGradient
      colors={['#0D6B5E', '#085048', '#063D38']}
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* BSTS arrière-plan */}
      <Animated.Image
        source={require('../assets/bsts_bg.png')}
        resizeMode="contain"
        style={[
          styles.bgLogo,
          {
            opacity: bgOpacity,
          },
        ]}
      />

      {/* Logo */}
      <Animated.Image
        source={require('../assets/logo.png')}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      />

      {/* Texte */}
      <Animated.View
        style={[
          styles.textBlock,
          {
            opacity: textOpacity,
          },
        ]}
      >
        <Text style={styles.title}>BOSTON</Text>

        <Text style={styles.subtitle}>
          SCIENCE & TECH SCHOOL
        </Text>
      </Animated.View>

      {/* Ligne dorée */}
      <Animated.View
        style={[
          styles.goldLine,
          {
            opacity: lineOpacity,
          },
        ]}
      />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bgLogo: {
    position: 'absolute',
    width: width * 0.95,
    height: height * 0.7,
    top: height * 0.05,
    tintColor: '#FFFFFF',
  },

  logo: {
    width: width * 0.48,
    height: width * 0.48,
    marginBottom: height * 0.03,

    shadowColor: '#FFFFFF',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  textBlock: {
    alignItems: 'center',
  },

  title: {
    fontSize: width * 0.11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: width * 0.012,
  },

  subtitle: {
    marginTop: 8,
    fontSize: width * 0.033,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: width * 0.007,
    fontWeight: '500',
  },

  goldLine: {
    width: width * 0.15,
    height: 2,
    backgroundColor: '#D4AF37',
    marginTop: height * 0.025,
  },
})

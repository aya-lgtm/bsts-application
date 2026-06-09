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
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'

const { width } = Dimensions.get('window')
const OTP_LENGTH = 6
const API_URL = 'http://192.168.1.7:3000/api/v1'

export default function RegisterOTPScreen({ email, userId, onBack, onSuccess }: {
  email: string
  userId: string
  onBack: () => void
  onSuccess: () => void
}) {
  const insets = useSafeAreaInsets()
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [timer, setTimer] = useState(45)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp]
    newOtp[index] = text
    setOtp(newOtp)
    if (text && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0)
      inputs.current[index - 1]?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < OTP_LENGTH) {
      setError('Please enter the full verification code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, {
        userId,
        otpCode: code,
      })
      const { accessToken, refreshToken, user } = response.data
      await SecureStore.setItemAsync('accessToken', accessToken)
      await SecureStore.setItemAsync('refreshToken', refreshToken)
      await SecureStore.setItemAsync('user', JSON.stringify(user))
      onSuccess()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Incorrect or expired code')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setTimer(45)
    setOtp(Array(OTP_LENGTH).fill(''))
    setError('')
    try {
      await axios.post(`${API_URL}/auth/resend-otp`, { userId })
    } catch (e) {
      setError('Error resending code. Please try again.')
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>

        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Image source={require('../assets/icon_back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        <Image source={require('../assets/logo1.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandTitle}>BOSTON</Text>
        <Text style={styles.brandSub}>SCIENCE & TECH SCHOOL</Text>
        <View style={styles.goldLine} />

        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.otpRow}>
          {Array(OTP_LENGTH).fill(0).map((_, i) => (
            <TextInput
              key={i}
              ref={ref => { inputs.current[i] = ref }}
              style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : {}]}
              value={otp[i]}
              onChangeText={text => handleChange(text.slice(-1), i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor="#0D6B5E"
            />
          ))}
        </View>

        {error !== '' && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive code? </Text>
          {timer > 0 ? (
            <Text style={styles.resendTimer}>Resend ({formatTime(timer)})</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.verifyBtnText}>Verify Account</Text>
              <Text style={styles.verifyBtnArrow}>→</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backToLogin}>Back to Register →</Text>
        </TouchableOpacity>

      </View>

      <View style={[styles.bottomShapes, { paddingBottom: insets.bottom }]}>
        <Svg width={width} height={160} viewBox={`0 0 ${width} 160`} style={StyleSheet.absoluteFill}>
          <Path
            d={`M0,80 Q${width * 0.2},10 ${width * 0.5},50 Q${width * 0.75},90 ${width},30 L${width},160 L0,160 Z`}
            fill="#0D6B5E"
          />
        </Svg>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: width * 0.07, backgroundColor: '#FFFFFF' },
  backBtn: { alignSelf: 'flex-start', width: 40, height: 40, borderRadius: 20, borderWidth: 0, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', marginBottom: 0, backgroundColor: '#FFFFFF' },
  backIcon: { width: 65, height: 65, tintColor: '#0D6B5E' },
  logo: { width: width * 0.2, height: width * 0.2, marginBottom: 6 },
  brandTitle: { fontSize: width * 0.048, fontWeight: '800', color: '#0D6B5E', letterSpacing: 3 },
  brandSub: { fontSize: width * 0.028, color: '#0D6B5E', letterSpacing: 1, fontWeight: '500' },
  goldLine: { width: width * 0.12, height: 2, backgroundColor: '#D4A017', marginVertical: 14 },
  title: { fontSize: width * 0.065, fontWeight: '700', color: '#2C2C2A', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: width * 0.035, color: '#888780', textAlign: 'center' },
  emailText: { fontSize: width * 0.038, color: '#2C2C2A', fontWeight: '700', textAlign: 'center', marginBottom: 28 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpBox: { width: (width * 0.86 - 50) / OTP_LENGTH, height: (width * 0.86 - 50) / OTP_LENGTH, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FFFFFF', fontSize: width * 0.055, fontWeight: '700', color: '#0D6B5E' },
  otpBoxFilled: { borderColor: '#0D6B5E', backgroundColor: '#F0F9F7' },
  errorText: { color: '#E24B4A', fontSize: width * 0.033, marginBottom: 10, textAlign: 'center' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  resendText: { fontSize: width * 0.035, color: '#888780' },
  resendTimer: { fontSize: width * 0.035, color: '#D4A017', fontWeight: '600' },
  resendLink: { fontSize: width * 0.035, color: '#D4A017', fontWeight: '700' },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D6B5E', borderRadius: 12, paddingVertical: 16, width: '100%', gap: 10, marginBottom: 16 },
  verifyBtnText: { fontSize: width * 0.045, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  verifyBtnArrow: { fontSize: width * 0.045, color: '#FFFFFF' },
  backToLogin: { fontSize: width * 0.038, color: '#0D6B5E', fontWeight: '700' },
  bottomShapes: { height: 160, width: width, backgroundColor: '#FFFFFF' },
})
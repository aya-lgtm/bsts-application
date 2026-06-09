import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { resetPasswordAPI } from '../services/auth.service'

const { width } = Dimensions.get('window')

export default function ResetPasswordScreen({ userId, otpCode, onBack, onSuccess }: {
  userId: string
  otpCode: string
  onBack: () => void
  onSuccess: () => void
}) {
  const insets = useSafeAreaInsets()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasMinLength = password.length >= 8
  const hasNumber = /\d/.test(password)
  const hasUppercase = /[A-Z]/.test(password)

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setError('Please complete all required fields')
      return
    }
    if (!hasMinLength || !hasNumber || !hasUppercase) {
      setError('Password does not meet the requirements')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      await resetPasswordAPI(userId, otpCode, password)
      onSuccess()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Password reset failed. Please try again')
    } finally {
      setLoading(false)
    }
  }

  const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleIcon, ok && styles.ruleIconOk]}>
        <Text style={styles.ruleCheck}>{ok ? '✓' : ''}</Text>
      </View>
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{label}</Text>
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { paddingTop: insets.top + 16 }]}>

          {/* Bouton retour */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Image
              source={require('../assets/icon_back.png')}
              style={styles.backIcon}
            />
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={require('../assets/logo1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>BOSTON</Text>
          <Text style={styles.brandSub}>SCIENCE & TECH SCHOOL</Text>
          <View style={styles.goldLine} />

          {/* Titre */}
          <Text style={styles.title}>Reset Your Password</Text>
          <Text style={styles.subtitle}>Enter your new password below.</Text>

          {/* New Password */}
          <View style={styles.inputWrapper}>
            <Image
              source={require('../assets/icon-lock.png')}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#AAAAAA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Image
                source={showPassword
                  ? require('../assets/icon-eye-off.png')
                  : require('../assets/icon-eye.png')}
                style={styles.eyeIcon}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Image
              source={require('../assets/icon-lock.png')}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#AAAAAA"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Image
                source={showConfirm
                  ? require('../assets/icon-eye-off.png')
                  : require('../assets/icon-eye.png')}
                style={styles.eyeIcon}
              />
            </TouchableOpacity>
          </View>

          {/* Règles */}
          <View style={styles.rulesBox}>
            <Rule ok={hasMinLength} label="At least 8 characters" />
            <Rule ok={hasNumber} label="Include a number" />
            <Rule ok={hasUppercase} label="Include an uppercase letter" />
          </View>

          {/* Erreur */}
          {error !== '' && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Bouton Reset */}
          <TouchableOpacity
            style={[styles.resetBtn, loading && { opacity: 0.7 }]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.resetBtnText}>Reset Password</Text>
                <Text style={styles.resetBtnArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backToLogin}>Back to Login →</Text>
          </TouchableOpacity>

        </View>

        {/* Vague verte en bas */}
        <View style={[styles.bottomShapes, { paddingBottom: insets.bottom }]}>
          <Svg
            width={width}
            height={160}
            viewBox={`0 0 ${width} 160`}
            style={StyleSheet.absoluteFill}
          >
            <Path
              d={`M0,80 Q${width * 0.2},10 ${width * 0.5},50 Q${width * 0.75},90 ${width},30 L${width},160 L0,160 Z`}
              fill="#0D6B5E"
            />
          </Svg>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: width * 0.07,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -37,
    backgroundColor: '#FFFFFF',
  },
  backIcon: {
    width: 70,
    height: 70,
    tintColor: '#0D6B5E',
  },
  logo: {
    width: width * 0.2,
    height: width * 0.2,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: width * 0.048,
    fontWeight: '800',
    color: '#0D6B5E',
    letterSpacing: 3,
  },
  brandSub: {
    fontSize: width * 0.028,
    color: '#0D6B5E',
    letterSpacing: 1,
    fontWeight: '500',
  },
  goldLine: {
    width: width * 0.12,
    height: 2,
    backgroundColor: '#D4A017',
    marginVertical: 14,
  },
  title: {
    fontSize: width * 0.065,
    fontWeight: '700',
    color: '#2C2C2A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: width * 0.035,
    color: '#888780',
    textAlign: 'center',
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
    marginBottom: 12,
  },
  inputIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
    tintColor: '#AAAAAA',
  },
  input: {
    flex: 1,
    fontSize: width * 0.038,
    color: '#2C2C2A',
  },
  eyeIcon: {
    width: 22,
    height: 22,
    tintColor: '#AAAAAA',
  },
  rulesBox: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  ruleIconOk: {
    backgroundColor: '#0D6B5E',
    borderColor: '#0D6B5E',
  },
  ruleCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ruleText: {
    fontSize: width * 0.035,
    color: '#888780',
  },
  ruleTextOk: {
    color: '#0D6B5E',
    fontWeight: '500',
  },
  errorText: {
    color: '#E24B4A',
    fontSize: width * 0.035,
    marginBottom: 12,
    textAlign: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6B5E',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  resetBtnText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  resetBtnArrow: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
  },
  backToLogin: {
    fontSize: width * 0.038,
    color: '#0D6B5E',
    fontWeight: '700',
    marginBottom: 20,
  },
  bottomShapes: {
    height: 160,
    width: width,
    backgroundColor: '#FFFFFF',
  },
})
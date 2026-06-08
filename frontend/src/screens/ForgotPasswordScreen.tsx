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

const { width } = Dimensions.get('window')

export default function ForgotPasswordScreen({ onBack, onSent }: { 
  onBack: () => void
  onSent: (email: string) => void 
}) {  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }
    setLoading(true)
    setError('')
    try {
      // TODO: connecter à l'API reset password
      await new Promise(r => setTimeout(r, 1000))
      onSent(email)
    } catch (e: any) {
      setError('Submission failed. Please try again')
    } finally {
      setLoading(false)
    }
  }

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
          <Text style={styles.title}>Forgot</Text>
          <Text style={styles.titleGold}>Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email or username{'\n'}
            and we'll send you a link to reset your password.
          </Text>

          {/* Si envoyé avec succès */}
          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                ✅ Link sent! Please check your email.
              </Text>
            </View>
          ) : (
            <>
              {/* Email input */}
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../assets/icon-email.png')}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email or Username"
                  placeholderTextColor="#AAAAAA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Erreur */}
              {error !== '' && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Bouton Send */}
              <TouchableOpacity
                style={[styles.sendBtn, loading && { opacity: 0.7 }]}
                onPress={handleSend}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.sendBtnText}>Send Code</Text>
                    <Text style={styles.sendBtnArrow}>→</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* OR */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* Card Remember password */}
          <View style={styles.card}>
            <View style={styles.cardIconBox}>
              <Image
                source={require('../assets/icon-lock.png')}
                style={styles.cardIcon}
              />
            </View>
            <View style={styles.cardTextBox}>
              <Text style={styles.cardTitle}>Remember your password?</Text>
              <Text style={styles.cardSub}>Login to access your account.</Text>
              <TouchableOpacity onPress={onBack}>
                <Text style={styles.cardLink}>Back to Login →</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Vague verte en bas */}
        <View style={styles.bottomShapes}>
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
    marginBottom: -35,
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
    fontSize: width * 0.1,
    fontWeight: '700',
    color: '#2C2C2A',
    alignSelf: 'flex-start',
  },
  titleGold: {
    fontSize: width * 0.1,
    fontWeight: '700',
    color: '#D4A017',
    alignSelf: 'flex-start',
    marginTop: -8,
  },
  subtitle: {
    fontSize: width * 0.035,
    color: '#888780',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 28,
    lineHeight: width * 0.052,
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
    marginBottom: 16,
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
  errorText: {
    color: '#E24B4A',
    fontSize: width * 0.035,
    marginBottom: 12,
    textAlign: 'center',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6B5E',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  sendBtnText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sendBtnArrow: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
  },
  successBox: {
    backgroundColor: '#E1F5EE',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  successText: {
    color: '#0D6B5E',
    fontSize: width * 0.038,
    textAlign: 'center',
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDDDDD',
  },
  orText: {
    fontSize: width * 0.033,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    width: 24,
    height: 24,
    tintColor: '#0D6B5E',
  },
  cardTextBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: width * 0.038,
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: width * 0.032,
    color: '#888780',
    marginBottom: 6,
  },
  cardLink: {
    fontSize: width * 0.035,
    color: '#0D6B5E',
    fontWeight: '700',
  },
  bottomShapes: {
    height: 160,
    width: width,
    backgroundColor: '#FFFFFF',
  },
})
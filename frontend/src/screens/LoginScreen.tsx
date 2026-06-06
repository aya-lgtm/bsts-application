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
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

const { width, height } = Dimensions.get('window')

export default function LoginScreen({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F5F3EE' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tout le contenu */}
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>

          {/* Logo */}
          <Image
            source={require('../assets/logo1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>BOSTON</Text>
          <Text style={styles.brandSub}>SCIENCE & TECH SCHOOL</Text>
          <View style={styles.goldLine} />

          {/* Welcome */}
          <Text style={styles.welcomeTitle}>Welcome</Text>
          <Text style={styles.welcomeGold}>Back</Text>
          <Text style={styles.welcomeSub}>Login to continue your journey</Text>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>✉️</Text>
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

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#AAAAAA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Remember me + Forgot Password */}
          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={styles.rememberLeft}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In */}
          <TouchableOpacity style={styles.signInBtn} onPress={onFinish}>
            <Text style={styles.signInText}>Sign In</Text>
            <Text style={styles.signInArrow}>→</Text>
          </TouchableOpacity>

        </View>

        {/* Formes courbées — dans le ScrollView, collées après le contenu */}
        <View style={styles.bottomShapes}>

         {/* Vague verte */}
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

          {/* Create Account */}
          <View style={[styles.createAccountRow, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.createAccountIcon}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
            <View>
              <Text style={styles.noAccountText}>Don't have an account?</Text>
              <TouchableOpacity>
                <Text style={styles.createAccountText}>Create Account →</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: width * 0.07,
    backgroundColor: '#F5F3EE',
  },
  logo: {
    width: width * 0.22,
    height: width * 0.22,
    marginBottom: 8,
    alignSelf: 'center',
  },
  brandTitle: {
    fontSize: width * 0.05,
    fontWeight: '800',
    color: '#0D6B5E',
    letterSpacing: 3,
    alignSelf: 'center',
  },
  brandSub: {
    fontSize: width * 0.03,
    color: '#0D6B5E',
    letterSpacing: 1,
    fontWeight: '500',
    alignSelf: 'center',
  },
  goldLine: {
    width: width * 0.12,
    height: 4,
    backgroundColor: '#D4A017',
    marginVertical: 14,
    alignSelf: 'center',
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
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: width * 0.038,
    color: '#2C2C2A',
  },
  eyeIcon: {
    fontSize: 16,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
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
  signInBtn: {
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
  signInText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  signInArrow: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
  },
  bottomShapes: {
    height: 220,
    width: width,
    backgroundColor: '#F5F3EE',
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
    height: 160,
  },
  createAccountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAccountText: {
    fontSize: width * 0.032,
    color: '#FFFFFF',
  },
  createAccountText: {
    fontSize: width * 0.035,
    color: '#D4A017',
    fontWeight: '700',
  },
})
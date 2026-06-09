import { useState, useRef } from 'react'
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
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { registerUser } from '../services/auth.service'

const { width, height } = Dimensions.get('window')

const LEVELS = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']

const pad = (n: number) => String(n).padStart(2, '0')
const DAYS = Array.from({ length: 31 }, (_, i) => pad(i + 1))
const MONTHS = [
  '01 - January', '02 - February', '03 - March', '04 - April',
  '05 - May', '06 - June', '07 - July', '08 - August',
  '09 - September', '10 - October', '11 - November', '12 - December',
]
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 50 }, (_, i) => String(currentYear - i))

type DropdownField = 'day' | 'month' | 'year' | 'level' | null

// ─── Dropdown via Modal (évite le clipping du ScrollView) ───────────────────
function ModalDropdown({
  value,
  placeholder,
  options,
  onSelect,
  flex,
}: {
  value: string
  placeholder: string
  options: string[]
  onSelect: (v: string) => void
  flex?: number
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<View>(null)
  const [btnLayout, setBtnLayout] = useState({ x: 0, y: 0, w: 0, h: 0 })

  const openModal = () => {
    btnRef.current?.measureInWindow((x, y, w, h) => {
      setBtnLayout({ x, y, w, h })
      setOpen(true)
    })
  }

  // La liste s'affiche sous le bouton si la place le permet, sinon au-dessus
  const listTop = btnLayout.y + btnLayout.h
  const listMaxH = 220
  const showAbove = listTop + listMaxH > height - 40
  const finalTop = showAbove ? btnLayout.y - listMaxH : listTop

  return (
    <View style={{ flex: flex ?? 1 }}>
      <View ref={btnRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.dobPicker, open && styles.dobPickerOpen]}
          onPress={openModal}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.dobPickerText, !value && { color: '#AAAAAA' }]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <Text style={[styles.dropdownArrow, open && styles.dropdownArrowOpen]}>▼</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* Overlay transparent pour fermer en cliquant dehors */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />

        {/* Liste flottante positionnée exactement sous le bouton */}
        <View
          style={[
            styles.modalList,
            {
              position: 'absolute',
              top: finalTop,
              left: btnLayout.x,
              width: btnLayout.w,
              maxHeight: listMaxH,
            },
          ]}
          pointerEvents="box-none"
        >
          <ScrollView
            style={{ maxHeight: listMaxH }}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {options.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.dropdownItem,
                  value === item && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onSelect(item)
                  setOpen(false)
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    value === item && styles.dropdownItemTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}
// ────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen({
  onBack,
  onFinish,
}: {
  onBack: () => void
  onFinish: (userId: string, email: string) => void
}) {
  const insets = useSafeAreaInsets()
  const [role, setRole] = useState<'STUDENT' | 'PARENT'>('STUDENT')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [level, setLevel] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please complete all required fields')
      return
    }
    if (role === 'STUDENT' && (!dobDay || !dobMonth || !dobYear || !level)) {
      setError('Date of birth and education level are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!agreed) {
      setError('You must accept the Terms and Conditions to proceed')
      return
    }
    setLoading(true)
    setError('')
    try {
      const nameParts = fullName.trim().split(' ')
      const prenom = nameParts[0]
      const nom = nameParts.slice(1).join(' ') || prenom

      const data = await registerUser({
        nom,
        prenom,
        email,
        password,
        role,
        phone,
      })
      onFinish(data.userId, data.email)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'An error occurred during registration')
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
        {/* ── Header vert ───────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0D6B5E', '#085048']}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Image source={require('../assets/icon_back.png')} style={styles.backIconImg} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>BOSTON</Text>
            <Text style={styles.headerSub}>SCIENCE & TECH SCHOOL</Text>
          </View>
          <Svg
            width={width}
            height={40}
            viewBox={`0 0 ${width} 40`}
            style={{ position: 'absolute', bottom: -1 }}
          >
            <Path
              d={`M0,20 Q${width * 0.25},0 ${width * 0.5},20 Q${width * 0.75},40 ${width},20 L${width},40 L0,40 Z`}
              fill="#EAA60F"
              opacity={0.6}
            />
            <Path
              d={`M0,30 Q${width * 0.25},10 ${width * 0.5},25 Q${width * 0.75},40 ${width},25 L${width},40 L0,40 Z`}
              fill="#FFFFFF"
            />
          </Svg>
        </LinearGradient>

        {/* ── Contenu ───────────────────────────────────────────────── */}
        <View style={[styles.content, { paddingTop: 30 }]}>
          {/* Titre */}
          <View style={styles.titleRow}>
            <Text style={styles.createText}>Create </Text>
            <Text style={styles.createGold}>Account</Text>
          </View>
          <View style={styles.goldUnderline} />
          <Text style={styles.subtitle}>Let's get you started</Text>

          {/* Sélecteur de rôle */}
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'STUDENT' && styles.roleBtnActive]}
              onPress={() => setRole('STUDENT')}
            >
              <Image
                source={require('../assets/icon_student.png')}
                style={[styles.roleIconImg, role === 'STUDENT' && styles.roleIconActive]}
              />
              <Text style={[styles.roleText, role === 'STUDENT' && styles.roleTextActive]}>
                Student
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'PARENT' && styles.roleBtnActive]}
              onPress={() => setRole('PARENT')}
            >
              <Image
                source={require('../assets/icon_parent.png')}
                style={[styles.roleIconImg, role === 'PARENT' && styles.roleIconActive]}
              />
              <Text style={[styles.roleText, role === 'PARENT' && styles.roleTextActive]}>
                Parent
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <Image source={require('../assets/icon_user.png')} style={styles.iconImg} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#AAAAAA"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Image source={require('../assets/icon-email.png')} style={styles.iconImg} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#AAAAAA"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone */}
          <View style={styles.inputWrapper}>
            <Image source={require('../assets/icon_phone.png')} style={styles.iconImg} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (optional)"
              placeholderTextColor="#AAAAAA"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* ── Champs Étudiant ──────────────────────────────────────── */}
          {role === 'STUDENT' && (
            <>
              {/* Date de naissance */}
              <View style={styles.dobRow}>
                <Image source={require('../assets/icon_dob.png')} style={styles.dobIcon} />
                <Text style={styles.dobLabel}>Date of birth</Text>
              </View>
              <View style={styles.dobSelectors}>
                <ModalDropdown
                  value={dobDay}
                  placeholder="Day"
                  options={DAYS}
                  onSelect={setDobDay}
                />
                <ModalDropdown
                  value={dobMonth}
                  placeholder="Month"
                  options={MONTHS}
                  onSelect={setDobMonth}
                  flex={2}
                />
                <ModalDropdown
                  value={dobYear}
                  placeholder="Year"
                  options={YEARS}
                  onSelect={setDobYear}
                />
              </View>

              {/* Current Level */}
              <View style={styles.dobRow}>
                <Image source={require('../assets/icon_level.png')} style={styles.dobIcon} />
                <Text style={styles.dobLabel}>Current Level</Text>
              </View>
              <View style={{ width: '100%', marginBottom: 16 }}>
                <ModalDropdown
                  value={level}
                  placeholder="Select your level"
                  options={LEVELS}
                  onSelect={setLevel}
                />
              </View>
            </>
          )}

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Image source={require('../assets/icon-lock.png')} style={styles.iconImg} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#AAAAAA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Image
                source={
                  showPassword
                    ? require('../assets/icon-eye-off.png')
                    : require('../assets/icon-eye.png')
                }
                style={styles.iconImg}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Image source={require('../assets/icon-lock.png')} style={styles.iconImg} />
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
                source={
                  showConfirm
                    ? require('../assets/icon-eye-off.png')
                    : require('../assets/icon-eye.png')
                }
                style={styles.iconImg}
              />
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)}>
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
            </Text>
          </TouchableOpacity>

          {error !== '' && <Text style={styles.errorText}>{error}</Text>}

          {/* Bouton */}
          <TouchableOpacity
            style={[styles.createBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.createBtnText}>Create Account</Text>
                <Text style={styles.createBtnArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
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
  header: {
    paddingBottom: 50,
    paddingHorizontal: width * 0.05,
    position: 'relative',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -35,
  },
  backIconImg: {
    width: 60,
    height: 60,
    tintColor: '#FFFFFF',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerLogo: {
    width: width * 0.18,
    height: width * 0.18,
    tintColor: '#FFFFFF',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: width * 0.06,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: width * 0.03,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: width * 0.07,
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  createText: {
    fontSize: width * 0.08,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  createGold: {
    fontSize: width * 0.08,
    fontWeight: '700',
    color: '#D4A017',
  },
  goldUnderline: {
    width: width * 0.25,
    height: 3,
    backgroundColor: '#D4A017',
    marginTop: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
    marginLeft: width * 0.07,
  },
  subtitle: {
    fontSize: width * 0.035,
    color: '#888780',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  roleBtnActive: {
    borderColor: '#0D6B5E',
    backgroundColor: '#E1F5EE',
  },
  roleIconImg: {
    width: 30,
    height: 30,
    tintColor: '#AAAAAA',
  },
  roleIconActive: {
    tintColor: '#0D6B5E',
  },
  roleText: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#888780',
  },
  roleTextActive: {
    color: '#0D6B5E',
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
  iconImg: {
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
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  dobIcon: {
    width: 22,
    height: 22,
    tintColor: '#0D6B5E',
  },
  dobLabel: {
    fontSize: width * 0.038,
    fontWeight: '600',
    color: '#2C2C2A',
  },
  dobSelectors: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  // Bouton du dropdown
  dobPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dobPickerOpen: {
    borderColor: '#0D6B5E',
  },
  dobPickerText: {
    fontSize: width * 0.033,
    color: '#2C2C2A',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#AAAAAA',
    marginLeft: 4,
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
    color: '#0D6B5E',
  },
  // Liste flottante via Modal
  modalList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0D6B5E',
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: {
    backgroundColor: '#E1F5EE',
  },
  dropdownItemText: {
    fontSize: width * 0.035,
    color: '#2C2C2A',
  },
  dropdownItemTextActive: {
    color: '#0D6B5E',
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
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
  termsText: {
    fontSize: width * 0.035,
    color: '#2C2C2A',
    flex: 1,
  },
  termsLink: {
    color: '#D4A017',
    fontWeight: '600',
  },
  errorText: {
    color: '#E24B4A',
    fontSize: width * 0.035,
    marginBottom: 12,
    textAlign: 'center',
  },
  createBtn: {
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
  createBtnText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  createBtnArrow: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    fontSize: width * 0.035,
    color: '#888780',
  },
  loginLink: {
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
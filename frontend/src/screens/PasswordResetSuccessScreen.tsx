import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

const { width } = Dimensions.get('window')

export default function PasswordResetSuccessScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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

        {/* Icône succès */}
        <View style={styles.successWrapper}>
          {/* Cercle extérieur gris clair */}
          <View style={styles.outerCircle}>
            {/* Cercle intérieur vert */}
            <View style={styles.innerCircle}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>

          {/* Étoiles décoratives */}
          <Text style={[styles.star, { top: 0, left: width * 0.12 }]}>✦</Text>
          <Text style={[styles.star, { top: 10, right: width * 0.1 }]}>✦</Text>
          <Text style={[styles.starSmall, { bottom: 10, left: width * 0.08 }]}>✦</Text>
          <Text style={[styles.starSmall, { bottom: 0, right: width * 0.12 }]}>✦</Text>
        </View>

        {/* Texte */}
        <Text style={styles.title}>Password Reset</Text>
        <Text style={styles.titleGold}>Successful!</Text>
        <Text style={styles.subtitle}>
          Your password has been updated{'\n'}successfully.
        </Text>

        {/* Bouton Back to Login */}
        <TouchableOpacity style={styles.loginBtn} onPress={onBack}>
          <Text style={styles.loginBtnText}>Back to Login</Text>
          <Text style={styles.loginBtnArrow}>→</Text>
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

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  successWrapper: {
    width: width * 0.55,
    height: width * 0.55,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
    marginTop: 10,
  },
  outerCircle: {
    width: width * 0.42,
    height: width * 0.42,
    borderRadius: width * 0.21,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    backgroundColor: '#0D6B5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: width * 0.12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  star: {
    position: 'absolute',
    fontSize: 18,
    color: '#0D6B5E',
  },
  starSmall: {
    position: 'absolute',
    fontSize: 12,
    color: '#0D6B5E',
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: '700',
    color: '#2C2C2A',
    textAlign: 'center',
  },
  titleGold: {
    fontSize: width * 0.07,
    fontWeight: '700',
    color: '#D4A017',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: width * 0.038,
    color: '#888780',
    textAlign: 'center',
    lineHeight: width * 0.058,
    marginBottom: 36,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6B5E',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    gap: 10,
  },
  loginBtnText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  loginBtnArrow: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
  },
  bottomShapes: {
    height: 160,
    width: width,
    backgroundColor: '#FFFFFF',
  },
})
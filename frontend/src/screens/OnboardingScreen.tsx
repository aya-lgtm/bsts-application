import { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

const { width, height } = Dimensions.get('window')

// Dans slides[], remplace icon par iconImage :
const slides = [
  {
    id: '1',
    image: require('../assets/onboarding1.png'),
    iconImage: require('../assets/icon_book.png'),      // 📖 → ton image livre
    titleWhite: 'ACADEMIC',
    titleGold: 'EXCELLENCE',
    description: 'Develop knowledge, discipline, and confidence through a high-quality educational experience.',
  },
  {
    id: '2',
    image: require('../assets/onboarding2.png'),
    iconImage: require('../assets/icon_atom.png'),      // ⚛️ → ton image atome
    titleWhite: 'SCIENCE &',
    titleGold: 'TECHNOLOGY',
    description: 'Discover innovation through STEM learning, digital skills, robotics, and scientific exploration.',
  },
  {
    id: '3',
    image: require('../assets/onboarding3.png'),
    iconImage: require('../assets/icon_rocket.png'),    // 🏆 → ton image fusée
    titleWhite: 'FUTURE',
    titleGold: 'READY',
    description: 'Prepare for university, leadership, and success in an ever-changing world.',
  },
]

export default function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
      setCurrentIndex(currentIndex + 1)
    } else {
      onFinish()
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width)
          setCurrentIndex(index)
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>

            {/* Header blanc avec courbe en bas */}
            <View style={styles.headerWrapper}>
              <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.logoRow}>
                  <Image
                    source={require('../assets/logo1.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={styles.headerTitle}>BOSTON</Text>
                    <Text style={styles.headerSub}>SCIENCE &</Text>
                    <Text style={styles.headerSub}>TECH SCHOOL</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onFinish}>
                  <Text style={styles.skipText}>SKIP</Text>
                </TouchableOpacity>
              </View>

              {/* Photo */}
              <Image
                source={item.image}
                style={styles.photo}
                resizeMode="cover"
              />

              {/* Courbe verte par dessus le bas de la photo */}
              <View style={styles.curveWrapper}>
                <Svg
                  width={width}
                  height={60}
                  viewBox={`0 0 ${width} 60`}
                  style={styles.curveSvg}
                >
                  <Path
                    d={`M0,0 Q${width / 2},60 ${width},0 L${width},60 L0,60 Z`}
                    fill="#0D6B5E"
                  />
                </Svg>
              </View>
            </View>

            {/* Partie verte */}
            <LinearGradient
              colors={['#0D6B5E', '#085048']}
              style={styles.bottomSection}
            >
              {/* Icône dorée */}
              <View style={styles.iconCircle}>
  <Image
    source={item.iconImage}
    style={styles.iconImage}
    resizeMode="contain"
  />
</View>

              <Text style={styles.titleWhite}>{item.titleWhite}</Text>
              <Text style={styles.titleGold}>{item.titleGold}</Text>
              <View style={styles.goldLine} />
              <Text style={styles.description}>{item.description}</Text>
            </LinearGradient>

          </View>
        )}
      />

      {/* Footer */}
      <LinearGradient
        colors={['#085048', '#063D38']}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.nextBtn,
            currentIndex === slides.length - 1 && styles.nextBtnFull,
          ]}
          onPress={goNext}
        >
          <Text style={[
            styles.nextText,
            currentIndex === slides.length - 1 && styles.nextTextDark,
          ]}>
            {currentIndex === slides.length - 1 ? 'GET STARTED >' : 'NEXT >'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D6B5E',
  },
  slide: {
    width,
    flex: 1,
  },
  headerWrapper: {
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: width * 0.12,
    height: width * 0.12,
  },
  headerTitle: {
    fontSize: width * 0.038,
    fontWeight: '800',
    color: '#0D6B5E',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: width * 0.028,
    color: '#0D6B5E',
    fontWeight: '500',
  },
  skipText: {
    fontSize: width * 0.035,
    fontWeight: '700',
    color: '#2C2C2A',
    letterSpacing: 1,
  },
  photo: {
    width,
    height: height * 0.42,
  },
  curveWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  curveSvg: {
    position: 'absolute',
    bottom: -20,
  },
  bottomSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width * 0.08,
    paddingTop: height * 0.03,
  },
  iconCircle: {
    width: width * 0.16,
    height: width * 0.16,
    borderRadius: width * 0.08,
    backgroundColor: '#D4A017',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(width * 0.08),
    marginBottom: height * 0.015,
    zIndex: 10,
  },
  iconImage: {
  width: width * 0.12,
  height: width * 0.12,
},
  titleWhite: {
    fontSize: width * 0.075,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  titleGold: {
    fontSize: width * 0.075,
    fontWeight: '800',
    color: '#D4A017',
    letterSpacing: 2,
    textAlign: 'center',
  },
  goldLine: {
    width: width * 0.12,
    height: 2,
    backgroundColor: '#D4A017',
    marginVertical: height * 0.015,
  },
  description: {
    fontSize: width * 0.037,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: width * 0.055,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.07,
    paddingTop: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#D4A017',
    width: 24,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  nextBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  nextBtnFull: {
    backgroundColor: '#D4A017',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  nextText: {
    fontSize: width * 0.04,
    fontWeight: '700',
    color: '#D4A017',
    letterSpacing: 1,
  },
  nextTextDark: {
    color: '#2C2C2A',
  },
})
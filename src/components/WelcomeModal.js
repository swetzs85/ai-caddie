import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
  ImageBackground,
} from 'react-native';
import { COLORS, FONTS } from '../theme';

const BANNER_URI = 'https://swetzs85.github.io/ai-caddie/banner.png';

export default function WelcomeModal({ visible, onDismiss }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <ImageBackground
          source={{ uri: BANNER_URI }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Art the Caddie</Text>
            <Text style={styles.heroSub}>Your personal golf strategist</Text>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.welcomeTitle}>Welcome to Art the Caddie!</Text>
          <Text style={styles.welcomeText}>
            Get a personalized hole-by-hole game plan for any round, tailored to your clubs, shot shape, and real-time weather.
          </Text>

          <View style={styles.step}>
            <Text style={styles.stepNum}>1</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Set Up Your Bag</Text>
              <Text style={styles.stepText}>Add your clubs, carry distances, shot shape, and tendencies.</Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>2</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Plan a Round</Text>
              <Text style={styles.stepText}>Pick your course and date. We fetch the weather and build your strategy.</Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>3</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Play & Learn</Text>
              <Text style={styles.stepText}>Log post-round notes and track your progress over time.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={onDismiss}>
            <Text style={styles.startBtnText}>Let's Go!</Text>
          </TouchableOpacity>

          <Text style={styles.tip}>
            Tip: Start by tapping "Edit" on the My Profile tab to customize your profile.
          </Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { paddingBottom: 40 },
  hero: { width: '100%', height: 200 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: {
    flex: 1, backgroundColor: 'rgba(13,51,17,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: { fontSize: 42, ...FONTS.bold, color: COLORS.white },
  heroSub: { fontSize: 16, color: COLORS.accentLight, marginTop: 4 },
  content: { padding: 24 },
  welcomeTitle: { fontSize: 24, ...FONTS.bold, color: COLORS.primary, marginBottom: 10 },
  welcomeText: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 24 },
  step: { flexDirection: 'row', marginBottom: 18, gap: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    color: COLORS.white, fontSize: 18, ...FONTS.bold, textAlign: 'center', lineHeight: 36,
    overflow: 'hidden',
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 16, ...FONTS.semiBold, color: COLORS.text },
  stepText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  startBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 20,
  },
  startBtnText: { color: COLORS.white, fontSize: 18, ...FONTS.bold },
  tip: { textAlign: 'center', fontSize: 12, color: COLORS.textLight, marginTop: 14, fontStyle: 'italic' },
});

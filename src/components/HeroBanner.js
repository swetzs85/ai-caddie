import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';

const BANNER_URI = 'https://swetzs85.github.io/ai-caddie/banner.png';

export default function HeroBanner({ title, subtitle, rightContent, children }) {
  return (
    <ImageBackground
      source={{ uri: BANNER_URI }}
      style={styles.banner}
      imageStyle={styles.bannerImage}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.textSection}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightContent}
        </View>
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    minHeight: 120,
  },
  bannerImage: {
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 51, 17, 0.72)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textSection: { flex: 1 },
  title: { fontSize: 26, ...FONTS.bold, color: COLORS.white },
  subtitle: { fontSize: 13, color: COLORS.accentLight, marginTop: 4 },
});

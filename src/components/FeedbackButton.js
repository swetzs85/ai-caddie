import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Linking } from 'react-native';
import { COLORS, FONTS } from '../theme';

export default function FeedbackButton() {
  const handlePress = () => {
    const subject = encodeURIComponent('Art the Caddie Feedback');
    const body = encodeURIComponent('Hi Scott,\n\nHere is my feedback on the AI Caddie app:\n\n');
    const url = 'mailto:scott.f.swetz@gmail.com?subject=' + subject + '&body=' + body;
    if (Platform.OS === 'web') {
      window.open(url, '_self');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress}>
      <Text style={styles.text}>{'\u2709\uFE0F'} Send Feedback</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginHorizontal: 16, marginTop: 24, marginBottom: 12,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.textSecondary, backgroundColor: COLORS.white,
  },
  text: { fontSize: 15, ...FONTS.semiBold, color: COLORS.textSecondary },
});

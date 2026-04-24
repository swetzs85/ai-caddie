import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';
import HeroBanner from '../components/HeroBanner';
import FeedbackButton from '../components/FeedbackButton';
import { loadProfile, saveProfile } from '../storage/store';

const SHOT_SHAPES = ['Straight', 'Draw', 'Fade'];
const TEE_OPTIONS = ['Championship', 'Blue', 'White', 'Yellow', 'Red'];
const MISS_DIRS = ['left', 'right', 'straight', 'thin/long', 'fat/short'];
const SEVERITIES = ['slight', 'moderate', 'severe'];
const PATTERNS = ['hook', 'slice', 'pull', 'push', 'block'];
const FREQUENCIES = ['rarely', 'sometimes', 'occasionally', 'often'];

function cap(s) { return (s || '').replace(/\b\w/g, c => c.toUpperCase()); }

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile().then(p => {
        if (!p.preRoundReminders) p.preRoundReminders = { technical: '', tactical: '', mental: '' };
        if (p.enhancedTracking === undefined) p.enhancedTracking = false;
        if (!p.shotShape) p.shotShape = 'straight';
        const defT = { miss: '', severity: '', pattern: '', altMiss: '', altFreq: '' };
        ['driver', 'woods', 'irons', 'wedges'].forEach(k => {
          p.tendencies[k] = { ...defT, ...p.tendencies[k] };
        });
        setProfile(p);
      });
    }, [])
  );

  if (!profile) return null;

  const updateField = (path, value) => {
    const updated = JSON.parse(JSON.stringify(profile));
    const keys = path.split('.');
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    setProfile(updated);
  };

  const updateClub = (index, field, value) => {
    const updated = JSON.parse(JSON.stringify(profile));
    if (field.includes('yard')) {
      const stripped = value.replace(/[^0-9]/g, '');
      updated.bag[index][field] = stripped === '' ? '' : parseInt(stripped);
    } else {
      updated.bag[index][field] = value;
    }
    setProfile(updated);
  };

  const handleSave = async () => {
    await saveProfile(profile);
    setEditing(false);
    if (Platform.OS === 'web') {
      window.alert('Your profile has been updated.');
    } else {
      Alert.alert('Saved', 'Your profile has been updated.');
    }
  };

  const editButton = (
    <TouchableOpacity
      style={[styles.editBtn, editing && styles.saveBtn]}
      onPress={editing ? handleSave : () => setEditing(true)}
    >
      <Text style={styles.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>
    </TouchableOpacity>
  );

  const reminders = profile.preRoundReminders || { technical: '', tactical: '', mental: '' };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <HeroBanner
          title="My Golf Profile"
          subtitle="Your personal golf strategist"
          rightContent={editButton}
        />

        {/* Golfer info */}
        <Card>
          <Text style={styles.sectionTitle}>{'\u26F3'} Golfer Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            {editing ? (
              <TextInput style={styles.inlineInput} value={profile.name}
                onChangeText={(v) => updateField('name', v)} placeholder="Your name" />
            ) : (
              <Text style={styles.value}>{profile.name}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Handicap</Text>
            {editing ? (
              <View style={styles.handicapEdit}>
                <TextInput style={styles.smallInput} value={String(profile.handicap.low)}
                  onChangeText={(v) => updateField('handicap.low', parseInt(v) || 0)}
                  keyboardType="number-pad" maxLength={2} />
                <Text style={styles.handicapDash}> - </Text>
                <TextInput style={styles.smallInput} value={String(profile.handicap.high)}
                  onChangeText={(v) => updateField('handicap.high', parseInt(v) || 0)}
                  keyboardType="number-pad" maxLength={2} />
              </View>
            ) : (
              <Badge label={profile.handicap.low + ' - ' + profile.handicap.high} color={COLORS.accent} textColor={COLORS.primaryDark} />
            )}
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Preferred Tee</Text>
            {editing ? (
              <View style={styles.chipRow}>
                {TEE_OPTIONS.map(t => (
                  <TouchableOpacity key={t}
                    style={[styles.chip, profile.preferences.preferredTee === t && styles.chipActive]}
                    onPress={() => updateField('preferences.preferredTee', t)}>
                    <Text style={[styles.chipText, profile.preferences.preferredTee === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Badge label={profile.preferences.preferredTee} color={COLORS.primary} />
            )}
          </View>
        </Card>

        {/* Pre-Round Reminders */}
        <Card style={styles.remindersCard}>
          <Text style={styles.sectionTitle}>{'\uD83E\uDDE0'} Pre-Round Reminders</Text>
          <Text style={styles.hintText}>These show at the top of every hole during your round</Text>

          <View style={styles.reminderItem}>
            <View style={styles.reminderLabelRow}>
              <View style={[styles.reminderDot, { backgroundColor: '#1565C0' }]} />
              <Text style={styles.reminderLabel}>Technical</Text>
            </View>
            {editing ? (
              <TextInput style={styles.reminderInput} value={reminders.technical}
                onChangeText={(v) => updateField('preRoundReminders.technical', v)}
                placeholder="e.g., Full shoulder turn, stay balanced" multiline />
            ) : (
              <Text style={styles.reminderValue}>{reminders.technical || 'Tap Edit to add'}</Text>
            )}
          </View>

          <View style={styles.reminderItem}>
            <View style={styles.reminderLabelRow}>
              <View style={[styles.reminderDot, { backgroundColor: '#2E7D32' }]} />
              <Text style={styles.reminderLabel}>Tactical</Text>
            </View>
            {editing ? (
              <TextInput style={styles.reminderInput} value={reminders.tactical}
                onChangeText={(v) => updateField('preRoundReminders.tactical', v)}
                placeholder="e.g., Play to the fat side of the green" multiline />
            ) : (
              <Text style={styles.reminderValue}>{reminders.tactical || 'Tap Edit to add'}</Text>
            )}
          </View>

          <View style={[styles.reminderItem, { borderBottomWidth: 0 }]}>
            <View style={styles.reminderLabelRow}>
              <View style={[styles.reminderDot, { backgroundColor: '#E65100' }]} />
              <Text style={styles.reminderLabel}>Mental</Text>
            </View>
            {editing ? (
              <TextInput style={styles.reminderInput} value={reminders.mental}
                onChangeText={(v) => updateField('preRoundReminders.mental', v)}
                placeholder="e.g., One shot at a time, commit to the target" multiline />
            ) : (
              <Text style={styles.reminderValue}>{reminders.mental || 'Tap Edit to add'}</Text>
            )}
          </View>
        </Card>

        {/* Shot Shape */}
        <Card>
          <Text style={styles.sectionTitle}>{'\uD83C\uDFAF'} Shot Shape</Text>
          <View style={styles.shapeRow}>
            {SHOT_SHAPES.map(s => {
              const val = s.toLowerCase();
              const isActive = (profile.shotShape || 'straight') === val;
              const icons = { Straight: '\u2B06\uFE0F', Draw: '\u21A9\uFE0F', Fade: '\u21AA\uFE0F' };
              const descs = { Straight: 'Minimal curve', Draw: 'Right to left', Fade: 'Left to right' };
              return (
                <TouchableOpacity key={s}
                  style={[styles.shapeOption, isActive && styles.shapeOptionActive]}
                  onPress={() => updateField('shotShape', val)} disabled={!editing}>
                  <Text style={styles.shapeIcon}>{icons[s]}</Text>
                  <Text style={[styles.shapeName, isActive && styles.shapeNameActive]}>{s}</Text>
                  <Text style={[styles.shapeDescSmall, isActive && styles.shapeDescActive]}>{descs[s]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Miss Tendencies */}
        <Card>
          <Text style={styles.sectionTitle}>{'\uD83D\uDCA8'} Miss Tendencies</Text>
          {!editing ? (
            <>
              {[
                { key: 'driver', label: 'Driver / Woods', emoji: '\uD83D\uDCA8', bg: '#E3F2FD',
                  text: 'Miss ' + cap(profile.tendencies.driver.severity || '') + ' ' + cap(profile.tendencies.driver.miss || '') + (profile.tendencies.driver.altMiss ? ', ' + cap(profile.tendencies.driver.altFreq || 'sometimes') + ' ' + cap(profile.tendencies.driver.altMiss) : '') },
                { key: 'irons', label: 'Irons', emoji: '\uD83C\uDFCC\uFE0F', bg: '#E8F5E9',
                  text: 'Miss ' + cap(profile.tendencies.irons.miss || '') + (profile.tendencies.irons.pattern ? ' (' + cap(profile.tendencies.irons.pattern) + ')' : '') + (profile.tendencies.irons.altMiss ? ', ' + cap(profile.tendencies.irons.altFreq || 'sometimes') + ' ' + cap(profile.tendencies.irons.altMiss) : '') },
                { key: 'wedges', label: 'Wedges', emoji: '\u26F3', bg: '#FFF8E1',
                  text: 'Miss ' + cap(profile.tendencies.wedges.miss || '') + (profile.tendencies.wedges.altMiss ? ', ' + cap(profile.tendencies.wedges.altFreq || 'occasionally') + ' ' + cap(profile.tendencies.wedges.altMiss) : '') },
              ].map((t, i, arr) => (
                <View key={t.key} style={[styles.tendencyRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.tendencyIcon, { backgroundColor: t.bg }]}>
                    <Text style={styles.tendencyEmoji}>{t.emoji}</Text>
                  </View>
                  <View style={styles.tendencyContent}>
                    <Text style={styles.tendencyLabel}>{t.label}</Text>
                    <Text style={styles.tendencyText}>{t.text}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <TendencyEditor label="Driver / Woods" emoji={'\uD83D\uDCA8'} bg="#E3F2FD"
                tendency={profile.tendencies.driver} showSeverity showPattern={false}
                onChange={(field, val) => {
                  const updated = JSON.parse(JSON.stringify(profile));
                  updated.tendencies.driver[field] = val;
                  updated.tendencies.woods[field] = val;
                  setProfile(updated);
                }} />
              <TendencyEditor label="Irons" emoji={'\uD83C\uDFCC\uFE0F'} bg="#E8F5E9"
                tendency={profile.tendencies.irons} showSeverity={false} showPattern
                onChange={(field, val) => updateField('tendencies.irons.' + field, val)} />
              <TendencyEditor label="Wedges" emoji={'\u26F3'} bg="#FFF8E1"
                tendency={profile.tendencies.wedges} showSeverity={false} showPattern={false}
                onChange={(field, val) => updateField('tendencies.wedges.' + field, val)} />
            </>
          )}
        </Card>

        {/* Enhanced Tracking Toggle */}
        <Card style={styles.trackingCard}>
          <View style={styles.trackingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{'\uD83D\uDCCA'} Enhanced Round Tracking</Text>
              <Text style={styles.hintText}>
                Track extra stats: drive location, distance to pin after approach, putt distances. Provides deeper insights after your round.
              </Text>
            </View>
            <Switch
              value={profile.enhancedTracking || false}
              onValueChange={(v) => updateField('enhancedTracking', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={profile.enhancedTracking ? COLORS.primary : '#f4f3f4'}
              disabled={!editing}
            />
          </View>
        </Card>

        {/* Clubs */}
        <Card style={styles.bagCard}>
          <Text style={styles.sectionTitle}>{'\uD83C\uDFCC\uFE0F\u200D\u2642\uFE0F'} My Clubs</Text>
          <View style={styles.clubHeader}>
            <Text style={[styles.clubHeaderText, { flex: 2 }]}>Club</Text>
            <Text style={[styles.clubHeaderText, { flex: 1, textAlign: 'center' }]}>Carry</Text>
            <Text style={[styles.clubHeaderText, { flex: 1, textAlign: 'center' }]}>Total</Text>
          </View>
          {profile.bag.map((club, i) => (
            <View key={i} style={[styles.clubRow, i % 2 === 0 && styles.clubRowAlt]}>
              <View style={styles.clubNameCol}>
                <View style={[styles.clubDot, {
                  backgroundColor: club.type === 'wood' ? COLORS.primary :
                    club.type === 'hybrid' ? COLORS.info :
                    club.type === 'iron' ? COLORS.textSecondary : COLORS.accent
                }]} />
                {editing ? (
                  <TextInput
                    style={styles.clubNameInput}
                    value={club.club}
                    onChangeText={(v) => updateClub(i, 'club', v)}
                    editable={true}
                    selectTextOnFocus={true}
                  />
                ) : (
                  <Text style={styles.clubNameText}>{club.club}</Text>
                )}
              </View>
              {editing ? (
                <>
                  <TextInput
                    style={styles.clubInput}
                    value={String(club.yardLow === '' ? '' : club.yardLow)}
                    onChangeText={(v) => updateClub(i, 'yardLow', v)}
                    keyboardType="numeric"
                    editable={true}
                    selectTextOnFocus={true}
                    maxLength={3}
                  />
                  <TextInput
                    style={styles.clubInput}
                    value={String(club.yardHigh === '' ? '' : club.yardHigh)}
                    onChangeText={(v) => updateClub(i, 'yardHigh', v)}
                    keyboardType="numeric"
                    editable={true}
                    selectTextOnFocus={true}
                    maxLength={3}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.clubYardText}>{club.yardLow}y</Text>
                  <Text style={styles.clubYardText}>{club.yardHigh}y</Text>
                </>
              )}
            </View>
          ))}
        </Card>

        <FeedbackButton />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TendencyEditor({ label, emoji, bg, tendency, showSeverity, showPattern, onChange }) {
  return (
    <View style={styles.tendencyEditBlock}>
      <View style={styles.tendencyEditHeader}>
        <View style={[styles.tendencyIcon, { backgroundColor: bg }]}>
          <Text style={styles.tendencyEmoji}>{emoji}</Text>
        </View>
        <Text style={styles.tendencyLabel}>{label}</Text>
      </View>

      <Text style={styles.tendencyFieldLabel}>Primary Miss</Text>
      <View style={styles.tendencyChipRow}>
        {MISS_DIRS.map(d => (
          <TouchableOpacity key={d}
            style={[styles.tChip, tendency.miss === d && styles.tChipActive]}
            onPress={() => onChange('miss', d)}>
            <Text style={[styles.tChipText, tendency.miss === d && styles.tChipTextActive]}>{cap(d)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showSeverity && (
        <>
          <Text style={styles.tendencyFieldLabel}>Severity</Text>
          <View style={styles.tendencyChipRow}>
            {SEVERITIES.map(s => (
              <TouchableOpacity key={s}
                style={[styles.tChip, tendency.severity === s && styles.tChipActive]}
                onPress={() => onChange('severity', s)}>
                <Text style={[styles.tChipText, tendency.severity === s && styles.tChipTextActive]}>{cap(s)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {showPattern && (
        <>
          <Text style={styles.tendencyFieldLabel}>Miss Pattern</Text>
          <View style={styles.tendencyChipRow}>
            {PATTERNS.map(p => (
              <TouchableOpacity key={p}
                style={[styles.tChip, tendency.pattern === p && styles.tChipActive]}
                onPress={() => onChange('pattern', p)}>
                <Text style={[styles.tChipText, tendency.pattern === p && styles.tChipTextActive]}>{cap(p)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.tendencyFieldLabel}>Secondary Miss (optional)</Text>
      <TextInput style={styles.tendencyTextInput}
        value={tendency.altMiss || ''}
        onChangeText={(v) => onChange('altMiss', v)}
        placeholder="e.g., hard hook, chunk, thin"
        placeholderTextColor={COLORS.textLight} />

      {tendency.altMiss ? (
        <>
          <Text style={styles.tendencyFieldLabel}>How Often?</Text>
          <View style={styles.tendencyChipRow}>
            {FREQUENCIES.map(f => (
              <TouchableOpacity key={f}
                style={[styles.tChip, tendency.altFreq === f && styles.tChipActive]}
                onPress={() => onChange('altFreq', f)}>
                <Text style={[styles.tChipText, tendency.altFreq === f && styles.tChipTextActive]}>{cap(f)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  saveBtn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  editBtnText: { color: COLORS.white, ...FONTS.semiBold, fontSize: 15 },
  sectionTitle: { fontSize: 18, ...FONTS.semiBold, color: COLORS.primary, marginBottom: 8 },
  hintText: { fontSize: 12, color: COLORS.textLight, marginBottom: 12, lineHeight: 16 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  label: { fontSize: 15, color: COLORS.textSecondary },
  value: { fontSize: 15, ...FONTS.medium, color: COLORS.text },
  inlineInput: {
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, fontSize: 15,
    minWidth: 120, textAlign: 'right', color: COLORS.text, backgroundColor: COLORS.white,
  },
  handicapEdit: { flexDirection: 'row', alignItems: 'center' },
  smallInput: {
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 15,
    width: 50, textAlign: 'center', color: COLORS.text, backgroundColor: COLORS.white,
  },
  handicapDash: { fontSize: 16, color: COLORS.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', flex: 1, marginLeft: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, ...FONTS.semiBold },

  remindersCard: {},
  reminderItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reminderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reminderDot: { width: 10, height: 10, borderRadius: 5 },
  reminderLabel: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  reminderInput: {
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.white, minHeight: 40,
  },
  reminderValue: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },

  shapeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  shapeOption: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  shapeOptionActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  shapeIcon: { fontSize: 28, marginBottom: 6 },
  shapeName: { fontSize: 15, ...FONTS.semiBold, color: COLORS.textSecondary },
  shapeNameActive: { color: COLORS.primary },
  shapeDescSmall: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  shapeDescActive: { color: COLORS.primaryLight },

  tendencyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  tendencyIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  tendencyEmoji: { fontSize: 20 },
  tendencyContent: { flex: 1 },
  tendencyLabel: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  tendencyText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  tendencyEditBlock: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8,
  },
  tendencyEditHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tendencyFieldLabel: { fontSize: 12, ...FONTS.semiBold, color: COLORS.textSecondary, marginTop: 8, marginBottom: 4, letterSpacing: 0.3 },
  tendencyChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  tChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tChipText: { fontSize: 12, color: COLORS.text, ...FONTS.medium },
  tChipTextActive: { color: COLORS.white, ...FONTS.semiBold },
  tendencyTextInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.white, marginTop: 4,
  },

  trackingCard: {},
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  bagCard: { paddingHorizontal: 12 },
  clubHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  clubHeaderText: { ...FONTS.bold, fontSize: 13, color: COLORS.primary, letterSpacing: 0.5 },
  clubRow: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  clubRowAlt: { backgroundColor: '#F8FAF8' },
  clubNameCol: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  clubDot: { width: 8, height: 8, borderRadius: 4 },
  clubNameText: { fontSize: 14, ...FONTS.medium, color: COLORS.text },
  clubNameInput: {
    flex: 1, fontSize: 14, ...FONTS.medium, color: COLORS.primary,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.white,
  },
  clubYardText: { flex: 1, textAlign: 'center', fontSize: 14, ...FONTS.medium, color: COLORS.text },
  clubInput: {
    flex: 1, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 8, textAlign: 'center', fontSize: 16,
    marginHorizontal: 4, backgroundColor: COLORS.white, color: COLORS.primary,
    fontWeight: '600', minHeight: 40,
  },
});

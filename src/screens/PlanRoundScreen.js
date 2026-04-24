import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';
import HeroBanner from '../components/HeroBanner';
import FeedbackButton from '../components/FeedbackButton';
import { TURNER_HILL } from '../data/turnerHill';
import { loadProfile, loadCourses, deleteCourse, updateCourseMeta, loadActiveRound, clearActiveRound } from '../storage/store';
import { fetchWeather, windDescription } from '../engine/weather';
import { generateGamePlan } from '../engine/strategy';

export default function PlanRoundScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [allCourses, setAllCourses] = useState([TURNER_HILL]);
  const [selectedCourse, setSelectedCourse] = useState(TURNER_HILL);
  const [dateStr, setDateStr] = useState(getDefaultDate());
  const [tee, setTee] = useState('White');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const [activeRound, setActiveRound] = useState(null);

  const reloadCourses = useCallback(() => {
    loadCourses().then(saved => {
      const combined = [TURNER_HILL, ...saved.filter(c => c.name !== TURNER_HILL.name)];
      setAllCourses(combined);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile().then(p => {
        setProfile(p);
        if (p?.preferences?.preferredTee) setTee(p.preferences.preferredTee);
      });
      reloadCourses();
      loadActiveRound().then(setActiveRound);
    }, [reloadCourses])
  );

  const handleResumeRound = () => {
    if (!activeRound) return;
    navigation.navigate('GamePlan', {
      plan: activeRound.plan,
      course: activeRound.course,
      weather: activeRound.weather,
      tee: activeRound.tee,
      date: activeRound.date,
      resumed: true,
    });
  };

  const handleDiscardRound = () => {
    const msg = 'Discard your in-progress round at ' + (activeRound?.course?.name || 'this course') + '?';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) { clearActiveRound(); setActiveRound(null); }
    } else {
      Alert.alert('Discard Round', msg, [
        { text: 'Keep', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { clearActiveRound(); setActiveRound(null); } },
      ]);
    }
  };

  const handleDeleteCourse = async (course) => {
    const msg = 'Delete "' + course.name + '" from your saved courses?';
    const doDelete = async () => {
      await deleteCourse(course.name);
      reloadCourses();
      if (selectedCourse?.name === course.name) {
        setSelectedCourse(TURNER_HILL);
        setWeather(null);
        setWeatherLoaded(false);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) await doDelete();
    } else {
      Alert.alert('Delete Course', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleEditCourse = async (course, newName, newLocation) => {
    await updateCourseMeta(course.name, newName, newLocation);
    reloadCourses();
    if (selectedCourse?.name === course.name) {
      setSelectedCourse(prev => ({ ...prev, name: newName, location: newLocation }));
    }
  };

  const handleFetchWeather = async () => {
    setLoading(true);
    try {
      const w = await fetchWeather(selectedCourse.lat, selectedCourse.lng, dateStr);
      setWeather(w);
      setWeatherLoaded(true);
    } catch (e) {
      Alert.alert('Error', 'Could not fetch weather data.');
    }
    setLoading(false);
  };

  const handleGeneratePlan = () => {
    if (!profile) {
      Alert.alert('Error', 'Profile not loaded yet.');
      return;
    }
    const plan = generateGamePlan(selectedCourse, profile, weather, tee);
    navigation.navigate('GamePlan', {
      plan,
      course: selectedCourse,
      weather,
      tee,
      date: dateStr,
    });
  };

  const teeOptions = selectedCourse ? Object.keys(selectedCourse.tees) : [];
  const isBuiltIn = (c) => c.name === TURNER_HILL.name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <HeroBanner
        title="Plan a Round"
        subtitle="Pick your course, check the weather, get your game plan"
      />

      {activeRound && (
        <Card>
          <Text style={styles.resumeTitle}>{'\u26A0\uFE0F'} Round In Progress</Text>
          <Text style={styles.resumeDesc}>
            You have an unfinished round at {activeRound.course?.name || 'a course'}.
          </Text>
          <View style={styles.resumeButtons}>
            <TouchableOpacity style={styles.resumeBtn} onPress={handleResumeRound}>
              <Text style={styles.resumeBtnText}>Resume Round</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.discardBtn} onPress={handleDiscardRound}>
              <Text style={styles.discardBtnText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.sectionTitle}>{'\u26F3'} Select Course</Text>
        <CourseDropdown
          courses={allCourses}
          selected={selectedCourse}
          onSelect={(c) => { setSelectedCourse(c); setWeather(null); setWeatherLoaded(false); }}
          onDelete={handleDeleteCourse}
          onEdit={handleEditCourse}
          isBuiltIn={isBuiltIn}
        />
        <TouchableOpacity style={styles.addCourseBtn}
          onPress={() => navigation.navigate('AddCourse')}>
          <Text style={styles.addCourseBtnText}>+ Add New Course</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{'\uD83D\uDCC5'} Date</Text>
        <TextInput
          style={styles.dateInput}
          value={dateStr}
          onChangeText={setDateStr}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textLight}
        />
        <Text style={styles.hint}>
          Weather forecast available up to 16 days out
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{'\uD83C\uDFCC\uFE0F'} Tee Selection</Text>
        <View style={styles.teeRow}>
          {teeOptions.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.teeBtn, tee === t && styles.teeBtnSelected]}
              onPress={() => setTee(t)}
            >
              <Text style={[styles.teeBtnText, tee === t && styles.teeBtnTextSelected]}>
                {t}
              </Text>
              {selectedCourse?.tees[t] && (
                <Text style={[styles.teeYards, tee === t && styles.teeBtnTextSelected]}>
                  {selectedCourse.tees[t].total}y
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <TouchableOpacity style={styles.weatherBtn} onPress={handleFetchWeather} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.weatherBtnText}>
            {weatherLoaded ? 'Refresh Weather' : 'Fetch Weather'}
          </Text>
        )}
      </TouchableOpacity>

      {weather && (
        <Card style={styles.weatherCard}>
          <Text style={styles.sectionTitle}>{'\u26C5'} Weather Forecast</Text>
          <View style={styles.weatherGrid}>
            <WeatherStat label="Temp" value={`${weather.summary.avgTemp}°F`} />
            <WeatherStat label="Wind" value={`${weather.summary.avgWind} mph`} />
            <WeatherStat label="Max Wind" value={`${weather.summary.maxWind} mph`} />
            <WeatherStat label="Direction" value={weather.summary.primaryWindDirLabel} />
            <WeatherStat label="Rain %" value={`${weather.summary.avgRainChance}%`} />
            <WeatherStat label="Conditions" value={windDescription(weather.summary.avgWind)} />
          </View>
        </Card>
      )}

      <TouchableOpacity
        style={[styles.generateBtn, !selectedCourse && styles.generateBtnDisabled]}
        onPress={handleGeneratePlan}
        disabled={!selectedCourse || !profile}
      >
        <Text style={styles.generateBtnText}>Generate Game Plan</Text>
      </TouchableOpacity>

      <FeedbackButton />
    </ScrollView>
  );
}

function CourseDropdown({ courses, selected, onSelect, onDelete, onEdit, isBuiltIn }) {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLoc, setEditLoc] = useState('');

  const startEdit = (c) => {
    setEditName(c.name);
    setEditLoc(c.location);
    setManaging(c.name);
  };

  const saveEdit = (c) => {
    if (editName.trim() && editLoc.trim()) {
      onEdit(c, editName.trim(), editLoc.trim());
    }
    setManaging(null);
  };

  const renderCourseItem = (c) => {
    const active = selected?.name === c.name;
    const builtIn = isBuiltIn(c);
    const isEditing = managing === c.name;

    return (
      <View key={c.name} style={[styles.dropdownItem, active && styles.dropdownItemActive]}>
        {isEditing ? (
          <View style={styles.editCourseWrap}>
            <TextInput style={styles.editCourseInput} value={editName}
              onChangeText={setEditName} placeholder="Course Name" />
            <TextInput style={styles.editCourseInput} value={editLoc}
              onChangeText={setEditLoc} placeholder="City, State" />
            <View style={styles.editCourseBtns}>
              <TouchableOpacity style={styles.editSaveBtn} onPress={() => saveEdit(c)}>
                <Text style={styles.editSaveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setManaging(null)}>
                <Text style={styles.editCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.courseItemRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { onSelect(c); setOpen(false); }}>
              <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{c.name}</Text>
              <Text style={styles.dropdownItemSub}>{c.location}</Text>
            </TouchableOpacity>
            {!builtIn && (
              <View style={styles.courseActions}>
                <TouchableOpacity style={styles.courseActionBtn} onPress={() => startEdit(c)}>
                  <Text style={styles.courseEditIcon}>{'\u270F\uFE0F'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.courseActionBtn} onPress={() => { setOpen(false); onDelete(c); }}>
                  <Text style={styles.courseDeleteIcon}>{'\uD83D\uDDD1\uFE0F'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.dropdownWrap}>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setOpen(!open)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dropdownBtnText}>
              {selected ? selected.name : 'Choose a course...'}
            </Text>
            {selected && <Text style={styles.dropdownBtnSub}>{selected.location}</Text>}
          </View>
          <Text style={styles.dropdownArrow}>{open ? '\u25B2' : '\u25BC'}</Text>
        </TouchableOpacity>
        {open && (
          <View style={styles.dropdownList}>
            {courses.map(renderCourseItem)}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setOpen(true)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dropdownBtnText}>{selected ? selected.name : 'Choose a course...'}</Text>
          {selected && <Text style={styles.dropdownBtnSub}>{selected.location}</Text>}
        </View>
        <Text style={styles.dropdownArrow}>{'\u25BC'}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Course</Text>
            <ScrollView>{courses.map(renderCourseItem)}</ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function WeatherStat({ label, value }) {
  return (
    <View style={styles.weatherStat}>
      <Text style={styles.weatherLabel}>{label}</Text>
      <Text style={styles.weatherValue}>{value}</Text>
    </View>
  );
}

function getDefaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },
  
  sectionTitle: { fontSize: 16, ...FONTS.semiBold, color: COLORS.primary, marginBottom: 10 },
  dropdownWrap: { marginBottom: 10 },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.white,
  },
  dropdownBtnText: { fontSize: 16, ...FONTS.semiBold, color: COLORS.primary },
  dropdownBtnSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dropdownArrow: { fontSize: 14, color: COLORS.primary, marginLeft: 8 },
  dropdownList: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    marginTop: 4, backgroundColor: COLORS.white, maxHeight: 300, overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dropdownItemActive: { backgroundColor: '#E8F5E9' },
  dropdownItemText: { fontSize: 15, ...FONTS.medium, color: COLORS.text },
  dropdownItemTextActive: { color: COLORS.primary, ...FONTS.bold },
  dropdownItemSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  courseItemRow: { flexDirection: 'row', alignItems: 'center' },
  courseActions: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  courseActionBtn: { padding: 6 },
  courseEditIcon: { fontSize: 14 },
  courseDeleteIcon: { fontSize: 14 },
  editCourseWrap: { gap: 6 },
  editCourseInput: {
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  editCourseBtns: { flexDirection: 'row', gap: 8, marginTop: 2 },
  editSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  editSaveBtnText: { color: COLORS.white, fontSize: 12, ...FONTS.semiBold },
  editCancelBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  editCancelBtnText: { color: COLORS.textSecondary, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.primary, textAlign: 'center', marginBottom: 12 },
  modalClose: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalCloseText: { fontSize: 16, color: COLORS.textSecondary, ...FONTS.medium },
  addCourseBtn: {
    padding: 14, borderRadius: 10, borderWidth: 2, borderColor: COLORS.primary,
    borderStyle: 'dashed', alignItems: 'center', backgroundColor: '#F5FFF5',
  },
  addCourseBtnText: { fontSize: 15, ...FONTS.semiBold, color: COLORS.primary },
  dateInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: 14, fontSize: 16, color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  hint: { fontSize: 12, color: COLORS.textLight, marginTop: 6 },
  teeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teeBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white,
    alignItems: 'center', minWidth: 80,
  },
  teeBtnSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  teeBtnText: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  teeBtnTextSelected: { color: COLORS.white },
  teeYards: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  weatherBtn: {
    backgroundColor: COLORS.info, marginHorizontal: 16, marginTop: 12,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  weatherBtnText: { color: COLORS.white, fontSize: 16, ...FONTS.semiBold },
  weatherCard: { backgroundColor: '#E3F2FD' },
  weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weatherStat: {
    width: '30%', backgroundColor: COLORS.white, borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  weatherLabel: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.medium },
  weatherValue: { fontSize: 16, ...FONTS.bold, color: COLORS.text, marginTop: 4 },
  generateBtn: {
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 16,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    ...SHADOWS.medium,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: COLORS.white, fontSize: 18, ...FONTS.bold },
  resumeTitle: { fontSize: 17, ...FONTS.bold, color: '#D35400', marginBottom: 4 },
  resumeDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  resumeButtons: { flexDirection: 'row', gap: 10 },
  resumeBtn: {
    flex: 1, backgroundColor: COLORS.primary, paddingVertical: 12,
    borderRadius: 10, alignItems: 'center',
  },
  resumeBtnText: { color: COLORS.white, fontSize: 15, ...FONTS.semiBold },
  discardBtn: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#C0392B', alignItems: 'center',
  },
  discardBtnText: { color: '#C0392B', fontSize: 15, ...FONTS.semiBold },
});

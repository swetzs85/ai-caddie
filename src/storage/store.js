import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DEFAULT_PROFILE } from '../data/defaultProfile';

const KEYS = {
  PROFILE: '@ai_caddie_profile',
  ROUNDS: '@ai_caddie_rounds',
  COURSES: '@ai_caddie_courses',
  SETUP_DONE: '@ai_caddie_setup_done',
  ACTIVE_ROUND: '@ai_caddie_active_round',
};

// On web, use localforage (IndexedDB) for reliable persistence.
// AsyncStorage maps to localStorage on web, which is fragile on localhost
// (port-scoped, browser may purge). IndexedDB is durable and origin-stable.
let webStore = null;
if (Platform.OS === 'web') {
  const localforage = require('localforage');
  webStore = localforage.createInstance({ name: 'ai_caddie' });
}

const storage = {
  async getItem(key) {
    if (webStore) return webStore.getItem(key);
    return AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    if (webStore) return webStore.setItem(key, value);
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (webStore) return webStore.removeItem(key);
    return AsyncStorage.removeItem(key);
  },
};

export async function isSetupDone() {
  try {
    const val = await storage.getItem(KEYS.SETUP_DONE);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markSetupDone() {
  await storage.setItem(KEYS.SETUP_DONE, 'true');
}

export async function loadProfile() {
  try {
    const raw = await storage.getItem(KEYS.PROFILE);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  }
}

export async function saveProfile(profile) {
  await storage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function loadRounds() {
  try {
    const raw = await storage.getItem(KEYS.ROUNDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveRound(round) {
  const rounds = await loadRounds();
  rounds.unshift({ ...round, id: Date.now().toString(), savedAt: new Date().toISOString() });
  try {
    await storage.setItem(KEYS.ROUNDS, JSON.stringify(rounds));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Storage is full. Try deleting old rounds.' };
  }
}

export async function deleteRound(roundId) {
  const rounds = await loadRounds();
  const filtered = rounds.filter(r => r.id !== roundId);
  await storage.setItem(KEYS.ROUNDS, JSON.stringify(filtered));
}

export async function loadCourses() {
  try {
    const raw = await storage.getItem(KEYS.COURSES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCourse(course) {
  const courses = await loadCourses();
  const idx = courses.findIndex(c => c.name === course.name);
  if (idx >= 0) {
    courses[idx] = course;
  } else {
    courses.push(course);
  }
  try {
    await storage.setItem(KEYS.COURSES, JSON.stringify(courses));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Storage is full. Try deleting unused courses or rounds.' };
  }
}

export async function deleteCourse(courseName) {
  const courses = await loadCourses();
  const filtered = courses.filter(c => c.name !== courseName);
  await storage.setItem(KEYS.COURSES, JSON.stringify(filtered));
}

export async function updateCourseMeta(oldName, newName, newLocation) {
  const courses = await loadCourses();
  const idx = courses.findIndex(c => c.name === oldName);
  if (idx >= 0) {
    courses[idx].name = newName;
    courses[idx].location = newLocation;
    await storage.setItem(KEYS.COURSES, JSON.stringify(courses));
  }
}

export async function saveActiveRound(data) {
  try {
    await storage.setItem(KEYS.ACTIVE_ROUND, JSON.stringify(data));
  } catch { /* storage full — non-critical */ }
}

export async function loadActiveRound() {
  try {
    const raw = await storage.getItem(KEYS.ACTIVE_ROUND);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearActiveRound() {
  await storage.removeItem(KEYS.ACTIVE_ROUND);
}

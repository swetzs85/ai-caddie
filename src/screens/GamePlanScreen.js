import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, Platform, Linking, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';
import HeroBanner from '../components/HeroBanner';
import FeedbackButton from '../components/FeedbackButton';
import { loadProfile, saveActiveRound, loadActiveRound, clearActiveRound } from '../storage/store';
import { getSatelliteUrl } from '../engine/courseLookup';

const DRIVE_LOCATIONS = ['LF', 'CF', 'RF'];
const PUTT_DISTANCES = ['Inside 5ft', '5-10ft', '10-15ft', '15+ft'];

function freshScores(plan) {
  return plan.map(h => ({
    hole: h.number, par: h.par, madePar: null, fir: null,
    approachDist: '', clubUsed: '', gir: null, upAndDown: null,
    putts: '', score: '',
    distToPin: '', driveLocation: '', puttDist: '', puttResult: null,
  }));
}

export default function GamePlanScreen({ route, navigation }) {
  const { plan, course, weather, tee, date, resumed } = route.params;
  const [currentHole, setCurrentHole] = useState(0);
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState(freshScores(plan));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const restore = async () => {
      const saved = resumed ? await loadActiveRound() : null;
      if (saved && saved.scores) {
        setScores(saved.scores);
        setCurrentHole(saved.currentHole || 0);
      }
      setLoaded(true);
    };
    loadProfile().then(setProfile);
    restore();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile().then(setProfile);
    }, [])
  );

  useEffect(() => {
    if (!loaded) return;
    saveActiveRound({ plan, course, weather, tee, date, scores, currentHole });
  }, [scores, currentHole, loaded]);

  const hole = plan[currentHole];
  const holeScore = scores[currentHole];
  const reminders = profile?.preRoundReminders || {};
  const enhanced = profile?.enhancedTracking || false;
  const hasReminders = reminders.technical || reminders.tactical || reminders.mental;

  const cumulativeStats = (() => {
    let totalStrokes = 0;
    let totalPar = 0;
    let holesCompleted = 0;
    for (const s of scores) {
      const sc = parseInt(s.score);
      if (!isNaN(sc) && sc > 0) {
        totalStrokes += sc;
        totalPar += s.par;
        holesCompleted++;
      }
    }
    const overUnder = totalStrokes - totalPar;
    return { totalStrokes, totalPar, overUnder, holesCompleted };
  })();

  const updateScore = (field, value) => {
    const updated = [...scores];
    updated[currentHole] = { ...updated[currentHole], [field]: value };
    setScores(updated);
  };

  const [showRoundMenu, setShowRoundMenu] = useState(false);

  const handleFinishRound = () => {
    clearActiveRound();
    navigation.navigate('PostRound', { plan, course, date, tee, scores, profile });
  };

  const handleRestartRound = () => {
    const msg = 'This will clear all scores and start over from Hole 1. Continue?';
    const doRestart = () => {
      setScores(freshScores(plan));
      setCurrentHole(0);
      setShowRoundMenu(false);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doRestart();
    } else {
      Alert.alert('Restart Round', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: doRestart },
      ]);
    }
  };

  const handleCancelRound = () => {
    const msg = 'This will discard all data for this round and go back. Continue?';
    const doCancel = () => { clearActiveRound(); navigation.goBack(); };
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doCancel();
    } else {
      Alert.alert('Cancel Round', msg, [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <HeroBanner
        title={course.name}
        subtitle={tee + ' Tees | ' + date}
        rightContent={weather ? (
          <View style={styles.weatherBadge}>
            <Text style={styles.weatherTemp}>{weather.summary.avgTemp}{'\u00B0'}F</Text>
            <Text style={styles.weatherWind}>{weather.summary.avgWind}mph {weather.summary.primaryWindDirLabel}</Text>
          </View>
        ) : null}
      />

      {/* Hole selector */}
      <View style={styles.holeSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.holeSelector}>
          {plan.map((h, i) => {
            const s = scores[i];
            const scored = s.score !== '';
            return (
              <TouchableOpacity key={i}
                style={[styles.holeTab, currentHole === i && styles.holeTabActive,
                  scored && currentHole !== i && styles.holeTabScored]}
                onPress={() => setCurrentHole(i)}>
                <Text style={[styles.holeTabNum, currentHole === i && styles.holeTabNumActive]}>{h.number}</Text>
                {scored ? (
                  <Text style={[styles.holeTabScore, currentHole === i && styles.holeTabNumActive]}>{s.score}</Text>
                ) : (
                  <Text style={[styles.holeTabPar, currentHole === i && styles.holeTabParActive]}>P{h.par}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.holeScroll} contentContainerStyle={styles.holeContent}>
        {/* Pre-round reminders */}
        {hasReminders && (
          <Card style={styles.remindersCard}>
            <Text style={styles.remindersTitle}>YOUR REMINDERS</Text>
            {reminders.technical ? (
              <View style={styles.reminderRow}>
                <View style={[styles.rDot, { backgroundColor: '#1565C0' }]} />
                <Text style={styles.reminderText}><Text style={styles.rLabel}>Technical: </Text>{reminders.technical}</Text>
              </View>
            ) : null}
            {reminders.tactical ? (
              <View style={styles.reminderRow}>
                <View style={[styles.rDot, { backgroundColor: '#2E7D32' }]} />
                <Text style={styles.reminderText}><Text style={styles.rLabel}>Tactical: </Text>{reminders.tactical}</Text>
              </View>
            ) : null}
            {reminders.mental ? (
              <View style={styles.reminderRow}>
                <View style={[styles.rDot, { backgroundColor: '#E65100' }]} />
                <Text style={styles.reminderText}><Text style={styles.rLabel}>Mental: </Text>{reminders.mental}</Text>
              </View>
            ) : null}
          </Card>
        )}

        {/* Hole header */}
        <View style={styles.holeHeaderSection}>
          <View style={styles.holeNumberRow}>
            <View>
              <Text style={styles.holeNumber}>Hole {hole.number}</Text>
              <View style={styles.holeMetaRow}>
                <Badge label={'Par ' + hole.par} color={COLORS.primary} />
                <Badge label={hole.yardage + 'y'} color={COLORS.accent} textColor={COLORS.primaryDark} />
                <Badge label={'HCP ' + hole.handicap.men}
                  color={hole.handicap.men <= 6 ? COLORS.danger : COLORS.textLight} />
              </View>
            </View>
          </View>
        </View>

        {/* Hole map section */}
        {(hole.imageUrl || hole.gps || course.websiteUrl) && (
          <Card style={styles.mapCard}>
            {hole.imageUrl ? (
              <Image source={{ uri: hole.imageUrl }} style={styles.holeImage} resizeMode="contain" />
            ) : null}
            <View style={styles.mapLinks}>
              {hole.gps && (
                <TouchableOpacity style={styles.mapBtn} onPress={() => {
                  const url = getSatelliteUrl(hole.gps);
                  if (url) Platform.OS === 'web' ? window.open(url, '_blank') : Linking.openURL(url);
                }}>
                  <Text style={styles.mapBtnText}>{'\uD83D\uDEF0\uFE0F'} Satellite View</Text>
                </TouchableOpacity>
              )}
              {course.websiteUrl ? (
                <TouchableOpacity style={[styles.mapBtn, { backgroundColor: '#2E7D32' }]} onPress={() => {
                  Platform.OS === 'web' ? window.open(course.websiteUrl, '_blank') : Linking.openURL(course.websiteUrl);
                }}>
                  <Text style={styles.mapBtnText}>{'\uD83C\uDFCC\uFE0F'} Course Tour</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>
        )}

        <Text style={styles.holeDesc}>{hole.description}</Text>

        <Card style={styles.strategyCard}>
          <Text style={styles.cardLabel}>COURSE TIP</Text>
          <Text style={styles.cardText}>{hole.courseStrategy}</Text>
        </Card>

        {hole.weatherNote ? (
          <Card style={styles.weatherCard}>
            <Text style={styles.weatherLabel}>WEATHER IMPACT</Text>
            <Text style={styles.cardText}>{hole.weatherNote}</Text>
          </Card>
        ) : null}

        {hole.hazards.length > 0 && (
          <Card style={styles.hazardCard}>
            <Text style={styles.hazardTitle}>HAZARDS</Text>
            <View style={styles.hazardList}>
              {hole.hazards.map((h, i) => (
                <Badge key={i} label={h} color={COLORS.danger} style={{ marginBottom: 2 }} />
              ))}
            </View>
          </Card>
        )}

        {hole.shapeTips && hole.shapeTips.length > 0 && (
          <Card style={styles.shapeCard}>
            <Text style={styles.shapeTitle}>SHOT SHAPE</Text>
            {hole.shapeTips.map((tip, i) => (
              <Text key={i} style={styles.shapeTipText}>{tip}</Text>
            ))}
          </Card>
        )}

        <Text style={styles.shotPlanTitle}>Shot Plan</Text>
        {hole.shots.map((shot) => (
          <Card key={shot.shotNum} style={styles.shotCard}>
            <View style={styles.shotHeader}>
              <View style={styles.shotNumCircle}>
                <Text style={styles.shotNumText}>{shot.shotNum}</Text>
              </View>
              <View style={styles.shotInfo}>
                <Text style={styles.shotType}>{shot.type}</Text>
                <Text style={styles.shotClub}>{shot.club}</Text>
              </View>
              <View style={styles.shotYardage}>
                {shot.adjustedYards ? (
                  <>
                    <Text style={styles.shotYardMain}>{shot.adjustedYards}y</Text>
                    <Text style={styles.shotYardSub}>({shot.targetYards}y actual)</Text>
                  </>
                ) : (
                  <Text style={styles.shotYardMain}>{shot.targetYards}y</Text>
                )}
              </View>
            </View>
            {shot.note && <Text style={styles.shotNote}>{shot.note}</Text>}
          </Card>
        ))}

        {hole.tips.length > 0 && (
          <Card style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Miss Management</Text>
            {hole.tips.map((tip, i) => (
              <Text key={i} style={styles.tipText}>{tip}</Text>
            ))}
          </Card>
        )}

        {/* ======= IN-HOLE SCORING ======= */}
        <View style={styles.scoringDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>SCORECARD</Text>
          <View style={styles.dividerLine} />
        </View>

        <Card style={styles.scoringCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Score</Text>
            <TextInput style={styles.scoreNumInput} value={holeScore.score}
              onChangeText={(v) => updateScore('score', v)} keyboardType="number-pad"
              maxLength={2} placeholder="-" placeholderTextColor={COLORS.textLight} />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Par or Better?</Text>
            <YesNo value={holeScore.madePar} onChange={(v) => updateScore('madePar', v)} />
          </View>

          {hole.par > 3 && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>FIR</Text>
              <YesNo value={holeScore.fir} onChange={(v) => updateScore('fir', v)} />
            </View>
          )}

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Approach Dist.</Text>
            <TextInput style={styles.scoreSmallInput} value={holeScore.approachDist}
              onChangeText={(v) => updateScore('approachDist', v)} keyboardType="number-pad"
              maxLength={3} placeholder="yds" placeholderTextColor={COLORS.textLight} />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Club Used</Text>
            <ClubPicker
              clubs={profile?.bag || []}
              value={holeScore.clubUsed}
              onChange={(v) => updateScore('clubUsed', v)}
            />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>GIR</Text>
            <YesNo value={holeScore.gir} onChange={(v) => updateScore('gir', v)} />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Up & Down</Text>
            <YesNoNA value={holeScore.upAndDown} onChange={(v) => updateScore('upAndDown', v)} />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Putts</Text>
            <TextInput style={styles.scoreNumInput} value={holeScore.putts}
              onChangeText={(v) => updateScore('putts', v)} keyboardType="number-pad"
              maxLength={1} placeholder="-" placeholderTextColor={COLORS.textLight} />
          </View>
        </Card>

        {/* Enhanced tracking fields */}
        {enhanced && (
          <Card style={styles.enhancedCard}>
            <Text style={styles.enhancedTitle}>{'\uD83D\uDCCA'} Enhanced Tracking</Text>

            {hole.par > 3 && (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Drive Location</Text>
                <View style={styles.driveRow}>
                  {DRIVE_LOCATIONS.map(loc => (
                    <TouchableOpacity key={loc}
                      style={[styles.driveBtn, holeScore.driveLocation === loc && styles.driveBtnActive]}
                      onPress={() => updateScore('driveLocation', holeScore.driveLocation === loc ? '' : loc)}>
                      <Text style={[styles.driveBtnText, holeScore.driveLocation === loc && styles.driveBtnTextActive]}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Dist. to Pin (after approach)</Text>
              <TextInput style={styles.scoreSmallInput} value={holeScore.distToPin}
                onChangeText={(v) => updateScore('distToPin', v)} keyboardType="number-pad"
                maxLength={3} placeholder="ft" placeholderTextColor={COLORS.textLight} />
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Putt Distance</Text>
              <View style={styles.puttDistRow}>
                {PUTT_DISTANCES.map(d => (
                  <TouchableOpacity key={d}
                    style={[styles.puttDistBtn, holeScore.puttDist === d && styles.puttDistBtnActive]}
                    onPress={() => updateScore('puttDist', holeScore.puttDist === d ? '' : d)}>
                    <Text style={[styles.puttDistText, holeScore.puttDist === d && styles.puttDistTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {holeScore.puttDist ? (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>First Putt Result</Text>
                <View style={styles.driveRow}>
                  <TouchableOpacity
                    style={[styles.driveBtn, holeScore.puttResult === true && { backgroundColor: COLORS.success, borderColor: COLORS.success }]}
                    onPress={() => updateScore('puttResult', holeScore.puttResult === true ? null : true)}>
                    <Text style={[styles.driveBtnText, holeScore.puttResult === true && { color: COLORS.white }]}>Make</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.driveBtn, holeScore.puttResult === false && { backgroundColor: COLORS.danger, borderColor: COLORS.danger }]}
                    onPress={() => updateScore('puttResult', holeScore.puttResult === false ? null : false)}>
                    <Text style={[styles.driveBtnText, holeScore.puttResult === false && { color: COLORS.white }]}>Miss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </Card>
        )}

        {/* Round management */}
        <View style={styles.roundMgmt}>
          <TouchableOpacity style={styles.roundMgmtToggle} onPress={() => setShowRoundMenu(!showRoundMenu)}>
            <Text style={styles.roundMgmtToggleText}>{showRoundMenu ? '\u25B2 Hide Options' : '\u2699\uFE0F Round Options'}</Text>
          </TouchableOpacity>
          {showRoundMenu && (
            <View style={styles.roundMgmtBtns}>
              <TouchableOpacity style={styles.restartBtn} onPress={handleRestartRound}>
                <Text style={styles.restartBtnText}>{'\uD83D\uDD04'} Restart Round</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelRoundBtn} onPress={handleCancelRound}>
                <Text style={styles.cancelRoundBtnText}>{'\u274C'} Cancel Round</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FeedbackButton />
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, currentHole === 0 && styles.navBtnDisabled]}
          onPress={() => currentHole > 0 && setCurrentHole(currentHole - 1)}
          disabled={currentHole === 0}>
          <Text style={styles.navBtnText}>{'\u25C0'} Prev</Text>
        </TouchableOpacity>

        <View style={styles.footerCenter}>
          {cumulativeStats.holesCompleted > 0 ? (
            <View style={styles.cumulativeBox}>
              <Text style={styles.cumulativeScore}>{cumulativeStats.totalStrokes}</Text>
              <Text style={[styles.cumulativeOverUnder,
                cumulativeStats.overUnder > 0 ? { color: COLORS.danger } :
                cumulativeStats.overUnder < 0 ? { color: COLORS.success } : { color: COLORS.textSecondary }]}>
                {cumulativeStats.overUnder === 0 ? 'E' : (cumulativeStats.overUnder > 0 ? '+' : '') + cumulativeStats.overUnder}
              </Text>
              <Text style={styles.cumulativeThru}>thru {cumulativeStats.holesCompleted}</Text>
            </View>
          ) : (
            <Text style={styles.holeCounter}>{currentHole + 1} / {plan.length}</Text>
          )}
          {currentHole === plan.length - 1 && (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinishRound}>
              <Text style={styles.finishBtnText}>Finish Round</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.navBtn, currentHole === plan.length - 1 && styles.navBtnDisabled]}
          onPress={() => currentHole < plan.length - 1 && setCurrentHole(currentHole + 1)}
          disabled={currentHole === plan.length - 1}>
          <Text style={styles.navBtnText}>Next {'\u25B6'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ClubPicker({ clubs, value, onChange }) {
  const [open, setOpen] = useState(false);
  const clubNames = clubs.map(c => c.club);

  if (!open) {
    return (
      <TouchableOpacity style={styles.clubPickerBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.clubPickerText, !value && { color: COLORS.textLight }]}>
          {value || 'Select club'}
        </Text>
        <Text style={styles.clubPickerArrow}>{'\u25BC'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.clubPickerDropdown}>
      <ScrollView style={styles.clubPickerScroll} nestedScrollEnabled>
        {clubNames.map(name => (
          <TouchableOpacity key={name} style={[styles.clubPickerItem, value === name && styles.clubPickerItemActive]}
            onPress={() => { onChange(name); setOpen(false); }}>
            <Text style={[styles.clubPickerItemText, value === name && styles.clubPickerItemTextActive]}>{name}</Text>
          </TouchableOpacity>
        ))}
        {value && (
          <TouchableOpacity style={styles.clubPickerClear}
            onPress={() => { onChange(''); setOpen(false); }}>
            <Text style={styles.clubPickerClearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.clubPickerClose} onPress={() => setOpen(false)}>
        <Text style={styles.clubPickerCloseText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

function YesNo({ value, onChange }) {
  return (
    <View style={styles.ynRow}>
      <TouchableOpacity style={[styles.ynBtn, value === true && styles.ynBtnYes]}
        onPress={() => onChange(value === true ? null : true)}>
        <Text style={[styles.ynText, value === true && styles.ynTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.ynBtn, value === false && styles.ynBtnNo]}
        onPress={() => onChange(value === false ? null : false)}>
        <Text style={[styles.ynText, value === false && styles.ynTextActive]}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

function YesNoNA({ value, onChange }) {
  return (
    <View style={styles.ynRow}>
      <TouchableOpacity style={[styles.ynBtn, value === true && styles.ynBtnYes]}
        onPress={() => onChange(value === true ? null : true)}>
        <Text style={[styles.ynText, value === true && styles.ynTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.ynBtn, value === false && styles.ynBtnNo]}
        onPress={() => onChange(value === false ? null : false)}>
        <Text style={[styles.ynText, value === false && styles.ynTextActive]}>No</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.ynBtn, value === 'na' && styles.ynBtnNA]}
        onPress={() => onChange(value === 'na' ? null : 'na')}>
        <Text style={[styles.ynText, value === 'na' && styles.ynTextActive]}>N/A</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  weatherBadge: { alignItems: 'flex-end' },
  weatherTemp: { color: COLORS.white, fontSize: 18, ...FONTS.bold },
  weatherWind: { color: COLORS.accentLight, fontSize: 12 },

  holeSelectorContainer: { backgroundColor: COLORS.primaryDark },
  holeSelector: { paddingHorizontal: 4, paddingVertical: 6 },
  holeTab: { width: 44, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 2 },
  holeTabActive: { backgroundColor: COLORS.accent },
  holeTabScored: { backgroundColor: 'rgba(255,255,255,0.15)' },
  holeTabNum: { color: '#CCCCCC', fontSize: 16, ...FONTS.bold },
  holeTabNumActive: { color: COLORS.primaryDark },
  holeTabPar: { color: '#888888', fontSize: 10 },
  holeTabParActive: { color: COLORS.primaryDark },
  holeTabScore: { color: COLORS.accentLight, fontSize: 11, ...FONTS.bold },

  holeScroll: { flex: 1 },
  holeContent: { paddingBottom: 20, paddingTop: 10 },

  remindersCard: { backgroundColor: '#FFFDE7', borderLeftWidth: 4, borderLeftColor: '#F9A825' },
  remindersTitle: { fontSize: 11, ...FONTS.bold, color: '#F57F17', letterSpacing: 1, marginBottom: 6 },
  reminderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  rDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  rLabel: { ...FONTS.semiBold, color: COLORS.text },
  reminderText: { fontSize: 13, color: COLORS.text, flex: 1, lineHeight: 18 },

  holeHeaderSection: { paddingHorizontal: 16, marginBottom: 8 },
  holeNumberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holeNumber: { fontSize: 26, ...FONTS.bold, color: COLORS.primary },
  holeMetaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  holeDesc: { fontSize: 14, color: COLORS.textSecondary, paddingHorizontal: 16, marginBottom: 8, lineHeight: 20 },

  mapCard: { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#1565C0', paddingVertical: 8 },
  holeImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 8 },
  mapLinks: { flexDirection: 'row', gap: 8 },
  mapBtn: { backgroundColor: '#1565C0', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  mapBtnText: { color: COLORS.white, fontSize: 12, ...FONTS.semiBold },

  strategyCard: { backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  cardLabel: { fontSize: 11, ...FONTS.bold, color: COLORS.primaryLight, letterSpacing: 1, marginBottom: 4 },
  cardText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  weatherCard: { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: COLORS.info },
  weatherLabel: { fontSize: 11, ...FONTS.bold, color: COLORS.info, letterSpacing: 1, marginBottom: 4 },
  hazardCard: { backgroundColor: '#FFEBEE', borderLeftWidth: 4, borderLeftColor: COLORS.danger },
  hazardTitle: { fontSize: 11, ...FONTS.bold, color: COLORS.danger, letterSpacing: 1, marginBottom: 6 },
  hazardList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  shapeCard: { backgroundColor: '#F3E5F5', borderLeftWidth: 4, borderLeftColor: '#7B1FA2' },
  shapeTitle: { fontSize: 11, ...FONTS.bold, color: '#7B1FA2', letterSpacing: 1, marginBottom: 6 },
  shapeTipText: { fontSize: 13, color: COLORS.text, marginBottom: 6, lineHeight: 18 },

  shotPlanTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.primary, paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  shotCard: { borderLeftWidth: 4, borderLeftColor: COLORS.accent },
  shotHeader: { flexDirection: 'row', alignItems: 'center' },
  shotNumCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  shotNumText: { color: COLORS.white, ...FONTS.bold, fontSize: 16 },
  shotInfo: { flex: 1, marginLeft: 12 },
  shotType: { fontSize: 13, color: COLORS.textSecondary },
  shotClub: { fontSize: 18, ...FONTS.bold, color: COLORS.text },
  shotYardage: { alignItems: 'flex-end' },
  shotYardMain: { fontSize: 20, ...FONTS.bold, color: COLORS.primary },
  shotYardSub: { fontSize: 11, color: COLORS.textSecondary },
  shotNote: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8, fontStyle: 'italic' },
  tipsCard: { backgroundColor: '#FFF8E1', borderLeftWidth: 4, borderLeftColor: COLORS.accent },
  tipsTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.warning, marginBottom: 6 },
  tipText: { fontSize: 13, color: COLORS.text, marginBottom: 6, lineHeight: 18 },

  scoringDivider: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { paddingHorizontal: 12, fontSize: 12, ...FONTS.bold, color: COLORS.textLight, letterSpacing: 1 },

  scoringCard: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  scoreLabel: { fontSize: 14, color: COLORS.text, ...FONTS.medium, flex: 1 },
  scoreNumInput: {
    width: 52, height: 44, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 10,
    textAlign: 'center', fontSize: 20, ...FONTS.bold, color: COLORS.primary, backgroundColor: COLORS.white,
  },
  scoreSmallInput: {
    width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, textAlign: 'center', fontSize: 14, color: COLORS.text, backgroundColor: COLORS.white,
  },
  scoreTextInput: {
    width: 120, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.white,
  },

  ynRow: { flexDirection: 'row', gap: 6 },
  ynBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  ynBtnYes: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  ynBtnNo: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  ynBtnNA: { backgroundColor: COLORS.textLight, borderColor: COLORS.textLight },
  ynText: { fontSize: 13, color: COLORS.text, ...FONTS.medium },
  ynTextActive: { color: COLORS.white, ...FONTS.semiBold },

  enhancedCard: { borderLeftWidth: 4, borderLeftColor: COLORS.info, backgroundColor: '#F5F9FF' },
  enhancedTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.info, marginBottom: 8 },
  driveRow: { flexDirection: 'row', gap: 6 },
  driveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  driveBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  driveBtnText: { fontSize: 13, ...FONTS.medium, color: COLORS.text },
  driveBtnTextActive: { color: COLORS.white },
  puttDistRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  puttDistBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  puttDistBtnActive: { backgroundColor: COLORS.info, borderColor: COLORS.info },
  puttDistText: { fontSize: 11, color: COLORS.text },
  puttDistTextActive: { color: COLORS.white, ...FONTS.semiBold },

  roundMgmt: { marginHorizontal: 16, marginTop: 16 },
  roundMgmtToggle: { alignItems: 'center', paddingVertical: 10 },
  roundMgmtToggleText: { fontSize: 13, ...FONTS.medium, color: COLORS.textSecondary },
  roundMgmtBtns: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 },
  restartBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    borderWidth: 2, borderColor: '#F57C00', backgroundColor: '#FFF3E0',
  },
  restartBtnText: { fontSize: 13, ...FONTS.semiBold, color: '#E65100' },
  cancelRoundBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.danger, backgroundColor: '#FFEBEE',
  },
  cancelRoundBtnText: { fontSize: 13, ...FONTS.semiBold, color: COLORS.danger },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  navBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: COLORS.white, ...FONTS.semiBold, fontSize: 13 },
  footerCenter: { alignItems: 'center', flex: 1 },
  cumulativeBox: { alignItems: 'center' },
  cumulativeScore: { fontSize: 18, ...FONTS.bold, color: COLORS.primary },
  cumulativeOverUnder: { fontSize: 13, ...FONTS.bold },
  cumulativeThru: { fontSize: 10, color: COLORS.textLight },
  holeCounter: { fontSize: 14, ...FONTS.semiBold, color: COLORS.textSecondary },
  finishBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, marginTop: 2 },
  finishBtnText: { color: COLORS.primaryDark, ...FONTS.bold, fontSize: 13 },

  clubPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: 140, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.white,
  },
  clubPickerText: { fontSize: 14, color: COLORS.text, flex: 1 },
  clubPickerArrow: { fontSize: 10, color: COLORS.textLight, marginLeft: 4 },
  clubPickerDropdown: { width: 160, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, backgroundColor: COLORS.white, overflow: 'hidden' },
  clubPickerScroll: { maxHeight: 200 },
  clubPickerItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  clubPickerItemActive: { backgroundColor: '#E8F5E9' },
  clubPickerItemText: { fontSize: 14, color: COLORS.text },
  clubPickerItemTextActive: { color: COLORS.primary, ...FONTS.semiBold },
  clubPickerClear: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: '#FFF8E1' },
  clubPickerClearText: { fontSize: 13, color: COLORS.warning, ...FONTS.medium, textAlign: 'center' },
  clubPickerClose: { paddingVertical: 10, backgroundColor: COLORS.background, alignItems: 'center' },
  clubPickerCloseText: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.medium },
});

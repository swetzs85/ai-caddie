import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, FONTS } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';
import HeroBanner from '../components/HeroBanner';
import FeedbackButton from '../components/FeedbackButton';
import { saveRound, clearActiveRound } from '../storage/store';
import { generateRoundInsights } from '../engine/insights';

const MISS_OPTIONS = ['Left', 'Right', 'Long', 'Short', 'Mixed'];
const SECTIONS = ['summary', 'interview', 'insights'];

export default function PostRoundScreen({ route, navigation }) {
  const { plan, course, date, tee, scores: inScores, profile } = route.params;
  const [section, setSection] = useState('summary');
  const [scores, setScores] = useState(inScores || plan.map(h => ({
    hole: h.number, par: h.par, madePar: null, fir: null,
    approachDist: '', clubUsed: '', gir: null, upAndDown: null,
    putts: '', score: '',
    distToPin: '', driveLocation: '', puttDist: '', puttResult: null,
  })));
  const [interview, setInterview] = useState({
    tacticalGoal: '', technicalGoal: '', mentalGoal: '',
    costStrokes: '', takeBack: '',
    decisionRating: '', commonMiss: '',
    rangeWork: '', helpfulNarrative: '', unhelpfulNarrative: '',
  });
  const [insights, setInsights] = useState(null);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef(null);

  const totalScore = scores.reduce((s, h) => s + (parseInt(h.score) || 0), 0);
  const totalPar = scores.reduce((s, h) => s + h.par, 0);
  const filled = scores.filter(s => s.score !== '' && s.score !== undefined).length;

  const updateScore = (i, field, value) => {
    const updated = [...scores];
    updated[i] = { ...updated[i], [field]: value };
    setScores(updated);
  };

  const updateInterview = (field, value) => {
    setInterview(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateInsights = async () => {
    const result = generateRoundInsights(scores, interview, profile, plan);
    setInsights(result);
    setSection('insights');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    const round = {
      course: course.name, date, tee,
      totalScore: totalScore || null,
      totalPar,
      overUnder: totalScore ? totalScore - totalPar : null,
      scores, interview, insights: result,
      plan,
    };
    await saveRound(round);
    await clearActiveRound();
    setSaved(true);
  };

  const handleSaveRound = async () => {
    if (saved) {
      navigation.popToTop();
      return;
    }
    const round = {
      course: course.name, date, tee,
      totalScore: totalScore || null,
      totalPar,
      overUnder: totalScore ? totalScore - totalPar : null,
      scores, interview, insights,
      plan,
    };
    const result = await saveRound(round);
    if (result && !result.ok) {
      if (Platform.OS === 'web') {
        window.alert('Error saving round: ' + (result.error || 'Unknown error'));
      } else {
        Alert.alert('Save Error', result.error || 'Unknown error');
      }
      return;
    }
    await clearActiveRound();
    setSaved(true);
    if (Platform.OS === 'web') {
      window.alert('Round Saved! Your round data and insights have been saved.');
      navigation.popToTop();
    } else {
      Alert.alert('Round Saved!', 'Your round data and insights have been saved.',
        [{ text: 'OK', onPress: () => navigation.popToTop() }]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <HeroBanner title="Post-Round Review" subtitle={course.name + ' | ' + date} />

      {/* Section tabs */}
      <View style={styles.tabs}>
        {SECTIONS.map(s => (
          <TouchableOpacity key={s}
            style={[styles.tab, section === s && styles.tabActive]}
            onPress={() => { setSection(s); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}>
            <Text style={[styles.tabText, section === s && styles.tabTextActive]}>
              {s === 'summary' ? 'Scorecard' : s === 'interview' ? 'Reflection' : 'AI Insights'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        {/* ===== SCORECARD SECTION ===== */}
        {section === 'summary' && (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{filled > 0 ? totalScore : '--'}</Text>
                  <Text style={styles.statLabel}>Score</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum,
                    totalScore - totalPar > 0 ? { color: COLORS.danger } :
                    totalScore - totalPar < 0 ? { color: COLORS.success } : {}]}>
                    {filled > 0 ? (totalScore - totalPar >= 0 ? '+' : '') + (totalScore - totalPar) : '--'}
                  </Text>
                  <Text style={styles.statLabel}>vs Par</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{scores.reduce((s, h) => s + (parseInt(h.putts) || 0), 0) || '--'}</Text>
                  <Text style={styles.statLabel}>Putts</Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionHeader}>Hole-by-Hole Scores</Text>
            <Text style={styles.sectionHint}>Fill in any scores you missed during the round</Text>

            {scores.map((s, i) => (
              <Card key={i} style={styles.holeCard}>
                <View style={styles.holeRow}>
                  <View>
                    <Text style={styles.holeNum}>Hole {s.hole}</Text>
                    <Text style={styles.holePar}>Par {s.par}</Text>
                  </View>
                  <View style={styles.holeInputs}>
                    <View style={styles.miniField}>
                      <Text style={styles.miniLabel}>Score</Text>
                      <TextInput style={styles.miniInput} value={s.score}
                        onChangeText={(v) => updateScore(i, 'score', v)}
                        keyboardType="number-pad" maxLength={2} placeholder="-" />
                    </View>
                    <View style={styles.miniField}>
                      <Text style={styles.miniLabel}>Putts</Text>
                      <TextInput style={styles.miniInput} value={s.putts}
                        onChangeText={(v) => updateScore(i, 'putts', v)}
                        keyboardType="number-pad" maxLength={1} placeholder="-" />
                    </View>
                  </View>
                </View>
              </Card>
            ))}

            <TouchableOpacity style={styles.nextBtn}
              onPress={() => { setSection('interview'); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}>
              <Text style={styles.nextBtnText}>Continue to Reflection {'\u2192'}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ===== INTERVIEW SECTION ===== */}
        {section === 'interview' && (
          <>
            <Card style={styles.goalCard}>
              <Text style={styles.cardTitle}>{'\uD83C\uDFAF'} Performance vs. Goals</Text>
              <Text style={styles.cardHint}>How did you deliver on your pre-round reminders?</Text>

              <View style={styles.goalItem}>
                <View style={styles.goalLabelRow}>
                  <View style={[styles.goalDot, { backgroundColor: '#1565C0' }]} />
                  <Text style={styles.goalLabel}>Technical Goal</Text>
                </View>
                {profile?.preRoundReminders?.technical ? (
                  <Text style={styles.goalReminder}>Reminder: "{profile.preRoundReminders.technical}"</Text>
                ) : null}
                <TextInput style={styles.interviewInput} value={interview.technicalGoal}
                  onChangeText={(v) => updateInterview('technicalGoal', v)}
                  placeholder="How did it go? Rate yourself..." multiline />
              </View>

              <View style={styles.goalItem}>
                <View style={styles.goalLabelRow}>
                  <View style={[styles.goalDot, { backgroundColor: '#2E7D32' }]} />
                  <Text style={styles.goalLabel}>Tactical Goal</Text>
                </View>
                {profile?.preRoundReminders?.tactical ? (
                  <Text style={styles.goalReminder}>Reminder: "{profile.preRoundReminders.tactical}"</Text>
                ) : null}
                <TextInput style={styles.interviewInput} value={interview.tacticalGoal}
                  onChangeText={(v) => updateInterview('tacticalGoal', v)}
                  placeholder="How did it go? Rate yourself..." multiline />
              </View>

              <View style={[styles.goalItem, { borderBottomWidth: 0 }]}>
                <View style={styles.goalLabelRow}>
                  <View style={[styles.goalDot, { backgroundColor: '#E65100' }]} />
                  <Text style={styles.goalLabel}>Mental Goal</Text>
                </View>
                {profile?.preRoundReminders?.mental ? (
                  <Text style={styles.goalReminder}>Reminder: "{profile.preRoundReminders.mental}"</Text>
                ) : null}
                <TextInput style={styles.interviewInput} value={interview.mentalGoal}
                  onChangeText={(v) => updateInterview('mentalGoal', v)}
                  placeholder="How did it go? Rate yourself..." multiline />
              </View>
            </Card>

            <Card>
              <Text style={styles.cardTitle}>{'\uD83D\uDD0D'} Round Reflection</Text>

              <View style={styles.qItem}>
                <Text style={styles.qText}>What cost the most strokes today?</Text>
                <TextInput style={styles.interviewInput} value={interview.costStrokes}
                  onChangeText={(v) => updateInterview('costStrokes', v)}
                  placeholder="e.g., three-putts, tee shots OB..." multiline />
              </View>

              <View style={styles.qItem}>
                <Text style={styles.qText}>What is one decision you would take back?</Text>
                <TextInput style={styles.interviewInput} value={interview.takeBack}
                  onChangeText={(v) => updateInterview('takeBack', v)}
                  placeholder="e.g., going for the green on 14..." multiline />
              </View>

              <View style={styles.qItem}>
                <Text style={styles.qText}>Rate your decision making today (1-10)</Text>
                <View style={styles.ratingRow}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <TouchableOpacity key={n}
                      style={[styles.ratingBtn, interview.decisionRating === String(n) && styles.ratingBtnActive]}
                      onPress={() => updateInterview('decisionRating', String(n))}>
                      <Text style={[styles.ratingNum, interview.decisionRating === String(n) && styles.ratingNumActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.qItem}>
                <Text style={styles.qText}>Where was your most common miss today?</Text>
                <View style={styles.missRow}>
                  {MISS_OPTIONS.map(m => (
                    <TouchableOpacity key={m}
                      style={[styles.missBtn, interview.commonMiss === m.toLowerCase() && styles.missBtnActive]}
                      onPress={() => updateInterview('commonMiss', m.toLowerCase())}>
                      <Text style={[styles.missText, interview.commonMiss === m.toLowerCase() && styles.missTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.qItem}>
                <Text style={styles.qText}>If you had range time right now, what would you work on?</Text>
                <TextInput style={styles.interviewInput} value={interview.rangeWork}
                  onChangeText={(v) => updateInterview('rangeWork', v)}
                  placeholder="e.g., driver alignment, 100-yard wedges..." multiline />
              </View>
            </Card>

            <Card>
              <Text style={styles.cardTitle}>{'\uD83E\uDDE0'} Mental Game</Text>

              <View style={styles.qItem}>
                <Text style={styles.qText}>What internal narrative was helpful today?</Text>
                <TextInput style={styles.interviewInput} value={interview.helpfulNarrative}
                  onChangeText={(v) => updateInterview('helpfulNarrative', v)}
                  placeholder="e.g., 'One shot at a time kept me present...'" multiline />
              </View>

              <View style={[styles.qItem, { borderBottomWidth: 0 }]}>
                <Text style={styles.qText}>What internal narrative was NOT helpful?</Text>
                <TextInput style={styles.interviewInput} value={interview.unhelpfulNarrative}
                  onChangeText={(v) => updateInterview('unhelpfulNarrative', v)}
                  placeholder="e.g., 'After the double I kept thinking about my score...'" multiline />
              </View>
            </Card>

            <TouchableOpacity style={styles.insightBtn} onPress={handleGenerateInsights}>
              <Text style={styles.insightBtnText}>{'\u2728'} Generate AI Insights</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ===== AI INSIGHTS SECTION ===== */}
        {section === 'insights' && insights && (
          <>
            {/* Round summary */}
            <Card style={styles.insightSummaryCard}>
              <Text style={styles.insightSectionTitle}>Round Summary</Text>
              <View style={styles.insightStatsGrid}>
                <StatBox label="Score" value={insights.summary.totalScore || '--'} />
                <StatBox label="vs Par" value={insights.summary.overUnder !== null
                  ? (insights.summary.overUnder >= 0 ? '+' : '') + insights.summary.overUnder : '--'}
                  color={insights.summary.overUnder > 0 ? COLORS.danger : insights.summary.overUnder < 0 ? COLORS.success : null} />
                <StatBox label="FIR" value={insights.summary.firPct !== null ? insights.summary.firPct + '%' : '--'} />
                <StatBox label="GIR" value={insights.summary.girPct !== null ? insights.summary.girPct + '%' : '--'} />
                <StatBox label="Up&Down" value={insights.summary.udPct !== null ? insights.summary.udPct + '%' : '--'} />
                <StatBox label="Putts/Hole" value={insights.summary.avgPutts || '--'} />
              </View>
              {insights.summary.driveLeft + insights.summary.driveCenter + insights.summary.driveRight > 0 && (
                <View style={styles.driveChart}>
                  <Text style={styles.driveChartTitle}>Drive Distribution</Text>
                  <View style={styles.driveBar}>
                    <View style={[styles.driveBarSeg, { flex: insights.summary.driveLeft || 0.01, backgroundColor: '#EF5350' }]}>
                      {insights.summary.driveLeft > 0 && <Text style={styles.driveBarText}>L:{insights.summary.driveLeft}</Text>}
                    </View>
                    <View style={[styles.driveBarSeg, { flex: insights.summary.driveCenter || 0.01, backgroundColor: COLORS.success }]}>
                      {insights.summary.driveCenter > 0 && <Text style={styles.driveBarText}>C:{insights.summary.driveCenter}</Text>}
                    </View>
                    <View style={[styles.driveBarSeg, { flex: insights.summary.driveRight || 0.01, backgroundColor: '#42A5F5' }]}>
                      {insights.summary.driveRight > 0 && <Text style={styles.driveBarText}>R:{insights.summary.driveRight}</Text>}
                    </View>
                  </View>
                </View>
              )}
            </Card>

            {/* Practice areas */}
            {insights.practiceAreas.length > 0 && (
              <>
                <Text style={styles.insightHeading}>{'\uD83C\uDFAF'} Practice Focus Areas</Text>
                {insights.practiceAreas.map((area, i) => (
                  <Card key={i} style={[styles.practiceCard,
                    area.priority === 'high' ? styles.practiceHigh :
                    area.priority === 'medium' ? styles.practiceMedium : styles.practiceLow]}>
                    <View style={styles.practiceHeader}>
                      <Text style={styles.practiceArea}>{area.area}</Text>
                      <Badge label={area.stat}
                        color={area.priority === 'high' ? COLORS.danger : area.priority === 'medium' ? COLORS.warning : COLORS.info} />
                    </View>
                    <Text style={styles.practiceRec}>{area.recommendation}</Text>
                    <Badge label={area.priority.toUpperCase() + ' PRIORITY'}
                      color={area.priority === 'high' ? COLORS.danger : area.priority === 'medium' ? '#FF8F00' : COLORS.info}
                      style={{ alignSelf: 'flex-start', marginTop: 8 }} />
                  </Card>
                ))}
              </>
            )}

            {/* Profile modifications */}
            {insights.profileMods.length > 0 && (
              <>
                <Text style={styles.insightHeading}>{'\uD83D\uDD27'} Suggested Profile Updates</Text>
                {insights.profileMods.map((mod, i) => (
                  <Card key={i} style={styles.modCard}>
                    <Text style={styles.modCategory}>{mod.category}</Text>
                    <View style={styles.modArrow}>
                      <Badge label={'Current: ' + mod.current} color={COLORS.textLight} />
                      <Text style={styles.modArrowText}>{'\u2192'}</Text>
                      <Badge label={'Suggested: ' + mod.suggested} color={COLORS.primary} />
                    </View>
                    <Text style={styles.modReason}>{mod.reason}</Text>
                  </Card>
                ))}
              </>
            )}

            {insights.practiceAreas.length === 0 && insights.profileMods.length === 0 && (
              <Card style={styles.noInsightCard}>
                <Text style={styles.noInsightText}>
                  Fill in more scorecard data and reflection questions to get personalized insights!
                </Text>
              </Card>
            )}

            {saved ? (
              <View>
                <View style={styles.savedBanner}>
                  <Text style={styles.savedBannerText}>{'\u2705'} Round & Insights Saved</Text>
                </View>
                <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.popToTop()}>
                  <Text style={styles.doneBtnText}>Done — Back to Home</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRound}>
                <Text style={styles.saveBtnText}>Save Round & Insights</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {section === 'insights' && !insights && (
          <Card style={styles.noInsightCard}>
            <Text style={styles.noInsightText}>
              Complete the Reflection tab and tap "Generate AI Insights" to see your personalized analysis.
            </Text>
          </Card>
        )}

        <FeedbackButton />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.insightStatBox}>
      <Text style={[styles.insightStatVal, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.insightStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textLight, ...FONTS.medium },
  tabTextActive: { color: COLORS.primary, ...FONTS.bold },

  summaryCard: { backgroundColor: '#E8F5E9' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 32, ...FONTS.bold, color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  sectionHeader: { fontSize: 18, ...FONTS.bold, color: COLORS.primary, paddingHorizontal: 16, marginTop: 12 },
  sectionHint: { fontSize: 12, color: COLORS.textLight, paddingHorizontal: 16, marginBottom: 8 },
  holeCard: { paddingVertical: 8 },
  holeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holeNum: { fontSize: 16, ...FONTS.bold, color: COLORS.primary },
  holePar: { fontSize: 12, color: COLORS.textSecondary },
  holeInputs: { flexDirection: 'row', gap: 12 },
  miniField: { alignItems: 'center' },
  miniLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 3 },
  miniInput: {
    width: 46, height: 40, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 8,
    textAlign: 'center', fontSize: 18, ...FONTS.bold, color: COLORS.primary, backgroundColor: COLORS.white,
  },

  nextBtn: { backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: COLORS.white, fontSize: 16, ...FONTS.bold },

  goalCard: { borderLeftWidth: 4, borderLeftColor: '#F9A825' },
  cardTitle: { fontSize: 17, ...FONTS.bold, color: COLORS.primary, marginBottom: 4 },
  cardHint: { fontSize: 12, color: COLORS.textLight, marginBottom: 12 },
  goalItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  goalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalLabel: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  goalReminder: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', marginBottom: 6 },
  interviewInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.white, minHeight: 44, textAlignVertical: 'top',
  },
  qItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  qText: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text, marginBottom: 8 },

  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white,
  },
  ratingBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ratingNum: { fontSize: 13, ...FONTS.bold, color: COLORS.textSecondary },
  ratingNumActive: { color: COLORS.white },

  missRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  missBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  missBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  missText: { fontSize: 13, ...FONTS.medium, color: COLORS.text },
  missTextActive: { color: COLORS.white },

  insightBtn: {
    backgroundColor: '#7B1FA2', marginHorizontal: 16, marginTop: 16,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  insightBtnText: { color: COLORS.white, fontSize: 18, ...FONTS.bold },

  insightSummaryCard: { backgroundColor: '#F5F5F5' },
  insightSectionTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.primary, marginBottom: 10 },
  insightStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  insightStatBox: { width: '30%', alignItems: 'center', marginBottom: 12 },
  insightStatVal: { fontSize: 22, ...FONTS.bold, color: COLORS.primary },
  insightStatLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  driveChart: { marginTop: 8 },
  driveChartTitle: { fontSize: 12, ...FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 4 },
  driveBar: { flexDirection: 'row', height: 28, borderRadius: 6, overflow: 'hidden' },
  driveBarSeg: { justifyContent: 'center', alignItems: 'center' },
  driveBarText: { color: COLORS.white, fontSize: 11, ...FONTS.bold },

  insightHeading: { fontSize: 18, ...FONTS.bold, color: COLORS.primary, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  practiceCard: { borderLeftWidth: 4 },
  practiceHigh: { borderLeftColor: COLORS.danger },
  practiceMedium: { borderLeftColor: '#FF8F00' },
  practiceLow: { borderLeftColor: COLORS.info },
  practiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  practiceArea: { fontSize: 15, ...FONTS.bold, color: COLORS.text, flex: 1 },
  practiceRec: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  modCard: { borderLeftWidth: 4, borderLeftColor: '#7B1FA2' },
  modCategory: { fontSize: 15, ...FONTS.bold, color: '#7B1FA2', marginBottom: 6 },
  modArrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modArrowText: { fontSize: 16, color: COLORS.textSecondary },
  modReason: { fontSize: 13, color: COLORS.text, lineHeight: 19 },

  noInsightCard: { padding: 24, alignItems: 'center' },
  noInsightText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  saveBtn: {
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 20,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontSize: 18, ...FONTS.bold },
  savedBanner: {
    backgroundColor: '#E8F5E9', marginHorizontal: 16, marginTop: 20,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.success,
  },
  savedBannerText: { fontSize: 16, ...FONTS.bold, color: COLORS.success },
  doneBtn: {
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 12,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  doneBtnText: { color: COLORS.white, fontSize: 16, ...FONTS.bold },
});

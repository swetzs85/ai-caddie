import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';
import HeroBanner from '../components/HeroBanner';
import FeedbackButton from '../components/FeedbackButton';
import { loadRounds, deleteRound } from '../storage/store';

function getRoundStats(round) {
  if (round.scores && Array.isArray(round.scores)) {
    const s = round.scores;
    const par4and5 = s.filter(h => h.par >= 4);
    const firAnswered = par4and5.filter(h => h.fir !== null && h.fir !== undefined);
    const firHit = firAnswered.filter(h => h.fir === true).length;
    const girAnswered = s.filter(h => h.gir !== null && h.gir !== undefined);
    const girHit = girAnswered.filter(h => h.gir === true).length;
    const putts = s.reduce((sum, h) => sum + (parseInt(h.putts) || 0), 0);
    return {
      fairways: firHit,
      fwTotal: firAnswered.length || par4and5.length,
      girs: girHit,
      girTotal: girAnswered.length || s.length,
      totalPutts: putts || null,
    };
  }
  return {
    fairways: round.fairways || 0,
    fwTotal: 14,
    girs: round.girs || 0,
    girTotal: 18,
    totalPutts: round.totalPutts || null,
  };
}

export default function HistoryScreen() {
  const [rounds, setRounds] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadRounds().then(setRounds);
    }, [])
  );

  const handleDelete = (round, index) => {
    const doDelete = async () => {
      await deleteRound(round.id);
      setRounds(prev => prev.filter((_, i) => i !== index));
      setExpanded(null);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this round at ' + round.course + '?')) doDelete();
    } else {
      Alert.alert('Delete Round', 'Delete this round at ' + round.course + '?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (rounds.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>&#9971;</Text>
        <Text style={styles.emptyTitle}>No Rounds Yet</Text>
        <Text style={styles.emptyText}>
          Play a round and save your notes to start tracking your progress.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <HeroBanner
        title="Round History"
        subtitle={rounds.length + ' round' + (rounds.length !== 1 ? 's' : '') + ' logged'}
      />

      {rounds.length >= 1 && <QuickStats rounds={rounds} />}

      {rounds.map((round, i) => {
        const stats = getRoundStats(round);
        return (
          <TouchableOpacity key={round.id || i} onPress={() => setExpanded(expanded === i ? null : i)}>
            <Card style={styles.roundCard}>
              <View style={styles.roundHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roundCourse}>{round.course}</Text>
                  <Text style={styles.roundDate}>
                    {new Date(round.date).toLocaleDateString()} | {round.tee} tees
                  </Text>
                </View>
                {round.totalScore ? (
                  <View style={styles.scoreBox}>
                    <Text style={styles.roundScore}>{round.totalScore}</Text>
                    <Text style={[
                      styles.roundOverUnder,
                      round.overUnder > 0 ? styles.overPar : round.overUnder < 0 ? styles.underPar : null,
                    ]}>
                      {round.overUnder > 0 ? '+' : ''}{round.overUnder}
                    </Text>
                  </View>
                ) : null}
              </View>

              {round.totalScore ? (
                <View style={styles.statsRow}>
                  <StatPill label="FW" value={stats.fairways + '/' + stats.fwTotal} />
                  <StatPill label="GIR" value={stats.girs + '/' + stats.girTotal} />
                  {stats.totalPutts ? <StatPill label="Putts" value={stats.totalPutts} /> : null}
                </View>
              ) : null}

              {expanded === i && (
                <View style={styles.expandedSection}>
                  {round.generalNotes ? (
                    <View style={styles.generalNotes}>
                      <Text style={styles.notesLabel}>Overall Notes</Text>
                      <Text style={styles.notesText}>{round.generalNotes}</Text>
                    </View>
                  ) : null}

                  {(round.holes || round.scores)?.filter(h => h.note).map((h, j) => (
                    <View key={j} style={styles.holeNote}>
                      <View style={styles.holeNoteHeader}>
                        <Text style={styles.holeNoteNum}>Hole {h.hole}</Text>
                        {h.score ? (
                          <Badge
                            label={String(h.score)}
                            color={
                              parseInt(h.score) <= h.par ? COLORS.success :
                              parseInt(h.score) === h.par + 1 ? COLORS.warning : COLORS.danger
                            }
                          />
                        ) : null}
                      </View>
                      <Text style={styles.holeNoteText}>{h.note}</Text>
                    </View>
                  ))}

                  {round.interview && round.interview.costStrokes ? (
                    <View style={styles.generalNotes}>
                      <Text style={styles.notesLabel}>Post-Round Reflection</Text>
                      {round.interview.costStrokes ? <Text style={styles.notesText}>Cost Strokes: {round.interview.costStrokes}</Text> : null}
                      {round.interview.commonMiss ? <Text style={styles.notesText}>Common Miss: {round.interview.commonMiss}</Text> : null}
                      {round.interview.decisionRating ? <Text style={styles.notesText}>Decision Rating: {round.interview.decisionRating}/10</Text> : null}
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(round, i)}>
                    <Text style={styles.deleteBtnText}>Delete Round</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.expandHint}>
                {expanded === i ? 'Tap to collapse' : 'Tap to see details'}
              </Text>
            </Card>
          </TouchableOpacity>
        );
      })}

      <FeedbackButton />
    </ScrollView>
  );
}

function QuickStats({ rounds }) {
  const scored = rounds.filter(r => r.totalScore);
  if (scored.length === 0) return null;

  const avgScore = Math.round(scored.reduce((s, r) => s + r.totalScore, 0) / scored.length);
  const bestScore = Math.min(...scored.map(r => r.totalScore));

  const allStats = scored.map(getRoundStats);
  const avgFW = (allStats.reduce((s, st) => s + st.fairways, 0) / scored.length).toFixed(1);
  const avgGIR = (allStats.reduce((s, st) => s + st.girs, 0) / scored.length).toFixed(1);

  return (
    <Card style={styles.statsCard}>
      <Text style={styles.statsTitle}>Your Averages</Text>
      <View style={styles.statsGrid}>
        <BigStat label="Avg Score" value={avgScore} />
        <BigStat label="Best" value={bestScore} />
        <BigStat label="Avg FW" value={avgFW} />
        <BigStat label="Avg GIR" value={avgGIR} />
      </View>
    </Card>
  );
}

function BigStat({ label, value }) {
  return (
    <View style={styles.bigStat}>
      <Text style={styles.bigStatValue}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, ...FONTS.bold, color: COLORS.primary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  statsCard: { backgroundColor: '#E8F5E9' },
  statsTitle: { fontSize: 16, ...FONTS.semiBold, color: COLORS.primary, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  bigStat: { alignItems: 'center' },
  bigStatValue: { fontSize: 28, ...FONTS.bold, color: COLORS.primary },
  bigStatLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  roundCard: {},
  roundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundCourse: { fontSize: 16, ...FONTS.semiBold, color: COLORS.text },
  roundDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  scoreBox: { alignItems: 'center' },
  roundScore: { fontSize: 28, ...FONTS.bold, color: COLORS.primary },
  roundOverUnder: { fontSize: 14, ...FONTS.semiBold, color: COLORS.textSecondary },
  overPar: { color: COLORS.danger },
  underPar: { color: COLORS.success },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statPillLabel: { fontSize: 11, color: COLORS.textSecondary },
  statPillValue: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text },
  expandedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  generalNotes: { marginBottom: 10 },
  notesLabel: { fontSize: 13, ...FONTS.semiBold, color: COLORS.primary, marginBottom: 4 },
  notesText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  holeNote: { marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: COLORS.accent },
  holeNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  holeNoteNum: { fontSize: 13, ...FONTS.semiBold, color: COLORS.textSecondary },
  holeNoteText: { fontSize: 13, color: COLORS.text },
  expandHint: { textAlign: 'center', color: COLORS.textLight, fontSize: 11, marginTop: 8 },
  deleteBtn: {
    marginTop: 12, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.danger, alignItems: 'center',
  },
  deleteBtnText: { color: COLORS.danger, fontSize: 13, ...FONTS.semiBold },
});

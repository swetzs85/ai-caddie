import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, Linking, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS } from '../theme';
import Card from '../components/Card';
import HeroBanner from '../components/HeroBanner';
import FeedbackButton from '../components/FeedbackButton';
import { saveCourse } from '../storage/store';
import {
  geocodeCourse, autoImportCourse, importFromUrl,
  parsePastedScorecard, buildSearchUrl, buildGolfLinkUrl, getSatelliteUrl,
  searchGolfCourses,
} from '../engine/courseLookup';

const SHAPES = ['Straight', 'Slight Dogleg Left', 'Dogleg Left', 'Slight Dogleg Right', 'Dogleg Right'];
const ELEVATIONS = ['Flat', 'Uphill', 'Downhill', 'Elevated'];
const HAZARD_PRESETS = [
  'Bunker Left', 'Bunker Right', 'Bunker Greenside', 'Water Left', 'Water Right',
  'Water Crossing', 'Trees Left', 'Trees Right', 'OB Left', 'OB Right',
  'Slope Left', 'Slope Right', 'Tight Fairway',
];

function defaultHole(num) {
  return {
    number: num, par: 4, yardages: {},
    handicap: { men: num, women: num },
    shape: 'straight', elevation: 'flat',
    hazards: [], description: '', strategy: '',
  };
}

function defaultYardForPar(par, tees) {
  const b = { 3: 160, 4: 370, 5: 500 };
  const result = {};
  for (const t of tees) result[t] = b[par] || 370;
  return result;
}

export default function AddCourseScreen({ navigation }) {
  const [step, setStep] = useState('info');
  const [courseName, setCourseName] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [activeTees, setActiveTees] = useState([]);
  const [holes, setHoles] = useState(Array.from({ length: 18 }, (_, i) => defaultHole(i + 1)));
  const [editingHole, setEditingHole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [importSource, setImportSource] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [courseUrl, setCourseUrl] = useState('');
  const [courseWebsite, setCourseWebsite] = useState('');
  const [teeInfo, setTeeInfo] = useState({});
  const [urlLoading, setUrlLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);
  const scrollRef = useRef(null);

  const handleNameChange = (text) => {
    setCourseName(text);
    if (searchTimer) clearTimeout(searchTimer);
    if (text.trim().length < 3) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const results = await searchGolfCourses(text);
      setSuggestions(results);
    }, 400);
    setSearchTimer(timer);
  };

  const pickSuggestion = (s) => {
    setCourseName(s.name);
    setLocation(s.location);
    if (s.lat && s.lng) setCoords({ lat: s.lat, lng: s.lng });
    setSuggestions([]);
  };

  const updateHole = (idx, field, value) => {
    const u = [...holes]; u[idx] = { ...u[idx], [field]: value }; setHoles(u);
  };
  const updateYardage = (idx, tee, value) => {
    const u = [...holes];
    u[idx] = { ...u[idx], yardages: { ...u[idx].yardages, [tee]: value === '' ? '' : parseInt(value) || 0 } };
    setHoles(u);
  };
  const setPar = (idx, par) => {
    const u = [...holes];
    const hasY = Object.values(u[idx].yardages).some(v => v !== '' && v > 0);
    u[idx] = { ...u[idx], par, yardages: hasY ? u[idx].yardages : defaultYardForPar(par, activeTees) };
    setHoles(u);
  };
  const toggleHazard = (idx, h) => {
    const u = [...holes]; const lower = h.toLowerCase();
    u[idx] = { ...u[idx], hazards: u[idx].hazards.includes(lower) ? u[idx].hazards.filter(x => x !== lower) : [...u[idx].hazards, lower] };
    setHoles(u);
  };

  const applyImportResult = (result) => {
    setHoles(result.holes.map((h, i) => ({ ...defaultHole(i + 1), ...h })));
    const names = result.tees.map(t => t.name);
    setActiveTees(names);
    const info = {};
    for (const t of result.tees) info[t.name] = { rating: t.rating, slope: t.slope, total: t.total };
    setTeeInfo(info);
    setImportSource(result.source);
    setStatusMsg('Found ' + result.holes.length + ' holes with ' + result.tees.length + ' tee sets! Review and tweak below.');
    setStep('edit');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleFindCourse = async () => {
    if (!courseName.trim() || !location.trim()) {
      if (Platform.OS === 'web') window.alert('Please enter both course name and location.');
      return;
    }
    setLoading(true);
    setStatusMsg('Searching...');
    setSuggestions([]);

    const [geo, result] = await Promise.all([
      coords ? Promise.resolve(coords) : geocodeCourse(courseName, location),
      autoImportCourse(courseName, location),
    ]);
    if (!coords) setCoords(geo);

    if (result && result.holes.length > 0) {
      if (result.websiteUrl && !courseWebsite) setCourseWebsite(result.websiteUrl);
      applyImportResult(result);
    } else {
      setStatusMsg('');
      setStep('import');
    }
    setLoading(false);
  };

  const handleUrlImport = async () => {
    if (!courseUrl.trim()) return;
    setUrlLoading(true);
    setStatusMsg('Fetching scorecard from URL...');
    const result = await importFromUrl(courseUrl.trim());
    if (result && result.holes.length > 0) {
      applyImportResult(result);
    } else {
      setStatusMsg('Could not extract scorecard from that URL. Try the paste option below.');
    }
    setUrlLoading(false);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    const result = parsePastedScorecard(pasteText);
    if (result && result.holes.length > 0) {
      const names = result.teeNames.length > 0 ? result.teeNames : ['White'];
      setActiveTees(names);
      const info = {};
      if (result.tees) for (const t of result.tees) info[t.name] = { rating: t.rating, slope: t.slope, total: t.total };
      setTeeInfo(info);
      setHoles(result.holes.map((h, i) => ({ ...defaultHole(i + 1), ...h })));
      setImportSource('Pasted scorecard');
      setStatusMsg('Parsed ' + result.holes.length + ' holes. Review below.');
      setStep('edit');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      if (Platform.OS === 'web') window.alert('Could not parse the pasted text. Try copying the full scorecard table with tee names and yardages.');
    }
  };

  const handleManualEntry = () => {
    const pars = [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
    const tees = activeTees.length > 0 ? activeTees : ['White'];
    setActiveTees(tees);
    setHoles(holes.map((h, i) => ({ ...h, par: pars[i] || 4, yardages: defaultYardForPar(pars[i] || 4, tees) })));
    setStatusMsg('');
    setImportSource('');
    setStep('edit');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openLink = (url) => {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  const handleSave = async () => {
    const tees = {};
    for (const t of activeTees) {
      const total = holes.reduce((s, h) => s + (parseInt(h.yardages[t]) || 0), 0);
      const inf = teeInfo[t] || {};
      tees[t] = { rating: inf.rating || 72, slope: inf.slope || 130, total };
    }
    const course = {
      name: courseName.trim(), location: location.trim(),
      lat: coords?.lat || 42.36, lng: coords?.lng || -71.06, tees,
      websiteUrl: courseWebsite.trim() || '',
      holes: holes.map(h => ({
        ...h, shape: h.shape || 'straight', elevation: h.elevation || 'flat',
        description: h.description || 'Hole ' + h.number + ', Par ' + h.par,
        strategy: h.strategy || 'Play smart and find the fairway.',
        imageUrl: h.imageUrl || '',
        gps: h.gps || null,
      })),
    };
    await saveCourse(course);
    if (Platform.OS === 'web') window.alert(courseName + ' saved! Select it on the Plan tab.');
    navigation.goBack();
  };

  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const frontPar = holes.slice(0, 9).reduce((s, h) => s + h.par, 0);
  const backPar = holes.slice(9).reduce((s, h) => s + h.par, 0);
  const golfLinkUrl = buildGolfLinkUrl(courseName, location);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <HeroBanner title="Add a Course" subtitle="Import your scorecard in seconds" />

        {/* ── STEP 1: Name & Location ── */}
        {step === 'info' && (
          <>
            <Card>
              <Text style={styles.sectionTitle}>{'\u26F3'} Course Name</Text>
              <TextInput style={styles.input} value={courseName}
                onChangeText={handleNameChange} placeholder="Start typing a course name..." />
              {suggestions.length > 0 && (
                <View style={styles.suggestList}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity key={i} style={styles.suggestItem} onPress={() => pickSuggestion(s)}>
                      <View style={styles.suggestRow}>
                        <Text style={styles.suggestName}>{s.name}</Text>
                        {s.source === 'library' && (
                          <View style={styles.suggestBadge}>
                            <Text style={styles.suggestBadgeText}>In Library</Text>
                          </View>
                        )}
                      </View>
                      {s.location ? <Text style={styles.suggestLoc}>{s.location}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.hint}>Search finds golf courses worldwide</Text>
            </Card>
            <Card>
              <Text style={styles.sectionTitle}>{'\uD83D\uDCCD'} Location</Text>
              <TextInput style={styles.input} value={location}
                onChangeText={setLocation} placeholder="City, State (e.g., Marblehead, MA)" />
              {coords && <Text style={styles.hint}>{'\u2705'} Coordinates found</Text>}
            </Card>
            <Card>
              <Text style={styles.sectionTitle}>{'\uD83C\uDF10'} Course Website (optional)</Text>
              <TextInput style={styles.input} value={courseWebsite}
                onChangeText={setCourseWebsite}
                placeholder="https://www.tedescocc.org/golf/course-tour"
                autoCapitalize="none" />
              <Text style={styles.hint}>Paste the course tour URL for hole maps and visual reference</Text>
            </Card>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleFindCourse} disabled={loading}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.white} />
                  <Text style={styles.loadingText}>Searching (max 8 sec)...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>{'\uD83D\uDD0D'} Find Course Data</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 2: Import Options (auto-import failed) ── */}
        {step === 'import' && (
          <>
            <Card style={styles.infoCard}>
              <Text style={styles.infoTitle}>{'\uD83D\uDCA1'} How to Import "{courseName}"</Text>
              <Text style={styles.infoText}>
                Auto-search didn't find data. Choose one of these quick options:
              </Text>
            </Card>

            {/* Option A: Paste a URL */}
            <Card>
              <Text style={styles.sectionTitle}>{'\uD83C\uDF10'} Option 1: Paste a Course URL</Text>
              <Text style={styles.hint}>
                If you know the course's scorecard page, paste the URL here and we'll pull the data.
              </Text>
              <TextInput style={styles.input} value={courseUrl}
                onChangeText={setCourseUrl}
                placeholder="https://www.golflink.com/golf-courses/..." autoCapitalize="none" />
              {courseUrl.length > 10 && (
                <TouchableOpacity style={styles.importBtn} onPress={handleUrlImport} disabled={urlLoading}>
                  {urlLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color={COLORS.white} size="small" />
                      <Text style={styles.importBtnText}>Importing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.importBtnText}>{'\uD83D\uDCE5'} Import from URL</Text>
                  )}
                </TouchableOpacity>
              )}
              {statusMsg ? <Text style={styles.statusHint}>{statusMsg}</Text> : null}

              <View style={styles.divider} />
              <Text style={styles.hint}>Don't have the URL? Try searching here:</Text>
              <View style={styles.linkRow}>
                {golfLinkUrl && (
                  <TouchableOpacity style={styles.linkChip} onPress={() => openLink(golfLinkUrl)}>
                    <Text style={styles.linkChipText}>GolfLink</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.linkChip}
                  onPress={() => openLink(buildSearchUrl(courseName, location))}>
                  <Text style={styles.linkChipText}>Google Search</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.tinyHint}>Open a link above, find the scorecard page, copy the URL, and paste it above.</Text>
            </Card>

            {/* Option B: Paste scorecard text */}
            <Card>
              <Text style={styles.sectionTitle}>{'\uD83D\uDCCB'} Option 2: Paste Scorecard Table</Text>
              <Text style={styles.hint}>
                Open the scorecard page, select the table, copy (Ctrl+C / Cmd+C), and paste below.
              </Text>
              <TextInput style={styles.pasteInput} value={pasteText}
                onChangeText={setPasteText} multiline
                placeholder={'Paste scorecard table here...\n\ne.g.:\nBlack  432  392  199  423  368  277  238  134  505\nBlue   427  384  177  416  348  274  229  131  495\nPar    4    4    3    4    4    4    3    3    5'} />
              {pasteText.length > 10 && (
                <TouchableOpacity style={[styles.importBtn, { backgroundColor: '#7B1FA2' }]} onPress={handlePasteImport}>
                  <Text style={styles.importBtnText}>{'\uD83D\uDCCB'} Parse Pasted Data</Text>
                </TouchableOpacity>
              )}
            </Card>

            {/* Option C: Manual */}
            <Card>
              <Text style={styles.sectionTitle}>{'\u270F\uFE0F'} Option 3: Enter Manually</Text>
              <TouchableOpacity style={styles.manualBtn} onPress={handleManualEntry}>
                <Text style={styles.manualBtnText}>Enter Scorecard Manually</Text>
              </TouchableOpacity>
            </Card>

            <TouchableOpacity style={styles.backBtn}
              onPress={() => { setStep('info'); setStatusMsg(''); scrollRef.current?.scrollTo({ y: 0 }); }}>
              <Text style={styles.backBtnText}>{'\u2190'} Change Course</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 3: Edit/Tweak Scorecard ── */}
        {step === 'edit' && (
          <>
            {statusMsg ? (
              <Card style={styles.successCard}>
                <Text style={styles.successText}>{'\u2705'} {statusMsg}</Text>
                {importSource ? <Text style={styles.sourceTag}>Source: {importSource}</Text> : null}
              </Card>
            ) : null}

            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <SummaryItem label="Front 9" value={frontPar} />
                <SummaryItem label="Back 9" value={backPar} />
                <SummaryItem label="Total Par" value={totalPar} big />
              </View>
              {activeTees.length > 0 && (
                <View style={styles.teesSummary}>
                  {activeTees.map(t => {
                    const total = holes.reduce((s, h) => s + (parseInt(h.yardages[t]) || 0), 0);
                    return (
                      <View key={t} style={styles.teeSummaryItem}>
                        <Text style={styles.teeSummaryName}>{t}</Text>
                        <Text style={styles.teeSummaryYards}>{total}y</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            <Text style={styles.nineHeader}>Front Nine</Text>
            {holes.map((hole, i) => {
              if (i === 9) return (
                <React.Fragment key="back">
                  <Text style={styles.nineHeader}>Back Nine</Text>
                  {renderHole(hole, i)}
                </React.Fragment>
              );
              return renderHole(hole, i);
            })}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{'\uD83D\uDCBE'} Save Course</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn}
              onPress={() => { setStep('import'); scrollRef.current?.scrollTo({ y: 0 }); }}>
              <Text style={styles.backBtnText}>{'\u2190'} Back to Import Options</Text>
            </TouchableOpacity>
          </>
        )}
        <FeedbackButton />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function renderHole(hole, i) {
    const isExp = editingHole === i;
    return (
      <Card key={i} style={[styles.holeCard, isExp && styles.holeCardExp]}>
        <TouchableOpacity onPress={() => setEditingHole(isExp ? null : i)}>
          <View style={styles.holeRow}>
            <View style={styles.holeBadge}><Text style={styles.holeBadgeText}>{hole.number}</Text></View>
            <View style={styles.parBtns}>
              {[3, 4, 5].map(p => (
                <TouchableOpacity key={p} style={[styles.parBtn, hole.par === p && styles.parBtnOn]}
                  onPress={() => setPar(i, p)}>
                  <Text style={[styles.parBtnText, hole.par === p && styles.parBtnTextOn]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.quickYards}>
              {activeTees.slice(0, 2).map(t => (
                <TextInput key={t} style={styles.quickYardInput}
                  value={String(hole.yardages[t] || '')}
                  onChangeText={(v) => updateYardage(i, t, v)}
                  keyboardType="numeric" maxLength={3} placeholder={t.substring(0, 3)} />
              ))}
            </View>
            <Text style={styles.arrow}>{isExp ? '\u25B2' : '\u25BC'}</Text>
          </View>
        </TouchableOpacity>
        {isExp && (
          <View style={styles.expanded}>
            <Text style={styles.miniLabel}>Yardages</Text>
            <View style={styles.yardGrid}>
              {activeTees.map(t => (
                <View key={t} style={styles.yardItem}>
                  <Text style={styles.yardTeeLabel}>{t}</Text>
                  <TextInput style={styles.yardInput} value={String(hole.yardages[t] || '')}
                    onChangeText={(v) => updateYardage(i, t, v)} keyboardType="numeric" maxLength={3} />
                </View>
              ))}
            </View>
            <Text style={styles.miniLabel}>Hole Shape</Text>
            <View style={styles.chipRow}>
              {SHAPES.map(s => (
                <TouchableOpacity key={s} style={[styles.chip, hole.shape === s.toLowerCase() && styles.chipOn]}
                  onPress={() => updateHole(i, 'shape', s.toLowerCase())}>
                  <Text style={[styles.chipText, hole.shape === s.toLowerCase() && styles.chipTextOn]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.miniLabel}>Elevation</Text>
            <View style={styles.chipRow}>
              {ELEVATIONS.map(e => (
                <TouchableOpacity key={e} style={[styles.chip, hole.elevation === e.toLowerCase() && styles.chipOn]}
                  onPress={() => updateHole(i, 'elevation', e.toLowerCase())}>
                  <Text style={[styles.chipText, hole.elevation === e.toLowerCase() && styles.chipTextOn]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.miniLabel}>Hazards</Text>
            <View style={styles.chipRow}>
              {HAZARD_PRESETS.map(h => {
                const on = hole.hazards.includes(h.toLowerCase());
                return (
                  <TouchableOpacity key={h} style={[styles.chip, on && styles.hazardOn]}
                    onPress={() => toggleHazard(i, h)}>
                    <Text style={[styles.chipText, on && styles.hazardTextOn]}>{h}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.miniLabel}>Notes</Text>
            <TextInput style={styles.noteInput} value={hole.description}
              onChangeText={(v) => updateHole(i, 'description', v)} placeholder="Hole description..." multiline />
            <TextInput style={[styles.noteInput, { marginTop: 4 }]} value={hole.strategy}
              onChangeText={(v) => updateHole(i, 'strategy', v)} placeholder="Strategy..." multiline />
            <Text style={styles.miniLabel}>Hole Image URL (optional)</Text>
            <TextInput style={styles.noteInput} value={hole.imageUrl || ''}
              onChangeText={(v) => updateHole(i, 'imageUrl', v)}
              placeholder="Paste image URL (long-press image → Copy)" autoCapitalize="none" />
            {hole.gps && (
              <TouchableOpacity style={styles.satBtn} onPress={() => openLink(getSatelliteUrl(hole.gps))}>
                <Text style={styles.satBtnText}>{'\uD83D\uDEF0\uFE0F'} View Satellite Map</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    );
  }
}

function SummaryItem({ label, value, big }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryNum, big && { fontSize: 28 }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },
  sectionTitle: { fontSize: 16, ...FONTS.semiBold, color: COLORS.primary, marginBottom: 8 },
  hint: { fontSize: 12, color: COLORS.textLight, marginTop: 2, marginBottom: 8 },
  suggestList: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    marginTop: 6, backgroundColor: COLORS.white, overflow: 'hidden',
  },
  suggestItem: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestName: { fontSize: 15, ...FONTS.medium, color: COLORS.text, flex: 1 },
  suggestLoc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  suggestBadge: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary,
  },
  suggestBadgeText: { fontSize: 10, color: COLORS.primary, ...FONTS.semiBold },
  tinyHint: { fontSize: 11, color: COLORS.textLight, marginTop: 6, fontStyle: 'italic' },
  statusHint: { fontSize: 12, color: COLORS.danger, marginTop: 6, ...FONTS.medium },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.white, marginBottom: 4 },
  primaryBtn: { backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: COLORS.white, fontSize: 17, ...FONTS.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: COLORS.white, fontSize: 14, ...FONTS.medium },
  backBtn: { marginHorizontal: 16, marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  backBtnText: { color: COLORS.textSecondary, fontSize: 14, ...FONTS.medium },

  infoCard: { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#1565C0' },
  infoTitle: { fontSize: 16, ...FONTS.bold, color: '#0D47A1', marginBottom: 4 },
  infoText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  linkRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  linkChip: { backgroundColor: COLORS.info, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  linkChipText: { color: COLORS.white, ...FONTS.semiBold, fontSize: 13 },

  importBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  importBtnText: { color: COLORS.white, fontSize: 15, ...FONTS.bold },
  manualBtn: { backgroundColor: COLORS.accent, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  manualBtnText: { color: COLORS.primaryDark, fontSize: 15, ...FONTS.bold },

  pasteInput: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, padding: 12, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.white, minHeight: 120, textAlignVertical: 'top', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },

  successCard: { backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: COLORS.success },
  successText: { fontSize: 14, ...FONTS.semiBold, color: COLORS.primary },
  sourceTag: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },

  summaryCard: { backgroundColor: '#E8F5E9' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNum: { fontSize: 22, ...FONTS.bold, color: COLORS.primary },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  teesSummary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#C8E6C9' },
  teeSummaryItem: { alignItems: 'center' },
  teeSummaryName: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.medium },
  teeSummaryYards: { fontSize: 14, ...FONTS.bold, color: COLORS.primary },

  nineHeader: { fontSize: 16, ...FONTS.bold, color: COLORS.primary, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  holeCard: { paddingVertical: 6, paddingHorizontal: 10, marginHorizontal: 12, marginVertical: 3 },
  holeCardExp: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  holeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  holeBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  holeBadgeText: { color: COLORS.white, ...FONTS.bold, fontSize: 14 },
  parBtns: { flexDirection: 'row', gap: 4 },
  parBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  parBtnOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  parBtnText: { fontSize: 16, ...FONTS.bold, color: COLORS.textSecondary },
  parBtnTextOn: { color: COLORS.white },
  quickYards: { flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'flex-end' },
  quickYardInput: { width: 52, height: 34, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, textAlign: 'center', fontSize: 13, color: COLORS.text, backgroundColor: COLORS.white },
  arrow: { fontSize: 12, color: COLORS.textLight, width: 20, textAlign: 'center' },

  expanded: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  miniLabel: { fontSize: 12, ...FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 6, marginTop: 8 },
  yardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yardItem: { alignItems: 'center' },
  yardTeeLabel: { fontSize: 10, color: COLORS.textLight, marginBottom: 2 },
  yardInput: { width: 56, height: 36, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 6, textAlign: 'center', fontSize: 14, ...FONTS.medium, color: COLORS.primary, backgroundColor: COLORS.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipOn: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 11, color: COLORS.textSecondary },
  chipTextOn: { color: COLORS.primary, ...FONTS.semiBold },
  hazardOn: { borderColor: COLORS.danger, backgroundColor: '#FFEBEE' },
  hazardTextOn: { color: COLORS.danger, ...FONTS.semiBold },
  noteInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.white, minHeight: 36 },
  satBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1565C0', paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  satBtnText: { color: COLORS.white, fontSize: 12, ...FONTS.semiBold },

  saveBtn: { backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 20, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontSize: 18, ...FONTS.bold },
});

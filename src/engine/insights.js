export function generateRoundInsights(scores, interview, profile, plan) {
  const practiceAreas = [];
  const profileMods = [];

  const totalHoles = scores.length;
  const scoredHoles = scores.filter(s => s.score !== '' && s.score !== undefined);
  const totalScore = scoredHoles.reduce((s, h) => s + (parseInt(h.score) || 0), 0);
  const totalPar = scoredHoles.reduce((s, h) => s + h.par, 0);
  const overUnder = totalScore - totalPar;

  const par4and5Holes = scores.filter(s => s.par >= 4);
  const firCount = par4and5Holes.filter(s => s.fir === true).length;
  const firTotal = par4and5Holes.filter(s => s.fir !== null).length;
  const firPct = firTotal > 0 ? Math.round((firCount / firTotal) * 100) : null;

  const girCount = scores.filter(s => s.gir === true).length;
  const girTotal = scores.filter(s => s.gir !== null).length;
  const girPct = girTotal > 0 ? Math.round((girCount / girTotal) * 100) : null;

  const udAttempts = scores.filter(s => s.upAndDown === true || s.upAndDown === false);
  const udMade = scores.filter(s => s.upAndDown === true).length;
  const udPct = udAttempts.length > 0 ? Math.round((udMade / udAttempts.length) * 100) : null;

  const totalPutts = scoredHoles.reduce((s, h) => s + (parseInt(h.putts) || 0), 0);
  const avgPutts = scoredHoles.length > 0 ? (totalPutts / scoredHoles.length).toFixed(1) : null;

  const driveLocations = scores.filter(s => s.driveLocation);
  const driveLeft = driveLocations.filter(s => s.driveLocation === 'LF').length;
  const driveCenter = driveLocations.filter(s => s.driveLocation === 'CF').length;
  const driveRight = driveLocations.filter(s => s.driveLocation === 'RF').length;

  // Approach analysis
  const approaches = scores.filter(s => s.approachDist && parseInt(s.approachDist) > 0);
  const avgApproachDist = approaches.length > 0
    ? Math.round(approaches.reduce((s, h) => s + parseInt(h.approachDist), 0) / approaches.length)
    : null;

  // Practice area logic
  if (firPct !== null && firPct < 50) {
    practiceAreas.push({
      area: 'Fairways Hit',
      stat: firPct + '%',
      recommendation: 'Your fairway percentage is below 50%. Focus on driver consistency — consider alignment drills and a tempo-focused range session. If your misses are consistently one direction, a lesson on path correction could help significantly.',
      priority: 'high',
    });
  } else if (firPct !== null && firPct < 65) {
    practiceAreas.push({
      area: 'Fairways Hit',
      stat: firPct + '%',
      recommendation: 'Your FIR is decent but has room to improve. Spend 10 minutes each range session on driver accuracy — pick a target in the fairway width and track success rate.',
      priority: 'medium',
    });
  }

  if (girPct !== null && girPct < 30) {
    practiceAreas.push({
      area: 'Greens in Regulation',
      stat: girPct + '%',
      recommendation: 'GIR is your biggest opportunity. Focus on mid-to-long iron accuracy — hit to a specific target on the range, not just "at the green." Distance control with 6-8 irons should be the priority.',
      priority: 'high',
    });
  } else if (girPct !== null && girPct < 50) {
    practiceAreas.push({
      area: 'Greens in Regulation',
      stat: girPct + '%',
      recommendation: 'Getting on more greens will lower your scores fastest. Work on approach accuracy from your most common approach distances. Consider aiming for the center of the green more often.',
      priority: 'medium',
    });
  }

  if (avgPutts !== null && parseFloat(avgPutts) > 2.1) {
    practiceAreas.push({
      area: 'Putting',
      stat: avgPutts + ' per hole',
      recommendation: 'You\'re averaging over 2 putts per hole. Prioritize lag putting from 20-40 feet to eliminate three-putts, then spend time on the 3-6 foot range for confidence on those knee-knockers.',
      priority: 'high',
    });
  } else if (avgPutts !== null && parseFloat(avgPutts) > 1.8) {
    practiceAreas.push({
      area: 'Putting',
      stat: avgPutts + ' per hole',
      recommendation: 'Your putting is average. Spend time on 6-10 foot putts — that\'s where you can convert more pars and birdies. Green reading practice will also help.',
      priority: 'medium',
    });
  }

  if (udPct !== null && udPct < 30) {
    practiceAreas.push({
      area: 'Short Game (Up & Down)',
      stat: udPct + '%',
      recommendation: 'When you miss the green, you\'re not getting up-and-down often enough. Dedicate practice time to chipping from 10-30 yards with your most comfortable wedge. Focus on landing spot, not the pin.',
      priority: 'high',
    });
  } else if (udPct !== null && udPct < 50) {
    practiceAreas.push({
      area: 'Short Game (Up & Down)',
      stat: udPct + '%',
      recommendation: 'Your scrambling has room to grow. Practice different lies around the green — uphill, downhill, tight. Variety in practice = confidence on the course.',
      priority: 'medium',
    });
  }

  // Interview-based insights
  const commonMiss = interview.commonMiss;
  if (commonMiss && commonMiss !== 'mixed') {
    const missMap = {
      left: 'Your most common miss was left. On the range, work on path — you may be coming over the top or closing the face. Alignment sticks can help.',
      right: 'Your most common miss was right. Check your alignment and ball position. You might be sliding through impact rather than rotating.',
      long: 'You\'re leaving shots long. Club down more often — better to be pin-high or short than over the green. Practice committing to the shorter club.',
      short: 'Leaving shots short is a common issue. Trust your distances and make full swings. Cold weather or fatigue may be costing you yards — adjust accordingly.',
    };
    if (missMap[commonMiss]) {
      practiceAreas.push({
        area: 'Most Common Miss Direction',
        stat: commonMiss.charAt(0).toUpperCase() + commonMiss.slice(1),
        recommendation: missMap[commonMiss],
        priority: 'medium',
      });
    }
  }

  if (interview.decisionRating && parseInt(interview.decisionRating) <= 5) {
    practiceAreas.push({
      area: 'Course Management',
      stat: interview.decisionRating + '/10',
      recommendation: 'You rated your decision-making low. Before each shot, commit to a target and a club — then don\'t second-guess. Consider playing more conservatively (aim center-green, take the safe tee club) until confidence builds.',
      priority: 'medium',
    });
  }

  if (interview.rangeWork) {
    practiceAreas.push({
      area: 'Self-Identified Focus',
      stat: 'Your words',
      recommendation: 'You said you\'d work on: "' + interview.rangeWork + '". Trust that instinct — your on-course feel is valuable data.',
      priority: 'low',
    });
  }

  // Profile modification suggestions
  if (driveLocations.length >= 6) {
    const missDir = driveLeft > driveRight ? 'left' : driveRight > driveLeft ? 'right' : null;
    if (missDir && (driveLeft >= driveLocations.length * 0.5 || driveRight >= driveLocations.length * 0.5)) {
      profileMods.push({
        category: 'Driver Miss Tendency',
        current: profile.tendencies.driver.miss,
        suggested: missDir,
        reason: 'Today\'s data shows ' + (missDir === 'left' ? driveLeft : driveRight) + ' of ' + driveLocations.length + ' drives went ' + missDir + '. If this is consistent across rounds, consider updating your driver miss to "' + missDir + '".',
      });
    }
  }

  if (avgApproachDist !== null) {
    if (avgApproachDist > 160) {
      profileMods.push({
        category: 'Approach Strategy',
        current: profile.preferences.approachStrategy,
        suggested: 'conservative',
        reason: 'Your average approach distance was ' + avgApproachDist + ' yards — quite long. Consider: is your tee club leaving you too far? You might benefit from more aggressive tee shots (driver over 3W) to shorten approaches.',
      });
    }
  }

  if (interview.commonMiss && interview.commonMiss !== 'mixed') {
    const currentMiss = profile.tendencies.irons.miss;
    if (currentMiss !== interview.commonMiss) {
      profileMods.push({
        category: 'Iron Miss Pattern',
        current: currentMiss,
        suggested: interview.commonMiss,
        reason: 'You reported your most common miss today as "' + interview.commonMiss + '" but your profile lists "' + currentMiss + '". If this trend continues, update your iron tendency so the AI Caddie gives better aim advice.',
      });
    }
  }

  if (totalPutts > 0 && avgPutts !== null && parseFloat(avgPutts) <= 1.6) {
    profileMods.push({
      category: 'Risk Tolerance',
      current: profile.preferences.riskTolerance,
      suggested: 'high',
      reason: 'Your putting was excellent today (' + avgPutts + ' per hole). With a hot putter, you can afford to attack more pins. Consider bumping your risk tolerance to "high" when you\'re putting well.',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  practiceAreas.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    summary: {
      totalScore,
      totalPar,
      overUnder,
      firPct,
      girPct,
      udPct,
      avgPutts,
      totalPutts,
      scoredHoles: scoredHoles.length,
      driveLeft,
      driveCenter,
      driveRight,
      avgApproachDist,
    },
    practiceAreas,
    profileMods,
  };
}

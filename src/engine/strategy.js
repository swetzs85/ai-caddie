import { windDescription } from './weather';

function tempAdjustment(temp) {
  return ((temp - 70) / 10) * 2;
}

function elevationAdjustment(elevationType, yardage) {
  const factors = {
    'downhill': -0.05,
    'severe downhill (140ft drop)': -0.10,
    'uphill': 0.05,
    'uphill green': 0.04,
    'down then up': 0,
    'elevated': 0.03,
    'flat': 0,
  };
  return Math.round(yardage * (factors[elevationType] || 0));
}

function windAdjustment(windSpeed, windDir, holeDir) {
  if (windSpeed < 3) return { yards: 0, lateral: 'none', lateralYards: 0, desc: 'No wind effect' };

  const relative = ((windDir - holeDir) + 360) % 360;
  const relRad = (relative * Math.PI) / 180;
  const headComponent = Math.cos(relRad);
  const crossComponent = Math.sin(relRad);

  const yardAdj = Math.round(headComponent * windSpeed * 1.0);
  const lateralYards = Math.round(Math.abs(crossComponent) * windSpeed * 0.5);

  let lateralDir = 'none';
  if (lateralYards >= 2) {
    lateralDir = crossComponent > 0 ? 'pushing right' : 'pushing left';
  }

  let desc = '';
  if (Math.abs(headComponent) > 0.7) {
    desc = headComponent > 0
      ? 'Into the wind (~' + Math.abs(yardAdj) + 'y extra)'
      : 'Downwind (~' + Math.abs(yardAdj) + 'y less)';
  } else if (Math.abs(crossComponent) > 0.7) {
    desc = 'Crosswind ' + lateralDir + ' (~' + lateralYards + 'y)';
  } else {
    const headStr = headComponent > 0 ? 'helping' : 'hurting';
    desc = 'Quartering wind (' + headStr + ' ~' + Math.abs(yardAdj) + 'y, ' + lateralDir + ' ~' + lateralYards + 'y)';
  }

  return { yards: yardAdj, lateral: lateralDir, lateralYards, desc };
}

function selectClubForRange(bag, targetYardage, preference) {
  if (!preference) preference = 'center';
  let best = null;
  let bestDiff = Infinity;

  for (const club of bag) {
    let compareYard;
    if (preference === 'full') compareYard = club.yardHigh;
    else if (preference === 'easy') compareYard = club.yardLow;
    else compareYard = (club.yardLow + club.yardHigh) / 2;

    const diff = Math.abs(compareYard - targetYardage);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = club;
    }
  }
  return best;
}

// Shot shape analysis for hole strategy
function getShotShapeAdvice(shotShape, hole, wind) {
  const tips = [];
  const shape = hole.shape || 'straight';

  if (shotShape === 'draw') {
    // Draw = right to left
    if (shape.includes('dogleg left')) {
      tips.push('\u2705 Your draw works WITH this dogleg left \u2014 your natural shape follows the hole');
    } else if (shape.includes('dogleg right')) {
      tips.push('\u26A0\uFE0F Dogleg right fights your draw \u2014 aim right side of fairway and let the draw bring it back center. Consider a 3W for control.');
    }
    if (wind && wind.lateral === 'pushing left' && wind.lateralYards >= 3) {
      tips.push('\u26A0\uFE0F Wind + your draw both move left \u2014 aim further right to compensate for double curve');
    } else if (wind && wind.lateral === 'pushing right' && wind.lateralYards >= 3) {
      tips.push('\u2705 Wind holds against your draw \u2014 should fly straighter today');
    }
  } else if (shotShape === 'fade') {
    // Fade = left to right
    if (shape.includes('dogleg right')) {
      tips.push('\u2705 Your fade works WITH this dogleg right \u2014 your natural shape follows the hole');
    } else if (shape.includes('dogleg left')) {
      tips.push('\u26A0\uFE0F Dogleg left fights your fade \u2014 aim left side of fairway and let the fade bring it back center. Consider a 3W for control.');
    }
    if (wind && wind.lateral === 'pushing right' && wind.lateralYards >= 3) {
      tips.push('\u26A0\uFE0F Wind + your fade both move right \u2014 aim further left to compensate for double curve');
    } else if (wind && wind.lateral === 'pushing left' && wind.lateralYards >= 3) {
      tips.push('\u2705 Wind holds against your fade \u2014 should fly straighter today');
    }
  }

  return tips;
}

function getShapeAimAdjustment(shotShape, hazards) {
  const tips = [];
  const leftHazards = hazards.filter(h =>
    h.toLowerCase().includes('left')
  );
  const rightHazards = hazards.filter(h =>
    h.toLowerCase().includes('right')
  );

  if (shotShape === 'draw') {
    // Draw moves the ball left, so left-side hazards are the danger zone
    if (leftHazards.length > 0) {
      tips.push('\u26A0\uFE0F Your draw curves toward ' + capitalize(leftHazards[0]) + ' \u2014 start your line further right to keep it safe');
    }
    if (rightHazards.length > 0 && leftHazards.length === 0) {
      tips.push('\u2705 Your draw curves AWAY from ' + capitalize(rightHazards[0]) + ' \u2014 favor the right side confidently');
    }
  } else if (shotShape === 'fade') {
    // Fade moves the ball right, so right-side hazards are the danger zone
    if (rightHazards.length > 0) {
      tips.push('\u26A0\uFE0F Your fade curves toward ' + capitalize(rightHazards[0]) + ' \u2014 start your line further left to keep it safe');
    }
    if (leftHazards.length > 0 && rightHazards.length === 0) {
      tips.push('\u2705 Your fade curves AWAY from ' + capitalize(leftHazards[0]) + ' \u2014 favor the left side confidently');
    }
  }

  return tips;
}

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function getMissAdvice(tendencies, clubType, hazards) {
  const tendency = tendencies[clubType] || tendencies.irons;
  const missDir = tendency.miss;
  const tips = [];

  const leftHazards = hazards.filter(h => h.toLowerCase().includes('left'));
  const rightHazards = hazards.filter(h => h.toLowerCase().includes('right'));

  if (missDir === 'right' || missDir === 'slight right') {
    if (rightHazards.length > 0) {
      tips.push('\u26A0\uFE0F Miss tendency is RIGHT \u2014 aim left of target to avoid ' + capitalize(rightHazards.join(', ')));
    } else {
      tips.push('Miss is right \u2014 right side is safe here, play your natural shape');
    }
  } else if (missDir === 'left') {
    if (leftHazards.length > 0) {
      tips.push('\u26A0\uFE0F Miss tendency is LEFT \u2014 aim right of target to avoid ' + capitalize(leftHazards.join(', ')));
    } else {
      tips.push('Miss is left \u2014 left side is clear here, play your natural shape');
    }
  }

  if (tendency.altMiss) {
    tips.push('Watch for the occasional ' + tendency.altMiss + ' \u2014 take an extra breath before swinging');
  }

  return tips;
}

function estimateHoleDirection(holeNumber) {
  const bearings = {
    1: 0, 2: 45, 3: 90, 4: 180, 5: 270,
    6: 180, 7: 45, 8: 0, 9: 270,
    10: 180, 11: 90, 12: 225, 13: 180, 14: 0,
    15: 90, 16: 0, 17: 45, 18: 270,
  };
  return bearings[holeNumber] || 0;
}

export function generateGamePlan(course, profile, weather, teeChoice) {
  const teeKey = teeChoice || profile.preferences.preferredTee || 'White';
  const shotShape = profile.shotShape || 'straight';
  const plan = [];

  for (const hole of course.holes) {
    const yardage = hole.yardages[teeKey] || hole.yardages.White;
    const holePlan = {
      number: hole.number,
      par: hole.par,
      yardage,
      handicap: hole.handicap,
      description: hole.description,
      courseStrategy: hole.strategy,
      hazards: hole.hazards.map(capitalize),
      shots: [],
      tips: [],
      shapeTips: [],
      weatherNote: '',
      imageUrl: hole.imageUrl || '',
      gps: hole.gps || null,
    };

    const holeDir = estimateHoleDirection(hole.number);
    const wind = weather && weather.summary
      ? windAdjustment(weather.summary.avgWind, weather.summary.primaryWindDir, holeDir)
      : { yards: 0, lateral: 'none', lateralYards: 0, desc: 'No weather data' };

    const tempAdj = weather && weather.summary ? tempAdjustment(weather.summary.avgTemp) : 0;

    holePlan.weatherNote = wind.desc;
    if (weather && weather.summary) {
      holePlan.weatherNote += ' | ' + weather.summary.avgTemp + '\u00B0F';
      if (Math.abs(tempAdj) >= 2) {
        holePlan.weatherNote += ' (' + (tempAdj > 0 ? '+' : '') + Math.round(tempAdj) + 'y temp adj)';
      }
    }

    const elevAdj = elevationAdjustment(hole.elevation, yardage);
    const totalAdj = wind.yards + Math.round(tempAdj) + elevAdj;

    // Shot shape tips for this hole
    holePlan.shapeTips = getShotShapeAdvice(shotShape, hole, wind);
    const shapeHazardTips = getShapeAimAdjustment(shotShape, hole.hazards);
    holePlan.shapeTips = holePlan.shapeTips.concat(shapeHazardTips);

    if (hole.par === 3) {
      const playYardage = yardage + totalAdj;
      const clubType = playYardage > 200 ? 'woods' : 'irons';
      const club = selectClubForRange(profile.bag, playYardage, 'center');

      holePlan.shots.push({
        shotNum: 1,
        type: 'Tee Shot (to green)',
        targetYards: yardage,
        adjustedYards: playYardage,
        club: club ? club.club : 'Check yardage',
        note: 'Play ' + playYardage + 'y (' + (totalAdj >= 0 ? '+' : '') + totalAdj + 'y adj)',
      });

      holePlan.tips = getMissAdvice(profile.tendencies, clubType, hole.hazards);

    } else if (hole.par === 4) {
      const driverMid = (profile.bag[0].yardLow + profile.bag[0].yardHigh) / 2;
      let teeClub = profile.bag[0];
      let teeTarget = driverMid;

      const isDogleg = hole.shape && hole.shape.includes('dogleg');
      const isTight = hole.hazards && hole.hazards.some(h => h.toLowerCase().includes('tight'));

      // Shot shape affects club selection on doglegs
      let shapeHelps = false;
      if (isDogleg && shotShape !== 'straight') {
        if (hole.shape.includes('right') && shotShape === 'fade') shapeHelps = true;
        if (hole.shape.includes('left') && shotShape === 'draw') shapeHelps = true;
      }

      if (yardage < 350 || (isDogleg && !shapeHelps) || isTight) {
        if (yardage < 320) {
          teeClub = profile.bag.find(function(c) { return c.club === '5 Wood'; }) || profile.bag[1];
        } else {
          teeClub = profile.bag.find(function(c) { return c.club === '3 Wood'; }) || profile.bag[1];
        }
        teeTarget = (teeClub.yardLow + teeClub.yardHigh) / 2;
      } else if (isDogleg && shapeHelps) {
        // Shape works with the dogleg, driver is fine, even advantageous
        teeClub = profile.bag[0];
        teeTarget = driverMid;
      }

      const remainAfterTee = yardage - teeTarget;
      const approachPlay = remainAfterTee + totalAdj;
      const approachClubType = approachPlay > 200 ? 'woods' : (approachPlay > 130 ? 'irons' : 'wedges');
      const approachClub = selectClubForRange(profile.bag, approachPlay, 'center');

      let teeNote = 'Find the fairway';
      if (isDogleg && shapeHelps) {
        teeNote = 'Your ' + shotShape + ' works this dogleg \u2014 fire away';
      } else if (isDogleg && !shapeHelps) {
        teeNote = 'Position for the ' + hole.shape + ' \u2014 control over distance';
      } else if (isTight) {
        teeNote = 'Tight fairway \u2014 accuracy first';
      }

      holePlan.shots.push({
        shotNum: 1,
        type: 'Tee Shot',
        targetYards: Math.round(teeTarget),
        club: teeClub.club,
        note: teeNote,
      });

      holePlan.shots.push({
        shotNum: 2,
        type: 'Approach',
        targetYards: Math.round(remainAfterTee),
        adjustedYards: Math.round(approachPlay),
        club: approachClub ? approachClub.club : 'Check yardage',
        note: 'Play ' + Math.round(approachPlay) + 'y (' + (totalAdj >= 0 ? '+' : '') + totalAdj + 'y adj)',
      });

      holePlan.tips = getMissAdvice(profile.tendencies, 'driver', hole.hazards)
        .concat(getMissAdvice(profile.tendencies, approachClubType, hole.hazards));

    } else if (hole.par === 5) {
      const driverMid = (profile.bag[0].yardLow + profile.bag[0].yardHigh) / 2;
      const remainAfterDrive = yardage - driverMid;

      let secondClub, secondTarget, thirdNeeded;

      if (remainAfterDrive <= 240 && profile.preferences.riskTolerance !== 'low') {
        const goClub = selectClubForRange(profile.bag, remainAfterDrive + totalAdj, 'full');
        secondClub = goClub;
        secondTarget = remainAfterDrive;
        thirdNeeded = false;
      } else {
        const layupTarget = 100;
        secondTarget = remainAfterDrive - layupTarget;
        secondClub = selectClubForRange(profile.bag, secondTarget, 'center');
        thirdNeeded = true;
      }

      holePlan.shots.push({
        shotNum: 1,
        type: 'Tee Shot',
        targetYards: Math.round(driverMid),
        club: 'Driver',
        note: 'Bomb it and find the fairway',
      });

      if (thirdNeeded) {
        const thirdRemain = yardage - driverMid - secondTarget;
        const thirdPlay = thirdRemain + totalAdj;
        const thirdClub = selectClubForRange(profile.bag, thirdPlay, 'center');

        holePlan.shots.push({
          shotNum: 2,
          type: 'Layup',
          targetYards: Math.round(secondTarget),
          club: secondClub ? secondClub.club : 'Mid iron',
          note: 'Leave ' + Math.round(thirdRemain) + 'y to the green',
        });

        holePlan.shots.push({
          shotNum: 3,
          type: 'Approach',
          targetYards: Math.round(thirdRemain),
          adjustedYards: Math.round(thirdPlay),
          club: thirdClub ? thirdClub.club : 'Wedge',
          note: 'Play ' + Math.round(thirdPlay) + 'y (' + (totalAdj >= 0 ? '+' : '') + totalAdj + 'y adj)',
        });
      } else {
        holePlan.shots.push({
          shotNum: 2,
          type: 'Go for Green',
          targetYards: Math.round(secondTarget),
          adjustedYards: Math.round(secondTarget + totalAdj),
          club: secondClub ? secondClub.club : '3 Wood',
          note: 'Hero shot! Play ' + Math.round(secondTarget + totalAdj) + 'y',
        });
      }

      holePlan.tips = getMissAdvice(profile.tendencies, 'driver', hole.hazards);
    }

    // Add wind lateral tip
    if (wind.lateral !== 'none' && wind.lateralYards >= 3) {
      holePlan.tips.unshift('\uD83C\uDF2C\uFE0F Wind ' + wind.lateral + ' ~' + wind.lateralYards + 'y \u2014 aim to compensate');
    }

    plan.push(holePlan);
  }

  return plan;
}

export const DEFAULT_PROFILE = {
  name: 'Scott',
  handicap: { low: 13, high: 16 },
  shotShape: 'draw', // 'straight', 'draw', 'fade'
  tendencies: {
    driver: { miss: 'right', severity: 'slight', altMiss: 'hard hook', altFreq: 'sometimes', pattern: '' },
    woods: { miss: 'right', severity: 'slight', altMiss: 'hard hook', altFreq: 'sometimes', pattern: '' },
    irons: { miss: 'left', severity: 'moderate', pattern: 'hook', altMiss: '', altFreq: '' },
    wedges: { miss: 'thin/long', severity: '', pattern: '', altMiss: 'chunk', altFreq: 'occasionally' },
  },
  bag: [
    { club: 'Driver',       yardLow: 225, yardHigh: 250, type: 'wood' },
    { club: '3 Wood',       yardLow: 215, yardHigh: 235, type: 'wood' },
    { club: '5 Wood',       yardLow: 205, yardHigh: 215, type: 'wood' },
    { club: '4 Hybrid',     yardLow: 195, yardHigh: 205, type: 'hybrid' },
    { club: '5 Iron',       yardLow: 185, yardHigh: 195, type: 'iron' },
    { club: '6 Iron',       yardLow: 175, yardHigh: 185, type: 'iron' },
    { club: '7 Iron',       yardLow: 165, yardHigh: 175, type: 'iron' },
    { club: '8 Iron',       yardLow: 155, yardHigh: 165, type: 'iron' },
    { club: '9 Iron',       yardLow: 145, yardHigh: 155, type: 'iron' },
    { club: 'PW',           yardLow: 125, yardHigh: 135, type: 'wedge' },
    { club: '48° Wedge',    yardLow: 105, yardHigh: 115, type: 'wedge' },
    { club: '54° Wedge',    yardLow: 90,  yardHigh: 100, type: 'wedge' },
    { club: '58° Wedge',    yardLow: 80,  yardHigh: 85,  type: 'wedge' },
  ],
  preRoundReminders: {
    technical: '',
    tactical: '',
    mental: '',
  },
  enhancedTracking: false,
  preferences: {
    approachStrategy: 'center',
    riskTolerance: 'moderate',
    preferredTee: 'White',
  },
};

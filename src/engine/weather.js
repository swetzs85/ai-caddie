const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export async function fetchWeather(lat, lng, dateStr) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    hourly: 'temperature_2m,windspeed_10m,winddirection_10m,precipitation_probability,weathercode',
    temperature_unit: 'fahrenheit',
    windspeed_unit: 'mph',
    start_date: dateStr,
    end_date: dateStr,
    timezone: 'America/New_York',
  });

  try {
    const res = await fetch(`${OPEN_METEO_URL}?${params}`);
    const data = await res.json();

    if (!data.hourly) return null;

    const hours = data.hourly.time.map((t, i) => ({
      hour: new Date(t).getHours(),
      temp: data.hourly.temperature_2m[i],
      windSpeed: data.hourly.windspeed_10m[i],
      windDir: data.hourly.winddirection_10m[i],
      rainChance: data.hourly.precipitation_probability[i],
      code: data.hourly.weathercode[i],
    }));

    // Golf hours: 6am - 6pm
    const golfHours = hours.filter(h => h.hour >= 6 && h.hour <= 18);

    if (golfHours.length === 0) return null;

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      hourly: golfHours,
      summary: {
        avgTemp: Math.round(avg(golfHours.map(h => h.temp))),
        avgWind: Math.round(avg(golfHours.map(h => h.windSpeed))),
        maxWind: Math.max(...golfHours.map(h => h.windSpeed)),
        primaryWindDir: dominantDirection(golfHours.map(h => h.windDir)),
        primaryWindDirLabel: degreesToCompass(dominantDirection(golfHours.map(h => h.windDir))),
        avgRainChance: Math.round(avg(golfHours.map(h => h.rainChance))),
      },
    };
  } catch (e) {
    console.error('Weather fetch failed:', e);
    return null;
  }
}

function dominantDirection(dirs) {
  const sinSum = dirs.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0);
  const cosSum = dirs.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0);
  let avg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  if (avg < 0) avg += 360;
  return Math.round(avg);
}

function degreesToCompass(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function windDescription(speed) {
  if (speed < 5) return 'Calm';
  if (speed < 10) return 'Light Breeze';
  if (speed < 15) return 'Moderate Wind';
  if (speed < 20) return 'Strong Wind';
  return 'Very Strong Wind';
}

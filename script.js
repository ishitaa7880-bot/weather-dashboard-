'use strict';

const $ = id => document.getElementById(id);

const WEATHER_ICONS = {
  0: ['☀️', 'Clear sky'],
  1: ['🌤️', 'Mainly clear'],
  2: ['⛅', 'Partly cloudy'],
  3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'],
  48: ['🌫️', 'Depositing rime fog'],
  51: ['🌦️', 'Light drizzle'],
  53: ['🌦️', 'Moderate drizzle'],
  55: ['🌦️', 'Dense drizzle'],
  61: ['🌧️', 'Slight rain'],
  63: ['🌧️', 'Moderate rain'],
  65: ['🌧️', 'Heavy rain'],
  71: ['🌨️', 'Slight snowfall'],
  73: ['🌨️', 'Moderate snowfall'],
  75: ['❄️', 'Heavy snowfall'],
  80: ['🌦️', 'Rain showers'],
  81: ['🌧️', 'Moderate rain showers'],
  82: ['⛈️', 'Violent rain showers'],
  95: ['⛈️', 'Thunderstorm'],
  96: ['⛈️', 'Thunderstorm with hail'],
  99: ['⛈️', 'Severe thunderstorm with hail']
};

function setMessage(text, isError = false) {
  const msg = $('message');
  msg.textContent = text;
  msg.style.color = isError ? 'var(--warn)' : 'var(--mute)';
}

function getWeatherInfo(code) {
  return WEATHER_ICONS[code] || ['🌡️', 'Unknown'];
}

async function getCoordinates(city) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?count=1&language=en&format=json&name=${encodeURIComponent(city)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Could not find the city.');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('City not found. Please check the spelling.');
  }

  return data.results[0];
}

async function getWeather(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
    `is_day,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
    `precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Could not load weather data.');
  }

  return response.json();
}

function showCurrentWeather(place, weather) {
  const current = weather.current;
  const [icon, condition] = getWeatherInfo(current.weather_code);

  $('cityName').textContent = `${place.name}, ${place.country ?? ''}`;
  $('localTime').textContent = `Local time: ${current.time.replace('T', ' ')}`;
  $('weatherIcon').textContent = current.is_day ? icon : '🌙';
  $('temperature').textContent = `${Math.round(current.temperature_2m)}°C`;
  $('condition').textContent = condition;
  $('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°C`;
  $('humidity').textContent = `${current.relative_humidity_2m}%`;
  $('wind').textContent = `${current.wind_speed_10m} km/h`;
  $('maxMin').textContent =
    `${Math.round(weather.daily.temperature_2m_max[0])}° / ` +
    `${Math.round(weather.daily.temperature_2m_min[0])}°`;

  $('currentWeather').hidden = false;
}

function showForecast(weather) {
  const daily = weather.daily;

  const cards = daily.time.map((date, i) => {
    const [icon] = getWeatherInfo(daily.weather_code[i]);
    const dayName = new Date(date + 'T00:00:00')
      .toLocaleDateString(undefined, { weekday: 'short' });

    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const minTemp = Math.round(daily.temperature_2m_min[i]);
    const rainChance = daily.precipitation_probability_max?.[i] ?? 0;

    return `
      <div class="day">
        <b>${dayName}</b>
        <span class="icon">${icon}</span>
        <span class="temps">${maxTemp}° / ${minTemp}°</span>
        <span class="rain">💧 ${rainChance}%</span>
      </div>
    `;
  }).join('');

  $('forecast').innerHTML = cards;
  $('forecastSection').hidden = false;
}

$('weatherForm').addEventListener('submit', async event => {
  event.preventDefault();

  const city = $('cityInput').value.trim();

  if (!city) {
    setMessage('Please enter a city name.', true);
    return;
  }

  setMessage('Loading weather…');
  $('currentWeather').hidden = true;
  $('forecastSection').hidden = true;

  try {
    const place = await getCoordinates(city);
    const weather = await getWeather(place.latitude, place.longitude);

    showCurrentWeather(place, weather);
    showForecast(weather);

    setMessage(`Weather updated for ${place.name}.`);
  } catch (error) {
    setMessage(error.message, true);
  }
});

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('themeBtn').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  localStorage.setItem('skylog.theme', JSON.stringify(theme));
}

$('themeBtn').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  setTheme(isDark ? 'light' : 'dark');
});

setTheme(
  JSON.parse(localStorage.getItem('skylog.theme')) ??
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);
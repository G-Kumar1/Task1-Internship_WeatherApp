let currentMode = 'light'; // default theme

// =============== Weather Fetch ===============
async function getWeather(city) {
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;

  try {
    const res = await fetch(weatherUrl);
    const data = await res.json();
    if (data.cod !== 200) throw new Error("City not found");

    document.getElementById('loading').style.display = 'none';
    document.getElementById('weatherInfo').classList.remove('hidden');
    document.getElementById('temp').textContent = data.main.temp;
    document.getElementById('humidity').textContent = data.main.humidity;
    document.getElementById('wind').textContent = data.wind.speed;
    document.getElementById('icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
    const cityText = `${data.name}, ${data.sys.country}`;
    document.getElementById('cityName').textContent = cityText;

    // Format today's date
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString(undefined, options);

    // Set date beside city
    document.getElementById('currentDate').textContent = `${formattedDate}`;

    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json();
    renderForecast(forecastData);
  } catch (err) {
    document.getElementById('loading').textContent = "❌ " + err.message;
  }
}

function renderForecast(data) {
  const forecastDiv = document.getElementById('forecast');
  const hourlyDiv = document.getElementById('todayHourly');
  forecastDiv.innerHTML = '';
  hourlyDiv.innerHTML = '';

  // Next 4 entries = ~12 hours
  const nextHours = data.list.slice(0, 6);
  nextHours.forEach(entry => {
    const time = new Date(entry.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    hourlyDiv.innerHTML += `
      <div class="forecast-item small">
        <p>${time}</p>
        <img src="https://openweathermap.org/img/wn/${entry.weather[0].icon}.png" />
        <p>${entry.main.temp.toFixed(1)}°C</p>
      </div>`;
  });

  const days = data.list.filter((_, i) => i % 8 === 0);
  days.forEach(day => {
    const date = new Date(day.dt_txt).toDateString();
    forecastDiv.innerHTML += `
      <div class="forecast-item">
        <p>${date}</p>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" />
        <p>${day.main.temp.toFixed(1)}°C</p>
      </div>`;
  });
}


// =============== News Fetch ===============
async function getNews(city) {
  const url = `https://newsapi.org/v2/everything?q=${city}&apiKey=${NEWS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const newsDiv = document.getElementById('news');
    newsDiv.innerHTML = '';

    if (!data.articles || !data.articles.length) {
      newsDiv.innerHTML = "<p>No recent news available.</p>";
      return;
    }

    data.articles.slice(0, 5).forEach(article => {
      newsDiv.innerHTML += `
        <div class="news-card">
          <h4>${article.title}</h4>
          <p>${article.description || 'No description available.'}</p>
          <a href="${article.url}" target="_blank">Read more</a>
        </div>`;
    });
  } catch (err) {
    document.getElementById('news').innerHTML = "❌ News fetch error.";
  }
}

// =============== Tab Switching ===============
function switchTab(tab) {
  const weatherSection = document.getElementById('weatherSection');
  const newsSection = document.getElementById('newsSection');

  if (tab === 'weather') {
    weatherSection.classList.remove('hidden');
    newsSection.classList.add('hidden');
    document.getElementById('weatherTab').classList.add('active');
    document.getElementById('newsTab').classList.remove('active');
  } else {
    weatherSection.classList.add('hidden');
    newsSection.classList.remove('hidden');
    document.getElementById('weatherTab').classList.remove('active');
    document.getElementById('newsTab').classList.add('active');
  }
}

// =============== Search Functions ===============
function searchCity() {
  const city = document.getElementById('cityInput').value.trim();
  if (city) {
    localStorage.setItem('city', city);
    window.location.href = 'dashboard.html';
  }
}

function handleKey(e) {
  if (e.key === 'Enter') searchCity();
}

function handleResultKey(e) {
  if (e.key === 'Enter') searchCityResult();
}

function searchCityResult() {
  const city = document.getElementById('cityInput').value.trim();
  if (city) {
    localStorage.setItem('city', city);
    clearDisplay();
    getWeather(city);
    getNews(city);
  }
}

// =============== Voice Input ===============
function startVoiceInput() {
  const input = document.getElementById('cityInput');
  startRecognition(input, searchCity);
}

function startVoiceInputResult() {
  const input = document.getElementById('cityInput');
  startRecognition(input, searchCityResult);
}

function startRecognition(inputField, callback) {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Voice recognition not supported.");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = (e) => {
    let result = e.results[0][0].transcript;

    // ✅ Clean the result: remove punctuation and extra space
    result = result.trim().replace(/[^\w\s]/gi, '');

    inputField.value = result;

    // ✅ Log for debugging (optional)
    console.log("Voice input recognized:", result);

    callback(); // trigger search
  };

  recognition.onerror = (e) => console.error("Voice input error:", e);
}

// =============== Mode Toggle ===============
function toggleMode() {
  document.body.classList.toggle("dark-mode");
  const themeIcon = document.getElementById("themeIcon");
  const isDark = document.body.classList.contains("dark-mode");
  themeIcon.setAttribute("data-feather", isDark ? "sun" : "moon");
  feather.replace(); // Refresh icon
}


// =============== Geolocation ===============
function getLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        localStorage.setItem('city', data.name);
        getWeather(data.name);
        getNews(data.name);
      },
      () => {
        alert("Location permission denied.");
      }
    );
  } else {
    alert("Geolocation not supported in this browser.");
  }
}

// =============== Clear Display ===============
function clearDisplay() {
  document.getElementById('loading').textContent = "Loading...";
  document.getElementById('weatherInfo')?.classList.add('hidden');
  document.getElementById('forecast').innerHTML = '';
  document.getElementById('news').innerHTML = '';
}

// =============== Page Load ===============
window.onload = () => {
  const city = localStorage.getItem('city');
  const isDashboard = !!document.getElementById('weatherSection');

  if (city && isDashboard) {
    getWeather(city);
    getNews(city);
    switchTab('weather');
  }

  feather.replace(); // Load icons
};

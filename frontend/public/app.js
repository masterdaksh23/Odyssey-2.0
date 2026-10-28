/**
 * AGRO USE - Smart Farming Dashboard & SaaS Client
 */

const API_URL = 'https://agripilot-backend.onrender.com';

// Mock Data Defaults (ensures instant zero-latency UI rendering)
const defaultData = {
  totalFields: 12,
  activeCrops: 6,
  yieldPrediction: '3.6',
  fieldHealth: 85,
  insights: {
    moisture: 68,
    temp: 24,
    rainChance: 10
  },
  weather: {
    temp: '24°C',
    condition: 'Partly Cloudy',
    wind: '12 km/h',
    humidity: '60%',
    rainfall: '0 mm'
  },
  recentTasks: [
    { name: 'Irrigation Completed', field: 'Field 3', time: '2h ago', statusColor: 'green' },
    { name: 'Fertilizer Applied', field: 'Field 6', time: '5h ago', statusColor: 'orange' },
    { name: 'Pest Control Done', field: 'Field 2', time: '1d ago', statusColor: 'red' }
  ]
};

/**
 * Render initial UI immediately
 */
function renderInitialUI() {
  updateMetrics(defaultData.totalFields, defaultData.activeCrops, defaultData.yieldPrediction);
  updateInsights(defaultData.insights);
  updateWeather(defaultData.weather);
  updateRecentActivity(defaultData.recentTasks);
  updateFieldHealth(defaultData.fieldHealth);
}

/**
 * Update Top Metric Cards
 */
function updateMetrics(fields, crops, yieldVal) {
  const fieldsEl = document.getElementById('totalFields');
  const cropsEl = document.getElementById('activeCrops');
  const yieldEl = document.getElementById('yieldPrediction');

  if (fieldsEl) fieldsEl.textContent = fields;
  if (cropsEl) cropsEl.textContent = crops;
  if (yieldEl) yieldEl.innerHTML = `${yieldVal} <small>ton/ha</small>`;
}

/**
 * Update Live Farm Insights Bars
 */
function updateInsights(insights) {
  const moistureVal = document.getElementById('insightMoistureVal');
  const moistureBar = document.getElementById('insightMoistureBar');
  const tempVal = document.getElementById('insightTempVal');
  const tempBar = document.getElementById('insightTempBar');
  const rainVal = document.getElementById('insightRainVal');
  const rainBar = document.getElementById('insightRainBar');

  if (moistureVal && moistureBar) {
    moistureVal.textContent = `${insights.moisture}%`;
    moistureBar.style.width = `${insights.moisture}%`;
  }
  if (tempVal && tempBar) {
    tempVal.textContent = `${insights.temp}°C`;
    tempBar.style.width = `${Math.min(100, (insights.temp / 40) * 100)}%`;
  }
  if (rainVal && rainBar) {
    rainVal.textContent = `${insights.rainChance}%`;
    rainBar.style.width = `${insights.rainChance}%`;
  }
}

/**
 * Update Weather Card Information
 */
function updateWeather(w) {
  const tempEl = document.getElementById('weatherTemp');
  const conditionEl = document.getElementById('weatherCondition');
  const windEl = document.getElementById('weatherWind');
  const humidityEl = document.getElementById('weatherHumidity');
  const rainEl = document.getElementById('weatherRainfall');

  if (tempEl) tempEl.textContent = w.temp;
  if (conditionEl) conditionEl.textContent = w.condition;
  if (windEl) windEl.textContent = w.wind;
  if (humidityEl) humidityEl.textContent = w.humidity;
  if (rainEl) rainEl.textContent = w.rainfall;
}

/**
 * Update Circular Field Health
 */
function updateFieldHealth(percent) {
  const healthVal = document.getElementById('fieldHealthVal');
  const circle = document.getElementById('fieldHealthCircle');
  if (healthVal) healthVal.textContent = `${percent}%`;

  if (circle) {
    const circumference = 2 * Math.PI * 50; // ~314.159
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }
}

/**
 * Update Recent Activity List
 */
function updateRecentActivity(tasks) {
  const listEl = document.getElementById('recentActivityList');
  if (!listEl) return;

  listEl.innerHTML = tasks.map(task => `
    <li class="activity-item">
      <div class="activity-info">
        <span class="activity-dot ${task.statusColor}"></span>
        <div>
          <div class="activity-name">${task.name}</div>
          <div class="activity-field">${task.field}</div>
        </div>
      </div>
      <div class="activity-time">${task.time}</div>
    </li>
  `).join('');
}

/**
 * Fetch live data from backend
 */
async function fetchLiveData() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const [farmsRes, tasksRes, weatherRes] = await Promise.allSettled([
      fetch(`${API_URL}/api/farms`, { signal: controller.signal }),
      fetch(`${API_URL}/api/tasks`, { signal: controller.signal }),
      fetch(`${API_URL}/api/weather/1`, { signal: controller.signal })
    ]);
    clearTimeout(timeoutId);

    // Parse Farms
    if (farmsRes.status === 'fulfilled' && farmsRes.value.ok) {
      const farms = await farmsRes.value.json();
      if (Array.isArray(farms) && farms.length > 0) {
        let fieldCount = 0;
        let cropCount = 0;
        farms.forEach(f => {
          if (Array.isArray(f.fields)) {
            fieldCount += f.fields.length;
            f.fields.forEach(fld => {
              if (fld.crop_id || fld.crop_name) cropCount++;
            });
          }
        });
        updateMetrics(fieldCount || defaultData.totalFields, cropCount || defaultData.activeCrops, defaultData.yieldPrediction);
      }
    }

    // Parse Tasks
    if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
      const tasks = await tasksRes.value.json();
      if (Array.isArray(tasks) && tasks.length > 0) {
        const colors = ['green', 'orange', 'red'];
        const mapped = tasks.slice(0, 3).map((t, idx) => ({
          name: `${t.type || 'Operation'} ${t.status === 'completed' ? 'Done' : 'Scheduled'}`,
          field: t.farm_name || (t.field_id ? `Field ${t.field_id}` : `Field ${idx + 1}`),
          time: t.time || `${(idx + 1) * 2}h ago`,
          statusColor: colors[idx % colors.length]
        }));
        updateRecentActivity(mapped);
      }
    }

    // Parse Weather
    if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
      const w = await weatherRes.value.json();
      if (w) {
        const temp = w.temperature !== undefined ? `${Math.round(w.temperature)}°C` : defaultData.weather.temp;
        const condition = w.condition || w.summary || defaultData.weather.condition;
        const wind = w.wind_speed ? `${w.wind_speed} km/h` : defaultData.weather.wind;
        const humidity = w.humidity ? `${w.humidity}%` : defaultData.weather.humidity;
        const rain = w.precipitation !== undefined ? `${w.precipitation} mm` : defaultData.weather.rainfall;

        updateWeather({ temp, condition, wind, humidity, rainfall: rain });
      }
    }
  } catch (e) {
    console.log('Using default Agro Use telemetry (backend sleeping or CORS):', e);
  }
}

/**
 * Setup navigation & smooth interactions
 */
function setupInteractions() {
  // Smooth scroll links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Watch Story button scroll
  const watchStoryBtn = document.getElementById('watchStoryBtn');
  if (watchStoryBtn) {
    watchStoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const tech = document.getElementById('technology');
      if (tech) tech.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Theme toggle button
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleBtn.style.transform = 'scale(0.9) rotate(30deg)';
      setTimeout(() => {
        toggleBtn.style.transform = 'scale(1) rotate(0deg)';
      }, 200);
    });
  }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderInitialUI();
    fetchLiveData();
    setupInteractions();
  });
} else {
  renderInitialUI();
  fetchLiveData();
  setupInteractions();
}

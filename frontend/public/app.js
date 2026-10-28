/**
 * AgriPilot AI - Client Application Logic
 * Integrates with FastAPI backend for farms, tasks, and weather telemetry.
 */

const API_URL = 'https://agripilot-backend.onrender.com';

// Mock Data Fallbacks (Ensures instant rendering even on network latency or backend cold-starts)
const defaultData = {
    totalFields: 12,
    activeCrops: 6,
    yieldPrediction: '3.6 ton/ha',
    fieldHealth: 85,
    weather: {
        temp: '24°C',
        condition: 'Partly Cloudy',
        humidity: '62%',
        wind: '8 km/h'
    },
    recentTasks: [
        { name: 'Irrigation Completed', meta: 'Field 1 • 08:00 AM', status: 'completed', color: 'bullet-green' },
        { name: 'Fertilizer Applied', meta: 'Field 4 • 09:30 AM', status: 'completed', color: 'bullet-amber' },
        { name: 'NDVI Satellite Scan', meta: 'All Parcels • 11:15 AM', status: 'scheduled', color: 'bullet-blue' }
    ]
};

/**
 * Initialize dashboard UI with immediate fallback data, then fetch live updates
 */
async function initDashboard() {
    // 1. Instantly render initial data so widget is immediately populated
    renderMetrics(defaultData.totalFields, defaultData.activeCrops, defaultData.yieldPrediction);
    renderHealth(defaultData.fieldHealth);
    renderWeather(defaultData.weather);
    renderRecentActivity(defaultData.recentTasks);

    // 2. Fetch live data asynchronously with AbortController timeout
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const [farmsRes, tasksRes, weatherRes] = await Promise.allSettled([
            fetch(`${API_URL}/api/farms`, { signal: controller.signal }),
            fetch(`${API_URL}/api/tasks`, { signal: controller.signal }),
            fetch(`${API_URL}/api/weather/1`, { signal: controller.signal })
        ]);
        clearTimeout(timeoutId);

        // Process Farms & Fields Data
        if (farmsRes.status === 'fulfilled' && farmsRes.value.ok) {
            const farms = await farmsRes.value.json();
            if (Array.isArray(farms) && farms.length > 0) {
                let totalFieldsCount = 0;
                let activeCropsCount = 0;

                farms.forEach(farm => {
                    if (Array.isArray(farm.fields)) {
                        totalFieldsCount += farm.fields.length;
                        farm.fields.forEach(field => {
                            if (field.crop_id || field.crop_name || field.current_crop) {
                                activeCropsCount += 1;
                            }
                        });
                    }
                });

                renderMetrics(
                    totalFieldsCount || farms.length * 3 || defaultData.totalFields,
                    activeCropsCount || Math.ceil((totalFieldsCount || 12) * 0.5) || defaultData.activeCrops,
                    defaultData.yieldPrediction
                );
            }
        }

        // Process Tasks Data
        if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
            const tasks = await tasksRes.value.json();
            if (Array.isArray(tasks) && tasks.length > 0) {
                const mappedTasks = tasks.slice(0, 3).map((t, idx) => {
                    const statusText = t.status === 'completed' ? 'Completed' : 'Scheduled';
                    const colors = ['bullet-green', 'bullet-amber', 'bullet-blue'];
                    const farmOrField = t.farm_name || (t.field_id ? `Field ${t.field_id}` : `Field ${idx + 1}`);
                    const timeStr = t.time || (t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today');

                    return {
                        name: `${t.type || 'Operation'} ${statusText}`,
                        meta: `${farmOrField} • ${timeStr}`,
                        status: t.status || 'scheduled',
                        color: colors[idx % colors.length]
                    };
                });
                renderRecentActivity(mappedTasks);
            }
        }

        // Process Weather Data
        if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
            const weather = await weatherRes.value.json();
            if (weather) {
                const tempVal = weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : (weather.temp || defaultData.weather.temp);
                const conditionVal = weather.condition || weather.conditions || weather.summary || defaultData.weather.condition;
                const humidityVal = weather.humidity ? `${weather.humidity}%` : defaultData.weather.humidity;
                const windVal = weather.wind_speed ? `${weather.wind_speed} km/h` : defaultData.weather.wind;

                renderWeather({
                    temp: tempVal,
                    condition: conditionVal,
                    humidity: humidityVal,
                    wind: windVal
                });
            }
        }

    } catch (err) {
        console.log('Using mock dashboard data (Backend offline or cold start):', err);
    }
}

/**
 * Render Total Fields, Active Crops, and Yield Prediction
 */
function renderMetrics(totalFields, activeCrops, yieldPred) {
    const fieldsEl = document.getElementById('totalFields');
    const cropsEl = document.getElementById('activeCrops');
    const yieldEl = document.getElementById('yieldPrediction');

    if (fieldsEl) fieldsEl.textContent = totalFields;
    if (cropsEl) cropsEl.textContent = activeCrops;
    if (yieldEl) yieldEl.textContent = yieldPred;
}

/**
 * Render Circular Progress Bar for Field Health
 */
function renderHealth(percent) {
    const percentEl = document.getElementById('fieldHealthPercent');
    const ringEl = document.getElementById('healthRing');

    if (percentEl) percentEl.textContent = `${percent}%`;

    if (ringEl) {
        const circumference = 2 * Math.PI * 46; // r = 46 -> ~289
        const offset = circumference - (percent / 100) * circumference;
        ringEl.style.strokeDashoffset = offset;
    }
}

/**
 * Render Weather Information Box
 */
function renderWeather(weather) {
    const tempEl = document.getElementById('weatherTemp');
    const conditionEl = document.getElementById('weatherCondition');
    const detailsEl = document.getElementById('weatherDetails');

    if (tempEl) tempEl.textContent = weather.temp;
    if (conditionEl) conditionEl.textContent = weather.condition;
    if (detailsEl) {
        detailsEl.innerHTML = `<span>Humidity: ${weather.humidity}</span> • <span>Wind: ${weather.wind}</span>`;
    }
}

/**
 * Render Recent Activity List
 */
function renderRecentActivity(tasks) {
    const listEl = document.getElementById('recentActivityList');
    if (!listEl) return;

    listEl.innerHTML = tasks.map(task => `
        <li class="activity-item">
            <span class="activity-bullet ${task.color}"></span>
            <div class="activity-details">
                <span class="activity-name">${task.name}</span>
                <span class="activity-meta">${task.meta}</span>
            </div>
        </li>
    `).join('');
}

/**
 * Setup Button and Smooth Scroll Event Listeners
 */
function setupEventListeners() {
    // Scroll to "What We Do" on Get Started click
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const solutionsSec = document.getElementById('solutions');
            if (solutionsSec) {
                solutionsSec.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Scroll to solutions on Explore Solutions click
    const exploreBtn = document.getElementById('exploreSolutionsBtn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const solutionsSec = document.getElementById('solutions');
            if (solutionsSec) {
                solutionsSec.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Scroll to technology widget on Watch Story click
    const watchStoryBtn = document.getElementById('watchStoryBtn');
    if (watchStoryBtn) {
        watchStoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const techSec = document.getElementById('technology');
            if (techSec) {
                techSec.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Join AgriPilot Today CTA click
    const ctaJoinBtn = document.getElementById('ctaJoinBtn');
    if (ctaJoinBtn) {
        ctaJoinBtn.addEventListener('click', () => {
            const solutionsSec = document.getElementById('solutions');
            if (solutionsSec) {
                solutionsSec.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

// Ensure execution once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initDashboard();
        setupEventListeners();
    });
} else {
    initDashboard();
    setupEventListeners();
}

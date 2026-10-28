const API_URL = 'https://agripilot-backend.onrender.com';

const mockData = {
  totalFields: 12, activeCrops: 6, yield: '3.6 ton/ha', health: 85,
  weather: { temp: 24, condition: 'Partly Cloudy', wind: 12, humidity: 60, rain: 0 },
  tasks: [
    { name: 'Irrigation Completed', field: 'Field 3', time: '2h ago', color: 'green' },
    { name: 'Fertilizer Applied', field: 'Field 6', time: '5h ago', color: 'orange' },
    { name: 'Pest Control Done', field: 'Field 2', time: '1d ago', color: 'red' }
  ]
};

async function initDashboard() {
  // 1. Render mock data instantly so the UI is never blank
  document.getElementById('totalFields').textContent = mockData.totalFields;
  document.getElementById('activeCrops').textContent = mockData.activeCrops;
  document.getElementById('fieldHealthPercent').textContent = mockData.health + '%';
  document.getElementById('healthRing').style.strokeDashoffset = 289 - (289 * mockData.health / 100);
  
  document.getElementById('weatherTemp').textContent = mockData.weather.temp + '°C';
  document.getElementById('weatherCondition').textContent = mockData.weather.condition;
  document.querySelector('.wind-value').textContent = mockData.weather.wind + ' km/h';
  document.querySelector('.humidity-value').textContent = mockData.weather.humidity + '%';
  document.querySelector('.rainfall-value').textContent = mockData.weather.rain + ' mm';

  const activityList = document.getElementById('activityList');
  activityList.innerHTML = mockData.tasks.map(t => `
    <li class="activity-item">
      <div class="activity-info">
        <span class="activity-dot ${t.color}"></span>
        <div><div class="activity-name">${t.name}</div><div class="activity-field">${t.field}</div></div>
      </div>
      <span class="activity-time">${t.time}</span>
    </li>
  `).join('');

  // 2. Try to fetch live data from Render backend (with 5-second timeout)
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    
    const tasksRes = await fetch(`${API_URL}/api/tasks`, { signal: controller.signal });
    if (tasksRes.ok) {
      const tasks = await tasksRes.json();
      // If live data succeeds, update the activity list
      if (tasks && tasks.length > 0) {
        activityList.innerHTML = tasks.slice(0, 3).map(t => `
          <li class="activity-item">
            <div class="activity-info">
              <span class="activity-dot green"></span>
              <div><div class="activity-name">${t.task_type || 'Task'} Completed</div><div class="activity-field">Field ${t.field_id || '1'}</div></div>
            </div>
            <span class="activity-time">${t.status || 'Just now'}</span>
          </li>
        `).join('');
      }
    }
  } catch (err) {
    console.log('Backend is sleeping or offline. Using mock data (This is normal for free Render tier).');
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);

const API_URL = 'http://localhost:8000'; // Change to your Render URL when deployed

// Mock Data Fallback (Ensures UI looks good even if backend is down)
const mockTasks = [
    { id: 1, farm_name: 'Punjab Farm 1', type: 'Irrigation', priority: 9, status: 'scheduled', time: '08:00 AM', duration: 60, resources: ['Pump A', 'Labor x2'], replanned: false },
    { id: 2, farm_name: 'Haryana Farm 2', type: 'Spraying', priority: 7, status: 'pending', time: '10:30 AM', duration: 90, resources: ['Tractor 1', 'Sprayer'], replanned: false },
    { id: 3, farm_name: 'UP Farm 3', type: 'Harvesting', priority: 5, status: 'scheduled', time: '02:00 PM', duration: 120, resources: ['Harvester', 'Labor x4'], replanned: false },
    { id: 4, farm_name: 'Maharashtra Farm 4', type: 'Fertilizing', priority: 8, status: 'pending', time: '09:00 AM', duration: 45, resources: ['Labor x2'], replanned: true }
];

const mockAlerts = [
    { type: 'Weather', msg: 'Heavy rainfall expected in Punjab region tomorrow.', severity: 'high' },
    { type: 'Crop Health', msg: 'Low NDVI detected in Haryana Farm 2 - Field B.', severity: 'medium' }
];

async function init() {
    let tasks = mockTasks;
    let alerts = mockAlerts;

    try {
        const [taskRes, alertRes] = await Promise.all([
            fetch(`${API_URL}/api/tasks`),
            fetch(`${API_URL}/api/alerts`)
        ]);
        if (taskRes.ok) tasks = await taskRes.json();
        if (alertRes.ok) alerts = await alertRes.json();
    } catch (e) {
        console.log('Using mock data (Backend offline or CORS issue)');
    }

    renderTasks(tasks);
    renderAlerts(alerts);
    initChart();

    document.getElementById('simRainBtn').addEventListener('click', async () => {
        const btn = document.getElementById('simRainBtn');
        btn.innerText = '⏳ Replanning...';
        btn.disabled = true;
        
        try {
            await fetch(`${API_URL}/api/replan`, { method: 'POST', body: JSON.stringify({farm_id: '1'}) });
        } catch(e) {} // Ignore if backend is down
        
        // Visually update tasks for demo
        tasks[0].status = 'postponed';
        tasks[0].replanned = true;
        tasks[0].time = 'Tomorrow 08:00 AM';
        renderTasks(tasks);
        
        alerts.unshift({ type: 'System', msg: 'Schedule automatically replanned due to rain forecast.', severity: 'high' });
        renderAlerts(alerts);
        
        btn.innerText = '🌧️ Simulate Rain Event';
        btn.disabled = false;
    });
}

function renderTasks(tasks) {
    const container = document.getElementById('taskList');
    container.innerHTML = tasks.map(t => {
        const pClass = t.priority >= 8 ? 'priority-high' : t.priority >= 6 ? 'priority-med' : 'priority-low';
        const pColor = t.priority >= 8 ? 'text-red-400 bg-red-500/10' : t.priority >= 6 ? 'text-yellow-400 bg-yellow-500/10' : 'text-emerald-400 bg-emerald-500/10';
        return `
        <div class="task-card glass rounded-lg p-4 ${pClass}">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg">${t.type}</h3>
                    <p class="text-gray-400 text-sm">${t.farm_name}</p>
                    <p class="text-gray-300 text-sm mt-1">⏰ ${t.time} • ⏱️ ${t.duration} mins</p>
                </div>
                <div class="text-right">
                    <span class="px-2 py-1 rounded text-xs font-bold ${pColor}">P${t.priority}</span>
                    <p class="text-xs text-gray-400 mt-1 capitalize">${t.status}</p>
                    ${t.replanned ? '<span class="text-xs text-yellow-400 font-bold">🔄 Replanned</span>' : ''}
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-white/10 flex gap-2 flex-wrap">
                ${t.resources.map(r => `<span class="text-xs bg-white/5 px-2 py-1 rounded text-gray-300">${r}</span>`).join('')}
            </div>
        </div>`;
    }).join('');
}

function renderAlerts(alerts) {
    const container = document.getElementById('alertList');
    container.innerHTML = alerts.map(a => {
        const color = a.severity === 'high' ? 'border-red-500 bg-red-500/10' : 'border-yellow-500 bg-yellow-500/10';
        return `<div class="p-3 rounded border-l-4 ${color}"><p class="text-xs font-bold text-gray-300">${a.type}</p><p class="text-sm text-white">${a.msg}</p></div>`;
    }).join('');
}

function initChart() {
    const ctx = document.getElementById('ndviChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
            datasets: [{
                label: 'NDVI',
                data: [0.45, 0.52, 0.61, 0.68, 0.72, 0.75],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: 'white' } } },
            scales: {
                x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

init();

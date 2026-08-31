// script.js

// --- MOCK DATA ---
const INITIAL_STATE = {
    ph: 7.2,
    turbidity: 14,
    temperature: 29.4,
    tds: 420,
    flow: 82
};

let currentData = { ...INITIAL_STATE };
let isAnomaly = false;
let simulationInterval;
let activeAlerts = 0;
let riskScore = 32;

// --- WEBSOCKET STATE ---
let ws = null;
let isOffline = true;
let reconnectTimeout = null;

// Determine if we are deployed (not on localhost)
const isDeployed = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Chart History Data
const MAX_HISTORY = 20;
let chartHistory = {
    labels: Array.from({length: MAX_HISTORY}, (_, i) => `T-${MAX_HISTORY - i}`),
    ph: Array(MAX_HISTORY).fill(7.2),
    turbidity: Array(MAX_HISTORY).fill(14),
    temperature: Array(MAX_HISTORY).fill(29.4),
    tds: Array(MAX_HISTORY).fill(420),
    flow: Array(MAX_HISTORY).fill(82)
};

// Incidents Data
let incidents = [];

// Monitoring Points (Map)
let mapPoints = [];

// --- DOM ELEMENTS ---
const sensorCardsContainer = document.getElementById('sensor-cards');
const incidentsTbody = document.getElementById('incidents-tbody');
const reportsContainer = document.getElementById('reports-container');

// AI Elements
const aiBehaviour = document.getElementById('ai-behaviour');
const aiFingerprint = document.getElementById('ai-fingerprint');
const aiConfidence = document.getElementById('ai-confidence');

// Risk Elements
const riskScoreEl = document.getElementById('risk-score');
const riskProgressEl = document.getElementById('risk-progress');
const riskBadgeEl = document.getElementById('risk-status-badge');
const overallRiskVal = document.getElementById('overall-risk-val');

// Other Dash Elements
const activeAlertsCount = document.getElementById('active-alerts-count');
const lastUpdateTime = document.getElementById('last-update-time');
const heroStatus = document.getElementById('hero-system-status');
const recommendedActions = document.getElementById('recommended-actions');

// Chart instance
let myChart = null;
let currentChartSensor = 'ph';

// Leaflet map instance and markers
let map = null;
let markers = [];


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSensors();
    initChart();
    initMap();
    
    if (!isDeployed) {
        fetchDashboardSummary();
        fetchMapPoints();
        fetchIncidents();
        fetchReports();
        initWebSocket(); // Try to connect WebSocket
    } else {
        // Run in demo mode directly without spamming localhost connection errors
        handleDisconnect();
    }
    
    // Event Listeners
    document.getElementById('simulate-anomaly-btn').addEventListener('click', triggerAnomaly);
    document.getElementById('reset-sim-btn').addEventListener('click', resetSimulation);
    document.getElementById('chart-sensor-select').addEventListener('change', (e) => {
        currentChartSensor = e.target.value;
        updateChartDisplay();
    });
    
    // Filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderIncidents(e.target.dataset.filter);
        });
    });

    // Modals
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    
    // Print
    document.getElementById('generate-report-btn').addEventListener('click', generatePrintableReport);
});

// --- API FETCHERS ---
async function fetchDashboardSummary() {
    try {
        const res = await fetch('http://localhost:8000/api/dashboard/summary');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        document.querySelector('.dashboard-grid .stat-card:nth-child(1) .stat-value').innerText = data.monitoring_points < 10 ? '0' + data.monitoring_points : data.monitoring_points;
        activeAlertsCount.innerText = data.active_alerts;
        document.getElementById('safe-facilities-count').innerText = data.safe_facilities < 10 ? '0' + data.safe_facilities : data.safe_facilities;
        overallRiskVal.innerText = data.overall_risk;
        
        // Ensure hero status matches
        if (data.overall_risk >= 80) {
            heroStatus.className = 'system-status badge-critical';
            heroStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> CRITICAL ALERT';
        } else {
            heroStatus.className = 'system-status badge-safe';
            heroStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> SYSTEM OPERATIONAL';
        }
    } catch (e) {
        console.error("Dashboard fetch failed:", e);
    }
}

async function fetchMapPoints() {
    try {
        const res = await fetch('http://localhost:8000/api/map/points');
        if (!res.ok) throw new Error('Network response was not ok');
        mapPoints = await res.json();
        updateMapMarkers();
    } catch (e) {
        console.error("Map fetch failed:", e);
    }
}

async function fetchIncidents() {
    try {
        const res = await fetch('http://localhost:8000/api/incidents');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        // Map backend incident to frontend structure
        incidents = data.map(inc => ({
            db_id: inc.id, // backend DB ID needed for details and reports
            id: inc.incident_code,
            facility: "Facility " + inc.facility_id,
            location: "Point " + inc.monitoring_point_id,
            time: new Date(inc.detected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            issue: inc.issue,
            risk: inc.risk_level,
            status: inc.status,
            action: "Investigate"
        }));
        renderIncidents();
    } catch (e) {
        console.error("Incidents fetch failed:", e);
    }
}

async function fetchReports() {
    try {
        const res = await fetch('http://localhost:8000/api/reports');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        renderReports(data);
    } catch (e) {
        console.error("Reports fetch failed:", e);
    }
}


// --- NAVIGATION ---
function initNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close on link click (mobile)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// --- SENSORS & UI ---
const sensorConfigs = {
    ph: { name: 'pH Level', unit: '', icon: 'fa-vial' },
    turbidity: { name: 'Turbidity', unit: 'NTU', icon: 'fa-water' },
    temperature: { name: 'Temperature', unit: '°C', icon: 'fa-temperature-half' },
    tds: { name: 'TDS', unit: 'mg/L', icon: 'fa-flask' },
    flow: { name: 'Flow Rate', unit: 'L/min', icon: 'fa-gauge-high' }
};

function initSensors() {
    renderSensors();
}

function renderSensors() {
    sensorCardsContainer.innerHTML = '';
    
    for (const [key, config] of Object.entries(sensorConfigs)) {
        let val = currentData[key].toFixed(1);
        let statusClass = 'text-green';
        let trendIcon = 'fa-arrow-trend-up';
        
        // Basic logic for styling based on isAnomaly
        if (isAnomaly && (key === 'turbidity' || key === 'tds' || key === 'flow')) {
            statusClass = 'text-red';
        }

        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.innerHTML = `
            <div class="sensor-header">
                <span class="sensor-name"><i class="fa-solid ${config.icon} ${statusClass}"></i> ${config.name}</span>
            </div>
            <div class="sensor-value-container">
                <span class="sensor-value ${statusClass}" id="val-${key}">${val}</span>
                <span class="sensor-unit">${config.unit}</span>
            </div>
            <div class="sensor-trend ${statusClass}">
                <i class="fa-solid ${trendIcon}"></i> Live
            </div>
        `;
        sensorCardsContainer.appendChild(card);
    }
}

function updateSensorsUI() {
    for (const key of Object.keys(sensorConfigs)) {
        const el = document.getElementById(`val-${key}`);
        if (el) {
            el.innerText = currentData[key].toFixed(1);
        }
    }
    
    const now = new Date();
    lastUpdateTime.innerText = now.toLocaleTimeString();
}


// --- WEBSOCKET CONNECTION ---
function initWebSocket() {
    if (ws) {
        ws.close();
    }
    
    const wsUrl = `ws://localhost:8000/ws/sensors`;
    try {
        ws = new WebSocket(wsUrl);
    } catch(e) {
        handleDisconnect();
        return;
    }

    ws.onopen = () => {
        isOffline = false;
        updateConnectionStatus(true);
        // Stop local simulation if backend is live
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
        showToast("Connected to live server", "info");
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "sensor_update") {
            handleSensorUpdate(data);
        } else if (data.type === "incident") {
            handleIncidentEvent(data);
        } else if (data.type === "incident_resolved") {
            handleIncidentResolvedEvent(data);
        }
    };

    ws.onclose = () => {
        handleDisconnect();
    };

    ws.onerror = (err) => {
        // Suppress console error if we are deliberately offline or deployed
        if (!isDeployed) {
            console.error("WebSocket error:", err);
        }
        handleDisconnect();
    };
}

function handleDisconnect() {
    if (isOffline) return; // already handling
    isOffline = true;
    updateConnectionStatus(false);
    showToast("Connection lost. Falling back to local demo mode.", "warning");
    
    // Restart local simulation loop as fallback
    startSimulation();
    
    // Try reconnecting
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
        initWebSocket();
    }, 5000);
}

function updateConnectionStatus(isLive) {
    const statusEl = document.getElementById("connection-status");
    if (!statusEl) return;
    
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('.status-text');
    
    if (isLive) {
        statusEl.className = "connection-status live";
        dot.style.color = "#10b981"; // green
        text.style.color = "#10b981";
        text.innerText = "LIVE";
    } else {
        statusEl.className = "connection-status offline";
        dot.style.color = "#ef4444"; // red
        text.style.color = "#ef4444";
        text.innerText = "OFFLINE";
    }
}

function handleSensorUpdate(data) {
    // Override local data with backend data
    // (Assume monitoring_point_id=1 is the main display for simplicity)
    if (data.monitoring_point_id === 1) {
        currentData.ph = data.ph;
        currentData.turbidity = data.turbidity;
        currentData.temperature = data.temperature;
        currentData.tds = data.tds;
        currentData.flow = data.flow_rate;
        
        isAnomaly = data.risk_level === 'HIGH' || data.risk_level === 'CRITICAL';
        riskScore = data.risk_score;
        
        let type = 'safe';
        if (data.risk_level === 'MEDIUM') type = 'warning';
        if (data.risk_level === 'HIGH' || data.risk_level === 'CRITICAL') type = 'critical';
        updateRiskUI(`${data.risk_level} RISK`, type);
        
        // Update AI Fingerprint basic UI mapping
        if (isAnomaly) {
            aiBehaviour.innerText = 'ABNORMAL';
            aiBehaviour.className = 'value text-red';
            aiFingerprint.innerText = 'Server detected anomaly';
            aiFingerprint.className = 'value text-red';
        } else {
            aiBehaviour.innerText = 'NORMAL';
            aiBehaviour.className = 'value text-green';
            aiFingerprint.innerText = 'No significant deviation detected';
            aiFingerprint.className = 'value';
        }
        
        updateChartHistory();
        updateSensorsUI();
        updateChartDisplay();
        renderSensors();
    }
    
    // Update map status
    const mapPt = mapPoints.find(p => p.id === data.monitoring_point_id);
    if (mapPt) {
        if (!mapPt.latest_readings) mapPt.latest_readings = {};
        mapPt.latest_readings.ph = data.ph;
        mapPt.latest_readings.turbidity = data.turbidity;
        mapPt.risk_score = data.risk_score;
        mapPt.status = (data.risk_level === 'CRITICAL' || data.risk_level === 'HIGH') ? 'critical' : (data.risk_level === 'MEDIUM' ? 'warning' : 'safe');
        updateMapMarkers();
    }
}

function handleIncidentEvent(data) {
    const newIncident = {
        id: data.incident_code,
        facility: "Facility " + data.monitoring_point_id, // simplistic mapping
        location: "Point " + data.monitoring_point_id,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        issue: data.issue,
        risk: data.risk_level,
        status: "Open",
        action: "Investigate"
    };
    
    // Prevent exact duplicates
    if (!incidents.find(i => i.id === data.incident_code)) {
        incidents.unshift(newIncident);
        renderIncidents();
        renderReports();
        
        activeAlerts = incidents.filter(i => i.status !== 'Resolved').length;
        activeAlertsCount.innerText = activeAlerts;
        
        heroStatus.className = 'system-status badge-critical';
        heroStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> CRITICAL ALERT';
        recommendedActions.classList.remove('hidden');
        
        showToast(`New Incident [${data.incident_code}]: ${data.issue}`, 'critical');
    }
}

function handleIncidentResolvedEvent(data) {
    const inc = incidents.find(i => i.id === data.incident_code);
    if (inc) {
        inc.status = 'Resolved';
        renderIncidents();
        renderReports();
        
        activeAlerts = incidents.filter(i => i.status !== 'Resolved').length;
        activeAlertsCount.innerText = activeAlerts;
        
        if (activeAlerts === 0) {
            heroStatus.className = 'system-status badge-safe';
            heroStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> SYSTEM OPERATIONAL';
            recommendedActions.classList.add('hidden');
        }
        
        showToast(`Incident Resolved: ${data.incident_code}`, 'info');
    }
}


// --- SIMULATION LOOP (LOCAL FALLBACK) ---
function startSimulation() {
    if (simulationInterval) clearInterval(simulationInterval);
    
    simulationInterval = setInterval(() => {
        // Add small random fluctuations
        for (const key of Object.keys(currentData)) {
            // normal fluctuation
            let jitter = (Math.random() - 0.5) * (key === 'ph' ? 0.1 : 2);
            
            if (isAnomaly) {
                // If anomaly, keep values high for turb/tds
                if (key === 'turbidity') currentData[key] = Math.max(45, currentData[key] + jitter);
                else if (key === 'tds') currentData[key] = Math.max(850, currentData[key] + jitter);
                else if (key === 'flow') currentData[key] = Math.max(120, currentData[key] + jitter);
                else currentData[key] += jitter;
            } else {
                // return to baseline
                let diff = INITIAL_STATE[key] - currentData[key];
                currentData[key] += (diff * 0.1) + jitter;
            }
        }
        
        updateChartHistory();
        updateSensorsUI();
        updateChartDisplay();
        
    }, 3000);
}


// --- CHART.JS ---
function initChart() {
    const ctx = document.getElementById('sensorChart').getContext('2d');
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartHistory.labels,
            datasets: [{
                label: 'Sensor Value',
                data: chartHistory[currentChartSensor],
                borderColor: '#1e88e5',
                backgroundColor: 'rgba(30, 136, 229, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                y: { beginAtZero: false },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateChartHistory() {
    chartHistory.labels.shift();
    const now = new Date();
    chartHistory.labels.push(now.getSeconds() + "s");
    
    for (const key of Object.keys(currentData)) {
        chartHistory[key].shift();
        chartHistory[key].push(currentData[key]);
    }
}

function updateChartDisplay() {
    if (!myChart) return;
    
    myChart.data.datasets[0].data = chartHistory[currentChartSensor];
    myChart.data.labels = chartHistory.labels;
    
    // Change color if anomaly
    if (isAnomaly && (currentChartSensor === 'turbidity' || currentChartSensor === 'tds' || currentChartSensor === 'flow')) {
        myChart.data.datasets[0].borderColor = '#ef4444';
        myChart.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)';
    } else {
        myChart.data.datasets[0].borderColor = '#1e88e5';
        myChart.data.datasets[0].backgroundColor = 'rgba(30, 136, 229, 0.1)';
    }
    
    myChart.update();
}


// --- MAP (LEAFLET) ---
function initMap() {
    // Basic setup for London area as generic example
    map = L.map('map').setView([51.503, -0.08], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    updateMapMarkers();
}

function updateMapMarkers() {
    // Clear existing
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    mapPoints.forEach(pt => {
        let color = pt.status === 'critical' ? 'red' : (pt.status === 'warning' ? 'orange' : 'green');
        
        const circle = L.circleMarker([pt.latitude, pt.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            radius: pt.status === 'critical' ? 12 : 8
        }).addTo(map);
        
        const ph = pt.latest_readings ? pt.latest_readings.ph.toFixed(1) : "N/A";
        const turb = pt.latest_readings ? pt.latest_readings.turbidity.toFixed(1) : "N/A";
        
        circle.bindPopup(`
            <strong>${pt.name}</strong><br>
            Facility: ${pt.facility}<br>
            Status: <span style="color:${color}; text-transform:uppercase;">${pt.status}</span><br>
            Risk Score: ${pt.risk_score}/100<br>
            pH: ${ph} | Turbidity: ${turb}
        `);
        
        markers.push(circle);
    });
}


// --- ANOMALY LOGIC ---
async function triggerAnomaly() {
    if (!isOffline) {
        try {
            await fetch('http://localhost:8000/api/simulation/trigger-anomaly', { method: 'POST' });
            showToast('Anomaly triggered on backend server.', 'warning');
        } catch (e) {
            console.error(e);
            showToast('Failed to trigger backend anomaly.', 'critical');
        }
        return;
    }

    // Local Fallback logic
    if (isAnomaly) return; // already active
    
    isAnomaly = true;
    
    // Spike values
    currentData.turbidity = 55;
    currentData.tds = 890;
    currentData.flow = 140;
    
    // Update Risk
    riskScore = 88;
    updateRiskUI('HIGH RISK', 'critical');
    
    // Update AI
    aiBehaviour.innerText = 'ABNORMAL';
    aiBehaviour.className = 'value text-red';
    aiFingerprint.innerText = 'High turbidity + conductivity deviation';
    aiFingerprint.className = 'value text-red';
    aiConfidence.innerText = '97%';
    
    // Add Incident
    const newIncident = {
        id: `INC-00${incidents.length + 1}`,
        facility: "Plant A",
        location: "Discharge Point Alpha",
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        issue: "High Turbidity & TDS Spike",
        risk: "Critical",
        status: "Open",
        action: "Investigate"
    };
    incidents.unshift(newIncident); // Add to top
    renderIncidents();
    renderReports();
    
    // Update Map points
    mapPoints[0].status = 'critical';
    mapPoints[0].risk = 88;
    mapPoints[0].turb = 55;
    mapPoints[1].status = 'warning';
    mapPoints[1].risk = 60;
    updateMapMarkers();
    
    // UI changes
    activeAlerts++;
    activeAlertsCount.innerText = activeAlerts;
    
    heroStatus.className = 'system-status badge-critical';
    heroStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> CRITICAL ALERT';
    
    recommendedActions.classList.remove('hidden');
    
    // Re-render sensor cards for red colors
    renderSensors();
    
    showToast('Abnormal discharge detected locally.', 'critical');
    setTimeout(() => {
        showToast(`Risk score increased to ${riskScore}. System generating incident report.`, 'warning');
    }, 1500);
}

async function resetSimulation() {
    if (!isOffline) {
        try {
            await fetch('http://localhost:8000/api/simulation/stop', { method: 'POST' });
            await fetch('http://localhost:8000/api/simulation/start', { method: 'POST' });
            // Let WS updates slowly normalize the data on backend.
            showToast('Backend simulation reset to normal parameters.', 'info');
            // We should also fetch latest incidents/dashboard to reflect backend state if they resolved anything.
            fetchDashboardSummary();
            fetchMapPoints();
        } catch(e) {
            console.error(e);
        }
        return;
    }
    
    // Local Fallback logic
    isAnomaly = false;
    currentData = { ...INITIAL_STATE };
    
    // Reset Risk
    riskScore = 32;
    updateRiskUI('LOW RISK', 'safe');
    
    // Reset AI
    aiBehaviour.innerText = 'NORMAL';
    aiBehaviour.className = 'value text-green';
    aiFingerprint.innerText = 'No significant deviation detected';
    aiFingerprint.className = 'value';
    aiConfidence.innerText = '94%';
    
    // Reset UI
    activeAlerts = 0;
    activeAlertsCount.innerText = activeAlerts;
    heroStatus.className = 'system-status badge-safe';
    heroStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> SYSTEM OPERATIONAL';
    recommendedActions.classList.add('hidden');
    
    // Reset Map
    mapPoints[0].status = 'safe';
    mapPoints[0].risk = 20;
    mapPoints[1].status = 'safe';
    mapPoints[1].risk = 15;
    updateMapMarkers();
    
    // If there is an open critical incident, let's just mark it resolved for demo purposes
    if(incidents.length > 0 && incidents[0].status === "Open") {
        incidents[0].status = "Resolved";
        renderIncidents();
    }
    
    renderSensors();
    showToast('System reset to normal operational parameters locally.', 'info');
}

function updateRiskUI(statusText, type) {
    riskScoreEl.innerText = riskScore;
    overallRiskVal.innerText = riskScore;
    riskProgressEl.style.width = `${riskScore}%`;
    
    riskBadgeEl.innerText = statusText;
    
    // Classes
    riskBadgeEl.className = `badge badge-${type}`;
    riskProgressEl.className = `progress-fill ${type}-bg`;
    
    const iconColor = type === 'critical' ? 'text-red' : 'text-green';
    const iconType = type === 'critical' ? 'fa-xmark' : 'fa-check';
    
    document.getElementById('rf-turbidity').className = `fa-solid ${iconType} ${iconColor}`;
    document.getElementById('rf-conductivity').className = `fa-solid ${iconType} ${iconColor}`;
    document.getElementById('rf-flow').className = `fa-solid ${iconType} ${iconColor}`;
}


// --- INCIDENTS & MODALS ---
function renderIncidents(filter = 'all') {
    incidentsTbody.innerHTML = '';
    
    let filtered = incidents;
    if (filter !== 'all') {
        filtered = incidents.filter(inc => {
            if(filter === 'resolved') return inc.status.toLowerCase() === 'resolved';
            return inc.risk.toLowerCase() === filter;
        });
    }
    
    filtered.forEach(inc => {
        const tr = document.createElement('tr');
        
        let riskBadge = 'badge-safe';
        if (inc.risk === 'Medium') riskBadge = 'badge-warning';
        if (inc.risk === 'High' || inc.risk === 'Critical') riskBadge = 'badge-critical';
        
        tr.innerHTML = `
            <td><strong>${inc.id}</strong></td>
            <td>${inc.facility}</td>
            <td>${inc.location}</td>
            <td>${inc.time}</td>
            <td>${inc.issue}</td>
            <td><span class="badge ${riskBadge}">${inc.risk}</span></td>
            <td>${inc.status}</td>
            <td><button class="btn btn-secondary btn-sm" onclick="openModal('${inc.id}')">Investigate</button></td>
        `;
        incidentsTbody.appendChild(tr);
    });
}

async function openModal(id) {
    const inc = incidents.find(i => i.id === id);
    if (!inc) return;
    
    // Fetch details from backend
    let details = null;
    if (inc.db_id && !isOffline) {
        try {
            const res = await fetch(`http://localhost:8000/api/incidents/${inc.db_id}/details`);
            if (res.ok) {
                details = await res.json();
            }
        } catch(e) { console.error("Details fetch failed", e); }
    }
    
    const modalBody = document.getElementById('modal-body');
    let actionsHtml = "";
    let sensorHtml = "";
    
    if (details) {
        actionsHtml = "<ul>" + details.recommended_actions.map(a => `<li>${a}</li>`).join("") + "</ul>";
        if (details.recent_readings && details.recent_readings.length > 0) {
            const r = details.recent_readings[0];
            sensorHtml = `pH: ${r.ph.toFixed(1)} | Turbidity: ${r.turbidity.toFixed(1)} NTU | TDS: ${r.tds.toFixed(1)} mg/L`;
        } else {
            sensorHtml = "No recent data available.";
        }
    } else {
        actionsHtml = "<p>Verify sensor readings.</p>";
        sensorHtml = `Turbidity: ${isAnomaly ? '55.2 NTU (High)' : '14.1 NTU (Normal)'} | TDS: ${isAnomaly ? '890 mg/L (High)' : '420 mg/L (Normal)'}`;
    }

    modalBody.innerHTML = `
        <div class="detail-row"><span><strong>Incident ID:</strong></span> <span>${inc.id}</span></div>
        <div class="detail-row"><span><strong>Facility:</strong></span> <span>${details ? details.facility_name : inc.facility}</span></div>
        <div class="detail-row"><span><strong>Time Detected:</strong></span> <span>${inc.time}</span></div>
        <div class="detail-row"><span><strong>Detected Anomaly:</strong></span> <span>${inc.issue}</span></div>
        <div class="detail-row"><span><strong>Risk Level:</strong></span> <span>${inc.risk}</span></div>
        <div class="detail-row"><span><strong>Status:</strong></span> <span>${inc.status}</span></div>
        <div style="margin-top: 1rem;">
            <h4>Sensor Snapshot</h4>
            <p style="font-size: 0.9rem; color: #666;">${sensorHtml}</p>
        </div>
        <div style="margin-top: 1rem;">
            <h4>Recommended Actions</h4>
            ${actionsHtml}
        </div>
    `;
    
    document.getElementById('incident-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('incident-modal').classList.remove('show');
}

// --- REPORTS ---
function renderReports(dbReports = []) {
    reportsContainer.innerHTML = '';
    
    if (dbReports.length === 0) {
        reportsContainer.innerHTML = '<p>No reports generated yet.</p>';
        return;
    }
    
    dbReports.slice(0, 6).forEach(rep => {
        const div = document.createElement('div');
        div.className = 'report-card card';
        
        div.innerHTML = `
            <div class="report-icon"><i class="fa-solid fa-file-lines"></i></div>
            <div class="report-info">
                <h4>Report ID: #${rep.id}</h4>
                <p>Generated: ${new Date(rep.generated_at).toLocaleString()}</p>
                <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">Incident DB ID: ${rep.incident_id}</p>
            </div>
            <div style="margin-left: auto;">
                <button class="btn btn-secondary btn-sm" onclick="printBackendReport(${rep.id})"><i class="fa-solid fa-print"></i></button>
            </div>
        `;
        reportsContainer.appendChild(div);
    });
}

async function printBackendReport(reportId) {
    if (isOffline) {
        showToast("Backend offline. Cannot fetch report.", "warning");
        return;
    }
    try {
        const res = await fetch(`http://localhost:8000/api/reports/${reportId}`);
        if (res.ok) {
            const rep = await res.json();
            document.getElementById('print-date').innerText = new Date(rep.generated_at).toLocaleString();
            document.getElementById('print-content').innerHTML = `<pre style="white-space: pre-wrap; font-family: 'Inter', sans-serif;">${rep.report_content}</pre>`;
            window.print();
        }
    } catch(e) {
        console.error(e);
        showToast("Failed to fetch report details.", "warning");
    }
}

async function generatePrintableReport() {
    if (isOffline) {
        showToast("Backend unavailable. Cannot generate official report.", "warning");
        return;
    }
    
    // Pick the first active incident
    const active = incidents.find(i => i.status !== 'Resolved' && i.db_id);
    if (!active) {
        showToast("No active incidents to report on.", "info");
        return;
    }
    
    try {
        const res = await fetch(`http://localhost:8000/api/reports/${active.db_id}`, { method: 'POST' });
        if (res.ok) {
            showToast("Report successfully generated.", "info");
            fetchReports(); // Refresh the report list
        } else {
            showToast("Failed to generate report.", "warning");
        }
    } catch(e) {
        console.error(e);
        showToast("Network error while generating report.", "warning");
    }
}

// --- ALERTS / TOASTS ---
function showToast(message, type = 'info') {
    const container = document.getElementById('alert-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    let title = 'Notification';
    
    if (type === 'critical') { icon = 'fa-triangle-exclamation'; title = 'Critical Alert'; }
    if (type === 'warning') { icon = 'fa-circle-exclamation'; title = 'Warning'; }
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Remove from DOM after animation finishes (5s total)
    setTimeout(() => {
        if(container.contains(toast)) {
            container.removeChild(toast);
        }
    }, 5000);
}

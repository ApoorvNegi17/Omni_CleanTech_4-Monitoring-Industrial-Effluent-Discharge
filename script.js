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
let incidents = [
    { id: "INC-001", facility: "Plant A", location: "Upstream Zone", time: "09:15", issue: "Minor pH Fluctuation", risk: "Medium", status: "Resolved", action: "Investigate" },
    { id: "INC-002", facility: "Plant B", location: "River Point 2", time: "13:47", issue: "Conductivity Spike", risk: "Medium", status: "Investigating", action: "Investigate" }
];

// Monitoring Points (Map)
const mapPoints = [
    { id: 1, name: "Discharge Point Alpha", lat: 51.505, lng: -0.09, status: 'safe', ph: 7.2, turb: 14, tds: 420, risk: 20 },
    { id: 2, name: "Monitoring Station 1", lat: 51.503, lng: -0.08, status: 'safe', ph: 7.1, turb: 12, tds: 410, risk: 15 },
    { id: 3, name: "Downstream Community", lat: 51.501, lng: -0.07, status: 'safe', ph: 7.3, turb: 10, tds: 400, risk: 10 }
];

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
    renderIncidents();
    renderReports();
    startSimulation();
    
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


// --- SIMULATION LOOP ---
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
        
        const circle = L.circleMarker([pt.lat, pt.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            radius: pt.status === 'critical' ? 12 : 8
        }).addTo(map);
        
        circle.bindPopup(`
            <strong>${pt.name}</strong><br>
            Status: <span style="color:${color}; text-transform:uppercase;">${pt.status}</span><br>
            Risk Score: ${pt.risk}/100<br>
            pH: ${pt.ph} | Turbidity: ${pt.turb}
        `);
        
        markers.push(circle);
    });
}


// --- ANOMALY LOGIC ---
function triggerAnomaly() {
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
    
    showToast('Abnormal discharge detected at Plant A.', 'critical');
    setTimeout(() => {
        showToast(`Risk score increased to ${riskScore}. System generating incident report.`, 'warning');
    }, 1500);
}

function resetSimulation() {
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
    showToast('System reset to normal operational parameters.', 'info');
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

function openModal(id) {
    const inc = incidents.find(i => i.id === id);
    if (!inc) return;
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="detail-row"><span><strong>Incident ID:</strong></span> <span>${inc.id}</span></div>
        <div class="detail-row"><span><strong>Facility:</strong></span> <span>${inc.facility}</span></div>
        <div class="detail-row"><span><strong>Time Detected:</strong></span> <span>${inc.time}</span></div>
        <div class="detail-row"><span><strong>Detected Anomaly:</strong></span> <span>${inc.issue}</span></div>
        <div class="detail-row"><span><strong>Risk Level:</strong></span> <span>${inc.risk}</span></div>
        <div class="detail-row"><span><strong>Status:</strong></span> <span>${inc.status}</span></div>
        <div style="margin-top: 1rem;">
            <h4>Sensor Snapshot</h4>
            <p style="font-size: 0.9rem; color: #666;">Turbidity: ${isAnomaly ? '55.2 NTU (High)' : '14.1 NTU (Normal)'} | TDS: ${isAnomaly ? '890 mg/L (High)' : '420 mg/L (Normal)'}</p>
        </div>
    `;
    
    document.getElementById('incident-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('incident-modal').classList.remove('show');
}

// --- REPORTS ---
function renderReports() {
    reportsContainer.innerHTML = '';
    
    // Just display the first 3 incidents as reports
    incidents.slice(0, 3).forEach(inc => {
        const div = document.createElement('div');
        div.className = 'report-card card';
        
        let riskBadge = 'badge-safe';
        if (inc.risk === 'Medium') riskBadge = 'badge-warning';
        if (inc.risk === 'High' || inc.risk === 'Critical') riskBadge = 'badge-critical';
        
        div.innerHTML = `
            <div class="report-icon"><i class="fa-solid fa-file-lines"></i></div>
            <div class="report-info">
                <h4>Incident Report #${inc.id}</h4>
                <p>Generated: ${new Date().toLocaleDateString()}</p>
                <p>Facility: ${inc.facility} | Risk: <span class="badge ${riskBadge}">${inc.risk}</span> | Status: ${inc.status}</p>
            </div>
        `;
        reportsContainer.appendChild(div);
    });
}

function generatePrintableReport() {
    const inc = incidents[0]; // Just use the most recent
    
    document.getElementById('print-date').innerText = new Date().toLocaleString();
    document.getElementById('print-content').innerHTML = `
        <h3>Details for ${inc.id}</h3>
        <p><strong>Facility:</strong> ${inc.facility}</p>
        <p><strong>Location:</strong> ${inc.location}</p>
        <p><strong>Time:</strong> ${inc.time}</p>
        <p><strong>Issue:</strong> ${inc.issue}</p>
        <p><strong>Risk Level:</strong> ${inc.risk}</p>
        
        <h4 style="margin-top: 20px;">Sensor Snapshot</h4>
        <ul>
            <li>pH: ${currentData.ph.toFixed(1)}</li>
            <li>Turbidity: ${currentData.turbidity.toFixed(1)} NTU</li>
            <li>TDS: ${currentData.tds.toFixed(1)} mg/L</li>
            <li>Flow: ${currentData.flow.toFixed(1)} L/min</li>
        </ul>
        
        <h4 style="margin-top: 20px;">Recommended Action</h4>
        <p>Immediate inspection required at discharge point. Verify sensor calibration.</p>
    `;
    
    window.print();
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

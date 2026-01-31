/**
 * TELOC CELL BULK VIOLATION AUDIT - REPORT ENGINE
 * Strictly Following User's Triple Validation Formatting
 */

window.generateViolationReport = function() {
    const selIdx = document.getElementById('vio_sig_list').value;
    const targetSpd = document.getElementById('vio_speed').value;
    const stTimeStr = document.getElementById('vio_time').value.trim();
    const rtTimeStr = document.getElementById('rtis_pass_time').value.trim();
    
    // Metadata
    const rDate = document.getElementById('rep_date').value;
    const rLoco = document.getElementById('rep_loco').value;
    const rTrain = document.getElementById('rep_train').value;
    const rLP = document.getElementById('rep_lp').value;

    const fsd = window.activeSigs[selIdx];
    const stPoint = window.rtis.find(p => p.time.includes(stTimeStr)) || fsd;
    const rtPoint = window.rtis.find(p => p.time.includes(rtTimeStr)) || fsd;

    const calcDist = (l1, g1, l2, g2) => {
        const R = 6371000;
        const dLat = (l2 - l1) * Math.PI / 180;
        const dLon = (g2 - g1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R).toFixed(1);
    };

    let errorFSD = calcDist(fsd.lt, fsd.lg, stPoint.lt, stPoint.lg);
    let errorRTIS = calcDist(rtPoint.lt, rtPoint.lg, stPoint.lt, stPoint.lg);

    // 2km Logic
    let isThrough = true; 
    let dTotal = 0; 
    let stIdx = window.rtis.indexOf(stPoint);
    if (stIdx !== -1) {
        for (let i = stIdx; i < window.rtis.length; i++) {
            if (i > stIdx) dTotal += parseFloat(calcDist(window.rtis[i - 1].lt, window.rtis[i - 1].lg, window.rtis[i].lt, window.rtis[i].lg));
            if (window.rtis[i].spd < 31) { isThrough = false; break; }
            if (dTotal > 2000) break;
        }
    }

    let finalStatus = isThrough ? "THROUGH PASS" : (stPoint.spd > targetSpd ? "SPEED VIOLATION" : "NORMAL");
    let statusColor = isThrough ? "#7f8c8d" : (stPoint.spd > targetSpd ? "#e74c3c" : "#27ae60");

    let reportHtml = `<html><head><title>Audit_${fsd.n}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { font-family: sans-serif; display: flex; margin: 0; height: 100vh; }
        #sidebar { width: 450px; padding: 20px; border-right: 2px solid #ddd; overflow-y: auto; background: #fff; }
        #rmap { flex: 1; }
        .audit-card { padding: 15px; margin-bottom: 12px; border-radius: 8px; border-left: 8px solid; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .st-card { background: #e8f5e9; border-color: #27ae60; }
        .fsd-card { background: #f3e5f5; border-color: #8e44ad; }
        .rtis-card { background: #fffde7; border-color: #f1c40f; }
        .status-banner { background: ${statusColor}; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 20px; border-radius: 5px; margin: 20px 0; }
        .meta-footer { font-size: 13px; border-top: 2px solid #eee; padding-top: 15px; color: #2c3e50; line-height: 1.6; }
    </style></head><body>
    <div id="sidebar">
        <h2 style="text-align:center; color:#2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">TELOC CELL BULK VIOLATION AUDIT</h2>
        <p style="font-size: 16px;"><b>Signal Audited:</b> <span style="color:#2980b9;">${fsd.n}</span></p>
        
        <div class="audit-card st-card">
            <b style="color:#1b5e20;">1. Actual Signal passing as per S&T</b><br>
            Time: ${stTimeStr}<br>Speed: ${stPoint.spd} Kmph<br>Distance Error: 0
        </div>
        
        <div class="audit-card fsd-card">
            <b style="color:#4a148c;">2. Signal passing as per FSD</b><br>
            Time: ${fsd.t}<br>Speed: ${fsd.s} Kmph<br>Distance Error: ${errorFSD}
        </div>
        
        <div class="audit-card rtis-card">
            <b style="color:#827717;">3. Actual Signal passing as per RTIS</b><br>
            Time: ${rtTimeStr}<br>Speed: ${rtPoint.spd} Kmph<br>Distance Error: ${errorRTIS}
        </div>

        <div class="status-banner">STATUS: ${finalStatus}</div>

        <div class="meta-footer">
            <p style="font-size: 11px; background:#f9f9f9; padding:8px; border-radius:4px; margin-bottom:15px;">
                *Rule: Violation checked only if train speed drops below 31 Kmph within 2km of Signal passing.
            </p>
            <b>Date:</b> ${rDate} <br>
            <b>Loco Number:</b> ${rLoco} <br>
            <b>Train Number:</b> ${rTrain} <br>
            <b>LP ID:</b> ${rLP}
        </div>
    </div>
    <div id="rmap"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var m = L.map('rmap').setView([${stPoint.lt}, ${stPoint.lg}], 17);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        
        // S&T Ball (Green)
        L.circleMarker([${stPoint.lt}, ${stPoint.lg}], {radius: 12, color: 'green', fillOpacity: 1}).addTo(m)
         .bindTooltip("S&T: ${stPoint.spd} Kmph", {permanent: true, direction: 'top', className: 'label-st'});
        
        // RTIS Ball (Yellow)
        L.circleMarker([${rtPoint.lt}, ${rtPoint.lg}], {radius: 10, color: '#f1c40f', fillOpacity: 1}).addTo(m)
         .bindTooltip("RTIS: ${rtPoint.spd} Kmph", {permanent: true, direction: 'bottom', className: 'label-rtis'});
        
        // FSD Ball (Purple)
        L.circleMarker([${fsd.lt}, ${fsd.lg}], {radius: 10, color: '#8e44ad', fillOpacity: 1}).addTo(m)
         .bindTooltip("FSD: ${fsd.s} Kmph", {permanent: true, direction: 'left', className: 'label-fsd'});
    </script></body></html>`;

    let blob = new Blob([reportHtml], {type: 'text/html'});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Audit_" + fsd.n + ".html";
    link.click();
};

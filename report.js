/**
 * SECR RAIPUR TELOC CELL - ADVANCED AUDIT LOGIC
 * Includes: Distance Error & Through Pass Logic (2km/31kmph rule)
 */

window.generateViolationReport = function() {
    const selIdx = parseInt(document.getElementById('vio_sig_list').value);
    const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
    const manualTime = document.getElementById('vio_time').value.trim();

    if (isNaN(selIdx) || !window.activeSigs.length) return alert("Error: No signal selected.");
    if (isNaN(targetSpeed)) return alert("Error: Please enter Target Speed.");

    let fsdSig = window.activeSigs[selIdx]; 
    let actualSig = { ...fsdSig }; 
    let syncSuccess = false;

    // --- 1. S&T Time-Sync Logic ---
    let rtisIdx = -1;
    if (manualTime !== "") {
        rtisIdx = window.rtis.findIndex(p => p.time.includes(manualTime));
        if (rtisIdx !== -1) {
            let closestPoint = window.rtis[rtisIdx];
            actualSig.s = closestPoint.spd;
            actualSig.lt = closestPoint.lt;
            actualSig.lg = closestPoint.lg;
            actualSig.t = closestPoint.time;
            syncSuccess = true;
        }
    }

    // --- 2. Distance Error Calculation (Haversine Formula) ---
    function getDist(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        return (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R).toFixed(1);
    }
    let distError = getDist(fsdSig.lt, fsdSig.lg, actualSig.lt, actualSig.lg);

    // --- 3. Through Pass Logic (Next 2km check) ---
    let isThroughPass = true;
    let stnMatch = fsdSig.n.match(/(?:UP|DN)\s+(?:MID\s+)?([A-Z]+)\s+/);
    let stationName = stnMatch ? stnMatch[1] : "Station";

    if (rtisIdx !== -1) {
        let distanceCovered = 0;
        for (let i = rtisIdx; i < window.rtis.length; i++) {
            if (i > rtisIdx) {
                distanceCovered += parseFloat(getDist(window.rtis[i-1].lt, window.rtis[i-1].lg, window.rtis[i].lt, window.rtis[i].lg));
            }
            if (window.rtis[i].spd < 31) {
                isThroughPass = false;
                break;
            }
            if (distanceCovered > 2000) break; // Check up to 2km only
        }
    }

    // Final Decision
    let auditStatus = "";
    let statusColor = "";
    if (isThroughPass) {
        auditStatus = "NO VIOLATION (THROUGH PASS)";
        statusColor = "#95a5a6"; // Grey
    } else {
        auditStatus = actualSig.s > targetSpeed ? "SPEED VIOLATION DETECTED" : "RULE FOLLOWED";
        statusColor = actualSig.s > targetSpeed ? "#d63031" : "#27ae60";
    }

    let fullHtml = "<html><head><title>Audit: " + fsdSig.n + "</title>" +
        "<link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' />" +
        "<style>body{margin:0;display:flex;height:100vh;font-family:sans-serif;}#side{width:420px;padding:20px;overflow-y:auto;border-right:1px solid #ddd;background:#fcfcfc;}#map{flex:1;}" +
        ".header{background:#2c3e50;color:white;padding:15px;border-radius:5px;text-align:center;}" +
        ".info-card{border:1px solid #ddd;padding:12px;margin-bottom:12px;border-radius:8px;background:white;box-shadow:0 2px 4px rgba(0,0,0,0.05);}" +
        ".status-box{padding:20px;text-align:center;font-weight:bold;color:white;border-radius:8px;margin-top:20px;font-size:18px;}" +
        ".label-fsd{color:#e67e22;font-size:11px;font-weight:bold;}.label-st{color:#2980b9;font-size:11px;font-weight:bold;}" +
        ".error-badge{background:#fff3cd; color:#856404; padding:5px; border-radius:4px; font-size:12px; font-weight:bold; display:block; margin-top:5px; border:1px solid #ffeeba;}" +
        "</style></head><body>" +
        "<div id='side'><div class='header'><b>ADVANCED AUDIT REPORT</b><br>" + fsdSig.n + "</div>" +
        "<div class='info-card' style='margin-top:15px;'><b>Permissible Speed:</b> " + targetSpeed + " Kmph</div>" +
        
        "<div class='info-card' style='border-left:5px solid #e67e22;'>" +
            "<span class='label-fsd'>[A] FOG SAFE DEVICE (FSD) DATA</span><br>Speed: " + fsdSig.s + " Kmph<br><small>GPS Time: " + fsdSig.t + "</small></div>" +
        
        "<div class='info-card' style='border-left:5px solid #2980b9;'>" +
            "<span class='label-st'>[B] ACTUAL S&T PASSING DATA (SYNCED)</span><br><b>Speed: " + actualSig.s + " Kmph</b><br><small>S&T Time: " + (manualTime || 'N/A') + "</small><br>" +
            "<span class='error-badge'>Location Error: " + distError + " Meters from FSD</span></div>" +

        "<div class='status-box' style='background:" + statusColor + "'>" + auditStatus + "</div>" +

        "<div style='margin-top:20px; padding:10px; font-size:12px; background:#e8f4fd; border-radius:5px; border:1px solid #d1e9f9;'>" +
            "<b>Through Pass Analysis:</b><br>" + 
            (isThroughPass ? "Train through passed from <b>" + stationName + "</b> (Speed remained > 31 Kmph for next 2km). No violation applicable." : 
            "Train speed dropped below 31 Kmph within 2km of <b>" + stationName + "</b>. Audit is valid.") + 
        "</div></div>" +

        "<div id='map'></div><script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'></script><script>" +
        "var m=L.map('map').setView([" + actualSig.lt + "," + actualSig.lg + "],17);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);" +
        "L.circleMarker([" + fsdSig.lt + "," + fsdSig.lg + "],{radius:8,color:'#e67e22',fillOpacity:0.5}).addTo(m).bindPopup('FSD Location');" +
        "L.circleMarker([" + actualSig.lt + "," + actualSig.lg + "],{radius:14,color:'white',fillColor:'" + statusColor + "',fillOpacity:1,weight:4}).addTo(m).bindPopup('Actual Passing');" +
        "L.polyline([[" + fsdSig.lt + "," + fsdSig.lg + "],[" + actualSig.lt + "," + actualSig.lg + "]],{color:'#7f8c8d',weight:2,dashArray:'5,10'}).addTo(m);" +
        "var rPath=" + JSON.stringify(window.rtis.slice(Math.max(0, rtisIdx-20), rtisIdx+100).map(p=>[p.lt,p.lg])) + ";L.polyline(rPath,{color:'black',weight:2,opacity:0.3}).addTo(m);" +
        "</script></body></html>";

    let b = new Blob([fullHtml], { type: 'text/html' });
    let a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = "Final_Audit_"+fsdSig.n+".html"; a.click();
};

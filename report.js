/**
 * SECR RAIPUR TELOC CELL - FINAL AUDIT LOGIC
 * FSD (Fog Safe Device) vs S&T Manual Passing Time
 */

window.saveInteractiveWebReport = function() {
    if (!window.rtis.length) return alert("Pehle Map Generate karein!");
    // Standard Report logic (as previously stable version)
    let sigData = window.activeSigs;
    let html = "<html><head><title>Web Report</title><link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' /><style>body{margin:0;display:flex;height:100vh;font-family:sans-serif;}#side{width:320px;padding:15px;overflow-y:auto;border-right:1px solid #ddd;}#map{flex:1;}.card{padding:10px;margin-bottom:8px;border-left:5px solid;background:#f9f9f9;cursor:pointer;}</style></head><body><div id='side'><h3>SECR RAIPUR REPORT</h3><hr>";
    sigData.forEach(r => {
        html += "<div class='card' style='border-color:" + r.clr + "' onclick='m.setView([" + r.lt + "," + r.lg + "],17)'><b>" + r.n + "</b><br>Speed: " + r.s + " Kmph</div>";
    });
    html += "</div><div id='map'></div><script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'></script><script>var m=L.map('map').setView([" + (sigData[0]?sigData[0].lt:21) + "," + (sigData[0]?sigData[0].lg:79) + "],14);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);var rPath=" + JSON.stringify(window.rtis.map(p=>[p.lt,p.lg])) + ";L.polyline(rPath,{color:'black',weight:2}).addTo(m);" + JSON.stringify(sigData) + ".forEach(s=>{L.circleMarker([s.lt,s.lg],{radius:6,fillColor:s.clr,color:'#fff',fillOpacity:1}).addTo(m).bindPopup(s.n)});</script></body></html>";
    let b = new Blob([html], { type: 'text/html' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = "Web_Report.html"; a.click();
};

window.generateViolationReport = function() {
    const selIdx = parseInt(document.getElementById('vio_sig_list').value);
    const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
    const manualTime = document.getElementById('vio_time').value.trim();

    if (isNaN(selIdx) || !window.activeSigs.length) return alert("Error: No signal selected.");
    if (isNaN(targetSpeed)) return alert("Error: Please enter Target Speed.");

    let fsdSig = window.activeSigs[selIdx]; // Coordinates from FSD Device
    let actualSig = { ...fsdSig }; 
    let syncSuccess = false;

    // --- Time-Sync Logic for S&T GROUND TRUTH ---
    if (manualTime !== "") {
        let closestPoint = window.rtis.find(p => p.time.includes(manualTime));
        if (closestPoint) {
            actualSig.s = closestPoint.spd;
            actualSig.lt = closestPoint.lt;
            actualSig.lg = closestPoint.lg;
            actualSig.t = closestPoint.time;
            syncSuccess = true;
        } else {
            alert("S&T Time not found in RTIS logs. Showing FSD data only.");
        }
    }

    let isViolated = actualSig.s > targetSpeed;

    let fullHtml = "<html><head><title>Violation Audit: " + fsdSig.n + "</title>" +
        "<link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' />" +
        "<style>body{margin:0;display:flex;height:100vh;font-family:sans-serif;}#side{width:400px;padding:20px;overflow-y:auto;border-right:1px solid #ddd;background:#fcfcfc;}#map{flex:1;}" +
        ".header{background:#2c3e50;color:white;padding:15px;border-radius:5px;margin-bottom:15px;text-align:center;}" +
        ".info-card{border:1px solid #ddd;padding:12px;margin-bottom:12px;border-radius:8px;background:white;box-shadow:0 2px 4px rgba(0,0,0,0.05);}" +
        ".status-box{padding:20px;text-align:center;font-weight:bold;color:white;border-radius:8px;margin-top:20px;font-size:20px;}" +
        ".fsd-tag{color:#e67e22;font-size:12px;font-weight:bold;}.st-tag{color:#2980b9;font-size:12px;font-weight:bold;}" +
        "</style></head><body>" +
        "<div id='side'><div class='header'><b>VIOLATION AUDIT REPORT</b><br>" + fsdSig.n + "</div>" +
        "<div class='info-card' style='background:#f1f9ff;'><b>Target Permissible Speed:</b> " + targetSpeed + " Kmph</div>" +
        "<div class='info-card' style='border-top:4px solid #e67e22;'><span class='fsd-tag'>[FSD] FOG SAFE DEVICE LOCATION</span><br>Speed: " + fsdSig.s + " Kmph<br><small>GPS Time: " + fsdSig.t + "</small></div>" +
        "<div class='info-card' style='border-top:4px solid #2980b9;'><span class='st-tag'>[S&T] ACTUAL SIGNAL PASSING DATA</span><br><b>Speed: " + actualSig.s + " Kmph</b><br><small>Manual S&T Time: " + (manualTime || 'N/A') + "</small><br><small>RTIS Log Time: " + actualSig.t + "</small></div>" +
        "<div class='status-box' style='background:" + (isViolated ? "#d63031" : "#27ae60") + "'>" + (isViolated ? "SPEED VIOLATION" : "RULE FOLLOWED") + "</div>" +
        "<p style='font-size:11px;color:#7f8c8d;margin-top:20px;'>*Violation is verified based on train coordinates at S&T manual time.</p></div>" +
        "<div id='map'></div><script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'></script><script>" +
        "var m=L.map('map').setView([" + actualSig.lt + "," + actualSig.lg + "],17);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);" +
        "L.circleMarker([" + fsdSig.lt + "," + fsdSig.lg + "],{radius:8,color:'#e67e22',fillOpacity:0.5}).addTo(m).bindPopup('FSD Location');" +
        "L.circleMarker([" + actualSig.lt + "," + actualSig.lg + "],{radius:14,color:'white',fillColor:'" + (isViolated ? "#d63031" : "#27ae60") + "',fillOpacity:1,weight:4}).addTo(m).bindPopup('Actual Passing Location');" +
        "L.polyline([[" + fsdSig.lt + "," + fsdSig.lg + "],[" + actualSig.lt + "," + actualSig.lg + "]],{color:'#7f8c8d',weight:2,dashArray:'5,10'}).addTo(m);" +
        "var rPath=" + JSON.stringify(window.rtis.slice(0,500).map(p=>[p.lt,p.lg])) + ";L.polyline(rPath,{color:'black',weight:2,opacity:0.2}).addTo(m);" +
        "</script></body></html>";

    let b = new Blob([fullHtml], { type: 'text/html' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = "Audit_" + fsdSig.n + ".html"; a.click();
};

window.downloadExcelAudit = function() {
    if (!window.activeSigs.length) return alert("No data to download.");
    let csv = "Signal Name,Type,RTIS Speed,Time\n";
    window.activeSigs.forEach(s => { csv += s.n + "," + s.type + "," + s.s + "," + s.t + "\n"; });
    let b = new Blob([csv], { type: 'text/csv' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = "SECR_Audit_Data.csv"; a.click();
};

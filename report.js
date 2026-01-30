/**
 * SECR RAIPUR TELOC CELL - Logic Re-Verified
 * Red/Green Logic: RTIS Speed <= Target Speed ? Green : Red
 */

window.saveInteractiveWebReport = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Map Generate karein!");
    const sF = document.getElementById('s_from').value;
    const sT = document.getElementById('s_to').value;
    const dir = determineDirection(sF, sT);

    let sigData = [];
    window.master.sigs.forEach(sig => {
        if (!sig.type.startsWith(dir)) return;
        let lt = conv(getVal(sig, ['Lat'])), lg = conv(getVal(sig, ['Lng']));
        let m = window.rtis.find(p => Math.sqrt(Math.pow(p.lt - lt, 2) + Math.pow(p.lg - lg, 2)) < 0.0012);
        if (m) sigData.push({ n: getVal(sig, ['SIGNAL_NAME']), s: m.spd, t: m.time, lt: lt, lg: lg, clr: sig.clr });
    });

    let html = "<html><head><title>Web Report</title><link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' /><style>body{margin:0;display:flex;height:100vh;font-family:sans-serif;}#side{width:320px;padding:15px;overflow-y:auto;border-right:1px solid #ddd;}#map{flex:1;}.card{padding:10px;margin-bottom:8px;border-left:5px solid;background:#f9f9f9;cursor:pointer;}</style></head><body><div id='side'><h3>SECR RAIPUR</h3><hr>";
    sigData.forEach(r => {
        html += "<div class='card' style='border-color:" + r.clr + "' onclick='m.setView([" + r.lt + "," + r.lg + "],17)'><b>" + r.n + "</b><br>Speed: " + r.s + "</div>";
    });
    html += "</div><div id='map'></div><script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'></script><script>var m=L.map('map').setView([" + (sigData[0] ? sigData[0].lt : 21) + "," + (sigData[0] ? sigData[0].lg : 79) + "],14);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);var rData=" + JSON.stringify(window.rtis) + ";L.polyline(rData.map(p=>[p.lt,p.lg]),{color:'black'}).addTo(m);" + JSON.stringify(sigData) + ".forEach(s=>{L.circleMarker([s.lt,s.lg],{radius:6,fillColor:s.clr,color:'#fff',fillOpacity:1}).addTo(m).bindPopup(s.n)});</script></body></html>";

    let b = new Blob([html], { type: 'text/html' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = "Web_Report.html"; a.click();
};

window.generateViolationReport = function() {
    const selIdx = parseInt(document.getElementById('vio_sig_list').value);
    const targetSpeed = parseFloat(document.getElementById('vio_speed').value);

    if (isNaN(selIdx) || !window.activeSigs || window.activeSigs.length === 0) return alert("Pehle Map Generate karein!");
    if (isNaN(targetSpeed)) return alert("Please enter Permissible Target Speed!");

    let start = Math.max(0, selIdx - 3);
    let end = Math.min(window.activeSigs.length - 1, selIdx + 3);
    let vioSigs = window.activeSigs.slice(start, end + 1);
    let targetSig = window.activeSigs[selIdx];
    
    // YAHAN HAI MAIN LOGIC: RTIS Speed agar Target ke barabar ya kam hai toh Green
    let isViolated = targetSig.s > targetSpeed;

    let sidebarHtml = "";
    vioSigs.forEach(s => {
        let isTarget = (s.n === targetSig.n);
        let cardClass = "normal";
        let statusTag = "";
        let targetLabel = "";

        if(isTarget) {
            // RED if RTIS Speed > Target, else GREEN
            cardClass = isViolated ? "violation" : "followed";
            statusTag = isViolated ? 
                "<div class='status-tag' style='background:#eb4d4b'>OVER SPEEDING / VIOLATION</div>" : 
                "<div class='status-tag' style='background:#2ecc71'>RULE FOLLOWED</div>";
            targetLabel = "<br><span style='color:#2980b9; font-size:11px;'>(TARGET SIGNAL) Target Speed: " + targetSpeed + " Kmph</span>";
        }

        sidebarHtml += "<div class='card " + cardClass + "' onclick='m.setView([" + s.lt + "," + s.lg + "],17)'>" +
            "<div style='font-size:15px;'>" + s.n + "</div>" +
            "<div style='font-size:13px; color:#555;'>RTIS Speed: <b>" + s.s + " Kmph</b></div>" +
            "<div style='font-size:11px; color:#888;'>Time: " + s.t + "</div>" +
            targetLabel + statusTag + "</div>";
    });

    let fullHtml = "<html><head><title>Violation Audit</title><link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' /><style>" +
        "body{margin:0;display:flex;height:100vh;background:#f1f2f6;font-family:sans-serif;}#side{width:380px;background:#fff;padding:20px;overflow-y:auto;border-right:1px solid #ddd;}" +
        "#map{flex:1;}.card{padding:15px;margin-bottom:12px;border-radius:6px;border:1px solid #ddd;font-weight:bold;background:#fff;}.status-tag{display:inline-block;padding:4px 10px;border-radius:3px;font-size:11px;margin-top:8px;text-transform:uppercase;color:#fff;}" +
        ".violation{border:2px solid #eb4d4b;background:#fff5f5;}.followed{border:2px solid #2ecc71;background:#f0fff4;}.normal{border-left:5px solid #ccc;opacity:0.8;}" +
        ".header-box{background:#34495e;color:white;padding:15px;border-radius:5px;margin-bottom:20px;}</style></head><body>" +
        "<div id='side'><div class='header-box'><div style='font-size:18px;font-weight:bold;'>VIOLATION AUDIT</div><div style='font-size:12px;opacity:0.8;'>SECR RAIPUR TELOC CELL</div></div>" +
        "<div style='background:#f8f9fa;padding:12px;border:1px solid #ddd;border-radius:5px;margin-bottom:20px;'><b>Target Speed:</b> " + targetSpeed + " Kmph<br><b>Actual Speed:</b> " + targetSig.s + " Kmph</div><hr>" +
        sidebarHtml + "</div><div id='map'></div><script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'></script><script>" +
        "var m=L.map('map').setView([" + targetSig.lt + "," + targetSig.lg + "],16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);" +
        "var rPath=" + JSON.stringify(window.rtis.map(p => [p.lt, p.lg])) + ";L.polyline(rPath,{color:'black',weight:3,opacity:0.4}).addTo(m);" +
        "var signals=" + JSON.stringify(vioSigs) + ";signals.forEach(s => { var isTgt=(s.n==='" + targetSig.n + "'); var markerClr=isTgt?(" + isViolated + "?'#eb4d4b':'#2ecc71'):s.clr; L.circleMarker([s.lt,s.lg],{radius:isTgt?12:8,color:'white',fillColor:markerClr,fillOpacity:1,weight:2}).addTo(m).bindPopup('<b>'+s.n+'</b><br>RTIS Speed: '+s.s+' Kmph<br>Target Speed: " + targetSpeed + "'); });</script></body></html>";

    let b = new Blob([fullHtml], { type: 'text/html' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = "Violation_" + targetSig.n + ".html"; a.click();
};

window.downloadExcelAudit = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("No Data!");
    let csv = "Type,Signal Name,RTIS Speed,Time\n";
    window.activeSigs.forEach(s => {
        csv += (s.type || 'SIG') + "," + s.n + "," + s.s + "," + s.t + "\n";
    });
    let b = new Blob([csv], { type: 'text/csv' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = "Audit_Data.csv"; a.click();
};

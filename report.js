/**
 * SECR RAIPUR TELOC CELL - AUDIT ENGINE
 * Feature: FSD Distance Error & Through-Pass Logic
 */

window.generateViolationReport = function() {
    const selIdx = parseInt(document.getElementById('vio_sig_list').value);
    const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
    const manualTime = document.getElementById('vio_time').value.trim();

    if (isNaN(selIdx)) return alert("Select Signal!");
    
    let fsdSig = window.activeSigs[selIdx];
    let actualSig = { ...fsdSig };
    let rtisIdx = window.rtis.findIndex(p => p.time.includes(manualTime));

    if (rtisIdx !== -1) {
        actualSig.s = window.rtis[rtisIdx].spd;
        actualSig.lt = window.rtis[rtisIdx].lt;
        actualSig.lg = window.rtis[rtisIdx].lg;
        actualSig.t = window.rtis[rtisIdx].time;
    }

    // Distance Error
    const R = 6371e3;
    let dLat = (actualSig.lt - fsdSig.lt) * Math.PI/180;
    let dLon = (actualSig.lg - fsdSig.lg) * Math.PI/180;
    let a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(fsdSig.lt*Math.PI/180) * Math.cos(actualSig.lt*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    let distError = (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R).toFixed(1);

    // Through-Pass Logic (2km / 31kmph)
    let isThrough = true;
    if (rtisIdx !== -1) {
        let dSum = 0;
        for (let i = rtisIdx; i < window.rtis.length; i++) {
            if (i > rtisIdx) {
                let dP = Math.sqrt(Math.pow(window.rtis[i].lt-window.rtis[i-1].lt,2) + Math.pow(window.rtis[i].lg-window.rtis[i-1].lg,2)) * 111320;
                dSum += dP;
            }
            if (window.rtis[i].spd < 31) { isThrough = false; break; }
            if (dSum > 2000) break;
        }
    }

    let stnName = fsdSig.n.split(' ').filter(x => x.length > 2 && x !== 'HOME' && x !== 'STARTER')[1] || "Station";
    let status = isThrough ? "NO VIOLATION (THROUGH PASS)" : (actualSig.s > targetSpeed ? "SPEED VIOLATION" : "RULE FOLLOWED");
    let clr = isThrough ? "#95a5a6" : (actualSig.s > targetSpeed ? "#d63031" : "#27ae60");

    let html = `<html><head><title>Audit</title><link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'/><style>
        body{display:flex;margin:0;font-family:sans-serif;} #side{width:400px;padding:20px;background:#f8f9fa;border-right:1px solid #ccc;} #map{flex:1;}
        .card{background:white;padding:15px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.1);margin-bottom:15px; border-left:5px solid #2980b9;}
        .status{padding:15px;border-radius:8px;text-align:center;font-weight:bold;color:white;font-size:18px;background:${clr};}
    </style></head><body>
    <div id='side'>
        <h2>Audit Report</h2><hr>
        <div class='card'><b>Signal:</b> ${fsdSig.n}<br><b>Target:</b> ${targetSpeed} Kmph</div>
        <div class='card' style='border-color:#e67e22;'><b>FSD Data:</b><br>Speed: ${fsdSig.s} | Time: ${fsdSig.t}</div>
        <div class='card'><b>Actual (S&T Time):</b><br>Speed: ${actualSig.s} | Time: ${actualSig.t}<br><b>Error: ${distError} meters</b></div>
        <div class='status'>${status}</div>
        <p style='font-size:12px;margin-top:20px;'>Through Pass Analysis: Train speed at <b>${stnName}</b> remained above 31kmph for 2km.</p>
    </div><div id='map'></div>
    <script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'></script>
    <script>
        var m=L.map('map').setView([${actualSig.lt},${actualSig.lg}],16); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        L.circleMarker([${fsdSig.lt},${fsdSig.lg}],{radius:8,color:'#e67e22'}).addTo(m).bindPopup('FSD');
        L.circleMarker([${actualSig.lt},${actualSig.lg}],{radius:12,color:'white',fillColor:'${clr}',fillOpacity:1,weight:3}).addTo(m).bindPopup('Actual');
        L.polyline([[${fsdSig.lt},${fsdSig.lg}],[${actualSig.lt},${actualSig.lg}]],{color:'#7f8c8d',dashArray:'5,5'}).addTo(m);
    </script></body></html>`;

    let b = new Blob([html], {type:'text/html'}), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `Audit_${fsdSig.n}.html`; a.click();
}

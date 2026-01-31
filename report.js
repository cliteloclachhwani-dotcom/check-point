/**
 * SECR RAIPUR TELOC CELL - AUDIT ENGINE
 * Fixed: Strictly 2000m tracking after signal passing point
 */

window.generateViolationReport = function() {
    try {
        const selIdx = parseInt(document.getElementById('vio_sig_list').value);
        const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
        const manualTime = document.getElementById('vio_time').value.trim();

        if (isNaN(selIdx) || !window.activeSigs[selIdx]) {
            return alert("Pehle Signal select karein!");
        }
        
        let fsdSig = window.activeSigs[selIdx];
        let actualSig = { ...fsdSig };
        
        // Find the index in RTIS where the train actually passed the signal
        let rtisIdx = window.rtis.findIndex(p => p.time && p.time.includes(manualTime));

        if (rtisIdx !== -1) {
            actualSig.s = window.rtis[rtisIdx].spd;
            actualSig.lt = window.rtis[rtisIdx].lt;
            actualSig.lg = window.rtis[rtisIdx].lg;
            actualSig.t = window.rtis[rtisIdx].time;
        }

        // Distance Error (FSD vs S&T) calculation
        const EarthR = 6371e3; 
        const toRad = Math.PI/180;
        let dLat = (actualSig.lt - fsdSig.lt) * toRad;
        let dLon = (actualSig.lg - fsdSig.lg) * toRad;
        let dCalc = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(fsdSig.lt * toRad) * Math.cos(actualSig.lt * toRad) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
        let distError = (2 * Math.atan2(Math.sqrt(dCalc), Math.sqrt(1-dCalc)) * EarthR).toFixed(1);

        // --- DYNAMIC 2000m ANALYSIS ---
        let isThrough = true; 
        let analysisPoints = [];
        let totalTrackedDist = 0;

        if (rtisIdx !== -1) {
            for (let i = rtisIdx; i < window.rtis.length; i++) {
                if (i > rtisIdx) {
                    // Haversine for segment distance
                    let lat1 = window.rtis[i-1].lt * toRad, lat2 = window.rtis[i].lt * toRad;
                    let dL = (window.rtis[i].lg - window.rtis[i-1].lg) * toRad;
                    let seg = Math.acos(Math.sin(lat1)*Math.sin(lat2) + Math.cos(lat1)*Math.cos(lat2)*Math.cos(dL)) * EarthR;
                    totalTrackedDist += (isNaN(seg) ? 0 : seg);
                }
                
                analysisPoints.push([window.rtis[i].lt, window.rtis[i].lg]);

                // Check speed condition
                if (window.rtis[i].spd < 31) {
                    isThrough = false;
                    break;
                }

                if (totalTrackedDist >= 2000) break; // Strict 2000m stop
            }
        }

        let finalStatus = isThrough ? "NO VIOLATION (THROUGH PASS)" : (actualSig.s > targetSpeed ? "SPEED VIOLATION" : "RULE FOLLOWED");
        let statusClr = isThrough ? "#95a5a6" : (actualSig.s > targetSpeed ? "#d63031" : "#27ae60");

        // --- HTML Report ---
        let reportHtml = `<html><head><title>Audit: ${fsdSig.n}</title>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
            <style>
                body{display:flex;margin:0;font-family:sans-serif;height:100vh;}
                #side{width:400px;padding:25px;background:#ffffff;border-right:1px solid #ddd;overflow-y:auto;box-shadow: 2px 0 5px rgba(0,0,0,0.1);}
                #map{flex:1;}
                .card{background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:12px;border-left:5px solid #2c3e50;}
                .status-box{padding:20px;border-radius:8px;text-align:center;font-weight:bold;color:white;font-size:18px;background:${statusClr};}
                .rule-box{font-size:12px; background:#eef7ff; padding:12px; border-radius:6px; margin-top:20px; border:1px solid #cfe2ff; color:#084298;}
            </style></head><body>
            <div id="side">
                <h3 style="margin-top:0; color:#2c3e50;">AUDIT REPORT</h3>
                <div class="card"><b>Signal:</b> ${fsdSig.n}</div>
                <div class="card" style="border-color:#e67e22;"><b>FSD Point:</b><br>Speed: ${fsdSig.s} Kmph | ${fsdSig.t}</div>
                <div class="card" style="border-color:#2980b9;"><b>Actual Point:</b><br>Speed: ${actualSig.s} Kmph | ${actualSig.t}<br><b>Error: ${distError}m</b></div>
                <div class="status-box">${finalStatus}</div>
                <div class="rule-box">
                    <b>Rule Applied:</b> Violation is checked only if train speed drops below <b>31 Kmph</b> within <b>2000 meters</b> after passing the signal location.
                    <br><br><b>Distance Tracked:</b> ${totalTrackedDist.toFixed(0)} meters.
                </div>
            </div><div id="map"></div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                var m=L.map('map').setView([${actualSig.lt},${actualSig.lg}],16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
                L.circleMarker([${fsdSig.lt},${fsdSig.lg}],{radius:7,color:'#e67e22',fillOpacity:0.8}).addTo(m).bindPopup('FSD');
                L.circleMarker([${actualSig.lt},${actualSig.lg}],{radius:10,color:'white',fillColor:'${statusClr}',fillOpacity:1,weight:3}).addTo(m).bindPopup('Actual Passing');
                
                // Drawing the 2000m zone
                var zonePath = ${JSON.stringify(analysisPoints)};
                L.polyline(zonePath, {color: '${statusClr}', weight: 5, opacity: 0.7}).addTo(m);
            </script></body></html>`;

        let blob = new Blob([reportHtml], {type:'text/html'});
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "Audit_" + fsdSig.n.replace(/\s+/g, '_') + ".html";
        link.click();

    } catch (err) {
        alert("Report Error: " + err.message);
    }
}

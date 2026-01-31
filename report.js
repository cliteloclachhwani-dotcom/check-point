/**
 * SECR RAIPUR TELOC CELL - AUDIT ENGINE
 * Logic: Audit valid only if speed drops < 31kmph within 2000m AFTER Signal.
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

        // Distance Error (FSD vs S&T)
        const EarthR = 6371e3; 
        const toRad = Math.PI/180;
        let dLat = (actualSig.lt - fsdSig.lt) * toRad;
        let dLon = (actualSig.lg - fsdSig.lg) * toRad;
        let distCalc = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(fsdSig.lt * toRad) * Math.cos(actualSig.lt * toRad) *
                       Math.sin(dLon/2) * Math.sin(dLon/2);
        let distError = (2 * Math.atan2(Math.sqrt(distCalc), Math.sqrt(1-distCalc)) * EarthR).toFixed(1);

        // --- IMPROVED THROUGH-PASS LOGIC (2000m AFTER SIGNAL) ---
        let isThrough = true; // Default assume through pass
        let analysisPoints = []; // For map visualization of the 2km zone

        if (rtisIdx !== -1) {
            let distanceAfterSignal = 0;
            for (let i = rtisIdx; i < window.rtis.length; i++) {
                if (i > rtisIdx) {
                    // Calculate distance from previous point to current point
                    let segment = Math.sqrt(Math.pow(window.rtis[i].lt - window.rtis[i-1].lt, 2) + 
                                            Math.pow(window.rtis[i].lg - window.rtis[i-1].lg, 2)) * 111320;
                    distanceAfterSignal += segment;
                }
                
                analysisPoints.push([window.rtis[i].lt, window.rtis[i].lg]);

                // Condition: If speed drops below 31kmph, it's NOT a through pass (Audit Valid)
                if (window.rtis[i].spd < 31) {
                    isThrough = false;
                    break;
                }

                // Stop checking after 2000 meters
                if (distanceAfterSignal > 2000) break;
            }
        }

        let finalStatus = isThrough ? "NO VIOLATION (THROUGH PASS)" : (actualSig.s > targetSpeed ? "SPEED VIOLATION" : "RULE FOLLOWED");
        let statusClr = isThrough ? "#95a5a6" : (actualSig.s > targetSpeed ? "#d63031" : "#27ae60");

        // --- Report HTML ---
        let reportHtml = `<html><head><title>Audit: ${fsdSig.n}</title>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
            <style>
                body{display:flex;margin:0;font-family:sans-serif;height:100vh;}
                #side{width:400px;padding:20px;background:#fcfcfc;border-right:1px solid #ddd;overflow-y:auto;}
                #map{flex:1;}
                .card{background:white;padding:15px;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 4px rgba(0,0,0,0.05);border-left:5px solid #2c3e50;}
                .status-box{padding:20px;border-radius:8px;text-align:center;font-weight:bold;color:white;font-size:18px;background:${statusClr};margin-top:10px;}
                .note{font-size:11px; color:#555; background:#fff3cd; padding:10px; border-radius:5px; margin-top:15px; border:1px solid #ffeeba;}
            </style></head><body>
            <div id="side">
                <h3 style="color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:10px;">SECR AUDIT REPORT</h3>
                <div class="card"><b>Signal Passing:</b> ${fsdSig.n}</div>
                <div class="card" style="border-color:#e67e22;"><b>FSD Coordinate:</b><br>Speed: ${fsdSig.s} | GPS Time: ${fsdSig.t}</div>
                <div class="card" style="border-color:#2980b9;"><b>Actual S&T Point:</b><br>Speed: ${actualSig.s} | S&T Time: ${actualSig.t}<br><b>Shift: ${distError}m</b></div>
                <div class="status-box">${finalStatus}</div>
                <div class="note">
                    <b>Audit Logic:</b> Violation is only declared if train speed drops below <b>31 Kmph</b> within <b>2000 meters</b> after passing the signal. 
                    ${isThrough ? "<br><br><b>Result:</b> Train maintained high speed (>31) for 2km, hence treated as Through Pass." : "<br><br><b>Result:</b> Train speed dropped below 31 Kmph within 2km zone."}
                </div>
            </div><div id="map"></div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                var m=L.map('map').setView([${actualSig.lt},${actualSig.lg}],16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
                L.circleMarker([${fsdSig.lt},${fsdSig.lg}],{radius:8,color:'#e67e22',fillOpacity:0.6}).addTo(m).bindPopup('FSD Location');
                L.circleMarker([${actualSig.lt},${actualSig.lg}],{radius:12,color:'white',fillColor:'${statusClr}',fillOpacity:1,weight:3}).addTo(m).bindPopup('Actual Passing');
                
                // Highlight the 2km Analysis Zone
                var zonePath = ${JSON.stringify(analysisPoints)};
                L.polyline(zonePath, {color: '${statusClr}', weight: 6, opacity: 0.5}).addTo(m);
                L.polyline([[${fsdSig.lt},${fsdSig.lg}],[${actualSig.lt},${actualSig.lg}]],{color:'#7f8c8d',dashArray:'5,10'}).addTo(m);
            </script></body></html>`;

        let reportBlob = new Blob([reportHtml], {type:'text/html'});
        let downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(reportBlob);
        downloadLink.download = "Audit_" + fsdSig.n.replace(/\s+/g, '_') + ".html";
        downloadLink.click();

    } catch (err) {
        alert("Error: " + err.message);
    }
}

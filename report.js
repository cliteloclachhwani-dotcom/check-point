/**
 * SECR RAIPUR TELOC CELL - AUDIT ENGINE (FIXED)
 */

window.generateViolationReport = function() {
    try {
        const selIdx = parseInt(document.getElementById('vio_sig_list').value);
        const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
        const manualTime = document.getElementById('vio_time').value.trim();

        if (isNaN(selIdx) || !window.activeSigs[selIdx]) {
            return alert("Kripya pehle Map generate karein aur Signal select karein!");
        }
        
        let fsdSig = window.activeSigs[selIdx];
        let actualSig = { ...fsdSig };
        
        // RTIS data matching
        let rtisIdx = window.rtis.findIndex(p => p.time && p.time.includes(manualTime));

        if (rtisIdx !== -1) {
            actualSig.s = window.rtis[rtisIdx].spd;
            actualSig.lt = window.rtis[rtisIdx].lt;
            actualSig.lg = window.rtis[rtisIdx].lg;
            actualSig.t = window.rtis[rtisIdx].time;
        }

        // --- Distance Calculation (Variable 'distCalc' used instead of 'a') ---
        const EarthR = 6371e3; 
        const toRad = Math.PI/180;
        let dLat = (actualSig.lt - fsdSig.lt) * toRad;
        let dLon = (actualSig.lg - fsdSig.lg) * toRad;
        
        let distCalc = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(fsdSig.lt * toRad) * Math.cos(actualSig.lt * toRad) *
                       Math.sin(dLon/2) * Math.sin(dLon/2);
        
        let distError = (2 * Math.atan2(Math.sqrt(distCalc), Math.sqrt(1-distCalc)) * EarthR).toFixed(1);

        // --- Through-Pass Logic ---
        let isThrough = true;
        if (rtisIdx !== -1) {
            let runningDist = 0;
            for (let i = rtisIdx; i < window.rtis.length; i++) {
                if (i > rtisIdx) {
                    let segmentDist = Math.sqrt(Math.pow(window.rtis[i].lt-window.rtis[i-1].lt,2) + 
                                     Math.pow(window.rtis[i].lg-window.rtis[i-1].lg,2)) * 111320;
                    runningDist += segmentDist;
                }
                if (window.rtis[i].spd < 31) { isThrough = false; break; }
                if (runningDist > 2000) break;
            }
        }

        let stnLabel = fsdSig.n.split(' ')[1] || "Station";
        let finalStatus = isThrough ? "NO VIOLATION (THROUGH PASS)" : (actualSig.s > targetSpeed ? "SPEED VIOLATION" : "RULE FOLLOWED");
        let statusClr = isThrough ? "#95a5a6" : (actualSig.s > targetSpeed ? "#d63031" : "#27ae60");

        // --- HTML Generation ---
        let reportHtml = `<html><head><title>Audit Report</title>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
            <style>
                body{display:flex;margin:0;font-family:sans-serif;height:100vh;}
                #side{width:380px;padding:20px;background:#f4f7f6;border-right:1px solid #ddd;overflow-y:auto;}
                #map{flex:1;}
                .card{background:white;padding:15px;border-radius:8px;margin-bottom:15px;box-shadow:0 2px 4px rgba(0,0,0,0.1);border-left:5px solid #2c3e50;}
                .status{padding:20px;border-radius:8px;text-align:center;font-weight:bold;color:white;font-size:18px;background:${statusClr};}
                h2{margin-top:0;color:#2c3e50;border-bottom:2px solid #2c3e50;padding-bottom:10px;}
            </style></head><body>
            <div id="side">
                <h2>SECR AUDIT</h2>
                <div class="card"><b>Signal:</b> ${fsdSig.n}</div>
                <div class="card" style="border-color:#e67e22;"><b>FSD:</b> Speed: ${fsdSig.s} | Time: ${fsdSig.t}</div>
                <div class="card" style="border-color:#2980b9;"><b>ACTUAL (S&T):</b> Speed: ${actualSig.s} | Time: ${actualSig.t}<br><b>Error: ${distError}m</b></div>
                <div class="status">${finalStatus}</div>
                <p style="font-size:11px;margin-top:20px;">*Rules: Violation checked only if train speed < 31kmph within 2km of ${stnLabel}.</p>
            </div><div id="map"></div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                var m=L.map('map').setView([${actualSig.lt},${actualSig.lg}],17);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
                L.circleMarker([${fsdSig.lt},${fsdSig.lg}],{radius:8,color:'#e67e22',fillOpacity:0.6}).addTo(m).bindPopup('FSD');
                L.circleMarker([${actualSig.lt},${actualSig.lg}],{radius:12,color:'white',fillColor:'${statusClr}',fillOpacity:1,weight:3}).addTo(m).bindPopup('Actual');
                L.polyline([[${fsdSig.lt},${fsdSig.lg}],[${actualSig.lt},${actualSig.lg}]],{color:'#7f8c8d',dashArray:'5,10'}).addTo(m);
            </script></body></html>`;

        // --- File Download ---
        let reportBlob = new Blob([reportHtml], {type:'text/html'});
        let downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(reportBlob);
        downloadLink.download = "Audit_" + fsdSig.n.replace(/\s+/g, '_') + ".html";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (err) {
        console.error("Critical Error:", err);
        alert("System error: " + err.message);
    }
}

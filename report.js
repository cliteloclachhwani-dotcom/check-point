/**
 * SECR RAIPUR TELOC CELL - TRIPLE LOCATION AUDIT
 * Logic: Compare FSD, S&T Actual, and RTIS Reported locations.
 */

window.generateViolationReport = function() {
    try {
        const selIdx = parseInt(document.getElementById('vio_sig_list').value);
        const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
        const stTime = document.getElementById('vio_time').value.trim(); // S&T Ground Truth
        const rtisPassTime = prompt("RTIS Signal Passing Time enter karein (e.g. 10:15:20):"); // RTIS Window

        if (isNaN(selIdx)) return alert("Pehle Signal select karein!");
        
        let fsdSig = window.activeSigs[selIdx];
        let actualSig = { ...fsdSig }; // S&T Location
        let rtisSig = { ...fsdSig };   // RTIS Reported Location
        
        // 1. Find S&T Actual Point
        let stIdx = window.rtis.findIndex(p => p.time && p.time.includes(stTime));
        if (stIdx !== -1) {
            actualSig = { ...window.rtis[stIdx], t: window.rtis[stIdx].time, s: window.rtis[stIdx].spd };
        }

        // 2. Find RTIS Reported Point
        let rtisIdx = window.rtis.findIndex(p => p.time && p.time.includes(rtisPassTime));
        if (rtisIdx !== -1) {
            rtisSig = { ...window.rtis[rtisIdx], t: window.rtis[rtisIdx].time, s: window.rtis[rtisIdx].spd };
        }

        // --- Distance Calculation Function ---
        const getDist = (lat1, lon1, lat2, lon2) => {
            const R = 6371000; // meters
            const dLat = (lat2 - lat1) * Math.PI/180;
            const dLon = (lon2 - lon1) * Math.PI/180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            return (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R).toFixed(1);
        };

        let errFSD = getDist(fsdSig.lt, fsdSig.lg, actualSig.lt, actualSig.lg);
        let errRTIS = getDist(rtisSig.lt, rtisSig.lg, actualSig.lt, actualSig.lg);

        // --- Through-Pass Logic (Still based on S&T Actual) ---
        let isThrough = true;
        let analysisPoints = [];
        let totalDist = 0;
        if (stIdx !== -1) {
            for (let i = stIdx; i < window.rtis.length; i++) {
                if (i > stIdx) {
                    totalDist += parseFloat(getDist(window.rtis[i-1].lt, window.rtis[i-1].lg, window.rtis[i].lt, window.rtis[i].lg));
                }
                analysisPoints.push([window.rtis[i].lt, window.rtis[i].lg]);
                if (window.rtis[i].spd < 31) { isThrough = false; break; }
                if (totalDist >= 2000) break;
            }
        }

        let status = isThrough ? "NO VIOLATION (THROUGH PASS)" : (actualSig.s > targetSpeed ? "SPEED VIOLATION" : "RULE FOLLOWED");
        let clr = isThrough ? "#95a5a6" : (actualSig.s > targetSpeed ? "#d63031" : "#27ae60");

        // --- HTML Report ---
        let html = `<html><head><title>Triple Audit: ${fsdSig.n}</title>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
            <style>
                body{display:flex;margin:0;font-family:sans-serif;height:100vh;}
                #side{width:400px;padding:20px;background:#f8f9fa;border-right:1px solid #ddd;overflow-y:auto;}
                #map{flex:1;}
                .card{background:white;padding:12px;border-radius:8px;margin-bottom:10px;box-shadow:0 2px 4px rgba(0,0,0,0.05);font-size:13px;}
                .fsd{border-left:5px solid #e67e22;} .st{border-left:5px solid #2980b9;} .rtis{border-left:5px solid #8e44ad;}
                .status{padding:15px;border-radius:8px;text-align:center;font-weight:bold;color:white;background:${clr};}
                .err-badge{background:#fff3cd; padding:3px 6px; border-radius:4px; font-weight:bold; color:#856404; font-size:11px;}
            </style></head><body>
            <div id="side">
                <h3>TRIPLE LOCATION AUDIT</h3>
                <div class="card fsd"><b>[1] FSD LOCATION</b><br>Time: ${fsdSig.t}<br><span class="err-badge">Error: ${errFSD}m from S&T</span></div>
                <div class="card st"><b>[2] S&T ACTUAL PASSING (Ground Truth)</b><br>Time: ${stTime}<br>Speed: ${actualSig.s} Kmph</div>
                <div class="card rtis"><b>[3] RTIS REPORTED PASSING</b><br>Time: ${rtisPassTime}<br><span class="err-badge">Error: ${errRTIS}m from S&T</span></div>
                <div class="status">${status}</div>
                <p style="font-size:11px; color:#666; margin-top:15px;">Violation check: Valid only if speed < 31kmph within 2km after S&T passing point.</p>
            </div><div id="map"></div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                var m=L.map('map').setView([${actualSig.lt},${actualSig.lg}],17);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
                L.circleMarker([${fsdSig.lt},${fsdSig.lg}],{radius:6,color:'#e67e22',fillOpacity:0.8}).addTo(m).bindPopup('FSD');
                L.circleMarker([${actualSig.lt},${actualSig.lg}],{radius:10,color:'white',fillColor:'${clr}',fillOpacity:1,weight:3}).addTo(m).bindPopup('S&T Actual');
                L.circleMarker([${rtisSig.lt},${rtisSig.lg}],{radius:8,color:'#8e44ad',fillOpacity:0.8}).addTo(m).bindPopup('RTIS Reported');
                L.polyline(${JSON.stringify(analysisPoints)},{color:'${clr}',weight:5,opacity:0.4}).addTo(m);
            </script></body></html>`;

        let b = new Blob([html], {type:'text/html'}), a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = "Triple_Audit_"+fsdSig.n+".html"; a.click();
    } catch(e) { alert(e.message); }
};

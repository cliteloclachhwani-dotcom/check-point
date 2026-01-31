/**
 * SECR RAIPUR TELOC CELL - TRIPLE AUDIT REPORT
 */

window.generateViolationReport = function() {
    try {
        const selIdx = parseInt(document.getElementById('vio_sig_list').value);
        const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
        const stTime = document.getElementById('vio_time').value.trim(); 
        const rtisPassTime = document.getElementById('rtis_pass_time').value.trim(); 

        if (isNaN(selIdx)) return alert("Select Signal!");
        if (!stTime || !rtisPassTime) return alert("S&T aur RTIS dono time dalein!");
        
        let fsdSig = window.activeSigs[selIdx];
        let actualSig = { ...fsdSig }; 
        let rtisSig = { ...fsdSig };   
        
        const getDist = (lat1, lon1, lat2, lon2) => {
            const R = 6371000;
            const dLat = (lat2 - lat1) * Math.PI/180;
            const dLon = (lon2 - lon1) * Math.PI/180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
            return (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R).toFixed(1);
        };

        let stIdx = window.rtis.findIndex(p => p.time && p.time.includes(stTime));
        let rtisIdx = window.rtis.findIndex(p => p.time && p.time.includes(rtisPassTime));

        if (stIdx === -1 || rtisIdx === -1) return alert("Entered time RTIS file mein nahi mila!");

        actualSig = { ...window.rtis[stIdx], t: window.rtis[stIdx].time, s: window.rtis[stIdx].spd };
        rtisSig = { ...window.rtis[rtisIdx], t: window.rtis[rtisIdx].time, s: window.rtis[rtisIdx].spd };

        let errFSD = getDist(fsdSig.lt, fsdSig.lg, actualSig.lt, actualSig.lg);
        let errRTIS = getDist(rtisSig.lt, rtisSig.lg, actualSig.lt, actualSig.lg);

        // --- 2km Logic (Starting from S&T Point) ---
        let isThrough = true;
        let analysisPoints = [];
        let totalDist = 0;
        for (let i = stIdx; i < window.rtis.length; i++) {
            if (i > stIdx) {
                totalDist += parseFloat(getDist(window.rtis[i-1].lt, window.rtis[i-1].lg, window.rtis[i].lt, window.rtis[i].lg));
            }
            analysisPoints.push([window.rtis[i].lt, window.rtis[i].lg]);
            if (window.rtis[i].spd < 31) { isThrough = false; break; }
            if (totalDist >= 2000) break;
        }

        let status = isThrough ? "NO VIOLATION (THROUGH PASS)" : (actualSig.s > targetSpeed ? "SPEED VIOLATION" : "RULE FOLLOWED");
        let clr = isThrough ? "#95a5a6" : (actualSig.s > targetSpeed ? "#d63031" : "#27ae60");

        let html = `<html><head><title>Audit: ${fsdSig.n}</title>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
            <style>
                body{display:flex;margin:0;font-family:sans-serif;height:100vh;}
                #side{width:400px;padding:20px;background:#f8f9fa;border-right:1px solid #ddd;overflow-y:auto;}
                #map{flex:1;}
                .card{background:white;padding:12px;border-radius:8px;margin-bottom:10px;box-shadow:0 2px 4px rgba(0,0,0,0.05);border-left:5px solid;}
                .fsd{border-color:#e67e22;} .st{border-color:#2980b9;} .rtis{border-color:#8e44ad;}
                .status{padding:15px;border-radius:8px;text-align:center;font-weight:bold;color:white;background:${clr};}
                .err-badge{background:#fff3cd; padding:2px 5px; border-radius:4px; font-weight:bold; color:#856404; font-size:11px;}
            </style></head><body>
            <div id="side">
                <h3 style="color:#2c3e50;">TRIPLE LOCATION AUDIT</h3>
                <div class="card fsd"><b>[1] FSD LOCATION (Database)</b><br>Time: ${fsdSig.t}<br><span class="err-badge">Error: ${errFSD}m from S&T</span></div>
                <div class="card st"><b>[2] S&T ACTUAL PASSING (Truth)</b><br>Time: ${stTime}<br>Speed: ${actualSig.s} Kmph</div>
                <div class="card rtis"><b>[3] RTIS REPORTED PASSING</b><br>Time: ${rtisPassTime}<br><span class="err-badge">Error: ${errRTIS}m from S&T</span></div>
                <div class="status">${status}</div>
                <p style="font-size:11px; margin-top:15px; background:#eef; padding:10px; border-radius:5px;">
                    <b>Rule:</b> Violation checked if speed < 31kmph within 2000m after S&T passing point.
                </p>
            </div><div id="map"></div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                var m=L.map('map').setView([${actualSig.lt},${actualSig.lg}],17);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
                L.circleMarker([${fsdSig.lt},${fsdSig.lg}],{radius:6,color:'#e67e22',fillOpacity:0.8}).addTo(m).bindPopup('FSD');
                L.circleMarker([${actualSig.lt},${actualSig.lg}],{radius:10,color:'white',fillColor:'${clr}',fillOpacity:1,weight:3}).addTo(m).bindPopup('S&T Actual');
                L.circleMarker([${rtisSig.lt},${rtisSig.lg}],{radius:8,color:'#8e44ad',fillOpacity:0.8}).addTo(m).bindPopup('RTIS Reported');
                L.polyline(${JSON.stringify(analysisPoints)},{color:'${clr}',weight:6,opacity:0.5}).addTo(m);
            </script></body></html>`;

        let b = new Blob([html], {type:'text/html'}), a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = "Audit_"+fsdSig.n+".html"; a.click();
    } catch(e) { alert("Error: " + e.message); }
};

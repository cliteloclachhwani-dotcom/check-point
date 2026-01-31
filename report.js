window.generateViolationReport = function() {
    // 1. Dropdown aur Input se value uthana
    const selIdx = document.getElementById('vio_sig_list').value;
    const targetSpd = document.getElementById('vio_speed').value;
    const stTimeStr = document.getElementById('vio_time').value; // Actual S&T Time
    const rtTimeStr = document.getElementById('rtis_pass_time').value; // RTIS Time
    
    const fsd = window.activeSigs[selIdx];
    
    // 2. RTIS Data mein matching points dhoondna (S&T vs RTIS)
    const stP = window.rtis.find(p => p.time.includes(stTimeStr)) || fsd;
    const rtP = window.rtis.find(p => p.time.includes(rtTimeStr)) || fsd;

    // 3. Haversine Formula: Distance Error nikalne ke liye
    const getD = (l1, g1, l2, g2) => {
        const R = 6371000; // Earth radius meters mein
        const dLat = (l2-l1)*Math.PI/180; 
        const dLon = (g2-g1)*Math.PI/180;
        const a = Math.sin(dLat/2)**2 + Math.cos(l1*Math.PI/180)*Math.cos(l2*Math.PI/180)*Math.sin(dLon/2)**2;
        return (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R).toFixed(1);
    };

    let eFSD = getD(fsd.lt, fsd.lg, stP.lt, stP.lg);
    let eRTIS = getD(rtP.lt, rtP.lg, stP.lt, stP.lg);

    // 4. THROUGH PASS Logic: 2km check ya speed 31 se kam hona
    let isT = true; 
    let dSum = 0; 
    let stIdx = window.rtis.indexOf(stP);
    if(stIdx !== -1) {
        for(let i=stIdx; i<window.rtis.length; i++){
            if(i>stIdx) dSum += parseFloat(getD(window.rtis[i-1].lt, window.rtis[i-1].lg, window.rtis[i].lt, window.rtis[i].lg));
            if(window.rtis[i].spd < 31) { isT = false; break; }
            if(dSum > 2000) break;
        }
    }

    // Status aur Color code
    let status = isT ? "THROUGH PASS" : (stP.spd > targetSpd ? "SPEED VIOLATION" : "NORMAL");
    let sColor = isT ? "#7f8c8d" : (stP.spd > targetSpd ? "#e74c3c" : "#27ae60");

    // 5. HTML Document taiyar karna (Audit File)
    let h = `<html><head><title>Audit</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body{display:flex;margin:0;font-family:sans-serif;height:100vh;}
        #side{width:420px;padding:25px;border-right:2px solid #ccc;overflow-y:auto;background:#fff;}
        #rmap{flex:1;}
        .card{padding:15px;margin-bottom:12px;border-radius:6px;border-left:8px solid;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-size:14px;}
        .st{background:#e8f5e9;border-color:green;} 
        .fsd{background:#f3e5f5;border-color:purple;} 
        .rtis{background:#fffde7;border-color:#fbc02d;}
        .leaflet-tooltip { border: none !important; box-shadow: none !important; background: transparent !important; }
        .b-lbl { font-weight: bold !important; font-size: 20px !important; color: black; }
        .sig-name { font-weight: bold !important; font-size: 16px !important; color: black; text-transform: uppercase; }
    </style></head><body>
    <div id="side">
        <h2 style="text-align:center; color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:10px;">TELOC CELL BULK VIOLATION AUDIT</h2>
        <p><b>Signal Audited:</b> <span style="color:#2980b9;">${fsd.n}</span></p>
        <div class="card st"><b>1. Actual Signal passing as per S&T</b><br>Time: ${stTimeStr}<br>Speed: ${stP.spd} Kmph<br>Distance Error: 0</div>
        <div class="card fsd"><b>2. Signal passing as per FSD</b><br>Time: ${fsd.t}<br>Speed: ${fsd.s} Kmph<br>Distance Error: ${eFSD}m</div>
        <div class="card rtis"><b>3. Actual Signal passing as per RTIS</b><br>Time: ${rtTimeStr}<br>Speed: ${rtP.spd} Kmph<br>Distance Error: ${eRTIS}m</div>
        <div style="background:${sColor};color:white;padding:15px;text-align:center;font-weight:bold;border-radius:5px;margin:20px 0;font-size:18px;">STATUS: ${status}</div>
        
        <div style="font-size: 36px; font-weight: bold; line-height: 1.3; margin-top: 30px; border-top: 2px solid #000; padding-top: 20px;">
            Date: ${document.getElementById('rep_date').value}<br>
            Loco: ${document.getElementById('rep_loco').value}<br>
            Train: ${document.getElementById('rep_train').value}<br>
            LP ID: ${document.getElementById('rep_lp').value}
        </div>
    </div><div id="rmap"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var m=L.map('rmap').setView([${stP.lt},${stP.lg}],17); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        
        // S&T Point (Green)
        L.circleMarker([${stP.lt},${stP.lg}],{radius:11,color:'green',fillOpacity:1}).addTo(m)
            .bindTooltip("<div style='text-align:center'><span class='sig-name'>${fsd.n}</span><br><br><span class='b-lbl'>${stP.spd}</span></div>",{permanent:true, direction:'top', offset:[0,-15]});
        
        // RTIS Point (Yellow)
        L.circleMarker([${rtP.lt},${rtP.lg}],{radius:10,color:'#fbc02d',fillOpacity:1}).addTo(m)
            .bindTooltip("<span class='b-lbl'>${rtP.spd}</span>",{permanent:true, direction:'bottom', offset:[0,15]});
        
        // FSD Point (Purple)
        L.circleMarker([${fsd.lt},${fsd.lg}],{radius:10,color:'purple',fillOpacity:1}).addTo(m)
            .bindTooltip("<span class='b-lbl'>${fsd.s}</span>",{permanent:true, direction:'left', offset:[-15,0]});
    </script></body></html>`;

    // 6. Download as HTML
    let b = new Blob([h],{type:'text/html'});
    let a = document.createElement('a'); a.href=URL.createObjectURL(b);
    a.download="Audit_"+fsd.n+".html"; a.click();
};

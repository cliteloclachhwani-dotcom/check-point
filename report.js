window.generateViolationReport = function() {
    const selIdx = document.getElementById('vio_sig_list').value;
    const targetSpeed = document.getElementById('vio_speed').value;
    const stT = document.getElementById('vio_time').value;
    const rtT = document.getElementById('rtis_pass_time').value;
    
    const fsd = window.activeSigs[selIdx];
    const stP = window.rtis.find(p => p.time.includes(stT)) || fsd;
    const rtP = window.rtis.find(p => p.time.includes(rtT)) || fsd;

    const getD = (l1,g1,l2,g2) => {
        const R=6371000; const dL=(l2-l1)*Math.PI/180; const dG=(g2-g1)*Math.PI/180;
        const a=Math.sin(dL/2)**2 + Math.cos(l1*Math.PI/180)*Math.cos(l2*Math.PI/180)*Math.sin(dG/2)**2;
        return (2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a))*R).toFixed(1);
    };

    let eFSD = getD(fsd.lt, fsd.lg, stP.lt, stP.lg);
    let eRTIS = getD(rtP.lt, rtP.lg, stP.lt, stP.lg);

    // Through-pass logic
    let isT = true; let dSum = 0; let stIdx = window.rtis.indexOf(stP);
    for(let i=stIdx; i<window.rtis.length; i++){
        if(i>stIdx) dSum += parseFloat(getD(window.rtis[i-1].lt,window.rtis[i-1].lg,window.rtis[i].lt,window.rtis[i].lg));
        if(window.rtis[i].spd < 31) { isT=false; break; }
        if(dSum > 2000) break;
    }

    let status = isT ? "THROUGH PASS" : (stP.spd > targetSpeed ? "SPEED VIOLATION" : "NORMAL");
    let statusColor = isT ? "#7f8c8d" : (stP.spd > targetSpeed ? "#e74c3c" : "#27ae60");

    let html = `<html><head><title>Audit_${fsd.n}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { font-family: sans-serif; display: flex; margin: 0; height: 100vh; }
        #sidebar { width: 420px; padding: 25px; background: #fff; border-right: 2px solid #ddd; overflow-y: auto; }
        #rmap { flex: 1; height: 100%; }
        .header { background: #2c3e50; color: white; padding: 15px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
        .card { padding: 12px; margin-bottom: 12px; border-radius: 6px; border-left: 6px solid; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .st { background: #e8f5e9; border-color: green; }
        .fsd { background: #f3e5f5; border-color: purple; }
        .rtis { background: #fffde7; border-color: #fbc02d; }
        .status-box { background: ${statusColor}; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 18px; border-radius: 5px; margin: 20px 0; }
        .meta-table { width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 15px; }
        .meta-table td { padding: 5px; border-bottom: 1px solid #eee; }
    </style></head><body>
    <div id="sidebar">
        <div class="header">TELOC CELL BULK VIOLATION AUDIT</div>
        <p><b>Signal Audited:</b> <span style="color:#2980b9">${fsd.n}</span></p>
        
        <div class="card st">
            <b>1. Actual Signal passing as per S&T (Benchmark)</b><br>
            Time: ${stT} | Speed: <b>${stP.spd} Kmph</b><br>Distance Error: 0m
        </div>
        
        <div class="card fsd">
            <b>2. Signal passing as per FSD</b><br>
            Time: ${fsd.t} | Speed: <b>${fsd.s} Kmph</b><br>Distance Error: <b>${eFSD}m</b>
        </div>
        
        <div class="card rtis">
            <b>3. Actual Signal passing as per RTIS</b><br>
            Time: ${rtT} | Speed: <b>${rtP.spd} Kmph</b><br>Distance Error: <b>${eRTIS}m</b>
        </div>

        <div class="status-box">${status}</div>

        <table class="meta-table">
            <tr><td><b>Date:</b> ${document.getElementById('rep_date').value}</td><td><b>Loco No:</b> ${document.getElementById('rep_loco').value}</td></tr>
            <tr><td><b>Train No:</b> ${document.getElementById('rep_train').value}</td><td><b>LP ID:</b> ${document.getElementById('rep_lp').value}</td></tr>
        </table>
        <p style="font-size: 11px; color: #666; font-style: italic; margin-top: 20px;">
            *Rule: Violation checked only if train speed drops below 31 Kmph within 2000 meters after passing the signal.
        </p>
    </div>
    <div id="rmap"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var m=L.map('rmap').setView([${stP.lt},${stP.lg}], 17);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        
        var sBall = L.circleMarker([${stP.lt},${stP.lg}], {radius: 12, color: 'green', fillOpacity: 0.9}).addTo(m)
                     .bindTooltip("S&T: ${stP.spd} Kmph", {permanent: true, direction: 'top'});
        
        var rBall = L.circleMarker([${rtP.lt},${rtP.lg}], {radius: 10, color: '#fbc02d', fillOpacity: 0.9}).addTo(m)
                     .bindTooltip("RTIS: ${rtP.spd} Kmph", {permanent: true, direction: 'bottom'});
        
        var fBall = L.circleMarker([${fsd.lt},${fsd.lg}], {radius: 10, color: 'purple', fillOpacity: 0.9}).addTo(m)
                     .bindTooltip("FSD: ${fsd.s} Kmph", {permanent: true, direction: 'left'});

        L.polyline([[${stP.lt},${stP.lg}], [${rtP.lt},${rtP.lg}]], {color: 'black', dashArray: '5,10', weight: 1}).addTo(m);
        L.polyline([[${stP.lt},${stP.lg}], [${fsd.lt},${fsd.lg}]], {color: 'black', dashArray: '5,10', weight: 1}).addTo(m);
    </script></body></html>`;

    let blob = new Blob([html], {type:'text/html'});
    let link = document.createElement('a'); link.href = URL.createObjectURL(blob); 
    link.download = "Audit_" + fsd.n + "_" + document.getElementById('rep_loco').value + ".html"; 
    link.click();
};

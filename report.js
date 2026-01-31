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

    // Through-pass 2km check
    let isT = true; let dSum = 0; let stIdx = window.rtis.indexOf(stP);
    for(let i=stIdx; i<window.rtis.length; i++){
        if(i>stIdx) dSum += parseFloat(getD(window.rtis[i-1].lt,window.rtis[i-1].lg,window.rtis[i].lt,window.rtis[i].lg));
        if(window.rtis[i].spd < 31) { isT=false; break; }
        if(dSum > 2000) break;
    }

    let status = isT ? "THROUGH PASS" : (stP.spd > targetSpeed ? "SPEED VIOLATION" : "NORMAL");
    let clr = isT ? "#7f8c8d" : (stP.spd > targetSpeed ? "#e74c3c" : "#27ae60");

    let html = `<html><head><title>Audit_${fsd.n}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { font-family: sans-serif; display: flex; margin: 0; height: 100vh; }
        #sidebar { width: 420px; padding: 25px; border-right: 2px solid #ddd; overflow-y: auto; }
        #rmap { flex: 1; }
        .card { padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 6px solid; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .st { background: #e8f5e9; border-color: green; }
        .fsd { background: #f3e5f5; border-color: purple; }
        .rtis { background: #fffde7; border-color: #fbc02d; }
    </style></head><body>
    <div id="sidebar">
        <h2 style="text-align:center; color:#2c3e50;">TELOC CELL BULK VIOLATION AUDIT</h2>
        <p><b>Signal Audited:</b> ${fsd.n}</p>
        <div class="card st"><b>1. Actual Signal passing as per S&T</b><br>Time: ${stT}<br>Speed: ${stP.spd} Kmph<br>Distance Error: 0m</div>
        <div class="card fsd"><b>2. Signal passing as per FSD</b><br>Time: ${fsd.t}<br>Speed: ${fsd.s} Kmph<br>Distance Error: ${eFSD}m</div>
        <div class="card rtis"><b>3. Actual Signal passing as per RTIS</b><br>Time: ${rtT}<br>Speed: ${rtP.spd} Kmph<br>Distance Error: ${eRTIS}m</div>
        <div style="background:${clr}; color:white; padding:15px; text-align:center; font-weight:bold; border-radius:5px; margin:15px 0;">STATUS: ${status}</div>
        <div style="font-size:12px; border-top:1px solid #ccc; padding-top:15px;">
            <i>Rule: Violation checked only if train speed drops < 31kmph within 2km after Signal.</i><br><br>
            <b>Date:</b> ${document.getElementById('rep_date').value}<br>
            <b>Loco:</b> ${document.getElementById('rep_loco').value}<br>
            <b>Train:</b> ${document.getElementById('rep_train').value}<br>
            <b>LP ID:</b> ${document.getElementById('rep_lp').value}
        </div>
    </div><div id="rmap"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var m=L.map('rmap').setView([${stP.lt},${stP.lg}], 17);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        L.circleMarker([${stP.lt},${stP.lg}],{radius:10,color:'green',fillOpacity:1}).addTo(m).bindTooltip("S&T: ${stP.spd}",{permanent:true, direction:'top'});
        L.circleMarker([${rtP.lt},${rtP.lg}],{radius:10,color:'#fbc02d',fillOpacity:1}).addTo(m).bindTooltip("RTIS: ${rtP.spd}",{permanent:true, direction:'bottom'});
        L.circleMarker([${fsd.lt},${fsd.lg}],{radius:10,color:'purple',fillOpacity:1}).addTo(m).bindTooltip("FSD: ${fsd.s}",{permanent:true, direction:'left'});
    </script></body></html>`;

    let blob = new Blob([html], {type:'text/html'});
    let link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "Audit_"+fsd.n+".html"; link.click();
};

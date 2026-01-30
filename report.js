window.generateViolationReport = function() {
    const selIdx = parseInt(document.getElementById('vio_sig_list').value);
    const userSpeed = document.getElementById('vio_speed').value;
    if(isNaN(selIdx)) return alert("Pehle Map Generate karein!");
    if(!userSpeed) return alert("Please enter Observed Speed!");

    // Logic: 3 Aage + 3 Piche + Selected = Total 7
    let start = Math.max(0, selIdx - 3);
    let end = Math.min(window.activeSigs.length - 1, selIdx + 3);
    let vioSigs = window.activeSigs.slice(start, end + 1);

    let html = `<html><head><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>
    body{margin:0;display:flex;height:100vh;background:#f8f9fa;font-family:sans-serif;}
    #side{width:380px;background:#fff;padding:20px;overflow-y:auto;border-right:1px solid #ddd;box-shadow:2px 0 5px rgba(0,0,0,0.1);}
    #map{flex:1;} .card{padding:12px;margin-bottom:10px;border-radius:5px;border:1px solid #ddd;font-weight:bold;}
    .highlight{background:#ff7675 !important; border:2px solid #d63031 !important; color:#fff;}
    .stn-lbl{font-size:12px; font-weight:900; color:#000; text-shadow:1px 1px white;}
    </style></head><body><div id="side">
    <h2 style="color:#d63031;">VIOLATION AUDIT REPORT</h2>
    <p><b>Observed Speed:</b> <span style="font-size:20px; color:#d63031;">${userSpeed} Kmph</span></p><hr>
    ${vioSigs.map(s => {
        let isSel = (s.n === window.activeSigs[selIdx].n);
        return `<div class="card ${isSel?'highlight':''}" onclick="m.setView([${s.lt},${s.lg}],17)">
            ${s.n}<br><small>RTIS Speed: ${s.s} | Time: ${s.t}</small>
            ${isSel ? '<br><span style="font-size:10px;">(TARGET SIGNAL)</span>' : ''}
        </div>`;
    }).join('')}
    </div><div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
    var m=L.map('map').setView([${window.activeSigs[selIdx].lt},${window.activeSigs[selIdx].lg}],16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
    
    // Zoom in only on these 7 signals area
    var rData = ${JSON.stringify(window.rtis.map(p=>({lt:p.lt, lg:p.lg, s:p.spd, t:p.time})))};
    var poly=L.polyline(rData.map(p=>[p.lt,p.lg]),{color:'black',weight:4, opacity:0.6}).addTo(m);

    ${JSON.stringify(vioSigs)}.forEach(s => {
        let isTgt = (s.n === "${window.activeSigs[selIdx].n}");
        L.circleMarker([s.lt,s.lg], {radius: isTgt?12:8, color:'white', fillColor: isTgt?'#d63031':s.clr, fillOpacity:1, weight:2}).addTo(m)
        .bindPopup("<b>"+s.n+"</b><br>RTIS Speed: "+s.s+"<br>Observed: ${userSpeed}");
    });
    </script></body></html>`;

    let b = new Blob([html],{type:'text/html'}), a = document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=`Violation_Report_${window.activeSigs[selIdx].n}.html`; a.click();
};

// Purane functions (Excel/Web Report) waise hi rahenge
window.saveInteractiveWebReport = function() { /* ... Same as previous ... */ };
window.downloadExcelAudit = function() { /* ... Same as previous ... */ };

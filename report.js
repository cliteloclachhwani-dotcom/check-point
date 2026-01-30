/**
 * SECR RAIPUR TELOC CELL - Report Logic
 * Includes: Web Report & Bulk Violation Audit
 */

// Function to generate the standard Interactive Web Report
window.saveInteractiveWebReport = function() {
    if(!window.rtis.length) return alert("Pehle Map Generate karein!");
    const sF = document.getElementById('s_from').value;
    const sT = document.getElementById('s_to').value;
    const dir = determineDirection(sF, sT);
    
    // Filter signals encountered during this journey
    let sigData = [];
    window.master.sigs.forEach(sig => {
        if(!sig.type.startsWith(dir)) return;
        let lt = conv(getVal(sig,['Lat'])), lg = conv(getVal(sig,['Lng']));
        let m = window.rtis.find(p => Math.sqrt(Math.pow(p.lt-lt,2)+Math.pow(p.lg-lg,2)) < 0.0012);
        if(m) sigData.push({n:getVal(sig,['SIGNAL_NAME']), s:m.spd, t:m.time, lt:lt, lg:lg, clr:sig.clr});
    });

    // Filter stations encountered
    let stnData = [];
    window.master.stns.forEach(s => {
        let n = getVal(s,['Station_Name']), lt = conv(getVal(s,['Start_Lat '])), lg = conv(getVal(s,['Start_Lng']));
        if(window.rtis.some(p => Math.sqrt(Math.pow(p.lt-lt,2)+Math.pow(p.lg-lg,2)) < 0.012)) stnData.push({n:n, lt:lt, lg:lg});
    });

    let html = `<html><head><title>Web Report ${sF}-${sT}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body{margin:0;display:flex;height:100vh;background:#f4f4f4;font-family:'Segoe UI',sans-serif;}
        #side{width:350px;background:#fff;padding:15px;overflow-y:auto;border-right:1px solid #ddd;box-shadow:2px 0 5px rgba(0,0,0,0.1);}
        #map{flex:1;} 
        .card{background:#fff;padding:12px;margin-bottom:10px;border-radius:5px;cursor:pointer;border:1px solid #eee;border-left:6px solid;transition:0.2s;}
        .card:hover{background:#f9f9f9; transform:translateX(5px);}
        h3{margin-top:0; color:#2c3e50; border-bottom:2px solid #34495e; padding-bottom:5px;}
    </style></head><body>
    <div id="side">
        <h3>SECR RAIPUR</h3>
        <b>Journey: ${sF} &#8594; ${sT}</b><hr>
        ${sigData.map(r=>`<div class="card" style="border-left-color:${r.clr}" onclick="m.setView([${r.lt},${r.lg}],17)">
            <div style="font-size:14px;">${r.n}</div>
            <div style="font-size:12px;color:#666;">Speed: <b>${r.s} Kmph</b> | Time: ${r.t}</div>
        </div>`).join('')}
    </div>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
        var m=L.map('map').setView([${sigData.length?sigData[0].lt:21.15},${sigData.length?sigData[0].lg:79.12}],14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        
        var rData = ${JSON.stringify(window.rtis.map(p=>({lt:p.lt, lg:p.lg, s:p.spd, t:p.time})))};
        var poly=L.polyline(rData.map(p=>[p.lt,p.lg]),{color:'black',weight:4}).addTo(m);
        m.fitBounds(poly.getBounds());
        
        poly.on('mousemove', function(e) {
            let p = rData.reduce((a, b) => Math.abs(b.lt-e.latlng.lat) < Math.abs(a.lt-e.latlng.lat) ? b : a);
            L.popup().setLatLng(e.latlng).setContent("Speed: "+p.s+" Kmph<br>Time: "+p.t).openOn(m);
        });

        ${JSON.stringify(stnData)}.forEach(a => {
            L.marker([a.lt, a.lg], {icon:L.divIcon({html:'<b style="font-size:12px;color:#000;text-shadow:1px 1px white;white-space:nowrap;">'+a.n+'</b>', className:''})}).addTo(m);
        });

        ${JSON.stringify(sigData)}.forEach(s => {
            L.circleMarker([s.lt,s.lg], {radius:7, color:'white', fillColor:s.clr, fillOpacity:1, weight:1.5}).addTo(m).bindPopup("<b>"+s.n+"</b><br>Spd: "+s.s);
        });
    </script></body></html>`;

    let b = new Blob([html],{type:'text/html'}), a = document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=`Report_${sF}_to_${sT}.html`; a.click();
};

// Function for Bulk Report Violation (Target vs Actual Logic)
window.generateViolationReport = function() {
    const selIdx = parseInt(document.getElementById('vio_sig_list').value);
    const targetSpeed = parseFloat(document.getElementById('vio_speed').value);
    
    if(isNaN(selIdx)) return alert("Pehle Map Generate karein!");
    if(isNaN(targetSpeed)) return alert("Please enter Permissible Target Speed!");

    // Calculate 7-Signal Window (3 Behind + 1 Target + 3 Ahead)
    let start = Math.max(0, selIdx - 3);
    let end = Math.min(window.activeSigs.length - 1, selIdx + 3);
    let vioSigs = window.activeSigs.slice(start, end + 1);

    let targetSig = window.activeSigs[selIdx];
    let isViolated = targetSig.s > targetSpeed;

    let html = `<html><head><title>Violation Audit - ${targetSig.n}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body{margin:0;display:flex;height:100vh;background:#f1f2f6;font-family:'Segoe UI',sans-serif;}
        #side{width:380px;background:#fff;padding:20px;overflow-y:auto;border-right:1px solid #ddd;box-shadow:2px 0 10px rgba(0,0,0,0.1);}
        #map{flex:1;} 
        .card{padding:15px;margin-bottom:12px;border-radius:6px;border:1px solid #ddd;font-weight:bold; background:#fff; position:relative;}
        .status-tag { display:inline-block; padding:4px 10px; border-radius:3px; font-size:11px; margin-top:8px; text-transform:uppercase; font-weight:900; }
        
        .violation{ border:2px solid #eb4d4b; background:#fff5f5; box-shadow:0 0 10px rgba(235,77,75,0.2); }
        .violation .status-tag { background:#eb4d4b; color:#fff; }
        
        .followed{ border:2px solid #2ecc71; background:#f0fff4; }
        .followed .status-tag { background:#2ecc71; color:#fff; }
        
        .normal{ border-left:5px solid #ccc; opacity:0.8; }
        .header-box { background:#34495e; color:white; padding:15px; border-radius:5px; margin-bottom:20px; }
    </style></head><body>
    <div id="side">
        <div class="header-box">
            <div style="font-size:18px; font-weight:bold;">VIOLATION AUDIT</div>
            <div style="font-size:12px; opacity:0.8;">SECR RAIPUR TELOC CELL</div>
        </div>
        
        <div style="background:#f8f9fa; padding:12px; border:1px solid #ddd; border-radius:5px; margin-bottom:20px; font-size:14px;">
            <b>Target Speed:</b> <span style="color:#2980b9;">${targetSpeed} Kmph</span><br>
            <b>Actual Speed:</b> <span style="color:${isViolated?'#c0392b':'#27ae60'};">${targetSig.s} Kmph</span>
        </div>
        <hr>
        <p style="font-size:12px; color:#666;">Signal sequence (Target +/- 3):</p>
        
        ${vioSigs.map(s => {
            let isTarget = (s.n === targetSig.n);
            let cardClass = "normal";
            let status = "";
            
            if(isTarget) {
                if(s.s > targetSpeed) {
                    cardClass = "violation";
                    status = "<div class='status-tag'>OVER SPEEDING / VIOLATION</div>";
                } else {
                    cardClass = "followed";
                    status = "<div class='status-tag'>RULE FOLLOWED</div>";
                }
            }

            return `<div class="card ${cardClass}" onclick="m.setView([${s.lt},${s.lg}],17)">
                <div style="font-size:15px;">${s.n}</div>
                <div style="font-size:13px; color:#555; margin-top:4px;">RTIS Speed: <b>${s.s} Kmph</b></div>
                <div style="font-size:11px; color:#888;">Logged at: ${s.t}</div>
                ${status}
            </div>`;
        }).join('')}
    </div>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
        var m=L.map('map').setView([${targetSig.lt},${targetSig.lg}],16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        
        var rPath = ${JSON.stringify(window.rtis.map(p=>({lt:p.lt, lg:p.lg, s:p.spd, t:p.time})))};
        L.polyline(rPath.map(p=>[p.lt,p.lg]),{color:'black',weight:3, opacity:0.4}).addTo(m);

        ${JSON.stringify(vioSigs)}.forEach(s => {
            let isTgt = (s.n === "${targetSig.n}");
            let markerClr = s.clr;
            if(isTgt) markerClr = ${isViolated} ? '#eb4d4b' : '#2ecc71';
            
            L.circleMarker([s.lt,s.lg], {
                radius: isTgt ? 12 : 8, 
                color: 'white', 
                fillColor: markerClr, 
                fillOpacity: 1, 
                weight: 2
            }).addTo(m).bindPopup("<b>"+s.n+"</b><br>Speed: "+s.s+" Kmph");
        });
    </script></body></html>`;

    let b = new Blob([html],{type:'text/html'}), a = document.createElement('a');
    a.href=URL.createObjectURL(b); 
    a.download=`Violation_Audit_${targetSig.n.replace(/ /g,'_')}.html`; 
    a.click();
};

// Standard Excel Audit Download
window.downloadExcelAudit = function() {
    if(!window.rtis.length) return alert("No Data Available");
    const sF = document.getElementById('s_from').value;
    const sT = document.getElementById('s_to').value;
    const dir = determineDirection(sF, sT);
    
    let csv = "Type,Signal Name,RTIS Speed,Time\n";
    window.master.sigs.forEach(sig => {
        if(!sig.type.startsWith(dir)) return;
        let lt = conv(getVal(sig,['Lat'])), lg = conv(getVal(sig,['Lng']));
        let m = window.rtis.find(p => Math.sqrt(Math.pow(p.lt-lt,2)+Math.pow(p.lg-lg,2)) < 0.0012);
        if(m) csv += `${sig.type},${getVal(sig,['SIGNAL_NAME'])},${m.spd},${m.time}\n`;
    });
    
    let b = new Blob([csv],{type:'text/csv'}), a = document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=`Audit_Data_${sF}_to_${sT}.csv`; a.click();
};

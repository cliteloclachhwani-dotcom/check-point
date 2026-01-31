window.generateViolationReport = function() {
    const selIdx = document.getElementById('vio_sig_list').value;
    const fsd = window.activeSigs[selIdx];
    const stTimeStr = document.getElementById('vio_time').value;
    const rtTimeStr = document.getElementById('rtis_pass_time').value;
    const stP = window.rtis.find(p => p.time.includes(stTimeStr)) || fsd;
    const rtP = window.rtis.find(p => p.time.includes(rtTimeStr)) || fsd;

    let h = `<html><head><style>
        body{display:flex;margin:0;font-family:sans-serif;height:100vh;}
        #side{width:420px;padding:25px;border-right:2px solid #ccc;overflow-y:auto;}
        #rmap{flex:1;}
        .card{padding:15px;margin-bottom:12px;border-radius:6px;border-left:8px solid;box-shadow:0 4px 6px rgba(0,0,0,0.1);}
        /* Bold Labels on Map */
        .leaflet-tooltip { border: none !important; box-shadow: none !important; background: transparent !important; }
        .b-lbl { font-weight: bold !important; font-size: 22px !important; color: black; }
        .sig-name { font-weight: bold !important; font-size: 18px !important; color: black; text-transform: uppercase; }
        /* 3x Bigger Metadata */
        .metadata { font-size: 38px; font-weight: bold; line-height: 1.4; margin-top: 40px; border-top: 3px solid #000; padding-top: 25px; }
    </style></head><body>
    <div id="side">
        <h2>TELOC CELL AUDIT</h2>
        <div class="card" style="border-color:green; background:#e8f5e9;"><b>S&T Time:</b> ${stTimeStr}<br><b>Speed:</b> ${stP.spd}</div>
        <div class="card" style="border-color:purple; background:#f3e5f5;"><b>FSD Speed:</b> ${fsd.s}</div>
        <div class="card" style="border-color:#fbc02d; background:#fffde7;"><b>RTIS Speed:</b> ${rtP.spd}</div>
        <div class="metadata">
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
        L.circleMarker([${stP.lt},${stP.lg}],{radius:12,color:'green',fillOpacity:1}).addTo(m)
            .bindTooltip("<div style='text-align:center'><span class='sig-name'>${fsd.n}</span><br><br><span class='b-lbl'>${stP.spd}</span></div>",{permanent:true, direction:'top', offset:[0,-15]});
        L.circleMarker([${rtP.lt},${rtP.lg}],{radius:10,color:'#fbc02d',fillOpacity:1}).addTo(m)
            .bindTooltip("<span class='b-lbl'>${rtP.spd}</span>",{permanent:true, direction:'bottom', offset:[0,15]});
    </script></body></html>`;

    let b = new Blob([h],{type:'text/html'});
    let a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download="Audit_"+fsd.n+".html"; a.click();
};

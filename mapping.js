window.master = { stns: [], sigs: [] }; window.rtis = []; window.activeSigs = [];
const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// RESTORED 16 MASTER DN RULES
const DN_RULES = [
    ["DURG","DLBS","BQR","BIA","DBEC","DCBIN","ACBIN","KMI","SZB","R","URK","MDH","SLH","BKTHW","BKTHE","TLD","HN","HNEOC","BYT","NPI","DGS","BYL","DPH","BSP"],
    ["TLD MGMT SDG","TLD","HN"],
    ["HN","HNEOC","HN SM4","HN UCLH SDG","HN MGCH SDG"],
    ["BYT","NPI","NPI NVCN SDG","NPI PCPN SDG"],
    ["HNEOC","BYT","BYT MRLB SDG"],
    ["SLH","BKTHW","BKTH MBMB SDG","BKTH CCS SDG"],
    ["URK","URKE","MDH","MDH MSMM SDG"],
    ["BMY MNBK SDG","BMY P CABIN","DBEC","BMY DNTH YD","DCBIN","ACBIN"],
    ["BMY FMYD","BMY CLYD","BMY CEYD","BMY P CABIN","DBEC","BMY DNTH YD","DCBIN","ACBIN"],
    ["BIA JCWS","BIA JBH","BIA","BLEY EX YARD","DBEC","BMY DNTH YD"],
    ["AAGH","KETI","BPTP","GUDM","DRZ","KYS","BXA","LBO","GDZ","RSA","MXA","ORE YARD"],
    ["DURG","DLBS","MXA","BMY CLYD","BMY CEYD","BMY FMYD"],
    ["DRZ RSDG SDG","DRZ KSDG SDG","DRZ"],
    ["SZB","R","RVH","RSD"],
    ["RSD","URKE","MDH"],
    ["TIG","RNBT","MRBL","KBJ","TRKR","HSK","LKNA","NPD","KRAR","KMK","BGBR","BMKJ","ARN","MSMD","BLSN","ANMD","LAE","NRMH","MNDH","RVH","R","RSD"]
];

function conv(v) { if(!v) return null; let n = parseFloat(v.toString().replace(/[^0-9.]/g, '')); return Math.floor(n/100) + ((n%100)/60); }
function getVal(row, keys) { let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())); return foundKey ? row[foundKey] : null; }

window.onload = function() {
    Papa.parse("master/station.csv", {download:true, header:true, complete: r => {
        window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
        let h = window.master.stns.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});
    [{f:'up_signals.csv', t:'UP', c:'#2ecc71'}, {f:'dn_signals.csv', t:'DN', c:'#3498db'}].forEach(c => {
        Papa.parse("master/"+c.f, {download:true, header:true, complete: r => { r.data.forEach(s => { if(getVal(s,['Lat'])){ s.type=c.t; s.clr=c.c; window.master.sigs.push(s); } }); }});
    });
};

function generateLiveMap() {
    const file = document.getElementById('csv_file').files[0];
    const sF = document.getElementById('s_from').value, sT = document.getElementById('s_to').value;
    if(!file) return alert("Select CSV!");

    // DIRECTION LOGIC
    let dir = "UP"; 
    for(let r of DN_RULES) {
        let idxF = r.indexOf(sF), idxT = r.indexOf(sT);
        if(idxF !== -1 && idxT !== -1 && idxF < idxT) { dir = "DN"; break; }
    }

    Papa.parse(file, {header:true, skipEmptyLines:true, complete: function(res) {
        window.rtis = res.data.map(r => ({ 
            lt: parseFloat(getVal(r,['Lat','Latitude'])), 
            lg: parseFloat(getVal(r,['Lng','Longitude'])), 
            spd: parseFloat(getVal(r,['Spd','Speed']))||0, 
            time: getVal(r,['Time','Logging Time'])
        })).filter(p => !isNaN(p.lt));

        map.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Polyline) map.removeLayer(l); });
        window.activeSigs = [];
        
        window.master.sigs.forEach(sig => {
            if(!sig.type.startsWith(dir)) return;
            let slt = conv(getVal(sig,['Lat'])), slg = conv(getVal(sig,['Lng']));
            let m = window.rtis.find(p => Math.sqrt(Math.pow(p.lt-slt,2)+Math.pow(p.lg-slg,2)) < 0.0015);
            if(m) {
                window.activeSigs.push({n:getVal(sig,['SIGNAL_NAME']), s:m.spd, t:m.time, lt:slt, lg:slg, clr:sig.clr});
                L.circleMarker([slt, slg], {radius: 6, color: sig.clr, fillOpacity: 1}).addTo(map)
                 .bindPopup("<b>"+getVal(sig,['SIGNAL_NAME'])+"</b><br>Speed: "+m.spd+" Kmph<br>Time: "+m.time);
            }
        });

        document.getElementById('vio_sig_list').innerHTML = window.activeSigs.map((s,i)=>`<option value="${i}">${s.n}</option>`).join('');
        document.getElementById('violation_panel').style.display='block';
        L.polyline(window.rtis.map(p=>[p.lt,p.lg]), {color:'black', weight:2, opacity:0.6}).addTo(map);
        map.fitBounds(L.polyline(window.rtis.map(p=>[p.lt,p.lg])).getBounds());
    }});
}

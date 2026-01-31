window.master = { stns: [], sigs: [] };
window.rtis = [];
window.activeSigs = [];

const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// --- 16 DN MASTER SEQUENCES (AS PER USER INSTRUCTION) ---
const DN_SEQUENCES = [
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

const SPECIAL_UP = [
    ["RSD","URKW","R","SZB"],
    ["RSD","R","SZB"]
];

// Smart Coordinate Handling: DDMM.SS -> Decimal conversion only if needed
function conv(v) { 
    if(!v) return null; 
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, '')); 
    if (n > 100) return Math.floor(n/100) + ((n%100)/60); 
    return n; 
}

function getVal(row, keys) { 
    if(!row) return null; 
    let fK = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())); 
    return fK ? row[fK].toString().trim() : ""; 
}

function determineDirection(f, t) {
    for(let s of SPECIAL_UP) if(s.includes(f) && s.includes(t) && s.indexOf(f) < s.indexOf(t)) return "UP";
    for(let s of DN_SEQUENCES) if(s.includes(f) && s.includes(t)) return s.indexOf(f) < s.indexOf(t) ? "DN" : "UP";
    return "DN";
}

window.onload = function() {
    // Load Stations
    Papa.parse("master/station.csv", {download:true, header:true, complete: r => {
        window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
        let h = window.master.stns.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});

    // Load Signals (UP, DN, MID)
    const files = [
        {f:'up_signals.csv', t:'UP', c:'#2ecc71'}, {f:'dn_signals.csv', t:'DN', c:'#3498db'}, 
        {f:'up_mid_signals.csv', t:'UP_MID', c:'#e74c3c'}, {f:'dn_mid_signals.csv', t:'DN_MID', c:'#9b59b6'}
    ];
    files.forEach(c => { 
        Papa.parse("master/"+c.f, {download:true, header:true, complete: r => { 
            r.data.forEach(s => { if(getVal(s,['Lat'])){ s.type=c.t; s.clr=c.c; window.master.sigs.push(s); } }); 
        }}); 
    });
};

function generateLiveMap() {
    const f = document.getElementById('csv_file').files[0];
    const sF = document.getElementById('s_from').value, sT = document.getElementById('s_to').value;
    if(!f) return alert("Select RTIS CSV File!");
    
    const dir = determineDirection(sF, sT);

    Papa.parse(f, {header:true, skipEmptyLines:true, complete: function(res) {
        let raw = res.data.map(r => ({ 
            lt: parseFloat(getVal(r,['Latitude','Lat'])), 
            lg: parseFloat(getVal(r,['Longitude','Lng'])), 
            spd: parseFloat(getVal(r,['Speed','Spd']))||0, 
            time: getVal(r,['Logging Time','Time'])||"-",
            stnCode: getVal(r,['last/cur stationCode','stationCode']) || ""
        })).filter(p => !isNaN(p.lt));

        // 1. Clipping by Station Code
        let si = raw.findIndex(p => p.stnCode.toUpperCase() === sF.toUpperCase());
        let ei = raw.findLastIndex(p => p.stnCode.toUpperCase() === sT.toUpperCase());

        // 2. Backup Clipping by Coordinates
        if(si === -1 || ei === -1) {
            let stnStart = window.master.stns.find(x => getVal(x,['Station_Name']) === sF);
            let stnEnd = window.master.stns.find(x => getVal(x,['Station_Name']) === sT);
            let sLT = conv(getVal(stnStart,['Start_Lat '])), sLG = conv(getVal(stnStart,['Start_Lng']));
            let eLT = conv(getVal(stnEnd,['Start_Lat '])), eLG = conv(getVal(stnEnd,['Start_Lng']));
            si = raw.findIndex(p => Math.sqrt(Math.pow(p.lt-sLT,2)+Math.pow(p.lg-sLG,2)) < 0.015);
            ei = raw.findLastIndex(p => Math.sqrt(Math.pow(p.lt-eLT,2)+Math.pow(p.lg-eLG,2)) < 0.015);
        }

        window.rtis = (si!==-1 && ei!==-1) ? raw.slice(Math.min(si,ei), Math.max(si,ei)+1) : raw;

        // Reset Map
        map.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Marker || l instanceof L.Polyline) map.removeLayer(l); });

        // Draw Path
        let poly = L.polyline(window.rtis.map(p=>[p.lt,p.lg]), {color: 'black', weight: 3}).addTo(map);
        map.fitBounds(poly.getBounds());

        // Add Station Markers with Labels
        window.master.stns.forEach(s => {
            let n = getVal(s,['Station_Name']), lt = conv(getVal(s,['Start_Lat '])), lg = conv(getVal(s,['Start_Lng']));
            if(window.rtis.some(p => Math.sqrt(Math.pow(p.lt-lt,2)+Math.pow(p.lg-lg,2)) < 0.012)) {
                L.marker([lt, lg], {icon: L.divIcon({className:'stn-label-style', html: n})}).addTo(map);
            }
        });

        // Add Signals on Path
        window.activeSigs = [];
        window.master.sigs.forEach(sig => {
            if(!sig.type.startsWith(dir)) return;
            let slt = conv(getVal(sig,['Lat'])), slg = conv(getVal(sig,['Lng']));
            
            // Euclidean search for the closest point on track
            let closest = null, minD = 99;
            window.rtis.forEach(p => {
                let d = Math.sqrt(Math.pow(p.lt-slt,2)+Math.pow(p.lg-slg,2));
                if(d < minD) { minD = d; closest = p; }
            });

            if(closest && minD < 0.008) { 
                let sigObj = {n:getVal(sig,['SIGNAL_NAME']), s:closest.spd, t:closest.time, lt:slt, lg:slg, clr:sig.clr};
                window.activeSigs.push(sigObj);
                L.circleMarker([slt, slg], {radius: 7, color: 'white', weight: 1.5, fillOpacity: 1, fillColor: sig.clr})
                .addTo(map).bindPopup(`<b>${sigObj.n}</b><br>Speed: ${sigObj.s} | Time: ${sigObj.t}`);
            }
        });

        // Update Violation Dropdown
        document.getElementById('vio_sig_list').innerHTML = window.activeSigs.map((s, idx) => `<option value="${idx}">${s.n} (${s.s} kmph)</option>`).join('');
        document.getElementById('violation_panel').style.display = 'block';

        // Hover Speed Interaction
        poly.on('mousemove', e => {
            let p = window.rtis.reduce((a, b) => Math.abs(b.lt-e.latlng.lat) < Math.abs(a.lt-e.latlng.lat) ? b : a);
            document.getElementById('live-speed').innerText = p.spd;
            document.getElementById('live-time').innerText = p.time;
        });
    }});
}

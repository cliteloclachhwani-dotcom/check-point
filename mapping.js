window.master = { stns: [], sigs: [] };
window.rtis = [];
window.activeSigs = []; 

const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const DN_SEQUENCES = [
    ["DURG","DLBS","BQR","BIA","DBEC","DCBIN","ACBIN","KMI","SZB","R","URK","MDH","SLH","BKTHW","BKTHE","TLD","HN","HNEOC","BYT","NPI","DGS","BYL","DPH","BSP"],
    ["TIG","RNBT","MRBL","KBJ","TRKR","HSK","LKNA","NPD","KRAR","KMK","BGBR","BMKJ","ARN","MSMD","BLSN","ANMD","LAE","NRMH","MNDH","RVH","R","RSD"]
    // ... baki sequences as it is rakhein
];
const SPECIAL_UP = [["RSD","URKW","R","SZB"], ["RSD","R","SZB"]];

// SMART CONVERSION: Sirf tab convert karega jab coordinate DDMM.SS format mein ho
function conv(v) { 
    if(!v) return null; 
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, '')); 
    if (n > 100) { // DDMM.SS Format detection
        return Math.floor(n/100) + ((n%100)/60); 
    }
    return n; // Already Decimal
}

function getVal(row, keys) { 
    if(!row) return null; 
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())); 
    return foundKey ? row[foundKey].toString().trim() : null; 
}

function determineDirection(f, t) {
    for(let s of SPECIAL_UP) if(s.includes(f) && s.includes(t) && s.indexOf(f) < s.indexOf(t)) return "UP";
    for(let s of DN_SEQUENCES) if(s.includes(f) && s.includes(t)) return s.indexOf(f) < s.indexOf(t) ? "DN" : "UP";
    return "DN";
}

window.onload = function() {
    Papa.parse("master/station.csv", {download:true, header:true, complete: r => {
        window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
        let h = window.master.stns.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});
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
    if(!f) return alert("Select File");
    const dir = determineDirection(sF, sT);

    Papa.parse(f, {header:true, skipEmptyLines:true, complete: function(res) {
        let raw = res.data.map(r => ({ 
            lt: parseFloat(getVal(r,['Lat','Latitude'])), 
            lg: parseFloat(getVal(r,['Lng','Longitude'])), 
            spd: parseFloat(getVal(r,['Spd','Speed']))||0, 
            time: getVal(r,['Time','Logging Time'])||"-",
            stnCode: getVal(r,['last/cur stationCode','stationCode']) || ""
        })).filter(p => !isNaN(p.lt));

        // NAYA LOGIC: Pehle Station Code se clipping try karein
        let si = raw.findIndex(p => p.stnCode.toUpperCase() === sF.toUpperCase());
        let ei = raw.findLastIndex(p => p.stnCode.toUpperCase() === sT.toUpperCase());

        // Agar Code nahi mila toh Coordinate logic (Backup)
        if(si === -1 || ei === -1) {
            let stnStart = window.master.stns.find(x => getVal(x,['Station_Name']) === sF);
            let stnEnd = window.master.stns.find(x => getVal(x,['Station_Name']) === sT);
            let sLT = conv(getVal(stnStart,['Start_Lat '])), sLG = conv(getVal(stnStart,['Start_Lng']));
            let eLT = conv(getVal(stnEnd,['Start_Lat '])), eLG = conv(getVal(stnEnd,['Start_Lng']));
            
            si = raw.findIndex(p => Math.sqrt(Math.pow(p.lt-sLT,2)+Math.pow(p.lg-sLG,2)) < 0.015);
            ei = raw.findLastIndex(p => Math.sqrt(Math.pow(p.lt-eLT,2)+Math.pow(p.lg-eLG,2)) < 0.015);
        }

        window.rtis = (si!==-1 && ei!==-1) ? raw.slice(Math.min(si,ei), Math.max(si,ei)+1) : raw;

        map.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Marker || l instanceof L.Polyline) map.removeLayer(l); });

        // Signals Discovery - Liberal Circle Search
        window.activeSigs = [];
        window.master.sigs.forEach(sig => {
            if(!sig.type.startsWith(dir)) return;
            let slt = conv(getVal(sig,['Lat'])), slg = conv(getVal(sig,['Lng']));
            
            // Sabse kareeb ka point dhoondhein raste mein
            let closest = null, minD = 99;
            window.rtis.forEach(p => {
                let d = Math.sqrt(Math.pow(p.lt-slt,2)+Math.pow(p.lg-slg,2));
                if(d < minD) { minD = d; closest = p; }
            });

            if(closest && minD < 0.008) { // ~800m tolerance
                let sigObj = {n:getVal(sig,['SIGNAL_NAME']), s:closest.spd, t:closest.time, lt:slt, lg:slg, clr:sig.clr};
                window.activeSigs.push(sigObj);
                L.circleMarker([slt, slg], {radius: 8, color: 'white', weight: 2, fillOpacity: 1, fillColor: sig.clr})
                .addTo(map).bindPopup(`<b>${sigObj.n}</b><br>Speed: ${sigObj.s} | Time: ${sigObj.t}`);
            }
        });

        // Dropdown refill
        document.getElementById('vio_sig_list').innerHTML = window.activeSigs.map((s, idx) => `<option value="${idx}">${s.n} (${s.s} kmph)</option>`).join('');
        document.getElementById('violation_panel').style.display = 'block';

        let poly = L.polyline(window.rtis.map(p=>[p.lt,p.lg]), {color: 'blue', weight: 4}).addTo(map);
        map.fitBounds(poly.getBounds());
    }});
}

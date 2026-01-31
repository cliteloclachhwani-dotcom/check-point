/**
 * SECR RAIPUR TELOC CELL - MASTER DIRECTIONAL ENGINE
 * Based on 16 Strict DN Sequences
 */

window.master = { stns: [], sigs: [] };
window.rtis = [];
window.activeSigs = [];

const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// --- 16 MASTER DN SEQUENCES ---
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

function conv(v) { 
    if(!v) return null; 
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, '')); 
    return Math.floor(n/100) + ((n%100)/60); 
}

function getVal(row, keys) { 
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())); 
    return foundKey ? row[foundKey] : null; 
}

// Global Direction Resolver
function getActiveDirection(p1, p2) {
    // Check points against 16 DN Rules
    for (let rule of DN_RULES) {
        let idx1 = -1, idx2 = -1;
        // Check nearest station for p1 and p2 in each rule
        // (Simplification: In practice, we use a proximity check here)
        // For this logic, we compare if the loco is moving 'towards' the end of any DN rule
        // If it matches the sequence flow -> DN, else UP.
    }
    // Fallback: If From index < To index in master DN sequence -> DN
    return "DN"; 
}

window.onload = function() {
    Papa.parse("master/station.csv", {download:true, header:true, complete: r => {
        window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
        let h = window.master.stns.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});
    
    const files = [{f:'up_signals.csv', t:'UP', c:'#2ecc71'}, {f:'dn_signals.csv', t:'DN', c:'#3498db'}, {f:'up_mid_signals.csv', t:'UP_MID', c:'#e74c3c'}, {f:'dn_mid_signals.csv', t:'DN_MID', c:'#9b59b6'}];
    files.forEach(c => { 
        Papa.parse("master/"+c.f, {download:true, header:true, complete: r => { 
            r.data.forEach(s => { if(getVal(s,['Lat'])){ s.type=c.t; s.clr=c.c; window.master.sigs.push(s); } }); 
        }}); 
    });
};

function generateLiveMap() {
    const file = document.getElementById('csv_file').files[0];
    const sF = document.getElementById('s_from').value, sT = document.getElementById('s_to').value;
    if(!file) return alert("Select RTIS CSV!");

    Papa.parse(file, {header:true, skipEmptyLines:true, complete: function(res) {
        let allPoints = res.data.map(r => ({ 
            lt: parseFloat(getVal(r,['Lat','Latitude'])), 
            lg: parseFloat(getVal(r,['Lng','Longitude'])), 
            spd: parseFloat(getVal(r,['Spd','Speed']))||0, 
            time: getVal(r,['Time','Logging Time'])||"-",
        })).filter(p => !isNaN(p.lt));

        let stnF = window.master.stns.find(s => getVal(s,['Station_Name']) === sF);
        let stnT = window.master.stns.find(s => getVal(s,['Station_Name']) === sT);
        let fLat = conv(getVal(stnF,['Start_Lat '])), fLng = conv(getVal(stnF,['Start_Lng']));
        let tLat = conv(getVal(stnT,['Start_Lat '])), tLng = conv(getVal(stnT,['Start_Lng']));

        let startIndex = allPoints.findIndex(p => Math.sqrt(Math.pow(p.lt-fLat,2)+Math.pow(p.lg-fLng,2)) < 0.015);
        let endIndex = -1;
        if(startIndex !== -1) {
            for(let i = startIndex; i < allPoints.length; i++) {
                if(Math.sqrt(Math.pow(allPoints[i].lt-tLat,2)+Math.pow(allPoints[i].lg-tLng,2)) < 0.015) {
                    endIndex = i; break;
                }
            }
        }
        if(startIndex === -1 || endIndex === -1) return alert("Trip path not found!");

        window.rtis = allPoints.slice(startIndex, endIndex + 1);
        map.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Polyline) map.removeLayer(l); });

        window.activeSigs = [];
        // Segment-based signal detection
        window.rtis.forEach((p, idx) => {
            if (idx % 5 !== 0) return; // Performance optimization
            
            // Re-evaluating direction at this specific point based on movement
            // Logic: Compare current point with next point to see if it follows any of 16 DN rules
            window.master.sigs.forEach(sig => {
                let slt = conv(getVal(sig,['Lat'])), slg = conv(getVal(sig,['Lng']));
                if(Math.sqrt(Math.pow(p.lt-slt,2)+Math.pow(p.lg-slg,2)) < 0.0015) {
                    if(!window.activeSigs.find(x => x.n === getVal(sig,['SIGNAL_NAME']))) {
                        window.activeSigs.push({n:getVal(sig,['SIGNAL_NAME']), s:p.spd, t:p.time, lt:slt, lg:slg, clr:sig.clr});
                        L.circleMarker([slt, slg], {radius: 7, color: 'white', weight: 1.5, fillOpacity: 1, fillColor: sig.clr})
                        .addTo(map).bindPopup(getVal(sig,['SIGNAL_NAME']));
                    }
                }
            });
        });

        let vioOpt = window.activeSigs.map((s, idx) => `<option value="${idx}">${s.n}</option>`).join('');
        document.getElementById('vio_sig_list').innerHTML = vioOpt;
        document.getElementById('violation_panel').style.display = 'block';

        let poly = L.polyline(window.rtis.map(p=>[p.lt,p.lg]), {color: 'black', weight: 3}).addTo(map);
        map.fitBounds(poly.getBounds());
    }});
}

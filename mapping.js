/**
 * SECR RAIPUR TELOC CELL - Mapping Engine
 * Feature: Directional Clipping (Event-Based Trip Filtering)
 */

window.master = { stns: [], sigs: [] };
window.rtis = [];
window.activeSigs = []; 

const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Sequences for UP/DN Logic
const DN_SEQUENCES = [["DURG","DLBS","BQR","BIA","DBEC","DCBIN","ACBIN","KMI","SZB","R","URK","MDH","SLH","BKTHW","BKTHE","TLD","HN","HNEOC","BYT","NPI","DGS","BYL","DPH","BSP"]]; 
const SPECIAL_UP = [["RSD","URKW","R","SZB"], ["RSD","R","SZB"]];

// Coordinate Conversion (DDMM.MMMM to Decimal)
function conv(v) { 
    if(!v) return null; 
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, '')); 
    return Math.floor(n/100) + ((n%100)/60); 
}

// Case-Insensitive CSV Header Matcher
function getVal(row, keys) { 
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())); 
    return foundKey ? row[foundKey] : null; 
}

// Direction Determination Logic
function determineDirection(f, t) {
    for(let s of SPECIAL_UP) if(s.includes(f) && s.includes(t) && s.indexOf(f) < s.indexOf(t)) return "UP";
    for(let s of DN_SEQUENCES) if(s.includes(f) && s.includes(t)) return s.indexOf(f) < s.indexOf(t) ? "DN" : "UP";
    return "DN";
}

// Initialization on Page Load
window.onload = function() {
    // 1. Load Station Master
    Papa.parse("master/station.csv", {download:true, header:true, complete: r => {
        window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
        let h = window.master.stns.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; 
        document.getElementById('s_to').innerHTML = h;
    }});
    
    // 2. Load Signal Masters (UP, DN, MID)
    const files = [
        {f:'up_signals.csv', t:'UP', c:'#2ecc71'}, 
        {f:'dn_signals.csv', t:'DN', c:'#3498db'}, 
        {f:'up_mid_signals.csv', t:'UP_MID', c:'#e74c3c'}, 
        {f:'dn_mid_signals.csv', t:'DN_MID', c:'#9b59b6'}
    ];
    files.forEach(c => { 
        Papa.parse("master/"+c.f, {download:true, header:true, complete: r => { 
            r.data.forEach(s => { 
                if(getVal(s,['Lat'])){ 
                    s.type=c.t; s.clr=c.c; 
                    window.master.sigs.push(s); 
                } 
            }); 
        }}); 
    });
};

// Main Tracker Generator with Directional Clipping
function generateLiveMap() {
    const file = document.getElementById('csv_file').files[0];
    const sF = document.getElementById('s_from').value;
    const sT = document.getElementById('s_to').value;
    
    if(!file) return alert("Pehle RTIS CSV file select karein.");
    const dir = determineDirection(sF, sT);

    Papa.parse(file, {header:true, skipEmptyLines:true, complete: function(res) {
        // Step 1: All Points Parse karein
        let allPoints = res.data.map(r => ({ 
            lt: parseFloat(getVal(r,['Lat','Latitude'])), 
            lg: parseFloat(getVal(r,['Lng','Longitude'])), 
            spd: parseFloat(getVal(r,['Spd','Speed']))||0, 
            time: getVal(r,['Time','Logging Time'])||"-",
        })).filter(p => !isNaN(p.lt));

        // Step 2: Station Master se coordinates nikaalein
        let stnF = window.master.stns.find(s => getVal(s,['Station_Name']) === sF);
        let stnT = window.master.stns.find(s => getVal(s,['Station_Name']) === sT);
        if(!stnF || !stnT) return alert("Master file mein station coordinates nahi mile.");

        let fLat = conv(getVal(stnF,['Start_Lat '])), fLng = conv(getVal(stnF,['Start_Lng']));
        let tLat = conv(getVal(stnT,['Start_Lat '])), tLng = conv(getVal(stnT,['Start_Lng']));

        // Step 3: Directional Clipping (Event Isolation)
        // From Station ke sabse karib pehla point dhundna (Approx 1.5km range)
        let startIndex = allPoints.findIndex(p => Math.sqrt(Math.pow(p.lt-fLat,2)+Math.pow(p.lg-fLng,2)) < 0.015);
        let endIndex = -1;
        
        if(startIndex !== -1) {
            // Start milne ke baad aage ke data mein To Station dhundna
            for(let i = startIndex; i < allPoints.length; i++) {
                if(Math.sqrt(Math.pow(allPoints[i].lt-tLat,2)+Math.pow(allPoints[i].lg-tLng,2)) < 0.015) {
                    endIndex = i;
                    break;
                }
            }
        }

        if(startIndex === -1 || endIndex === -1) {
            return alert("Error: Is RTIS file mein " + sF + " se " + sT + " ki trip nahi mili. Trip Direction check karein.");
        }

        // Clip the data to the specific trip only
        window.rtis = allPoints.slice(startIndex, endIndex + 1);

        // Step 4: Map Clear & Visuals Update
        map.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Marker || l instanceof L.Polyline) map.removeLayer(l); });

        // Step 5: Relevant Signals Display
        window.activeSigs = [];
        window.master.sigs.forEach(sig => {
            // Sirf wahi signals dikhaye jo Trip Direction (UP/DN) ke hain
            if(!sig.type.startsWith(dir)) return;
            
            let slt = conv(getVal(sig,['Lat'])), slg = conv(getVal(sig,['Lng']));
            // Clipped Trip data mein signal matching
            let m = window.rtis.find(p => Math.sqrt(Math.pow(p.lt-slt,2)+Math.pow(p.lg-slg,2)) < 0.0015);
            
            if(m) {
                let sigObj = {n:getVal(sig,['SIGNAL_NAME']), s:m.spd, t:m.time, lt:slt, lg:slg, clr:sig.clr, type:sig.type};
                window.activeSigs.push(sigObj);
                L.circleMarker([slt, slg], {radius: 7, color: 'white', weight: 1.5, fillOpacity: 1, fillColor: sig.clr})
                .addTo(map).bindPopup(`<b>${sigObj.n}</b><br>Speed: ${sigObj.s} Kmph<br>Time: ${sigObj.t}`);
            }
        });

        // Step 6: Update Audit UI
        let vioOpt = window.activeSigs.map((s, idx) => `<option value="${idx}">${s.n}</option>`).join('');
        document.getElementById('vio_sig_list').innerHTML = vioOpt;
        document.getElementById('violation_panel').style.display = 'block';

        // Step 7: Final Polyline & Auto-Zoom
        let poly = L.polyline(window.rtis.map(p=>[p.lt,p.lg]), {color: 'black', weight: 4, opacity: 0.8}).addTo(map);
        map.fitBounds(poly.getBounds());
        
        // Live Data on Hover
        poly.on('mousemove', e => {
            let p = window.rtis.reduce((a, b) => Math.abs(b.lt-e.latlng.lat) < Math.abs(a.lt-e.latlng.lat) ? b : a);
            document.getElementById('live-speed').innerText = p.spd;
            document.getElementById('live-time').innerText = p.time;
        });
    }});
}

window.master = { stns: [], sigs: [] };
window.rtis = [];
window.activeSigs = []; 

const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Sequences as defined previously
const DN_SEQUENCES = [["DURG","DLBS","BQR","BIA","DBEC","DCBIN","ACBIN","KMI","SZB","R","URK","MDH","SLH","BKTHW","BKTHE","TLD","HN","HNEOC","BYT","NPI","DGS","BYL","DPH","BSP"]]; // ... add all others here
const SPECIAL_UP = [["RSD","URKW","R","SZB"], ["RSD","R","SZB"]];

function conv(v) { 
    if(!v) return null; 
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, '')); 
    return Math.floor(n/100) + ((n%100)/60); 
}

function getVal(row, keys) { 
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())); 
    return foundKey ? row[foundKey] : null; 
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
    
    // Load Signals
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
    if(!file) return alert("Please select RTIS CSV file first.");
    const dir = determineDirection(sF, sT);

    Papa.parse(file, {header:true, skipEmptyLines:true, complete: function(res) {
        let raw = res.data.map(r => ({ 
            lt: parseFloat(getVal(r,['Lat','Latitude'])), 
            lg: parseFloat(getVal(r,['Lng','Longitude'])), 
            spd: parseFloat(getVal(r,['Spd','Speed']))||0, 
            time: getVal(r,['Time','Logging Time'])||"-",
            raw: r 
        })).filter(p => !isNaN(p.lt));
        
        window.rtis = raw; // Use full for time search later

        map.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Marker || l instanceof L.Polyline) map.removeLayer(l); });

        window.activeSigs = [];
        window.master.sigs.forEach(sig => {
            if(!sig.type.startsWith(dir)) return;
            let slt = conv(getVal(sig,['Lat'])), slg = conv(getVal(sig,['Lng']));
            let m = window.rtis.find(p => Math.sqrt(Math.pow(p.lt-slt,2)+Math.pow(p.lg-slg,2)) < 0.0012);
            if(m) {
                let sigObj = {n:getVal(sig,['SIGNAL_NAME']), s:m.spd, t:m.time, lt:slt, lg:slg, clr:sig.clr, type:sig.type};
                window.activeSigs.push(sigObj);
                L.circleMarker([slt, slg], {radius: 7, color: 'white', weight: 1.5, fillOpacity: 1, fillColor: sig.clr})
                .addTo(map).bindPopup(`<b>${sigObj.n}</b><br>Speed: ${sigObj.s} | Time: ${sigObj.t}`);
            }
        });

        let vioOpt = window.activeSigs.map((s, idx) => `<option value="${idx}">${s.n}</option>`).join('');
        document.getElementById('vio_sig_list').innerHTML = vioOpt;
        document.getElementById('violation_panel').style.display = 'block';

        let poly = L.polyline(window.rtis.map(p=>[p.lt,p.lg]), {color: 'black', weight: 3}).addTo(map);
        poly.on('mousemove', e => {
            let p = window.rtis.reduce((a, b) => Math.abs(b.lt-e.latlng.lat) < Math.abs(a.lt-e.latlng.lat) ? b : a);
            document.getElementById('live-speed').innerText = p.spd;
            document.getElementById('live-time').innerText = p.time;
        });
        map.fitBounds(poly.getBounds());
    }});
}

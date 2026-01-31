window.master = { stns: [], sigs: [] }; window.rtis = []; window.activeSigs = [];
const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 16 DN Rules (Hamesha Enable)
const DN_RULES = [
    ["DURG","DLBS","BQR","BIA","DBEC","DCBIN","ACBIN","KMI","SZB","R","URK","MDH","SLH","BKTHW","BKTHE","TLD","HN","HNEOC","BYT","NPI","DGS","BYL","DPH","BSP"],
    ["TLD MGMT SDG","TLD","HN"], ["HN","HNEOC","HN SM4","HN UCLH SDG","HN MGCH SDG"], ["BYT","NPI","NPI NVCN SDG","NPI PCPN SDG"], ["HNEOC","BYT","BYT MRLB SDG"], ["SLH","BKTHW","BKTH MBMB SDG","BKTH CCS SDG"], ["URK","URKE","MDH","MDH MSMM SDG"], ["BMY MNBK SDG","BMY P CABIN","DBEC","BMY DNTH YD","DCBIN","ACBIN"], ["BMY FMYD","BMY CLYD","BMY CEYD","BMY P CABIN","DBEC","BMY DNTH YD","DCBIN","ACBIN"], ["BIA JCWS","BIA JBH","BIA","BLEY EX YARD","DBEC","BMY DNTH YD"], ["AAGH","KETI","BPTP","GUDM","DRZ","KYS","BXA","LBO","GDZ","RSA","MXA","ORE YARD"], ["DURG","DLBS","MXA","BMY CLYD","BMY CEYD","BMY FMYD"], ["DRZ RSDG SDG","DRZ KSDG SDG","DRZ"], ["SZB","R","RVH","RSD"], ["RSD","URKE","MDH"], ["TIG","RNBT","MRBL","KBJ","TRKR","HSK","LKNA","NPD","KRAR","KMK","BGBR","BMKJ","ARN","MSMD","BLSN","ANMD","LAE","NRMH","MNDH","RVH","R","RSD"]
];

function getVal(row, keys) { 
    let f = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())); 
    return f ? row[f] : null; 
}

window.onload = function() {
    Papa.parse("master/station.csv", {download:true, header:true, complete: r => {
        window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
        let h = window.master.stns.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});
    [{f:'up_signals.csv', t:'UP'}, {f:'dn_signals.csv', t:'DN'}].forEach(conf => {
        Papa.parse("master/"+conf.f, {download:true, header:true, complete: r => { 
            r.data.forEach(s => { if(getVal(s,['Lat'])){ s.type=conf.t; window.master.sigs.push(s); } }); 
        }});
    });
};

function generateLiveMap() {
    const file = document.getElementById('csv_file').files[0];
    const sF = document.getElementById('s_from').value;
    const sT = document.getElementById('s_to').value;
    if(!file) return alert("Select CSV!");

    let dir = "UP"; 
    for(let r of DN_RULES) {
        let iF = r.indexOf(sF), iT = r.indexOf(sT);
        if(iF !== -1 && iT !== -1 && iF < iT) { dir = "DN"; break; }
    }

    Papa.parse(file, {header:true, skipEmptyLines:true, complete: function(res) {
        let fullData = res.data.map(r => ({
            lt: parseFloat(getVal(r,['Latitude'])), 
            lg: parseFloat(getVal(r,['Longitude'])), 
            spd: parseFloat(getVal(r,['Speed']))||0, 
            time: getVal(r,['Logging Time'])
        })).filter(p => !isNaN(p.lt));

        let stnF = window.master.stns.find(s => getVal(s,['Station_Name']) === sF);
        let stnT = window.master.stns.find(s => getVal(s,['Station_Name']) === sT);
        let ltF = parseFloat(getVal(stnF,['Lat'])), lgF = parseFloat(getVal(stnF,['Lng']));
        let ltT = parseFloat(getVal(stnT,['Lat'])), lgT = parseFloat(getVal(stnT,['Lng']));

        let startIdx = -1, endIdx = -1;
        let dF_min = 0.02, dT_min = 0.02; // ~2km tolerance

        fullData.forEach((p, i) => {
            let dF = Math.sqrt(Math.pow(p.lt - ltF, 2) + Math.pow(p.lg - lgF, 2));
            let dT = Math.sqrt(Math.pow(p.lt - ltT, 2) + Math.pow(p.lg - lgT, 2));
            if(dF < dF_min) { dF_min = dF; startIdx = i; }
            if(dT < dT_min) { dT_min = dT; endIdx = i; }
        });

        if(startIdx !== -1 && endIdx !== -1) {
            let s = Math.min(startIdx, endIdx);
            let e = Math.max(startIdx, endIdx);
            window.rtis = fullData.slice(s, e + 1);
        } else {
            alert("Stations not found in RTIS logs. Using full track.");
            window.rtis = fullData;
        }

        map.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Polyline) map.removeLayer(l); });
        window.activeSigs = [];
        
        let pathCoords = window.rtis.map(p=>[p.lt,p.lg]);
        let poly = L.polyline(pathCoords, {color:'blue', weight:5}).addTo(map);
        map.fitBounds(poly.getBounds());

        window.master.sigs.forEach(sig => {
            if(sig.type !== dir) return; 
            let slt = parseFloat(getVal(sig,['Lat'])), slg = parseFloat(getVal(sig,['Lng']));
            let near = window.rtis.find(p => Math.abs(p.lt - slt) < 0.003 && Math.abs(p.lg - slg) < 0.003);
            if(near) {
                window.activeSigs.push({n:getVal(sig,['SIGNAL_NAME']), s:near.spd, t:near.time, lt:slt, lg:slg});
                L.circleMarker([slt, slg], {radius: 6, color: (dir==='UP'?'#2ecc71':'#3498db'), fillOpacity: 1}).addTo(map);
            }
        });

        document.getElementById('vio_sig_list').innerHTML = window.activeSigs.map((s,i)=>`<option value="${i}">${s.n}</option>`).join('');
        document.getElementById('violation_panel').style.display='block';
    }});
}

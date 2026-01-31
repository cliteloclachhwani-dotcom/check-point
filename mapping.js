window.master = { stns: [], sigs: [] };
window.rtis = [];
window.activeSigs = [];

/* ================= MAP INIT ================= */
const map = L.map('map').setView([21.15, 79.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

/* ================= HELPERS ================= */
function conv(v) {
    if (!v) return null;
    let s = v.toString().trim();
    let n = parseFloat(s.replace(/[^0-9.]/g, ''));
    if (s.includes('.') && s.split('.')[0].length <= 2) return n;
    return Math.floor(n / 100) + ((n % 100) / 60);
}

function getVal(row, keys) {
    let f = Object.keys(row).find(k =>
        keys.some(key => k.trim().toLowerCase() === key.toLowerCase().trim())
    );
    return f ? row[f] : null;
}

function nearestIndex(arr, lt, lg) {
    let min = Infinity, idx = -1;
    arr.forEach((p, i) => {
        let d = Math.hypot(p.lt - lt, p.lg - lg);
        if (d < min) { min = d; idx = i; }
    });
    return idx;
}

/* ================= LOAD MASTER ================= */
window.onload = function () {

    // Stations
    Papa.parse("master/station.csv", {
        download: true,
        header: true,
        complete: r => {
            window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
            let opts = window.master.stns
                .map(s => {
                    let n = getVal(s, ['Station_Name']);
                    return `<option value="${n}">${n}</option>`;
                })
                .sort()
                .join('');
            document.getElementById('s_from').innerHTML = opts;
            document.getElementById('s_to').innerHTML = opts;
        }
    });

    // Signals
    [{ f: 'up_signals.csv', t: 'UP' }, { f: 'dn_signals.csv', t: 'DN' }]
        .forEach(conf => {
            Papa.parse("master/" + conf.f, {
                download: true,
                header: true,
                complete: r => {
                    r.data.forEach(s => {
                        if (getVal(s, ['Lat'])) {
                            s.type = conf.t;
                            window.master.sigs.push(s);
                        }
                    });
                }
            });
        });
};

/* ================= MAIN MAP LOGIC ================= */
function generateLiveMap() {

    const file = document.getElementById('csv_file').files[0];
    const sF = document.getElementById('s_from').value;
    const sT = document.getElementById('s_to').value;

    if (!file) return alert("Select CSV!");

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (res) {

            /* ---- RTIS CLEAN DATA ---- */
            let fullData = res.data.map(r => ({
                lt: parseFloat(getVal(r, ['Lat', 'Latitude'])),
                lg: parseFloat(getVal(r, ['Lng', 'Longitude'])),
                spd: parseFloat(getVal(r, ['Spd', 'Speed'])) || 0,
                time: getVal(r, ['Time', 'Logging Time'])
            })).filter(p => !isNaN(p.lt) && p.lt !== 0 && p.time);

            if (fullData.length === 0)
                return alert("No valid RTIS data!");

            // Sort by time (VERY IMPORTANT)
            fullData.sort((a, b) => a.time.localeCompare(b.time));

            /* ---- FROM / TO STATIONS ---- */
            let stnF = window.master.stns.find(s => getVal(s, ['Station_Name']) === sF);
            let stnT = window.master.stns.find(s => getVal(s, ['Station_Name']) === sT);

            if (!stnF || !stnT)
                return alert("Invalid FROM / TO station!");

            let ltF = conv(getVal(stnF, ['Lat']));
            let lgF = conv(getVal(stnF, ['Lng']));
            let ltT = conv(getVal(stnT, ['Lat']));
            let lgT = conv(getVal(stnT, ['Lng']));

            /* ---- REAL FROM–TO SLICE ---- */
            let iFrom = nearestIndex(fullData, ltF, lgF);
            let iTo = nearestIndex(fullData, ltT, lgT);

            if (iFrom === -1 || iTo === -1)
                return alert("RTIS data not found near selected stations!");

            if (iFrom > iTo) [iFrom, iTo] = [iTo, iFrom];

            window.rtis = fullData.slice(iFrom, iTo + 1);

            if (window.rtis.length === 0)
                return alert("No RTIS data between selected stations!");

            /* ---- CLEAR MAP ---- */
            map.eachLayer(l => {
                if (l instanceof L.CircleMarker || l instanceof L.Polyline)
                    map.removeLayer(l);
            });

            window.activeSigs = [];

            /* ---- DRAW PATH ---- */
            let pathCoords = window.rtis.map(p => [p.lt, p.lg]);
            let poly = L.polyline(pathCoords, { color: 'blue', weight: 5 }).addTo(map);
            map.fitBounds(poly.getBounds());

            /* ---- FILTER SIGNALS ON THIS PATH ---- */
            window.master.sigs.forEach(sig => {
                let slt = conv(getVal(sig, ['Lat']));
                let slg = conv(getVal(sig, ['Lng']));

                let near = window.rtis.find(p =>
                    Math.hypot(p.lt - slt, p.lg - slg) < 0.0008
                );

                if (near) {
                    window.activeSigs.push({
                        n: getVal(sig, ['SIGNAL_NAME']),
                        s: near.spd,
                        t: near.time,
                        lt: slt,
                        lg: slg
                    });

                    L.circleMarker([slt, slg], {
                        radius: 6,
                        color: 'red',
                        fillOpacity: 1
                    }).addTo(map);
                }
            });

            /* ---- UPDATE VIOLATION PANEL ---- */
            document.getElementById('vio_sig_list').innerHTML =
                window.activeSigs
                    .map((s, i) => `<option value="${i}">${s.n}</option>`)
                    .join('');

            document.getElementById('violation_panel').style.display = 'block';
        }
    });
}

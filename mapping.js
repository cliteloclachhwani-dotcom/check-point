window.master = { stns: [], sigs: [] };
window.rtis = [];
window.activeSigs = [];

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

    Papa.parse("master/station.csv", {
        download: true,
        header: true,
        complete: r => {
            window.master.stns = r.data.filter(s => getVal(s, ['Station_Name']));
            let h = window.master.stns
                .map(s => {
                    let n = getVal(s, ['Station_Name']);
                    return `<option value="${n}">${n}</option>`;
                })
                .sort()
                .join('');
            document.getElementById('s_from').innerHTML = h;
            document.getElementById('s_to').innerHTML = h;
        }
    });

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

/* ================= MAIN ================= */
function generateLiveMap() {

    const file = document.getElementById('csv_file').files[0];
    const sF = document.getElementById('s_from').value;
    const sT = document.getElementById('s_to').value;

    if (!file) return alert("Select CSV!");

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (res) {

            // ✅ SAME RTIS READING AS ORIGINAL
            let fullData = res.data.map(r => ({
                lt: parseFloat(getVal(r, ['Lat', 'Latitude'])),
                lg: parseFloat(getVal(r, ['Lng', 'Longitude'])),
                spd: parseFloat(getVal(r, ['Spd', 'Speed'])) || 0,
                time: getVal(r, ['Time', 'Logging Time'])
            })).filter(p => !isNaN(p.lt) && p.lt !== 0);

            if (fullData.length === 0)
                return alert("No RTIS data!");

            let stnF = window.master.stns.find(s => getVal(s, ['Station_Name']) === sF);
            let stnT = window.master.stns.find(s => getVal(s, ['Station_Name']) === sT);

            if (!stnF || !stnT)
                return alert("Invalid FROM / TO!");

            let ltF = conv(getVal(stnF, ['Lat']));
            let lgF = conv(getVal(stnF, ['Lng']));
            let ltT = conv(getVal(stnT, ['Lat']));
            let lgT = conv(getVal(stnT, ['Lng']));

            let iFrom = nearestIndex(fullData, ltF, lgF);
            let iTo = nearestIndex(fullData, ltT, lgT);

            if (iFrom > iTo) [iFrom, iTo] = [iTo, iFrom];

            window.rtis = fullData.slice(iFrom, iTo + 1);

            map.eachLayer(l => {
                if (l instanceof L.CircleMarker || l instanceof L.Polyline)
                    map.removeLayer(l);
            });

            window.activeSigs = [];

            let path = L.polyline(
                window.rtis.map(p => [p.lt, p.lg]),
                { color: 'blue', weight: 5 }
            ).addTo(map);

            map.fitBounds(path.getBounds());

            window.master.sigs.forEach(sig => {
                let slt = conv(getVal(sig, ['Lat']));
                let slg = conv(getVal(sig, ['Lng']));

                let near = window.rtis.find(p =>
                    Math.hypot(p.lt - slt, p.lg - slg) < 0.001
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

            document.getElementById('vio_sig_list').innerHTML =
                window.activeSigs.map((s, i) =>
                    `<option value="${i}">${s.n}</option>`
                ).join('');

            document.getElementById('violation_panel').style.display = 'block';
        }
    });
}

/**
 * APP.JS - Mesin Penerjemah & Transformasi Morfologi Bahasa Indonesia - Basa Jawa
 */

let kamusData = [];

// Memuat data kamuskramamet.json saat aplikasi pertama kali dimuat
document.addEventListener("DOMContentLoaded", () => {
    fetch("kamuskramamet.json")
        .then(response => {
            if (!response.ok) {
                throw new Error("Gagal memuat kamuskramamet.json");
            }
            return response.json();
        })
        .then(data => {
            kamusData = data;
            console.log("Kamus berhasil dimuat:", kamusData.length, "entri.");
        })
        .catch(err => {
            console.error("Error loading JSON dictionary:", err);
        });

    const inputArea = document.getElementById("inputIndonesia");
    if (inputArea) {
        inputArea.addEventListener("input", debounce(prosesTerjemahan, 400));
    }
});

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Alur Utama Penerjemahan
 */
function prosesTerjemahan() {
    const inputTeks = document.getElementById("inputIndonesia").value.trim();
    if (!inputTeks) {
        resetOutput();
        return;
    }

    // Ambil opsi manual dari UI jika pengguna memilih imbuhan secara terpisah
    const awalanUi = document.getElementById("selAwalan").value;
    const akhiranUi = document.getElementById("selAkhiran").value;

    const kataList = inputTeks.toLowerCase().split(/\s+/);

    let hasilNgoko = [];
    let hasilNgokoAlus = [];
    let hasilKrama = [];
    let hasilKramaInggil = [];
    let hasilBagongan = [];

    kataList.forEach(kata => {
        // 1. Urai Morfologi Bahasa Indonesia (Awalan + Kata Dasar + Akhiran)
        let analisisId = uraiMorfologiIndonesia(kata);

        // Gabungkan deteksi otomatis dari teks input dengan preferensi manual dari UI (jika ada)
        let awalanFinal = awalanUi || analisisId.awalan;
        let akhiranFinal = akhiranUi || analisisId.akhiran;

        let entry = analisisId.entry;

        // Ambil kata dasar terjemahan untuk masing-masing tingkatan
        let stemNgoko = entry ? entry.ngoko : analisisId.kataDasar;
        let stemNgokoAlus = entry ? entry.ngoko_alus : analisisId.kataDasar;
        let stemKrama = entry ? entry.krama : analisisId.kataDasar;
        let stemKramaInggil = entry ? entry.krama_inggil : analisisId.kataDasar;
        let stemBagongan = entry ? (entry.bagongan || entry.krama) : analisisId.kataDasar;

        // 2. Bentuk Morfologi Bahasa Jawa melalui Mesin Sriwedari
        hasilNgoko.push(terapkanMorfologi(stemNgoko, "ngoko", awalanFinal, akhiranFinal));
        hasilNgokoAlus.push(terapkanMorfologi(stemNgokoAlus, "ngoko_alus", awalanFinal, akhiranFinal));
        hasilKrama.push(terapkanMorfologi(stemKrama, "krama", awalanFinal, akhiranFinal));
        hasilKramaInggil.push(terapkanMorfologi(stemKramaInggil, "krama_inggil", awalanFinal, akhiranFinal));
        hasilBagongan.push(terapkanMorfologi(stemBagongan, "bagongan", awalanFinal, akhiranFinal));
    });

    let teksNgoko = hasilNgoko.join(" ");
    let teksNgokoAlus = hasilNgokoAlus.join(" ");
    let teksKrama = hasilKrama.join(" ");
    let teksKramaInggil = hasilKramaInggil.join(" ");
    let teksBagongan = hasilBagongan.join(" ");

    tampilkanHasil("outNgokoLatin", "outNgokoJawa", teksNgoko);
    tampilkanHasil("outNgokoAlusLatin", "outNgokoAlusJawa", teksNgokoAlus);
    tampilkanHasil("outKramaLatin", "outKramaJawa", teksKrama);
    tampilkanHasil("outKramaInggilLatin", "outKramaInggilJawa", teksKramaInggil);
    tampilkanHasil("outBagonganLatin", "outBagonganJawa", teksBagongan);
}

/**
 * 1. LOGIKA PENGURAIAN MORFOLOGI BAHASA INDONESIA
 * Memecah input kata menjadi Awalan, Kata Dasar (Luluh/Tidak Luluh), dan Akhiran.
 */
function uraiMorfologiIndonesia(kata) {
    let clean = kata.toLowerCase().replace(/[^a-z\-]/g, "");
    let awalan = "";
    let akhiran = "";
    let stem = clean;

    // A. Cek Entri Langsung di Kamus
    let directEntry = cariKamus(clean);
    if (directEntry) {
        return { kataDasar: clean, awalan: "", akhiran: "", entry: directEntry };
    }

    // B. Deteksi Akhiran Bahasa Indonesia (-kan, -i, -nya)
    if (stem.endsWith("nya") && stem.length > 4) {
        akhiran = "pemilikan";
        stem = stem.slice(0, -3);
    } else if (stem.endsWith("kan") && stem.length > 4) {
        akhiran = "kausatif";
        stem = stem.slice(0, -3);
    } else if (stem.endsWith("i") && stem.length > 3) {
        let tempStem = stem.slice(0, -1);
        if (cariKataDasarIndonesia(tempStem) || stem.startsWith("me") || stem.startsWith("di")) {
            akhiran = "lokatif";
            stem = tempStem;
        }
    }

    // C. Deteksi Awalan Pasif Bahasa Indonesia: di-
    if (stem.startsWith("di") && stem.length > 3) {
        awalan = "pasif";
        stem = stem.slice(2);
    }
    // D. Deteksi Awalan Aktif Bahasa Indonesia: me-, mem-, men-, meng-, meny-
    else if (stem.startsWith("me")) {
        awalan = "N"; // Awalan aktif / Nasalisasi Anuswara

        if (stem.startsWith("mem")) {
            let rest = stem.slice(3);
            // Luluh p- (misal: memotong -> potong, memilih -> pilih)
            if (cariKataDasarIndonesia("p" + rest)) stem = "p" + rest;
            // Tidak luluh b, f, v (misal: membuat -> buat, membawa -> bawa)
            else if (cariKataDasarIndonesia(rest)) stem = rest;
            else stem = "p" + rest;
        } else if (stem.startsWith("men")) {
            let rest = stem.slice(3);
            // Luluh t- (misal: menulis -> tulis)
            if (cariKataDasarIndonesia("t" + rest)) stem = "t" + rest;
            // Tidak luluh d, j, c, z (misal: mendengar -> dengar, mencari -> cari)
            else if (cariKataDasarIndonesia(rest)) stem = rest;
            else stem = "t" + rest;
        } else if (stem.startsWith("meny")) {
            let rest = stem.slice(4);
            // Luluh s- (misal: menyapu -> sapu, menyiram -> siram)
            stem = "s" + rest;
        } else if (stem.startsWith("meng")) {
            let rest = stem.slice(4);
            // Luluh k- (misal: mengirim -> kirim)
            if (cariKataDasarIndonesia("k" + rest)) stem = "k" + rest;
            // Awalan Vokal atau g, h (misal: mengambil -> ambil, menggoreng -> goreng)
            else if (cariKataDasarIndonesia(rest)) stem = rest;
            else stem = rest;
        } else if (stem.startsWith("me")) {
            let rest = stem.slice(2);
            // Tidak luluh l, r, m, n, w, y (misal: melihat -> lihat)
            stem = rest;
        }
    }

    // E. Pencarian Kata Dasar di JSON
    let entry = cariKataDasarIndonesia(stem);

    return {
        kataDasar: stem,
        awalan: awalan,
        akhiran: akhiran,
        entry: entry
    };
}

/**
 * Mencari kata dasar dalam kamus, termasuk mencocokkan kata dasar
 * dengan variasi kata berawalan yang tersimpan di kamuskramamet.json
 */
function cariKataDasarIndonesia(stem) {
    if (!stem) return null;
    let clean = stem.toLowerCase();

    // 1. Pencarian Langsung
    let direct = cariKamus(clean);
    if (direct) return direct;

    // 2. Pencarian Variasi Bentuk Berawalan me- (karena beberapa entri JSON ditulis dalam bentuk verba aktif)
    let meForms = [
        "me" + clean,
        "mem" + clean,
        "men" + clean,
        "meng" + clean,
        "meny" + clean
    ];

    if (clean.startsWith('t')) meForms.push("men" + clean.slice(1));
    if (clean.startsWith('p')) meForms.push("mem" + clean.slice(1));
    if (clean.startsWith('k')) meForms.push("meng" + clean.slice(1));
    if (clean.startsWith('s')) meForms.push("meny" + clean.slice(1));

    for (let form of meForms) {
        let found = cariKamus(form);
        if (found) return found;
    }

    return null;
}

function cariKamus(kata) {
    if (!kamusData || kamusData.length === 0) return null;

    let found = kamusData.find(item => item.indonesia.toLowerCase() === kata);
    if (found) return found;

    found = kamusData.find(item => item.indonesia.toLowerCase() === `[bagongan] ${kata}`);
    if (found) return found;

    found = kamusData.find(item => {
        let parts = item.indonesia.toLowerCase().split(", ");
        return parts.includes(kata);
    });

    return found || null;
}

/**
 * 2. LOGIKA PEMBENTUKAN MORFOLOGI BAHASA JAWA
 * Menggabungkan aturan tingkat tutur (ruleawalakhir.txt) dengan mesin paramasastra sriwedari.js.
 */
function terapkanMorfologi(kataDasar, tingkat, awalanType, akhiranType) {
    if (!kataDasar) return "";

    let aterAter = "";
    let panambang = "";

    // Pemetaan Awalan (Ater-ater) berdasarkan Tingkat Tutur
    if (awalanType === "N") {
        aterAter = "N"; // Anuswara (Peluluhan diproses di sriwedari.js)
    } else if (awalanType === "pasif") {
        if (tingkat === "ngoko" || tingkat === "ngoko_alus") aterAter = "di";
        else if (tingkat === "krama" || tingkat === "krama_inggil") aterAter = "dipun";
        else if (tingkat === "bagongan") aterAter = "ka";
    } else if (awalanType === "pelaku1") {
        if (tingkat === "ngoko" || tingkat === "ngoko_alus") aterAter = "tak";
        else if (tingkat === "krama" || tingkat === "krama_inggil") aterAter = "kula";
        else if (tingkat === "bagongan") aterAter = "di";
    } else if (awalanType === "pelaku2") {
        if (tingkat === "ngoko") aterAter = "kok";
        else if (tingkat === "ngoko_alus" || tingkat === "krama_inggil") aterAter = "panjenengan";
        else if (tingkat === "krama") aterAter = "sampeyan";
        else if (tingkat === "bagongan") aterAter = "di";
    } else if (["sa", "pa", "pi"].includes(awalanType)) {
        aterAter = awalanType;
    }

    // Pemetaan Akhiran (Panambang) berdasarkan Tingkat Tutur
    if (akhiranType === "pemilikan") {
        if (tingkat === "krama" || tingkat === "krama_inggil") panambang = "ipun";
        else panambang = "e";
    } else if (akhiranType === "kausatif") {
        if (tingkat === "krama" || tingkat === "krama_inggil") panambang = "aken";
        else panambang = "ake";
    } else if (akhiranType === "lokatif") {
        panambang = "i";
    } else if (akhiranType === "imperatif_aktif") {
        panambang = "a";
    } else if (akhiranType === "imperatif_pasif") {
        panambang = "en";
    }

    if (!aterAter && !panambang) {
        return kataDasar;
    }

    // Eksekusi perubahan vokal & luluh kata melalui mesin sriwedari.js
    return jalankanParamasastraSriwedari(aterAter, kataDasar, panambang);
}

/**
 * Menjalankan mesin pemrosesan Paramasastra dari sriwedari.js
 */
function jalankanParamasastraSriwedari(ater, dasar, panam) {
    let mockAter = { value: ater };
    let mockDasar = { value: dasar };
    let mockPanam = { value: panam };
    let mockWarn = { innerHTML: "" };
    let mockOutLat = { value: "" };
    let mockOutJaw = { innerHTML: "", innerText: "" };

    const getEl = document.getElementById.bind(document);
    document.getElementById = function (id) {
        if (id === 'selAter') return mockAter;
        if (id === 'inDasar') return mockDasar;
        if (id === 'selPanam') return mockPanam;
        if (id === 'paramWarningArea') return mockWarn;
        if (id === 'outParamLatin') return mockOutLat;
        if (id === 'outParamJawa') return mockOutJaw;
        return getEl(id);
    };

    if (typeof window.prosesParamasastra === 'function') {
        window.prosesParamasastra();
    }

    document.getElementById = getEl;
    return mockOutLat.value || dasar;
}

function tampilkanHasil(idLatin, idJawa, teksLatin) {
    const elLatin = document.getElementById(idLatin);
    const elJawa = document.getElementById(idJawa);

    if (elLatin) elLatin.innerText = teksLatin || "-";
    if (elJawa) {
        if (teksLatin && typeof window.transliterasiKalimat === 'function') {
            elJawa.innerText = window.transliterasiKalimat(teksLatin);
        } else {
            elJawa.innerText = "";
        }
    }
}

function resetOutput() {
    ["outNgoko", "outNgokoAlus", "outKrama", "outKramaInggil", "outBagongan"].forEach(prefix => {
        let l = document.getElementById(prefix + "Latin");
        let j = document.getElementById(prefix + "Jawa");
        if (l) l.innerText = "-";
        if (j) j.innerText = "";
    });
}

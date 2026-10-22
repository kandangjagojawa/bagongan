/**
 * APP.JS - Mesin Penerjemah & Transformasi Morfologi Basa Jawa
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

function prosesTerjemahan() {
    const inputTeks = document.getElementById("inputIndonesia").value.trim();
    if (!inputTeks) {
        resetOutput();
        return;
    }

    const awalanOp = document.getElementById("selAwalan").value;
    const akhiranOp = document.getElementById("selAkhiran").value;

    const kataList = inputTeks.toLowerCase().split(/\s+/);

    let hasilNgoko = [];
    let hasilNgokoAlus = [];
    let hasilKrama = [];
    let hasilKramaInggil = [];
    let hasilBagongan = [];

    kataList.forEach(kata => {
        let entry = cariKamus(kata);

        let stemNgoko = entry ? entry.ngoko : kata;
        let stemNgokoAlus = entry ? entry.ngoko_alus : kata;
        let stemKrama = entry ? entry.krama : kata;
        let stemKramaInggil = entry ? entry.krama_inggil : kata;
        let stemBagongan = entry ? (entry.bagongan || entry.krama) : kata;

        hasilNgoko.push(terapkanMorfologi(stemNgoko, "ngoko", awalanOp, akhiranOp));
        hasilNgokoAlus.push(terapkanMorfologi(stemNgokoAlus, "ngoko_alus", awalanOp, akhiranOp));
        hasilKrama.push(terapkanMorfologi(stemKrama, "krama", awalanOp, akhiranOp));
        hasilKramaInggil.push(terapkanMorfologi(stemKramaInggil, "krama_inggil", awalanOp, akhiranOp));
        hasilBagongan.push(terapkanMorfologi(stemBagongan, "bagongan", awalanOp, akhiranOp));
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

function cariKamus(kata) {
    if (!kamusData || kamusData.length === 0) return null;

    // 1. Pencarian persis pada bidang indonesia
    let found = kamusData.find(item => item.indonesia.toLowerCase() === kata);
    if (found) return found;

    // 2. Pencarian pencocokan entri bagongan bertag [bagongan]
    found = kamusData.find(item => item.indonesia.toLowerCase() === `[bagongan] ${kata}`);
    if (found) return found;

    // 3. Pencarian substring/kata dasar
    found = kamusData.find(item => item.indonesia.toLowerCase().split(", ").includes(kata));
    return found || null;
}

/**
 * Menerapkan aturan awalan, akhiran, dan peluluhan/perubahan vokal terbuka
 * berdasarkan logika paramasastra terintegrasi sriwedari.js & ruleawalakhir.txt
 */
function terapkanMorfologi(kataDasar, tingkat, awalanType, akhiranType) {
    if (!kataDasar) return "";

    let aterAter = "";
    let panambang = "";

    // A. Penentuan Awalan (Ater-ater) berdasarkan tingkat tutur
    if (awalanType === "N") {
        aterAter = "N"; // Mengaktifkan ater-ater anuswara di sriwedari
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
        else if (tingkat === "ngoko_alus") aterAter = "panjenengan";
        else if (tingkat === "krama") aterAter = "sampeyan";
        else if (tingkat === "krama_inggil") aterAter = "panjenengan";
        else if (tingkat === "bagongan") aterAter = "di";
    } else if (["sa", "pa", "pi"].includes(awalanType)) {
        aterAter = awalanType;
    }

    // B. Penentuan Akhiran (Panambang) berdasarkan tingkat tutur
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

    // C. Jika tanpa imbuhan, kembalikan kata dasar
    if (!aterAter && !panambang) {
        return kataDasar;
    }

    // D. Gunakan mesin transformasi Paramasastra sriwedari.js lewat DOM Mock/Simulasi
    return jalankanParamasastraSriwedari(aterAter, kataDasar, panambang);
}

function jalankanParamasastraSriwedari(ater, dasar, panam) {
    // Membuat elemen mock jika tidak berada pada konteks DOM terpasang
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

    document.getElementById = getEl; // Restore getElementById
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

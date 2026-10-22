/**
 * APP.JS - Mesin Penerjemah & Transformasi Morfologi Bahasa Indonesia ke Basa Jawa
 * Fitur Utama:
 * - Analisis morfologi Bahasa Indonesia (awalan me-/di-, akhiran -kan/-i/-nya)
 * - Pemisahan & pemulihan kata dasar luluh/tidak luluh
 * - Pencarian multi-tingkat tutur pada kamuskramamet.json (termasuk tag [bagongan])
 * - Pembentukan morfologi Bahasa Jawa via sriwedari.js
 * - Sorotan warna merah untuk kata tidak ditemukan & live-editing transliterasi Aksara Jawa
 */

let kamusData = [];

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

    const awalanUi = document.getElementById("selAwalan") ? document.getElementById("selAwalan").value : "";
    const akhiranUi = document.getElementById("selAkhiran") ? document.getElementById("selAkhiran").value : "";

    const kataList = inputTeks.toLowerCase().split(/\s+/);

    let hasilNgoko = [];
    let hasilNgokoAlus = [];
    let hasilKrama = [];
    let hasilKramaInggil = [];
    let hasilBagongan = [];

    kataList.forEach(kata => {
        let analisisId = uraiMorfologiIndonesia(kata);

        let awalanFinal = awalanUi || analisisId.awalan;
        let akhiranFinal = akhiranUi || analisisId.akhiran;

        let entry = analisisId.entry;
        let isMissingGeneral = !entry;

        // 1. Kata dasar umum (Ngoko, Krama, Krama Inggil)
        let stemNgoko = entry ? entry.ngoko : analisisId.kataDasar;
        let stemNgokoAlus = entry ? entry.ngoko_alus : analisisId.kataDasar;
        let stemKrama = entry ? entry.krama : analisisId.kataDasar;
        let stemKramaInggil = entry ? entry.krama_inggil : analisisId.kataDasar;

        // 2. Cek kosakata khusus Bagongan bertag [bagongan]
        let bagonganEntry = cariKamusBagongan(analisisId.kataDasar);
        let stemBagongan = analisisId.kataDasar;
        let isMissingBagongan = false;

        if (bagonganEntry) {
            stemBagongan = bagonganEntry.krama || bagonganEntry.ngoko;
            isMissingBagongan = false;
        } else if (entry) {
            stemBagongan = entry.bagongan || entry.krama || entry.ngoko;
            isMissingBagongan = false;
        } else {
            isMissingBagongan = true;
        }

        hasilNgoko.push({
            text: terapkanMorfologi(stemNgoko, "ngoko", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilNgokoAlus.push({
            text: terapkanMorfologi(stemNgokoAlus, "ngoko_alus", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilKrama.push({
            text: terapkanMorfologi(stemKrama, "krama", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilKramaInggil.push({
            text: terapkanMorfologi(stemKramaInggil, "krama_inggil", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilBagongan.push({
            text: terapkanMorfologi(stemBagongan, "bagongan", awalanFinal, akhiranFinal),
            isMissing: isMissingBagongan
        });
    });

    tampilkanHasil("outNgokoLatin", "outNgokoJawa", hasilNgoko);
    tampilkanHasil("outNgokoAlusLatin", "outNgokoAlusJawa", hasilNgokoAlus);
    tampilkanHasil("outKramaLatin", "outKramaJawa", hasilKrama);
    tampilkanHasil("outKramaInggilLatin", "outKramaInggilJawa", hasilKramaInggil);
    tampilkanHasil("outBagonganLatin", "outBagonganJawa", hasilBagongan);
}

/**
 * Urai Morfologi Bahasa Indonesia (Awalan + Kata Dasar + Akhiran)
 */
function uraiMorfologiIndonesia(kata) {
    let clean = kata.toLowerCase().replace(/[^a-z\-]/g, "");
    let awalan = "";
    let akhiran = "";
    let stem = clean;

    let directEntry = cariKamus(clean);
    if (directEntry) {
        return { kataDasar: clean, awalan: "", akhiran: "", entry: directEntry };
    }

    // Deteksi Akhiran Bahasa Indonesia
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

    // Deteksi Awalan Bahasa Indonesia
    if (stem.startsWith("di") && stem.length > 3) {
        awalan = "pasif";
        stem = stem.slice(2);
    } else if (stem.startsWith("me")) {
        awalan = "N";

        if (stem.startsWith("mem")) {
            let rest = stem.slice(3);
            if (cariKataDasarIndonesia("p" + rest)) stem = "p" + rest;
            else if (cariKataDasarIndonesia(rest)) stem = rest;
            else stem = "p" + rest;
        } else if (stem.startsWith("men")) {
            let rest = stem.slice(3);
            if (cariKataDasarIndonesia("t" + rest)) stem = "t" + rest;
            else if (cariKataDasarIndonesia(rest)) stem = rest;
            else stem = "t" + rest;
        } else if (stem.startsWith("meny")) {
            let rest = stem.slice(4);
            stem = "s" + rest;
        } else if (stem.startsWith("meng")) {
            let rest = stem.slice(4);
            if (cariKataDasarIndonesia("k" + rest)) stem = "k" + rest;
            else if (cariKataDasarIndonesia(rest)) stem = rest;
            else stem = rest;
        } else if (stem.startsWith("me")) {
            stem = stem.slice(2);
        }
    }

    let entry = cariKataDasarIndonesia(stem);

    return {
        kataDasar: stem,
        awalan: awalan,
        akhiran: akhiran,
        entry: entry
    };
}

function cariKataDasarIndonesia(stem) {
    if (!stem) return null;
    let clean = stem.toLowerCase();

    let direct = cariKamus(clean);
    if (direct) return direct;

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

function cariKamusBagongan(kata) {
    if (!kamusData || kamusData.length === 0) return null;
    let clean = kata.toLowerCase().trim();
    return kamusData.find(item => item.indonesia.toLowerCase() === `[bagongan] ${clean}`) || null;
}

/**
 * Pembentukan Morfologi Bahasa Jawa
 */
function terapkanMorfologi(kataDasar, tingkat, awalanType, akhiranType) {
    if (!kataDasar) return "";

    let aterAter = "";
    let panambang = "";

    if (awalanType === "N") {
        aterAter = "N";
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

    return jalankanParamasastraSriwedari(aterAter, kataDasar, panambang);
}

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

/**
 * Menampilkan Hasil Terjemahan dan Mengaktifkan Edit Bahasa Secara Otomatis
 */
function tampilkanHasil(idLatin, idJawa, kataItems) {
    const elLatin = document.getElementById(idLatin);
    const elJawa = document.getElementById(idJawa);

    if (!elLatin) return;

    if (!kataItems || kataItems.length === 0) {
        elLatin.innerText = "-";
        if (elJawa) elJawa.innerText = "";
        return;
    }

    let htmlContent = kataItems.map(item => {
        if (item.isMissing) {
            return `<span class="missing-word" contenteditable="true" spellcheck="false" title="Kata tidak ditemukan dalam kamus. Klik untuk mengubah.">${item.text}</span>`;
        }
        return `<span>${item.text}</span>`;
    }).join(" ");

    elLatin.innerHTML = htmlContent;

    let plainText = elLatin.innerText;

    if (elJawa && typeof window.transliterasiKalimat === 'function') {
        elJawa.innerText = window.transliterasiKalimat(plainText);
    }

    elLatin.querySelectorAll(".missing-word").forEach(span => {
        span.addEventListener("input", () => {
            let updatedText = elLatin.innerText;
            if (elJawa && typeof window.transliterasiKalimat === 'function') {
                elJawa.innerText = window.transliterasiKalimat(updatedText);
            }
        });
    });
}

function resetOutput() {
    ["outNgoko", "outNgokoAlus", "outKrama", "outKramaInggil", "outBagongan"].forEach(prefix => {
        let l = document.getElementById(prefix + "Latin");
        let j = document.getElementById(prefix + "Jawa");
        if (l) l.innerText = "-";
        if (j) j.innerText = "";
    });
}

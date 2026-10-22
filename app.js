/**
 * APP.JS - Mesin Penerjemah & Transformasi Morfologi Bahasa Indonesia ke Basa Jawa
 * Fitur Utama:
 * - Analisis morfologi Bahasa Indonesia (awalan me-/di-, akhiran -kan/-i/-nya)
 * - Pemisahan & pemulihan kata dasar luluh/tidak luluh
 * - Pencarian multi-tingkat tutur pada kamuskramamet.json (termasuk tag [bagongan])
 * - Pencarian Silang Otomatis (Cross-Card Lookup): Edit di 1 kartu -> Semua kartu menyesuaikan entri JSON
 * - Pembentukan morfologi Bahasa Jawa via sriwedari.js & live-editing Aksara Jawa
 */

let kamusData = [];
let currentWordsData = []; // Menyimpan state analisis kata untuk kalimat saat ini

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
 * Alur Utama Penerjemahan Input Teks
 */
function prosesTerjemahan() {
    const inputTeks = document.getElementById("inputIndonesia").value.trim();
    if (!inputTeks) {
        currentWordsData = [];
        resetOutput();
        return;
    }

    const kataList = inputTeks.toLowerCase().split(/\s+/);

    // Inisialisasi state kata per kata
    currentWordsData = kataList.map((kata, index) => {
        let analisisId = uraiMorfologiIndonesia(kata);
        let bagonganEntry = cariKamusBagongan(analisisId.kataDasar);

        return {
            index: index,
            originalInput: kata,
            analisis: analisisId,
            bagonganEntry: bagonganEntry,
            customEntry: null // Menyimpan entri JSON hasil pengubahan user
        };
    });

    renderAllCards();
}

/**
 * Merender Ulang Seluruh Kartu Terjemahan Berdasarkan State currentWordsData
 */
function renderAllCards() {
    if (!currentWordsData || currentWordsData.length === 0) {
        resetOutput();
        return;
    }

    const awalanUi = document.getElementById("selAwalan") ? document.getElementById("selAwalan").value : "";
    const akhiranUi = document.getElementById("selAkhiran") ? document.getElementById("selAkhiran").value : "";

    let hasilNgoko = [];
    let hasilNgokoAlus = [];
    let hasilKrama = [];
    let hasilKramaInggil = [];
    let hasilBagongan = [];

    currentWordsData.forEach(wordObj => {
        let idx = wordObj.index;
        let analisisId = wordObj.analisis;
        let awalanFinal = awalanUi || analisisId.awalan;
        let akhiranFinal = akhiranUi || analisisId.akhiran;

        // Gunakan customEntry jika user pernah memilih/mengetik kata yang cocok dengan JSON
        let activeEntry = wordObj.customEntry || analisisId.entry;
        let isMissingGeneral = !activeEntry;

        // 1. Kata dasar Ngoko, Ngoko Alus, Krama, Krama Inggil
        let stemNgoko = activeEntry ? activeEntry.ngoko : (analisisId.kataDasar);
        let stemNgokoAlus = activeEntry ? activeEntry.ngoko_alus : (analisisId.kataDasar);
        let stemKrama = activeEntry ? activeEntry.krama : (analisisId.kataDasar);
        let stemKramaInggil = activeEntry ? activeEntry.krama_inggil : (analisisId.kataDasar);

        // 2. Kosakata khusus Bagongan
        let bagonganEntry = wordObj.customEntry || wordObj.bagonganEntry;
        let stemBagongan = analisisId.kataDasar;
        let isMissingBagongan = false;

        if (wordObj.customEntry) {
            stemBagongan = wordObj.customEntry.bagongan || wordObj.customEntry.krama || wordObj.customEntry.ngoko;
            isMissingBagongan = false;
        } else if (bagonganEntry) {
            stemBagongan = bagonganEntry.krama || bagonganEntry.ngoko;
            isMissingBagongan = false;
        } else if (activeEntry) {
            stemBagongan = activeEntry.bagongan || activeEntry.krama || activeEntry.ngoko;
            isMissingBagongan = false;
        } else {
            isMissingBagongan = true;
        }

        hasilNgoko.push({
            wordIndex: idx,
            text: terapkanMorfologi(stemNgoko, "ngoko", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilNgokoAlus.push({
            wordIndex: idx,
            text: terapkanMorfologi(stemNgokoAlus, "ngoko_alus", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilKrama.push({
            wordIndex: idx,
            text: terapkanMorfologi(stemKrama, "krama", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilKramaInggil.push({
            wordIndex: idx,
            text: terapkanMorfologi(stemKramaInggil, "krama_inggil", awalanFinal, akhiranFinal),
            isMissing: isMissingGeneral
        });
        hasilBagongan.push({
            wordIndex: idx,
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
 * Mencari entri JSON berdasarkan kata dari Bahasa Apapun (Ngoko, Krama, Krama Inggil, Bagongan, Indonesia)
 */
function cariKamusByAnyField(kata) {
    if (!kamusData || kamusData.length === 0 || !kata) return null;
    let clean = kata.toLowerCase().trim();

    return kamusData.find(item => {
        let ind = item.indonesia ? item.indonesia.toLowerCase() : "";
        let ngo = item.ngoko ? item.ngoko.toLowerCase() : "";
        let ngoAlus = item.ngoko_alus ? item.ngoko_alus.toLowerCase() : "";
        let kra = item.krama ? item.krama.toLowerCase() : "";
        let kraIng = item.krama_inggil ? item.krama_inggil.toLowerCase() : "";

        return ind === clean ||
               ind === `[bagongan] ${clean}` ||
               ngo === clean ||
               ngoAlus === clean ||
               kra === clean ||
               kraIng === clean ||
               ind.split(", ").includes(clean) ||
               ngo.split(", ").includes(clean) ||
               kra.split(", ").includes(clean);
    }) || null;
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
 * Menampilkan Hasil Terjemahan dan Mengaktifkan Fitur Edit & Cross-Card Lookup
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
        let isRed = item.isMissing ? "missing-word" : "";
        return `<span class="word-span ${isRed}" contenteditable="true" spellcheck="false" data-index="${item.wordIndex}">${item.text}</span>`;
    }).join(" ");

    elLatin.innerHTML = htmlContent;

    let plainText = elLatin.innerText;

    if (elJawa && typeof window.transliterasiKalimat === 'function') {
        elJawa.innerText = window.transliterasiKalimat(plainText);
    }

    // Event Listener untuk Live Editing & Cross-Card Lookup
    elLatin.querySelectorAll(".word-span").forEach(span => {
        // 1. Transliterasi Aksara Jawa langsung saat mengetik
        span.addEventListener("input", () => {
            let updatedText = elLatin.innerText;
            if (elJawa && typeof window.transliterasiKalimat === 'function') {
                elJawa.innerText = window.transliterasiKalimat(updatedText);
            }
        });

        // 2. Saat selesai mengetik (blur) atau tekan Enter: Cari di JSON & perbarui semua kartu
        const handleCommitEdit = () => {
            let wordIndex = parseInt(span.getAttribute("data-index"));
            let typedText = span.innerText.trim();

            if (!isNaN(wordIndex) && currentWordsData[wordIndex]) {
                // Cari kata baru di kamus JSON (lintas bahasa)
                let matchedEntry = cariKamusByAnyField(typedText);

                if (matchedEntry) {
                    // Jika kata ditemukan di JSON, perbarui entri kata tersebut
                    currentWordsData[wordIndex].customEntry = matchedEntry;
                    currentWordsData[wordIndex].analisis.kataDasar = matchedEntry.indonesia;
                    renderAllCards(); // Perbarui seluruh 5 kartu sekaligus!
                }
            }
        };

        span.addEventListener("blur", handleCommitEdit);

        span.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                span.blur(); // Memicu handleCommitEdit
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

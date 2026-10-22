/**
 * APP.JS - Mesin Penerjemah & Transformasi Morfologi Bahasa Indonesia ke Basa Jawa
 * Fitur Utama:
 * - Dukungan Varian JSON (`all_ngoko`, `all_krama`, dll.): Tampil warna hijau + dropdown <select>
 * - Transformasi Morfologi Varian: Setiap opsi varian otomatis diimbuhi sesuai kaidah Jawa
 * - Analisis Morfologi Indonesia (awalan me-/di-, akhiran -kan/-i/-nya)
 * - Tampilan UI Tanpa Tanda Hubung (-), Sistem Tetap Memakai Tanda Hubung untuk Transliterasi Sriwedari
 * - Synchronized Cross-Card Lookup & Live-Editing Aksara Jawa
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

    currentWordsData = kataList.map((kata, index) => {
        let analisisId = uraiMorfologiIndonesia(kata);
        let bagonganEntry = cariKamusBagongan(analisisId.kataDasar);

        return {
            index: index,
            originalInput: kata,
            analisis: analisisId,          // Standar (tanpa tag bagongan)
            bagonganEntry: bagonganEntry, // Entri khusus bagongan jika ada
            customStandardEntry: null,     // Jika user edit di kartu standar
            customBagonganEntry: null,     // Jika user edit di kartu bagongan
            selectedVariants: {}           // Pilihan varian user per tingkat tutur
        };
    });

    renderAllCards();
}

/**
 * Memeriksa Apakah Suatu Entri Memiliki Varian Kata Array
 */
function getVariantsForLevel(entry, level) {
    if (!entry) return null;

    let key = "all_" + level;
    if (entry[key] && Array.isArray(entry[key]) && entry[key].length > 1) {
        return entry[key];
    }

    if (entry[level] && Array.isArray(entry[level]) && entry[level].length > 1) {
        return entry[level];
    }

    if (level === "bagongan") {
        if (entry.all_bagongan && Array.isArray(entry.all_bagongan) && entry.all_bagongan.length > 1) {
            return entry.all_bagongan;
        }
        if (entry.all_krama && Array.isArray(entry.all_krama) && entry.all_krama.length > 1) {
            return entry.all_krama;
        }
    }

    return null;
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

        let stdEntry = wordObj.customStandardEntry || analisisId.entry;
        let isMissingStd = !stdEntry;

        if (!wordObj.selectedVariants) wordObj.selectedVariants = {};

        // Helper Pembentuk Objek Item Terjemahan per Tingkat Tutur
        const buildLevelItem = (level, defaultStem, entryObj, isMissing) => {
            let varList = getVariantsForLevel(entryObj, level);
            let selectedStem = wordObj.selectedVariants[level] || defaultStem;

            if (varList && varList.length > 1) {
                let variantsTransformed = varList.map(vStem => ({
                    stem: vStem,
                    transformed: terapkanMorfologi(vStem, level, awalanFinal, akhiranFinal)
                }));

                if (!varList.includes(selectedStem)) {
                    selectedStem = defaultStem || varList[0];
                }

                let activeTransformed = terapkanMorfologi(selectedStem, level, awalanFinal, akhiranFinal);

                return {
                    wordIndex: idx,
                    text: activeTransformed,
                    isMissing: false,
                    hasVariants: true,
                    variants: variantsTransformed,
                    selectedStem: selectedStem
                };
            } else {
                return {
                    wordIndex: idx,
                    text: terapkanMorfologi(selectedStem, level, awalanFinal, akhiranFinal),
                    isMissing: isMissing,
                    hasVariants: false
                };
            }
        };

        let stemNgoko = stdEntry ? stdEntry.ngoko : analisisId.kataDasar;
        let stemNgokoAlus = stdEntry ? stdEntry.ngoko_alus : analisisId.kataDasar;
        let stemKrama = stdEntry ? stdEntry.krama : analisisId.kataDasar;
        let stemKramaInggil = stdEntry ? stdEntry.krama_inggil : analisisId.kataDasar;

        let bagEntry = wordObj.customBagonganEntry || wordObj.bagonganEntry || stdEntry;
        let isMissingBag = !bagEntry;
        let stemBagongan = analisisId.kataDasar;

        if (bagEntry) {
            stemBagongan = bagEntry.krama || bagEntry.ngoko || bagEntry.krama_inggil;
        }

        hasilNgoko.push(buildLevelItem("ngoko", stemNgoko, stdEntry, isMissingStd));
        hasilNgokoAlus.push(buildLevelItem("ngoko_alus", stemNgokoAlus, stdEntry, isMissingStd));
        hasilKrama.push(buildLevelItem("krama", stemKrama, stdEntry, isMissingStd));
        hasilKramaInggil.push(buildLevelItem("krama_inggil", stemKramaInggil, stdEntry, isMissingStd));
        hasilBagongan.push(buildLevelItem("bagongan", stemBagongan, bagEntry, isMissingBag));
    });

    tampilkanHasil("outNgokoLatin", "outNgokoJawa", hasilNgoko, false, "ngoko");
    tampilkanHasil("outNgokoAlusLatin", "outNgokoAlusJawa", hasilNgokoAlus, false, "ngoko_alus");
    tampilkanHasil("outKramaLatin", "outKramaJawa", hasilKrama, false, "krama");
    tampilkanHasil("outKramaInggilLatin", "outKramaInggilJawa", hasilKramaInggil, false, "krama_inggil");
    tampilkanHasil("outBagonganLatin", "outBagonganJawa", hasilBagongan, true, "bagongan");
}

/**
 * Urai Morfologi Bahasa Indonesia
 */
function uraiMorfologiIndonesia(kata) {
    let clean = kata.toLowerCase().replace(/[^a-z\-]/g, "");
    let awalan = "";
    let akhiran = "";
    let stem = clean;

    let directEntry = cariKamusStandard(clean);
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

    let direct = cariKamusStandard(clean);
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
        let found = cariKamusStandard(form);
        if (found) return found;
    }

    return null;
}

/**
 * Pencarian Kamus Standar Fleksibel
 */
function cariKamusStandard(kata) {
    if (!kamusData || kamusData.length === 0 || !kata) return null;
    let clean = kata.toLowerCase().trim().replace(/[^a-z\-]/g, "");
    if (!clean) return null;

    let match = kamusData.find(item => {
        let ind = item.indonesia ? item.indonesia.toLowerCase() : "";
        if (ind.startsWith("[bagongan]")) return false;

        let ngo = item.ngoko ? item.ngoko.toLowerCase() : "";
        let ngoAlus = item.ngoko_alus ? item.ngoko_alus.toLowerCase() : "";
        let kra = item.krama ? item.krama.toLowerCase() : "";
        let kraIng = item.krama_inggil ? item.krama_inggil.toLowerCase() : "";

        return ind === clean ||
               ngo === clean ||
               ngoAlus === clean ||
               kra === clean ||
               kraIng === clean ||
               ind.split(", ").includes(clean) ||
               ngo.split(", ").includes(clean) ||
               kra.split(", ").includes(clean);
    });

    if (match) return match;

    let stemsToTry = [];
    let s = clean;

    if (s.endsWith("aken")) s = s.slice(0, -4);
    else if (s.endsWith("ake") || s.endsWith("ipun")) s = s.slice(0, -3);
    else if (s.endsWith("e") || s.endsWith("i")) s = s.slice(0, -1);

    if (s.startsWith("dipun")) s = s.slice(5);
    else if (s.startsWith("di")) s = s.slice(2);
    else if (s.startsWith("ng")) {
        stemsToTry.push(s.slice(2));
        stemsToTry.push("k" + s.slice(2));
    } else if (s.startsWith("ny")) {
        stemsToTry.push("c" + s.slice(2));
        stemsToTry.push("s" + s.slice(2));
    } else if (s.startsWith("n")) {
        stemsToTry.push(s.slice(1));
        stemsToTry.push("t" + s.slice(1));
    } else if (s.startsWith("m")) {
        stemsToTry.push(s.slice(1));
        stemsToTry.push("p" + s.slice(1));
    }
    stemsToTry.push(s);

    for (let stemCandidate of stemsToTry) {
        if (!stemCandidate) continue;
        let subMatch = kamusData.find(item => {
            let ind = item.indonesia ? item.indonesia.toLowerCase() : "";
            if (ind.startsWith("[bagongan]")) return false;

            let ngo = item.ngoko ? item.ngoko.toLowerCase() : "";
            let ngoAlus = item.ngoko_alus ? item.ngoko_alus.toLowerCase() : "";
            let kra = item.krama ? item.krama.toLowerCase() : "";
            let kraIng = item.krama_inggil ? item.krama_inggil.toLowerCase() : "";

            return ind === stemCandidate || ngo === stemCandidate || kra === stemCandidate || kraIng === stemCandidate;
        });
        if (subMatch) return subMatch;
    }

    return null;
}

function cariKamusBagongan(kata) {
    if (!kamusData || kamusData.length === 0 || !kata) return null;
    let clean = kata.toLowerCase().trim();

    let bagEntry = kamusData.find(item => item.indonesia.toLowerCase() === `[bagongan] ${clean}`);
    if (bagEntry) return bagEntry;

    return cariKamusStandard(clean);
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
 * Menampilkan Hasil Terjemahan (Mendukung Text Merah, Dropdown Hijau Varian, & Aksara Jawa)
 */
function tampilkanHasil(idLatin, idJawa, kataItems, isBagonganCard = false, cardLevel = "ngoko") {
    const elLatin = document.getElementById(idLatin);
    const elJawa = document.getElementById(idJawa);

    if (!elLatin) return;

    if (!kataItems || kataItems.length === 0) {
        elLatin.innerText = "-";
        if (elJawa) elJawa.innerText = "";
        return;
    }

    // Render Elemen HTML (Merah jika Hilang, Dropdown Hijau jika Memiliki Varian)
    let htmlContent = kataItems.map(item => {
        if (item.isMissing) {
            let displayText = item.text ? item.text.replace(/-/g, "") : "";
            return `<span class="word-span missing-word" contenteditable="true" spellcheck="false" data-index="${item.wordIndex}">${displayText}</span>`;
        } else if (item.hasVariants) {
            let optionsHtml = item.variants.map(vObj => {
                let isSelected = vObj.stem === item.selectedStem ? "selected" : "";
                let displayVal = vObj.transformed ? vObj.transformed.replace(/-/g, "") : vObj.stem;
                return `<option value="${vObj.stem}" ${isSelected}>${displayVal}</option>`;
            }).join("");

            return `<select class="variant-select green-variant" data-index="${item.wordIndex}" data-level="${cardLevel}">${optionsHtml}</select>`;
        } else {
            let displayText = item.text ? item.text.replace(/-/g, "") : "";
            return `<span class="word-span" contenteditable="true" spellcheck="false" data-index="${item.wordIndex}">${displayText}</span>`;
        }
    }).join(" ");

    elLatin.innerHTML = htmlContent;

    // Transliterasi Aksara Jawa Tetap Memakai Teks Berpenghubung (-) untuk Kaidah Sriwedari
    let systemTextWithHyphens = kataItems.map(item => item.text).join(" ");

    if (elJawa && typeof window.transliterasiKalimat === 'function') {
        elJawa.innerText = window.transliterasiKalimat(systemTextWithHyphens);
    }

    // Event Listener untuk Varian Dropdown (Hijau)
    elLatin.querySelectorAll(".variant-select").forEach(select => {
        select.addEventListener("change", () => {
            let wordIndex = parseInt(select.getAttribute("data-index"));
            let level = select.getAttribute("data-level");
            let selectedStem = select.value;

            if (!isNaN(wordIndex) && currentWordsData[wordIndex]) {
                if (!currentWordsData[wordIndex].selectedVariants) {
                    currentWordsData[wordIndex].selectedVariants = {};
                }
                currentWordsData[wordIndex].selectedVariants[level] = selectedStem;
                renderAllCards();
            }
        });
    });

    // Event Listener untuk Live Editing Kata Merah/Normal
    elLatin.querySelectorAll(".word-span").forEach(span => {
        span.addEventListener("input", () => {
            let updatedText = elLatin.innerText;
            if (elJawa && typeof window.transliterasiKalimat === 'function') {
                elJawa.innerText = window.transliterasiKalimat(updatedText);
            }
        });

        const handleCommitEdit = () => {
            let wordIndex = parseInt(span.getAttribute("data-index"));
            let typedText = span.innerText.trim();

            if (!isNaN(wordIndex) && currentWordsData[wordIndex]) {
                if (isBagonganCard) {
                    let matched = cariKamusBagongan(typedText);
                    if (matched) {
                        currentWordsData[wordIndex].customBagonganEntry = matched;
                    }
                } else {
                    let matched = cariKamusStandard(typedText);
                    if (matched) {
                        currentWordsData[wordIndex].customStandardEntry = matched;
                        currentWordsData[wordIndex].analisis.kataDasar = matched.indonesia;
                        currentWordsData[wordIndex].bagonganEntry = cariKamusBagongan(matched.indonesia);
                    } else {
                        currentWordsData[wordIndex].customStandardEntry = null;
                        currentWordsData[wordIndex].analisis.kataDasar = typedText;
                        currentWordsData[wordIndex].bagonganEntry = cariKamusBagongan(typedText);
                    }
                }
                renderAllCards();
            }
        };

        span.addEventListener("blur", handleCommitEdit);

        span.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                span.blur();
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


/**
 * APP.JS - Versi 3.0 dengan Auto Krama Inggil untuk orang dihormati
 * - Imbuhan lengkap Indonesia (me-, ber-, ter-, di-, ke-, se-, per-, pe-, dll)
 * - Auto-detect subjek hormat (bapak, ibu, beliau, eyang, mbah, simbah, etc)
 * - Kalau hormat, otomatis pakai krama_inggil (makan -> dhahar, tidur -> tilem, datang -> rawuh)
 */

let kamusData = [];
let currentWordsData = [];
let isHormatAktif = false; // global flag untuk UI
window.isHormatAktif = false;

document.addEventListener("DOMContentLoaded", () => {
    fetch("kamuskramamet.json")
        .then(response => {
            if (!response.ok) throw new Error("Gagal memuat kamuskramamet.json");
            return response.json();
        })
        .then(data => {
            kamusData = data;
            console.log("Kamus berhasil dimuat:", kamusData.length, "entri.");
        })
        .catch(err => console.error("Error loading JSON dictionary:", err));

    const inputArea = document.getElementById("inputIndonesia");
    if (inputArea) inputArea.addEventListener("input", debounce(prosesTerjemahan, 400));
    
    const selSubjek = document.getElementById("selSubjek");
    if (selSubjek) selSubjek.addEventListener("change", prosesTerjemahan);
});

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// === LOGIKA DETEKSI HORMAT ===
const KATA_HORMAT = [
    "bapak", "bpk", "ibu", "bu", "beliau", "eyang", "mbah", "simbah", 
    "pakde", "bude", "paklik", "bulik", "pak dhe", "bu dhe",
    "eyang kakung", "eyang putri", "eyang kakung", "rama", "ibu", 
    "gusti", "ndoro", "kanjeng", "kyai", "ustad", "ustadz", "romo", "suster",
    "panjenengan", "sampeyan", "tuan", "nyonya", "kakek", "nenek"
];

function deteksiHormat(inputTeks, mode) {
    if (mode === "hormat") return true;
    if (mode === "biasa") return false;
    // mode auto
    let lower = inputTeks.toLowerCase();
    for (let kata of KATA_HORMAT) {
        if (lower.includes(kata)) return true;
    }
    return false;
}

function prosesTerjemahan() {
    const inputEl = document.getElementById("inputIndonesia");
    const inputTeks = inputEl ? inputEl.value.trim() : "";
    const selSubjek = document.getElementById("selSubjek");
    const mode = selSubjek ? selSubjek.value : "auto";
    
    isHormatAktif = deteksiHormat(inputTeks, mode);
    window.isHormatAktif = isHormatAktif;

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
            analisis: analisisId,
            bagonganEntry: bagonganEntry,
            customStandardEntry: null,
            customBagonganEntry: null,
            selectedVariants: {}
        };
    });
    renderAllCards();
}

function getVariantsForLevel(entry, level) {
    if (!entry) return null;
    let key = "all_" + level;
    if (entry[key] && Array.isArray(entry[key]) && entry[key].length > 1) return entry[key];
    if (entry[level] && Array.isArray(entry[level]) && entry[level].length > 1) return entry[level];
    if (level === "bagongan") {
        if (entry.all_bagongan && Array.isArray(entry.all_bagongan) && entry.all_bagongan.length > 1) return entry.all_bagongan;
        if (entry.all_krama && Array.isArray(entry.all_krama) && entry.all_krama.length > 1) return entry.all_krama;
    }
    return null;
}

// Pilih stem dengan mempertimbangkan mode hormat
function pilihStemHormat(entry, level, isHormat) {
    if (!entry) return null;
    if (!isHormat) {
        // mode biasa, pakai level masing-masing
        if (level === "ngoko") return entry.ngoko;
        if (level === "ngoko_alus") return entry.ngoko_alus;
        if (level === "krama") return entry.krama;
        if (level === "krama_inggil") return entry.krama_inggil;
        if (level === "bagongan") return entry.krama || entry.ngoko;
        return entry.ngoko;
    } else {
        // mode hormat: untuk kata kerja/orang, pakai krama_inggil kalau ada dan beda
        // Contoh: makan -> dhahar, bukan mangan
        // Jika krama_inggil ada dan berbeda dari ngoko, pakai itu untuk semua level
        // Kecuali untuk kata yang krama_inggil sama dengan krama (tidak perlu)
        let ki = entry.krama_inggil;
        let kr = entry.krama;
        let nga = entry.ngoko_alus;
        // Jika krama_inggil tersedia dan bukan kosong, pakai krama_inggil untuk level krama dan krama_inggil
        // Untuk ngoko alus, juga pakai krama_inggil kalau ada (ini ciri ngoko alus hormat)
        if (ki && ki !== "" && ki !== entry.ngoko) {
            if (level === "ngoko") {
                // Di ngoko lugu tapi subjek hormat, tetap pakai ngoko_alus atau krama_inggil?
                // Aturan: Bapak mangan -> seharusnya Bapak dhahar (pakai krama inggil walau ngoko)
                // Jadi untuk mode hormat, ngoko lugu pun kita upgrade ke krama_inggil kalau kata kerja
                // Kita cek apakah kata ini termasuk kata kerja yang punya krama inggil berbeda
                // Jika ya, pakai krama_inggil, jika tidak pakai ngoko_alus
                if (ki !== kr || nga !== entry.ngoko) {
                    return ki; // pakai paling halus untuk hormat
                }
            }
            if (level === "ngoko_alus") return ki || nga || kr;
            if (level === "krama") return ki || kr;
            if (level === "krama_inggil") return ki;
            if (level === "bagongan") return ki || kr;
        }
        // Fallback ke krama jika tidak ada krama_inggil
        if (level === "ngoko") return entry.ngoko;
        if (level === "ngoko_alus") return entry.ngoko_alus;
        if (level === "krama") return entry.krama;
        if (level === "krama_inggil") return entry.krama_inggil;
        return entry.ngoko;
    }
}

function renderAllCards() {
    if (!currentWordsData || currentWordsData.length === 0) {
        resetOutput(); return;
    }
    const awalanUi = document.getElementById("selAwalan") ? document.getElementById("selAwalan").value : "";
    const akhiranUi = document.getElementById("selAkhiran") ? document.getElementById("selAkhiran").value : "";

    let hasilNgoko = [], hasilNgokoAlus = [], hasilKrama = [], hasilKramaInggil = [], hasilBagongan = [];

    currentWordsData.forEach(wordObj => {
        let idx = wordObj.index;
        let analisisId = wordObj.analisis;
        let awalanFinal = awalanUi || analisisId.awalan;
        let akhiranFinal = akhiranUi || analisisId.akhiran;

        if(analisisId.konfiks) {
            if(analisisId.konfiks==="ke-an" && !awalanUi) awalanFinal = "ke";
            if(analisisId.konfiks==="per-an" && !awalanUi) awalanFinal = "pa";
        }

        let stdEntry = wordObj.customStandardEntry || analisisId.entry;
        let isMissingStd = !stdEntry;
        if (!wordObj.selectedVariants) wordObj.selectedVariants = {};

        const buildLevelItem = (level, entryObj, isMissing) => {
            // Tentukan stem dasar dengan mempertimbangkan hormat
            let defaultStemFromHormat = pilihStemHormat(entryObj, level, isHormatAktif);
            let defaultStem = defaultStemFromHormat || (entryObj ? (entryObj[level] || analisisId.kataDasar) : analisisId.kataDasar);
            
            // Jika entry custom atau ada selectedVariants, pakai itu
            let selectedStem = wordObj.selectedVariants[level] || defaultStem;
            
            let varList = getVariantsForLevel(entryObj, level);
            // Jika mode hormat, varian juga harus dari krama_inggil
            if (isHormatAktif && entryObj) {
                let kiVar = getVariantsForLevel(entryObj, "krama_inggil");
                if (kiVar && kiVar.length > 1) varList = kiVar;
            }

            if (varList && varList.length > 1) {
                let variantsTransformed = varList.map(vStem => ({
                    stem: vStem,
                    transformed: terapkanMorfologi(vStem, level, awalanFinal, akhiranFinal, analisisId)
                }));
                if (!varList.includes(selectedStem)) selectedStem = defaultStem || varList[0];
                let activeTransformed = terapkanMorfologi(selectedStem, level, awalanFinal, akhiranFinal, analisisId);
                return {
                    wordIndex: idx,
                    text: activeTransformed,
                    isMissing: false,
                    hasVariants: true,
                    variants: variantsTransformed,
                    selectedStem: selectedStem,
                    isHormat: isHormatAktif
                };
            } else {
                return {
                    wordIndex: idx,
                    text: terapkanMorfologi(selectedStem, level, awalanFinal, akhiranFinal, analisisId),
                    isMissing: isMissing,
                    hasVariants: false,
                    isHormat: isHormatAktif
                };
            }
        };

        let bagEntry = wordObj.customBagonganEntry || wordObj.bagonganEntry || stdEntry;
        let isMissingBag = !bagEntry;

        hasilNgoko.push(buildLevelItem("ngoko", stdEntry, isMissingStd));
        hasilNgokoAlus.push(buildLevelItem("ngoko_alus", stdEntry, isMissingStd));
        hasilKrama.push(buildLevelItem("krama", stdEntry, isMissingStd));
        hasilKramaInggil.push(buildLevelItem("krama_inggil", stdEntry, isMissingStd));
        hasilBagongan.push(buildLevelItem("bagongan", bagEntry, isMissingBag));
    });

    tampilkanHasil("outNgokoLatin", "outNgokoJawa", hasilNgoko, false, "ngoko");
    tampilkanHasil("outNgokoAlusLatin", "outNgokoAlusJawa", hasilNgokoAlus, false, "ngoko_alus");
    tampilkanHasil("outKramaLatin", "outKramaJawa", hasilKrama, false, "krama");
    tampilkanHasil("outKramaInggilLatin", "outKramaInggilJawa", hasilKramaInggil, false, "krama_inggil");
    tampilkanHasil("outBagonganLatin", "outBagonganJawa", hasilBagongan, true, "bagongan");
}

function uraiMorfologiIndonesia(kata) {
    if(typeof window.uraiMorfologiIndonesiaLengkap === 'function') {
        try {
            let hasil = window.uraiMorfologiIndonesiaLengkap(kata, cariKamusStandard);
            return {
                kataDasar: hasil.kataDasar,
                awalan: hasil.awalan,
                akhiran: hasil.akhiran,
                konfiks: hasil.konfiks || "",
                prefiks: hasil.prefiks || [],
                sufiks: hasil.sufiks || [],
                entry: hasil.entry,
                original: hasil.original,
                awalanIndo: hasil.awalanIndo || "",
                akhiranIndo: hasil.akhiranIndo || ""
            };
        } catch(e) {
            console.warn("Gagal pakai modul lengkap, fallback ke internal", e);
        }
    }
    return uraiMorfologiInternal(kata);
}

function uraiMorfologiInternal(kata) {
    let clean = kata.toLowerCase().replace(/[^a-z\-]/g, "");
    if(!clean) return { kataDasar: kata, awalan: "", akhiran: "", entry: null, konfiks: "" };
    let directEntry = cariKamusStandard(clean);
    if (directEntry) return { kataDasar: clean, awalan: "", akhiran: "", entry: directEntry, konfiks: "", prefiks: [], sufiks: [] };
    let word = clean;
    let prefiks = [];
    let sufiks = [];
    if(word.endsWith("nya") && word.length>5) { sufiks.push("nya"); word = word.slice(0,-3); }
    if(word.endsWith("kan") && word.length>5) { sufiks.push("kan"); word = word.slice(0,-3); }
    else if(word.endsWith("an") && word.length>4) { 
        let temp = word.slice(0,-2);
        if(cariKamusStandard(temp) || temp.length>3) { sufiks.push("an"); word = temp; }
    }
    if(word.endsWith("i") && word.length>4) {
        let temp = word.slice(0,-1);
        if(cariKamusStandard(temp)) { sufiks.push("i"); word = temp; }
    }
    let stem = word;
    let awalanJawa = "";
    const tryPrefix = (p, fn) => {
        if(stem.startsWith(p)) {
            let rest = stem.slice(p.length);
            let cand = fn ? fn(rest) : rest;
            let variants = [cand];
            if(p==="meng") variants.push("k"+rest, rest);
            if(p==="men") variants.push("t"+rest, rest);
            if(p==="mem") variants.push("p"+rest, "b"+rest, rest);
            if(p==="meny") variants.push("s"+rest, "c"+rest, rest);
            for(let v of variants) {
                if(cariKamusStandard(v)) {
                    prefiks.push(p);
                    return v;
                }
            }
            if(rest.length>=3) {
                prefiks.push(p);
                return cand;
            }
        }
        return null;
    };
    let newStem = null;
    for(let p of ["memper","meng","meny","men","mem","ber","ter","per","di","ke","se","me","pe"]) {
        let res = tryPrefix(p, r=>r);
        if(res) { newStem = res; break; }
    }
    if(newStem) stem = newStem;
    let entry = cariKamusStandard(stem);
    let hasMe = prefiks.some(p=>p.startsWith("me") || p==="memper");
    let hasDi = prefiks.includes("di");
    let hasBer = prefiks.includes("ber");
    let hasTer = prefiks.includes("ter");
    let hasKe = prefiks.includes("ke");
    let hasPer = prefiks.includes("per") || prefiks.includes("pe");
    if(hasMe || hasBer) awalanJawa = "N";
    else if(hasDi || hasTer) awalanJawa = "pasif";
    else if(hasPer) awalanJawa = "pa";
    else if(hasKe) awalanJawa = "ke";
    let akhiranJawa = "";
    let konfiks = "";
    if(sufiks.includes("kan")) akhiranJawa = "kausatif";
    else if(sufiks.includes("i")) akhiranJawa = "lokatif";
    else if(sufiks.includes("an")) {
        if(hasKe) { akhiranJawa = "an"; konfiks="ke-an"; }
        else if(hasPer) { akhiranJawa = "an"; konfiks="per-an"; awalanJawa="pa"; }
        else { akhiranJawa = "an"; }
    }
    else if(sufiks.includes("nya")) akhiranJawa = "pemilikan";
    return {
        kataDasar: stem,
        awalan: awalanJawa,
        akhiran: akhiranJawa,
        konfiks: konfiks,
        prefiks: prefiks,
        sufiks: sufiks,
        entry: entry,
        original: clean
    };
}

function cariKataDasarIndonesia(stem) {
    if (!stem) return null;
    return cariKamusStandard(stem);
}

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
        return ind === clean || ngo === clean || ngoAlus === clean || kra === clean || kraIng === clean ||
               ind.split(", ").includes(clean) || ngo.split(", ").includes(clean) || kra.split(", ").includes(clean);
    });
    if (match) return match;
    let s = clean;
    if (s.endsWith("aken")) s = s.slice(0, -4);
    else if (s.endsWith("ake") || s.endsWith("ipun")) s = s.slice(0, -3);
    else if (s.endsWith("e") || s.endsWith("i") || s.endsWith("an")) s = s.slice(0, -1);
    if (s.startsWith("dipun")) s = s.slice(5);
    else if (s.startsWith("di")) s = s.slice(2);
    else if (s.startsWith("ng")) s = s.slice(2);
    else if (s.startsWith("ny")) s = s.slice(2);
    else if (s.startsWith("n")) s = s.slice(1);
    else if (s.startsWith("m")) s = s.slice(1);
    if(s!==clean) {
        let sub = kamusData.find(item => {
            let ind = item.indonesia ? item.indonesia.toLowerCase() : "";
            if (ind.startsWith("[bagongan]")) return false;
            return ind === s;
        });
        if(sub) return sub;
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

function terapkanMorfologi(kataDasar, tingkat, awalanType, akhiranType, analisisLengkap) {
    if (!kataDasar) return "";
    let aterAter = "";
    let panambang = "";
    let konfiks = analisisLengkap ? analisisLengkap.konfiks : "";
    if(awalanType==="ber" || awalanType==="be") awalanType="N";
    if(awalanType==="ter") awalanType="ter";
    if (awalanType === "N") aterAter = "N";
    else if (awalanType === "pasif") {
        if (tingkat === "ngoko" || tingkat === "ngoko_alus") aterAter = "di";
        else if (tingkat === "krama" || tingkat === "krama_inggil") aterAter = "dipun";
        else if (tingkat === "bagongan") aterAter = "ka";
    }
    else if (awalanType === "ter") {
        if (tingkat === "ngoko" || tingkat === "ngoko_alus") aterAter = "ke";
        else if (tingkat === "krama" || tingkat === "krama_inggil") aterAter = "ke";
        else if (tingkat === "bagongan") aterAter = "ka";
    }
    else if (awalanType === "pelaku1") {
        if (tingkat === "ngoko" || tingkat === "ngoko_alus") aterAter = "tak";
        else if (tingkat === "krama" || tingkat === "krama_inggil") aterAter = "kula";
        else if (tingkat === "bagongan") aterAter = "di";
    }
    else if (awalanType === "pelaku2") {
        if (tingkat === "ngoko") aterAter = "kok";
        else if (tingkat === "ngoko_alus" || tingkat === "krama_inggil") aterAter = "panjenengan";
        else if (tingkat === "krama") aterAter = "sampeyan";
        else if (tingkat === "bagongan") aterAter = "di";
    }
    else if (["sa","pa","pi","ke","per"].includes(awalanType)) {
        if(awalanType==="per") aterAter = "pa";
        else aterAter = awalanType;
    }
    if(konfiks==="ke-an") {
        if(!aterAter) {
            if(tingkat==="bagongan") aterAter="ka";
            else aterAter="ke";
        }
        panambang = "an";
    } else if(konfiks==="per-an") {
        if(!aterAter) aterAter="pa";
        panambang = "an";
    }
    if (akhiranType === "pemilikan") {
        if (tingkat === "krama" || tingkat === "krama_inggil") panambang = "ipun";
        else panambang = "e";
    } else if (akhiranType === "kausatif") {
        if (tingkat === "ngoko") panambang = "ake";
        else panambang = "aken";
    } else if (akhiranType === "lokatif") {
        panambang = "i";
    } else if (akhiranType === "imperatif_aktif") {
        panambang = "a";
    } else if (akhiranType === "imperatif_pasif") {
        panambang = "en";
    } else if (akhiranType === "an" || akhiranType === "nomina") {
        if(!panambang) panambang = "an";
    }
    if (!aterAter && !panambang) return kataDasar;
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
    if (typeof window.prosesParamasastra === 'function') window.prosesParamasastra();
    document.getElementById = getEl;
    return mockOutLat.value || dasar;
}

function tampilkanHasil(idLatin, idJawa, kataItems, isBagonganCard = false, cardLevel = "ngoko") {
    const elLatin = document.getElementById(idLatin);
    const elJawa = document.getElementById(idJawa);
    if (!elLatin) return;
    if (!kataItems || kataItems.length === 0) {
        elLatin.innerText = "-";
        if (elJawa) elJawa.innerText = "";
        return;
    }
    let htmlContent = kataItems.map(item => {
        let hormatBadge = item.isHormat ? ' <span style="font-size:0.6rem; background:#f97316; color:white; padding:1px 4px; border-radius:4px;">hormat</span>' : '';
        if (item.isMissing) {
            let displayText = item.text ? item.text.replace(/-/g, "") : "";
            return `<span class="word-span missing-word" contenteditable="true" spellcheck="false" data-index="${item.wordIndex}">${displayText}</span>${hormatBadge}`;
        } else if (item.hasVariants) {
            let optionsHtml = item.variants.map(vObj => {
                let isSelected = vObj.stem === item.selectedStem ? "selected" : "";
                let displayVal = vObj.transformed ? vObj.transformed.replace(/-/g, "") : vObj.stem;
                return `<option value="${vObj.stem}" ${isSelected}>${displayVal}</option>`;
            }).join("");
            return `<select class="variant-select green-variant" data-index="${item.wordIndex}" data-level="${cardLevel}">${optionsHtml}</select>${hormatBadge}`;
        } else {
            let displayText = item.text ? item.text.replace(/-/g, "") : "";
            return `<span class="word-span" contenteditable="true" spellcheck="false" data-index="${item.wordIndex}">${displayText}</span>${hormatBadge}`;
        }
    }).join(" ");
    elLatin.innerHTML = htmlContent;
    let systemTextWithHyphens = kataItems.map(item => item.text).join(" ");
    if (elJawa && typeof window.transliterasiKalimat === 'function') {
        elJawa.innerText = window.transliterasiKalimat(systemTextWithHyphens);
    }
    elLatin.querySelectorAll(".variant-select").forEach(select => {
        select.addEventListener("change", () => {
            let wordIndex = parseInt(select.getAttribute("data-index"));
            let level = select.getAttribute("data-level");
            let selectedStem = select.value;
            if (!isNaN(wordIndex) && currentWordsData[wordIndex]) {
                if (!currentWordsData[wordIndex].selectedVariants) currentWordsData[wordIndex].selectedVariants = {};
                currentWordsData[wordIndex].selectedVariants[level] = selectedStem;
                renderAllCards();
            }
        });
    });
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
                    if (matched) currentWordsData[wordIndex].customBagonganEntry = matched;
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
            if (e.key === "Enter") { e.preventDefault(); span.blur(); }
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

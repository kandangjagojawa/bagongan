
/**
 * APP.JS - Versi 4.0 dengan Auto Krama Inggil + Krama Andhap
 * - Hormat (Inggil): bapak/ibu/beliau -> dhahar, tilem, rawuh, tindak
 * - Andhap (Merendah): saya/kula -> kula nedha, kula sowan, kula nyaosi
 * - Both: saya memberi bapak yang sedang makan -> kula nyaosi bapak ingkang dhahar
 */

let kamusData = [];
let currentWordsData = [];
let isHormatAktif = false;
let isAndhapAktif = false;
window.isHormatAktif = false;
window.isAndhapAktif = false;

document.addEventListener("DOMContentLoaded", () => {
    fetch("kamuskramamet.json")
        .then(r => {
            if (!r.ok) throw new Error("Gagal memuat kamuskramamet.json");
            return r.json();
        })
        .then(data => {
            kamusData = data;
            console.log("Kamus:", kamusData.length);
        })
        .catch(err => console.error(err));

    const inputArea = document.getElementById("inputIndonesia");
    if (inputArea) inputArea.addEventListener("input", debounce(prosesTerjemahan, 400));
    const selSubjek = document.getElementById("selSubjek");
    if (selSubjek) selSubjek.addEventListener("change", prosesTerjemahan);
});

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const KATA_HORMAT = [
    "bapak","bpk","ibu","bu","beliau","eyang","mbah","simbah",
    "pakde","bude","paklik","bulik","rama","eyang kakung","eyang putri",
    "gusti","ndoro","kanjeng","kyai","ustad","ustadz","romo","suster","bruder",
    "panjenengan","sampeyan","tuan","nyonya","kakek","nenek","eyang"
];

const KATA_SAYA = ["saya","aku","kula","kulo","kami","kita","kulon","aku"];

const ANDHAP_DICT = {
    // pronoun handled separately, but include here for fallback
    "saya": "kula",
    "aku": "kula",
    "kami": "kula",
    "kita": "kula",
    // andhap verbs - giving, seeing, hearing, etc to respected person
    "beri": "sukani",
    "memberi": "nyaosi",
    "memberikan": "nyaosaken",
    "memberiakan": "nyaosaken",
    "kasih": "sukani",
    "mengasih": "nyaosi",
    "lihat": "sumerep",
    "melihat": "sumerep",
    "dengar": "midhanget",
    "mendengar": "midhanget",
    "ambil": "mundhut",
    "mengambil": "mundhut",
    "bawa": "mbekta",
    "membawa": "mbekta",
    "datang": "sowan",
    "mendatangi": "sowani",
    "pergi": "kesah",
    "makan": "nedha", // andhap: kula nedha (not dhahar)
    "minum": "ngunjuk",
    "tidur": "sare", // andhap: kula sare (not tilem)
    "duduk": "lenggah",
    "berdiri": "jumeneng",
    "masuk": "mlebet",
    "keluar": "medal",
    "naik": "minggah",
    "turun": "mandhap",
    "beli": "tumbas",
    "membeli": "numbas",
    "jual": "sade",
    "baca": "maos",
    "membaca": "maos",
    "tulis": "serat",
    "menulis": "nyerat",
    "bicara": "sanjang",
    "berbicara": "sanjang",
    "bertemu": "kepanggih",
    "temu": "panggih",
    "menemukan": "manggihaken",
    "cari": "pados",
    "mencari": "madosi",
    "ingat": "emut",
    "mengingat": "emut",
    "lupa": "kesupen",
    "tahu": "ngertos",
    "mengetahui": "ngertos",
    "kenal": "tepang",
    "mengenal": "tepang",
    "minta": "nyuwun",
    "meminta": "nyuwun",
    "pinjam": "nyambut",
    "meminjam": "nyambut",
    "atur": "atur",
    "mengatur": "ngatur",
    "aturkan": "aturaken",
    "sampaikan": "aturaken",
    "menyampaikan": "ngaturaken"
};

function deteksiMode(inputTeks, modeSelect) {
    let lower = inputTeks.toLowerCase();
    let hasHormat = KATA_HORMAT.some(k => lower.includes(k));
    let hasSaya = KATA_SAYA.some(k => lower.split(/\s+/).includes(k)) || lower.includes("saya") || lower.includes(" aku ");

    if (modeSelect === "biasa") return {isHormat: false, isAndhap: false};
    if (modeSelect === "saya_andhap") return {isHormat: false, isAndhap: true};
    if (modeSelect === "beliau_hormat") return {isHormat: true, isAndhap: false};
    if (modeSelect === "both") return {isHormat: true, isAndhap: true};

    // auto
    if (hasHormat && hasSaya) return {isHormat: true, isAndhap: true};
    if (hasHormat) return {isHormat: true, isAndhap: false};
    if (hasSaya && (lower.includes("panjenengan") || lower.includes("sampeyan") || lower.includes("bapak") || lower.includes("ibu"))) {
        return {isHormat: true, isAndhap: true};
    }
    if (hasSaya) {
        // kalau cuma saya tapi tanpa bapak, anggap andhap kalau ada kata hormat implisit? untuk sekarang biasa
        return {isHormat: false, isAndhap: false};
    }
    return {isHormat: false, isAndhap: false};
}

function prosesTerjemahan() {
    const inputEl = document.getElementById("inputIndonesia");
    const inputTeks = inputEl ? inputEl.value.trim() : "";
    const selSubjek = document.getElementById("selSubjek");
    const mode = selSubjek ? selSubjek.value : "auto";

    let modeObj = deteksiMode(inputTeks, mode);
    isHormatAktif = modeObj.isHormat;
    isAndhapAktif = modeObj.isAndhap;
    window.isHormatAktif = isHormatAktif;
    window.isAndhapAktif = isAndhapAktif;

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

function pilihStemBagongan(entry, originalWord) {
    if (!entry) return null;
    // Bagongan murni: pakai krama/ngoko dari entry bagongan asli, tanpa pengaruh hormat/andhap
    // Contoh: [bagongan] saya -> manira, [bagongan] ada -> wenten
    return entry.krama || entry.ngoko || entry.krama_inggil;
}

function pilihStem(entry, level, isHormat, isAndhap, originalWord) {
    if (!entry) return null;
    let lowOrig = originalWord.toLowerCase().replace(/[^a-z]/g,"");

    // pronoun khusus
    if (["saya","aku","kula","kulo"].includes(lowOrig)) {
        if (isAndhap || isHormat) return "kula";
        if (level === "ngoko") return "aku";
        return "kula";
    }
    if (["kami","kita"].includes(lowOrig)) {
        if (isAndhap) return "kula";
        return entry.ngoko || "kita";
    }
    if (["kamu","anda","sampeyan"].includes(lowOrig)) {
        if (isHormat) return "panjenengan";
        if (level === "ngoko") return "kowe";
        return "sampeyan";
    }
    if (["dia","beliau"].includes(lowOrig)) {
        if (isHormat) return "piyambakipun";
        return entry.ngoko || "dheweke";
    }

    // andhap override dulu (untuk both mode, andhap diprioritaskan untuk kata kerja memberi, melihat, dll)
    if (isAndhap) {
        if (ANDHAP_DICT[lowOrig]) return ANDHAP_DICT[lowOrig];
        let baseIndo = entry.indonesia.toLowerCase();
        if (ANDHAP_DICT[baseIndo]) return ANDHAP_DICT[baseIndo];
    }

    // hormat -> krama inggil
    if (isHormat) {
        let ki = entry.krama_inggil;
        if (ki && ki !== "" && ki !== entry.ngoko) {
            // untuk kata yang punya krama inggil beda, pakai itu
            // kecuali kalau kata ini adalah andhap (sudah di-handle di atas), jadi yang sisa adalah inggil
            return ki;
        }
    }

    // andhap tanpa hormat -> pakai krama (merendah)
    if (isAndhap) {
        return entry.krama || entry.ngoko_alus || entry.ngoko;
    }

    // biasa
    if (level === "ngoko") return entry.ngoko;
    if (level === "ngoko_alus") return entry.ngoko_alus;
    if (level === "krama") return entry.krama;
    if (level === "krama_inggil") return entry.krama_inggil;
    if (level === "bagongan") return entry.krama || entry.ngoko;
    return entry.ngoko;
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
            let defaultStem;
            if (level === "bagongan") {
                // Bagongan harus murni, tidak terpengaruh mode hormat/andhap
                defaultStem = pilihStemBagongan(entryObj, wordObj.originalInput);
                if (!defaultStem) defaultStem = entryObj ? (entryObj.ngoko || entryObj.krama || analisisId.kataDasar) : analisisId.kataDasar;
            } else {
                defaultStem = pilihStem(entryObj, level, isHormatAktif, isAndhapAktif, wordObj.originalInput);
                if (!defaultStem) defaultStem = entryObj ? (entryObj[level] || analisisId.kataDasar) : analisisId.kataDasar;
            }
            
            let selectedStem = wordObj.selectedVariants[level] || defaultStem;
            let varList = getVariantsForLevel(entryObj, level);
            
            // kalau hormat, varian dari krama_inggil
            if (isHormatAktif && entryObj && level !== "ngoko") {
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
                    isHormat: isHormatAktif,
                    isAndhap: isAndhapAktif
                };
            } else {
                return {
                    wordIndex: idx,
                    text: terapkanMorfologi(selectedStem, level, awalanFinal, akhiranFinal, analisisId),
                    isMissing: isMissing,
                    hasVariants: false,
                    isHormat: isHormatAktif,
                    isAndhap: isAndhapAktif
                };
            }
        };

        // BAGONGAN: pakai vocab bagongan asli kalau ada, kalau tidak fallback ke standard tapi dengan morfologi ka-
        let bagEntryPure = wordObj.customBagonganEntry || wordObj.bagonganEntry;
        let bagEntryForStem = bagEntryPure || stdEntry; // untuk fallback morfologi ka-
        let isMissingBag = !bagEntryForStem; // hanya missing kalau tidak ada vocab sama sekali
        let bagEntry = bagEntryForStem;
        let isPureBagongan = !!bagEntryPure; // flag untuk debug, apakah ini vocab bagongan asli

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
            console.warn("fallback", e);
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
    const tryPrefix = (p) => {
        if(stem.startsWith(p)) {
            let rest = stem.slice(p.length);
            let cand = rest;
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
        let res = tryPrefix(p);
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

function cariKamusStandard(kata) {
    if (!kamusData || kamusData.length === 0 || !kata) return null;
    let clean = kata.toLowerCase().trim().replace(/[^a-z\-]/g, "");
    if (!clean) return null;
    let match = kamusData.find(item => {
        let ind = item.indonesia ? item.indonesia.toLowerCase() : "";
        if (ind.startsWith("[bagongan]")) return false;
        return ind === clean;
    });
    if (match) return match;
    return null;
}

function cariKamusBagongan(kata) {
    if (!kamusData || !kata) return null;
    let clean = kata.toLowerCase().trim();
    let bagEntry = kamusData.find(item => item.indonesia.toLowerCase() === `[bagongan] ${clean}`);
    if (bagEntry) return bagEntry;
    // Jangan fallback ke standard untuk deteksi murni bagongan
    // Kembalikan null biar bisa ditandai missing atau fallback dengan morfologi ka-
    return null;
}



function terapkanMorfologi(kataDasar, tingkat, awalanType, akhiranType, analisisLengkap) {
    if (!kataDasar) return "";
    let aterAter = "";
    let panambang = "";
    let konfiks = analisisLengkap ? analisisLengkap.konfiks : "";

    // Normalisasi awalan dari modul morfologi-id
    if(awalanType==="ber" || awalanType==="be") awalanType="N";
    if(awalanType==="ter") awalanType="ter";

    // === ATER-ATER (Awalan Jawa) ===
    if (awalanType === "N") {
        // me-, mem-, men-, meng-, ber- -> N- untuk semua tingkat
        aterAter = "N";
    }
    else if (awalanType === "pasif") {
        // di- -> di- (ngoko), dipun- (krama), ka- (bagongan)
        if (tingkat === "ngoko" || tingkat === "ngoko_alus") aterAter = "di";
        else if (tingkat === "krama" || tingkat === "krama_inggil") aterAter = "dipun";
        else if (tingkat === "bagongan") aterAter = "ka"; // Bagongan pakai ka- untuk pasif
    }
    else if (awalanType === "ter") {
        // ter- -> ke- (ngoko/krama), ka- (bagongan)
        if (tingkat === "bagongan") aterAter = "ka";
        else aterAter = "ke";
    }
    else if (awalanType === "pelaku1") {
        // kubuka, kumakan -> tak- (ngoko), kula- (krama), ka-/di- (bagongan)
        if (tingkat === "ngoko" || tingkat === "ngoko_alus") aterAter = "tak";
        else if (tingkat === "krama" || tingkat === "krama_inggil") aterAter = "kula";
        else if (tingkat === "bagongan") aterAter = "ka";
    }
    else if (awalanType === "pelaku2") {
        // kaubuka -> kok- (ngoko), sampeyan/panjenengan (krama), ka-/di- (bagongan)
        if (tingkat === "ngoko") aterAter = "kok";
        else if (tingkat === "krama") aterAter = "sampeyan";
        else if (tingkat === "ngoko_alus" || tingkat === "krama_inggil") aterAter = "panjenengan";
        else if (tingkat === "bagongan") aterAter = "ka";
    }
    else if (["sa","pa","pi","ke","per"].includes(awalanType)) {
        // sa-, pa-, pi-, per-, ke- tetap, per- jadi pa-
        if(awalanType==="per") aterAter = "pa";
        else aterAter = awalanType;
    }

    // === KONFIKS (ke-an, per-an) ===
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

    // === PANAMBANG (Akhiran Jawa) ===
    if (akhiranType === "pemilikan") {
        // -nya, -ku, -mu -> -e (ngoko, ngoko_alus, bagongan), -ipun (krama, krama_inggil)
        // Bagongan pakai -e seperti ngoko (lebih kasar), bukan -ipun
        if (tingkat === "krama" || tingkat === "krama_inggil") panambang = "ipun";
        else panambang = "e"; // ngoko, ngoko_alus, bagongan
    } 
    else if (akhiranType === "kausatif") {
        // -kan -> -ake (ngoko, bagongan), -aken (krama, krama_inggil, ngoko_alus)
        // Bagongan pakai -ake seperti ngoko (paugeran bagongan: -ake, bukan -aken)
        if (tingkat === "ngoko" || tingkat === "bagongan") panambang = "ake";
        else panambang = "aken"; // ngoko_alus, krama, krama_inggil
    } 
    else if (akhiranType === "lokatif") {
        // -i -> -i untuk semua tingkat
        panambang = "i";
    } 
    else if (akhiranType === "imperatif_aktif") {
        // -lah aktif -> -a
        panambang = "a";
    }
    else if (akhiranType === "imperatif_pasif") {
        // -lah pasif -> -en
        panambang = "en";
    }
    else if (akhiranType === "an" || akhiranType === "nomina") {
        // -an -> -an untuk semua tingkat
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
        let badges = "";
        if (item.isHormat) badges += ' <span style="font-size:0.6rem; background:#f97316; color:white; padding:1px 4px; border-radius:4px;">inggil</span>';
        if (item.isAndhap) badges += ' <span style="font-size:0.6rem; background:#0284c7; color:white; padding:1px 4px; border-radius:4px;">andhap</span>';
        if (item.isMissing) {
            let displayText = item.text ? item.text.replace(/-/g, "") : "";
            return `<span class="word-span missing-word" contenteditable="true" spellcheck="false" data-index="${item.wordIndex}">${displayText}</span>${badges}`;
        } else if (item.hasVariants) {
            let optionsHtml = item.variants.map(vObj => {
                let isSelected = vObj.stem === item.selectedStem ? "selected" : "";
                let displayVal = vObj.transformed ? vObj.transformed.replace(/-/g, "") : vObj.stem;
                return `<option value="${vObj.stem}" ${isSelected}>${displayVal}</option>`;
            }).join("");
            return `<select class="variant-select green-variant" data-index="${item.wordIndex}" data-level="${cardLevel}">${optionsHtml}</select>${badges}`;
        } else {
            let displayText = item.text ? item.text.replace(/-/g, "") : "";
            return `<span class="word-span" contenteditable="true" spellcheck="false" data-index="${item.wordIndex}">${displayText}</span>${badges}`;
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

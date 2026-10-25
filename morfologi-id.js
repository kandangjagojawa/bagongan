/**
 * morfologi-id.js
 * Modul pengurai imbuhan Bahasa Indonesia lengkap
 * Mendukung: me-, mem-, men-, meng-, meny-, memper-, di-, ber-, ter-, ke-, se-, per-, pe-, pem-, pen-, peng-, peny-, pel-, be-, te-
 * Akhiran: -kan, -an, -i, -nya, -ku, -mu, -lah, -kah, -pun
 * Konfiks: ke-an, per-an, pe-an, se-an, ber-an, me-kan, me-i, di-kan, di-i, ke-an, se-nya
 * Infix: -el-, -em-, -er- (opsional)
 */

const PREFIXES_SORTED = [
    "memper", "diper", "keber", "keter", "berke",
    "mem", "men", "meng", "meny", "pem", "pen", "peng", "peny",
    "ber", "ter", "per", "pel", "bel", "be", "te",
    "di", "ke", "se", "me", "pe"
].sort((a,b)=>b.length-a.length);

const SUFFIXES = ["kan", "an", "i"];
const PARTICLES = ["kah", "lah", "pun", "tah"];
const POSSESSIVES = ["nya", "ku", "mu"];

function generateCandidates(prefix, remainder) {
    const rem = remainder.toLowerCase();
    let cands = [];
    switch(prefix) {
        case "meny":
            // menyapu -> sapu, menyanyi -> nyanyi, menyuci -> cuci
            cands.push("s"+rem, "c"+rem, "ny"+rem, "sy"+rem, rem);
            break;
        case "peny":
            cands.push("s"+rem, "c"+rem, "ny"+rem, rem);
            break;
        case "meng":
            // mengharap -> harap / kharap, mengaji -> kaji / ngaji
            cands.push(rem, "k"+rem, "g"+rem, "ng"+rem, "h"+rem);
            break;
        case "peng":
            cands.push(rem, "k"+rem, "g"+rem);
            break;
        case "men":
            // menulis -> tulis, menari -> tari, menunggu -> tunggu
            cands.push(rem, "t"+rem, "n"+rem, "d"+rem);
            break;
        case "pen":
            cands.push(rem, "t"+rem);
            break;
        case "mem":
            // memukul -> pukul, membawa -> bawa, memfitnah -> fitnah
            cands.push(rem, "p"+rem, "b"+rem, "f"+rem, "m"+rem, "v"+rem);
            break;
        case "pem":
            cands.push(rem, "p"+rem, "b"+rem);
            break;
        case "memper":
        case "diper":
        case "ber":
        case "ter":
        case "per":
        case "pel":
        case "be":
        case "te":
        case "di":
        case "ke":
        case "se":
        case "me":
        case "pe":
        case "keber":
        case "keter":
        case "berke":
            cands.push(rem);
            // ber- + r... -> be + r... (belajar -> ajar)
            if(prefix==="ber" || prefix==="be" || prefix==="bel") {
                cands.push("r"+rem);
                // belajar -> ajar (bel + ajar)
                if(rem.startsWith("l")) {
                    // bel + ajar -> ajar
                }
            }
            break;
        default:
            cands.push(rem);
    }
    // Unik + filter panjang
    return [...new Set(cands)].filter(x=>x.length>=3);
}

// Fungsi cek kamus akan di-inject dari app.js via window.cariKamusStandard
function isInKamusFn(checkFn, kata) {
    if(!checkFn) return false;
    return !!checkFn(kata);
}

function uraiMorfologiIndonesiaLengkap(kataInput, cariKamusStandard) {
    let clean = kataInput.toLowerCase().replace(/[^a-z\-]/g,"");
    if(!clean) return { kataDasar: kataInput, awalan: "", akhiran: "", prefiks: [], sufiks: [], entry: null, original: kataInput };

    // 1. Cek langsung
    let direct = cariKamusStandard ? cariKamusStandard(clean) : null;
    if(direct) {
        return { kataDasar: clean, awalan: "", akhiran: "", prefiks: [], sufiks: [], konfiks: "", entry: direct, original: kataInput };
    }

    let original = clean;
    let word = clean;
    let prefiksFound = [];
    let sufiksFound = [];
    let particlesFound = [];

    // 2. Lepas partikel: -kah, -lah, -pun
    let loop = true;
    while(loop) {
        loop = false;
        for(let p of PARTICLES) {
            if(word.endsWith(p) && word.length > p.length + 3) {
                // pastikan sisa masih plausible
                let sisa = word.slice(0, -p.length);
                if(sisa.length>=3) {
                    word = sisa;
                    particlesFound.push(p);
                    loop = true;
                    break;
                }
            }
        }
    }

    // 3. Lepas possessive pronoun: -nya, -ku, -mu
    for(let pos of POSSESSIVES) {
        if(word.endsWith(pos) && word.length > pos.length + 3) {
            let sisa = word.slice(0, -pos.length);
            // -nya khusus
            if(pos==="nya") sufiksFound.push("nya");
            else sufiksFound.push(pos);
            word = sisa;
            break; // hanya satu possessive
        }
    }

    // 4. Lepas suffix -kan, -an, -i dengan validasi kamus
    // Kita coba strip suffix hanya jika sisa menghasilkan kata yang ada di kamus atau bisa di-strip prefiksnya
    function bisaJadiDasar(sisa) {
        if(!sisa || sisa.length<3) return false;
        if(cariKamusStandard && cariKamusStandard(sisa)) return true;
        // coba apakah sisa bisa diurai prefiksnya jadi ada di kamus
        for(let pref of PREFIXES_SORTED) {
            if(sisa.startsWith(pref) && sisa.length > pref.length+2) {
                let rem = sisa.slice(pref.length);
                let cands = generateCandidates(pref, rem);
                for(let cand of cands) {
                    if(cariKamusStandard && cariKamusStandard(cand)) return true;
                }
                // juga cek rem langsung
                if(cariKamusStandard && cariKamusStandard(rem)) return true;
            }
        }
        // Jika tidak ada di kamus, tetap izinkan jika sisa panjang dan bukan hasil potongan salah seperti berlar
        // Untuk -i, hindari jika sisa berakhiran konsonan ganda atau tidak plausible
        return null; // null = mungkin
    }

    for(let iter=0; iter<2; iter++) {
        let found = false;
        // prioritas kan > an > i
        for(let suf of SUFFIXES) {
            if(word.endsWith(suf) && word.length > suf.length + 2) {
                let sisa = word.slice(0, -suf.length);
                if(sisa.length<3) continue;
                let valid = bisaJadiDasar(sisa);
                // Untuk -an dan -kan, lebih longgar
                if(suf==="kan" || suf==="an") {
                    // jika valid===false, skip. Jika null (mungkin), tetap izinkan untuk kan/an
                    if(valid===false) continue;
                    sufiksFound.push(suf);
                    word = sisa;
                    found = true;
                    break;
                } else if(suf==="i") {
                    // -i harus lebih ketat: hanya jika sisa ada di kamus atau prefiksnya jelas
                    if(valid===true) {
                        sufiksFound.push(suf);
                        word = sisa;
                        found = true;
                        break;
                    }
                    // Jika tidak valid, jangan potong -i (hindari berlari -> berlar)
                }
            }
        }
        if(!found) break;
    }

    // 5. Lepas prefiks bertingkat (max 2 lapis untuk keber-, memper-, etc)
    let tempWord = word;
    let attempts = 0;
    let baseFound = null;
    let baseCandidateFinal = null;

    // Fungsi rekursif coba prefiks
    function tryStripPrefiks(currentWord, depth, collectedPrefiks) {
        if(depth>3) return null;
        // Cek apakah currentWord ada di kamus
        let entry = cariKamusStandard ? cariKamusStandard(currentWord) : null;
        if(entry) {
            return { base: currentWord, entry: entry, prefiks: collectedPrefiks };
        }
        // Coba semua prefiks
        for(let pref of PREFIXES_SORTED) {
            if(currentWord.startsWith(pref) && currentWord.length > pref.length + 2) {
                let remainder = currentWord.slice(pref.length);
                if(remainder.length < 3) continue;
                let candidates = generateCandidates(pref, remainder);
                for(let cand of candidates) {
                    let e = cariKamusStandard ? cariKamusStandard(cand) : null;
                    if(e) {
                        return { base: cand, entry: e, prefiks: [...collectedPrefiks, pref] };
                    }
                }
                // Jika tidak ketemu, coba rekursif strip lagi
                let deeper = tryStripPrefiks(remainder, depth+1, [...collectedPrefiks, pref]);
                if(deeper) {
                    // deeper.base sudah kandidat, tapi kita perlu cek luluh lagi untuk remainder?
                    // Coba generate ulang dari remainder yang sudah di-strip?
                    return deeper;
                }
                // Coba juga candidates untuk deeper
                for(let cand of candidates) {
                    let deeper2 = tryStripPrefiks(cand, depth+1, [...collectedPrefiks, pref]);
                    if(deeper2) return deeper2;
                }
            }
        }
        return null;
    }

    let result = tryStripPrefiks(tempWord, 0, []);
    
    let kataDasar = original;
    let entry = null;
    if(result) {
        kataDasar = result.base;
        entry = result.entry;
        prefiksFound = result.prefiks;
    } else {
        // Fallback 1: coba strip prefiks tanpa cek kamus (best guess) - penting untuk kata yang belum ada di kamus seperti 'main'
        let bestGuess = null;
        let temp = tempWord;
        let collected = [];
        for(let loop=0; loop<3; loop++) {
            let foundPref = false;
            for(let pref of PREFIXES_SORTED) {
                if(temp.startsWith(pref) && temp.length > pref.length+2) {
                    let rem = temp.slice(pref.length);
                    let cands = generateCandidates(pref, rem);
                    // ambil kandidat terpanjang yang plausible
                    let best = cands[0] || rem;
                    collected.push(pref);
                    temp = best;
                    foundPref = true;
                    break;
                }
            }
            if(!foundPref) break;
        }
        if(collected.length>0) {
            bestGuess = { base: temp, prefiks: collected };
        }

        if(bestGuess) {
            kataDasar = bestGuess.base;
            prefiksFound = bestGuess.prefiks;
            entry = cariKamusStandard ? cariKamusStandard(kataDasar) : null;
        } else {
            // Fallback 2: infix -el-, -em-, -er-
            let infixRemoved = tempWord;
            let infixPatterns = [
                {infix: "el", pos: 1}, {infix: "em", pos:1}, {infix: "er", pos:1}
            ];
            if(tempWord.length>4) {
                for(let pat of infixPatterns) {
                    let idx = tempWord.indexOf(pat.infix, 1);
                    if(idx>0 && idx<4) {
                        let coba = tempWord.slice(0, idx) + tempWord.slice(idx+2);
                        let e = cariKamusStandard ? cariKamusStandard(coba) : null;
                        if(e) {
                            kataDasar = coba;
                            entry = e;
                            break;
                        }
                    }
                }
            }
            if(!entry) {
                kataDasar = tempWord;
                entry = cariKamusStandard ? cariKamusStandard(tempWord) : null;
            }
        }
    }

    // Tentukan mapping ke Jawa
    let mapping = tentukanMappingJawa(prefiksFound, sufiksFound, particlesFound);

    return {
        kataDasar: kataDasar,
        original: original,
        prefiks: prefiksFound,
        sufiks: sufiksFound,
        particles: particlesFound,
        awalan: mapping.awalan,
        akhiran: mapping.akhiran,
        konfiks: mapping.konfiks,
        awalanIndo: prefiksFound.join("-"),
        akhiranIndo: sufiksFound.join("-"),
        entry: entry
    };
}

function tentukanMappingJawa(prefiks, sufiks, particles) {
    let hasMe = prefiks.some(p=>["me","mem","men","meng","meny","memper","memer","menge"].includes(p) || p.startsWith("mem") || p.startsWith("men") || p.startsWith("meng") || p.startsWith("meny"));
    let hasDi = prefiks.includes("di") || prefiks.some(p=>p.startsWith("diper"));
    let hasBer = prefiks.includes("ber") || prefiks.includes("be") || prefiks.includes("bel") || prefiks.includes("berke");
    let hasTer = prefiks.includes("ter") || prefiks.includes("te");
    let hasKe = prefiks.includes("ke") || prefiks.includes("keber") || prefiks.includes("keter");
    let hasSe = prefiks.includes("se");
    let hasPer = prefiks.includes("per") || prefiks.includes("pe") || prefiks.includes("pel");
    let hasPe = prefiks.includes("pe") || prefiks.includes("pem") || prefiks.includes("pen") || prefiks.includes("peng") || prefiks.includes("peny");

    let hasKan = sufiks.includes("kan");
    let hasAn = sufiks.includes("an");
    let hasI = sufiks.includes("i");
    let hasNya = sufiks.includes("nya") || sufiks.includes("ku") || sufiks.includes("mu");

    let awalan = "";
    let akhiran = "";
    let konfiks = "";

    // Tentukan awalan Jawa
    if(hasMe) awalan = "N";
    else if(hasBer) awalan = "N"; // ber- -> N- dalam Jawa (berjalan -> mlaku)
    else if(hasDi) awalan = "pasif";
    else if(hasTer) awalan = "ter"; // akan di-handle sebagai ke-
    else if(hasPer || hasPe) {
        // per-an, pe-an -> pa- atau pi-
        if(hasAn) awalan = "pa";
        else awalan = "pa";
    }
    else if(hasKe && hasAn) {
        awalan = "ke";
        konfiks = "ke-an";
    }
    else if(hasKe) awalan = "ke";
    else if(hasSe) awalan = "sa";

    // Tentukan akhiran Jawa
    if(hasKan && hasAn) {
        // ke-an + kan? jarang, tapi prioritaskan kan
        akhiran = "kausatif";
        if(hasKe) konfiks = "ke-an";
    } else if(hasKan) {
        akhiran = "kausatif";
    } else if(hasI) {
        akhiran = "lokatif";
    } else if(hasAn) {
        if(hasKe) {
            akhiran = "an";
            konfiks = "ke-an";
        } else if(hasPer || hasPe) {
            akhiran = "an";
            konfiks = "per-an";
        } else {
            akhiran = "an";
        }
    } else if(hasNya) {
        akhiran = "pemilikan";
    }

    // Jika ada kombinasi ke-an
    if(hasKe && hasAn) {
        konfiks = "ke-an";
        if(!awalan) awalan = "ke";
        if(!akhiran) akhiran = "an";
    }
    if((hasPer || hasPe) && hasAn) {
        if(!konfiks) konfiks = "per-an";
    }

    return { awalan, akhiran, konfiks };
}

// Export untuk browser
if(typeof window !== 'undefined') {
    window.uraiMorfologiIndonesiaLengkap = uraiMorfologiIndonesiaLengkap;
    window.tentukanMappingJawa = tentukanMappingJawa;
    window.generateCandidates = generateCandidates;
}

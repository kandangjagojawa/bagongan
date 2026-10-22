/**
 * SRIWEDARI.JS
 * Modul Transliterasi Aksara Jawa Paugeran Sriwedari (Murni 1926).
 * Perbaikan: Pengelompokan vokal hiatus (é/è -> h), Anuswara Tancap lookbehind,
 * konversi Warga Talawya otomatis (nc/nj -> nyc/nyj), serta koreksi Tembung Dwipurwa.
 */

const KAMUS_AKSARA = {
    'h':'ꦲ', 'n':'ꦤ', 'c':'ꦕ', 'r':'ꦫ', 'k':'ꦏ',
    'd':'ꦢ', 't':'ꦠ', 's':'ꦱ', 'w':'ꦮ', 'l':'ꦭ',
    'p':'ꦥ', 'dh':'\uA9A3', 'j':'ꦗ', 'y':'ꦪ', 'ny':'ꦚ',
    'm':'ꦩ', 'g':'ꦒ', 'b':'ꦧ', 'th':'ꦛ', 'ng':'ꦔ', 'nx':'ꦔ',
    'f':'ꦥ꦳', 'v':'ꦮ꦳', 'z':'ꦗ꦳',
    'kh':'ꦏ꦳', 'dz':'ꦢ꦳', 'gh':'ꦒ꦳',
    'sy':'ꦯ',
    'kx':'ꦏ', 'rx':'ꦫ', 'hx':'ꦲ', 'ngx':'ꦔ'
};

const AKSARA_MURDA = {
    'n':'ꦟ', 'k':'ꦑ', 't':'ꦡ', 's':'ꦯ', 'p':'ꦦ',
    'g':'ꦓ', 'b':'ꦨ', 'ny':'ꦘ', 'j':'ꦙ'
};

const SWARA_MAP = {
    'A':'ꦄ', 'I':'ꦆ', 'U':'ꦈ', 'E':'ꦄꦼ', 'É':'ꦌ', 'È':'ꦌ', 'Ê':'ꦄꦼ', 'O':'ꦎ'
};

const ANGKA = ['꧐','꧑','꧒','꧓','꧔','꧕','꧖','꧗','꧘','꧙'];

function togglePedoman() {
    let p = document.getElementById('pedoman-section');
    if (!p) return;
    if (p.style.display === 'none' || p.style.display === '') {
        p.style.display = 'block';
        p.scrollIntoView({ behavior: 'smooth' });
    } else {
        p.style.display = 'none';
    }
}

function scrollToParamasastra() {
    let el = document.getElementById('paramasastra-app');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function scrollToDwipurwa() {
    let el = document.getElementById('dwipurwa-app');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function ubahFont() {
    let fontSel = document.getElementById('fontSelect');
    if (!fontSel) return;
    let fontTerpilih = fontSel.value;
    let outJawa = document.getElementById('outputJawa');
    let outParam = document.getElementById('outParamJawa');
    let outDwi = document.getElementById('outDwipurwaJawa');

    if (outJawa) outJawa.style.fontFamily = fontTerpilih;
    if (outParam) outParam.style.fontFamily = fontTerpilih;
    if (outDwi) outDwi.style.fontFamily = fontTerpilih;
}

function ubahUkuranFont() {
    let slider = document.getElementById('fontSizeSlider');
    if (!slider) return;
    let ukuran = slider.value;
    let outJawa = document.getElementById('outputJawa');
    if (outJawa) outJawa.style.fontSize = ukuran + 'rem';
}

function ubahJarakBaris() {
    let lineH = document.getElementById('lineHeightSlider');
    if (!lineH) return;
    let val = lineH.value;
    let outJawa = document.getElementById('outputJawa');
    let outParam = document.getElementById('outParamJawa');
    let outDwi = document.getElementById('outDwipurwaJawa');

    if (outJawa) outJawa.style.lineHeight = val;
    if (outParam) outParam.style.lineHeight = val;
    if (outDwi) outDwi.style.lineHeight = val;
}

function hapusSemua() {
    let inp = document.getElementById('inputLatin');
    if (inp) inp.value = '';
    prosesTransliterasi();
}

function salinAksara() {
    let el = document.getElementById('outputJawa');
    if (!el) return;
    let teksAksara = el.innerText;
    if (!teksAksara) return;
    navigator.clipboard.writeText(teksAksara).then(() => {
        let btn = document.getElementById('btnSalin');
        if (btn) {
            let originalText = btn.innerText;
            btn.innerText = 'Tersalin!';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        }
    });
}

function salinParamLatin() {
    let el = document.getElementById('outParamLatin');
    if (!el) return;
    let teksLatin = el.value;
    if (!teksLatin) return;
    navigator.clipboard.writeText(teksLatin);
}

function salinParamJawa() {
    let el = document.getElementById('outParamJawa');
    if (!el) return;
    let teksAksara = el.innerText;
    if (!teksAksara) return;
    navigator.clipboard.writeText(teksAksara).then(() => {
        let btn = document.getElementById('btnSalinParam');
        if (btn) {
            let originalText = btn.innerText;
            btn.innerText = 'Tersalin!';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        }
    });
}

function updateParamFromManualInput() {
    let inp = document.getElementById('outParamLatin');
    let out = document.getElementById('outParamJawa');
    if (inp && out) {
        out.innerText = transliterasiKalimat(inp.value);
    }
}

function prosesDwipurwa() {
    let inDwi = document.getElementById('inDwipurwa');
    let outLat = document.getElementById('outDwipurwaLatin');
    let outJaw = document.getElementById('outDwipurwaJawa');
    if (!inDwi) return;

    let dasarRaw = inDwi.value.trim();
    let dasar = dasarRaw.replace(/e'/g, 'é').replace(/E'/g, 'É').toLowerCase();

    if (!dasar) {
        if (outLat) outLat.value = "";
        if (outJaw) outJaw.innerHTML = "";
        return;
    }

    let firstVowelMatch = dasar.match(/[aiueoéèê]/i);
    let resultLatin = dasar;

    if (firstVowelMatch) {
        let vokalIndex = firstVowelMatch.index;
        let vokal = dasar[vokalIndex];
        let awalan = dasar.substring(0, vokalIndex);
        
        let konsonan = "h"; 
        if (awalan !== "") {
            let match = awalan.match(/^(dh|th|ng|ny|kh|dz|gh|sh|sy|[bcdfghjklmnpqrstvwxyz])([rylw])?$/);
            if (match) {
                konsonan = match[1];
            } else {
                let matchComplex = awalan.match(/^((?:dh|th|ng|ny|kh|dz|gh|sh|sy|[bcdfghjklmnpqrstvwxyz])+?)([rylw])?$/);
                if (matchComplex) {
                    konsonan = matchComplex[1];
                } else {
                    konsonan = awalan;
                }
            }
        }
        
        let prefix = konsonan + vokal;
        resultLatin = prefix + dasar;
    }

    if (outLat) outLat.value = resultLatin;
    if (outJaw) outJaw.innerText = transliterasiKalimat(resultLatin);
}

function salinDwipurwaLatin() {
    let el = document.getElementById('outDwipurwaLatin');
    if (!el) return;
    let teksLatin = el.value;
    if (!teksLatin) return;
    navigator.clipboard.writeText(teksLatin);
}

function salinDwipurwaJawa() {
    let el = document.getElementById('outDwipurwaJawa');
    if (!el) return;
    let teksAksara = el.innerText;
    if (!teksAksara) return;
    navigator.clipboard.writeText(teksAksara).then(() => {
        let btn = document.getElementById('btnSalinDwipurwa');
        if (btn) {
            let originalText = btn.innerText;
            btn.innerText = 'Tersalin!';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        }
    });
}

function updateDwipurwaFromManualInput() {
    let inp = document.getElementById('outDwipurwaLatin');
    let out = document.getElementById('outDwipurwaJawa');
    if (inp && out) {
        out.innerText = transliterasiKalimat(inp.value);
    }
}

function prosesParamasastra() {
    let selAter = document.getElementById('selAter');
    let inDasar = document.getElementById('inDasar');
    let selPanam = document.getElementById('selPanam');
    if (!selAter || !inDasar || !selPanam) return;

    let ater = selAter.value;
    let dasarRaw = inDasar.value.trim();
    let dasar = dasarRaw.replace(/e'/g, 'é').replace(/E'/g, 'É').toLowerCase();
    let panam = selPanam.value;

    let warnArea = document.getElementById('paramWarningArea');
    let outLat = document.getElementById('outParamLatin');
    let outJaw = document.getElementById('outParamJawa');

    if (warnArea) warnArea.innerHTML = "";

    if (!dasar) {
        if (outLat) outLat.value = "";
        if (outJaw) outJaw.innerHTML = "";
        return;
    }

    let f = dasar.charAt(0);
    let isVowelStart = /[aiueoéèê]/i.test(f);
    let errorMsg = "";

    if (ater === 'm' && !['b','p','w','m','f','v'].includes(f)) {
        errorMsg = `Ater-ater "m-" khusus untuk kata dasar berawalan p, b, w, m.`;
    } else if (ater === 'n' && !['d','t','j','n'].includes(f) && !dasar.startsWith('dh') && !dasar.startsWith('th')) {
        errorMsg = `Ater-ater "n-" khusus untuk kata dasar berawalan d, dh, t, th, j, n.`;
    } else if (ater === 'ny' && !['c','s'].includes(f) && !dasar.startsWith('ny')) {
        errorMsg = `Ater-ater "ny-" khusus untuk kata dasar berawalan c, s, ny.`;
    } else if (ater === 'ng' && !['g','k','l','r','y','w'].includes(f) && !isVowelStart && !dasar.startsWith('ng')) {
        errorMsg = `Ater-ater "ng-" khusus untuk kata dasar berawalan k, g, l, r, y, w, atau vokal.`;
    }

    if (errorMsg !== "") {
        if (warnArea) warnArea.innerHTML = `<div class="param-warning">⚠️ WARNING PAUGERAN: ${errorMsg}</div>`;
        if (outLat) outLat.value = "";
        if (outJaw) outJaw.innerHTML = "";
        return;
    }

    let stem = dasar;
    let prefixAppended = "";

    if (['N', 'm', 'n', 'ny', 'ng', 'pa'].includes(ater)) {
        if (dasar.startsWith('ng') || dasar.startsWith('ny') || f === 'm' || f === 'n') {
            stem = dasar;
        } else if (f === 'g') {
            prefixAppended = 'hang';
            stem = dasar;
        } 
        else if (['p','w'].includes(f)) stem = 'm' + dasar.slice(1);
        else if (f === 'b') stem = 'm' + dasar;
        else if (dasar.startsWith('th')) stem = 'n' + dasar.slice(2); 
        else if (f === 't') stem = 'n' + dasar.slice(1); 
        else if (['d','j'].includes(f) || dasar.startsWith('dh')) stem = 'n' + dasar; 
        else if (['c','s'].includes(f)) stem = 'ny' + dasar.slice(1);
        else if (f === 'k') stem = 'ng' + dasar.slice(1);
        else if (['l','r','y'].includes(f) || isVowelStart) stem = 'ng' + dasar;
        else stem = 'ng' + dasar;

        if (ater === 'pa') {
            prefixAppended = 'pa';
        }
    } else if (ater === 'pating_paN') {
        let nasal = '';
        if (dasar.startsWith('ng') || dasar.startsWith('ny') || f === 'm' || f === 'n') {
            nasal = '';
        } else if (['p','b','w','m','f','v'].includes(f)) {
            nasal = 'm';
        } else if (['t','d','j','n'].includes(f) || dasar.startsWith('dh') || dasar.startsWith('th')) {
            nasal = 'n';
        } else if (['c','s'].includes(f) || dasar.startsWith('ny')) {
            nasal = 'ny';
        } else {
            nasal = 'ng';
        }
        stem = 'pa' + nasal + dasar; 
        prefixAppended = 'pating ';
    } else if (ater === 'kuma') {
        if (isVowelStart || f === 'r' || f === 'l') {
            stem = dasar;
            prefixAppended = 'kum'; 
        } else {
            prefixAppended = 'kuma';
        }
    } else if (ater === 'pi' || ater === 'kapi') {
        if (dasar === 'ambak' || dasar === 'hambak') {
            stem = 'yambak';
            prefixAppended = ater;
        } else if (isVowelStart) {
            stem = dasar.startsWith('h') ? dasar : 'h' + dasar;
            prefixAppended = ater;
        } else {
            prefixAppended = ater;
        }
    } else if (ater === 'ma') {
        if (f === 'i') {
            stem = 'mé' + dasar.slice(1);
        } else {
            prefixAppended = 'ma';
        }
    } else if (ater === 'sa') {
        const saExclusions = ['wengi', 'wulan', 'wis', 'weruh', 'wiji', 'wanci'];
        if (f === 'w' && !saExclusions.includes(dasar)) {
            prefixAppended = 'su';
        } else {
            prefixAppended = 'sa';
        }
    } else if (ater === 'in') {
        if (isVowelStart) {
            stem = 'in' + dasar;
        } else {
            stem = f + 'in' + dasar.slice(1);
        }
        prefixAppended = '';
    } else if (ater !== '') {
        prefixAppended = ater;
    }

    let resultLatin = "";

    if (panam === '') {
        resultLatin = prefixAppended ? (prefixAppended + stem) : stem;
    } else {
        let stemLastChar = stem.slice(-1);
        let stemIsVowel = /[aiueoéèê]/i.test(stemLastChar);
        let isTanggapI = (panam === 'i' && (ater === 'ka' || ater === 'in'));

        if (!stemIsVowel) {
            let formattedStem = prefixAppended ? (prefixAppended + stem) : stem;
            if (panam === 'an_e') {
                resultLatin = formattedStem + '-anné';
            } else {
                let currentPanam = isTanggapI ? 'an' : panam;
                resultLatin = formattedStem + '-' + currentPanam;
            }
        } else {
            let rootVowel = stemLastChar;
            let body = stem;
            let suffixMod = panam;

            if (isTanggapI) {
                if (rootVowel === 'a') {
                    body = stem;
                    suffixMod = 'nnan';
                } else if (rootVowel === 'i') {
                    body = stem.slice(0, -1) + 'è';
                    suffixMod = 'nnan';
                } else if (rootVowel === 'u') {
                    body = stem.slice(0, -1) + 'o';
                    suffixMod = 'nnan';
                } else if (['e','é','è','o'].includes(rootVowel)) {
                    body = stem;
                    suffixMod = 'nnan';
                }
            } else if (panam === 'i' || panam === 'ana') {
                suffixMod = (panam === 'i') ? 'nni' : 'nnana';
                if (rootVowel === 'u') body = stem.slice(0, -1) + 'o';
                else if (rootVowel === 'i') body = stem.slice(0, -1) + 'é';
                else if (rootVowel === 'a') body = stem;
                else if (['e','é','è','o'].includes(rootVowel)) body = stem;
            } else if (panam === 'a') {
                const explicitHaWords = ['priyé', 'priyayi', 'tawu', 'suwowo'];
                if (explicitHaWords.includes(stem)) {
                    body = stem;
                    suffixMod = 'ha';
                } else {
                    if (rootVowel === 'i') {
                        body = stem; suffixMod = 'ya'; 
                    } else if (rootVowel === 'u' || rootVowel === 'o') {
                        body = stem; suffixMod = 'wa'; 
                    } else {
                        body = stem; suffixMod = 'a';
                    }
                }
            } else if (panam === 'na') {
                if (rootVowel === 'a') {
                    body = stem;
                    suffixMod = 'kna';
                } else if (rootVowel === 'i') {
                    body = stem.slice(0, -1) + 'é';
                    suffixMod = 'kna';
                } else if (rootVowel === 'u') {
                    body = stem.slice(0, -1) + 'o';
                    suffixMod = 'kna';
                } else if (['e','é','è','o'].includes(rootVowel)) {
                    body = stem;
                    suffixMod = 'kna';
                }
            } else if (panam === 'an_e') {
                if (rootVowel === 'a') {
                    body = stem; suffixMod = 'nnanné'; 
                } else if (rootVowel === 'i') {
                    body = stem.slice(0, -1) + 'è'; suffixMod = 'nnanné'; 
                } else if (rootVowel === 'u') {
                    body = stem.slice(0, -1) + 'o'; suffixMod = 'nnanné'; 
                } else if (['e','é','è'].includes(rootVowel)) {
                    body = stem; suffixMod = 'anné'; 
                } else if (rootVowel === 'o') {
                    body = stem; suffixMod = 'nnanné'; 
                }
            } else {
                if (panam === 'an') {
                    if (stem === 'uji') {
                        body = stem; suffixMod = 'an'; 
                    } else if (rootVowel === 'a') {
                        body = stem; suffixMod = 'n'; 
                    } else if (rootVowel === 'i') {
                        body = stem.slice(0, -1) + 'è'; suffixMod = 'n'; 
                    } else if (rootVowel === 'u') {
                        body = stem.slice(0, -1) + 'o'; suffixMod = 'n'; 
                    } else if (['e','é','è'].includes(rootVowel)) {
                        body = stem; suffixMod = 'an'; 
                    } else if (rootVowel === 'o') {
                        body = stem; suffixMod = 'nan'; 
                    }
                } else if (rootVowel === 'a') {
                    if(['ake', 'aké'].includes(panam)) suffixMod = 'kake';
                    else if(panam === 'aken') suffixMod = 'kaken';
                    else if(panam === 'en') suffixMod = 'nen';
                    else if(['e', 'é'].includes(panam)) suffixMod = 'ne';
                    else if(panam === 'ipun') suffixMod = 'nipun';
                    else suffixMod = panam;
                } else if (rootVowel === 'i') {
                    if (['e', 'é', 'ipun'].includes(panam)) {
                        body = stem;
                        if (panam === 'ipun') suffixMod = 'nipun';
                        else suffixMod = 'ne';
                    } else {
                        body = stem.slice(0, -1) + 'é';
                        if(['ake', 'aké'].includes(panam)) suffixMod = 'kake';
                        else if(panam === 'aken') suffixMod = 'kaken';
                        else if(panam === 'en') suffixMod = 'nen';
                        else suffixMod = panam;
                    }
                } else if (rootVowel === 'u') {
                    if (panam === 'ipun') {
                        body = stem;
                        suffixMod = 'nipun';
                    } else if (['e', 'é'].includes(panam)) {
                        body = stem;
                        suffixMod = 'ne';
                    } else if (['ake', 'aké', 'aken', 'en'].includes(panam)) {
                        body = stem.slice(0, -1) + 'o';
                        if(['ake','aké'].includes(panam)) suffixMod='kake';
                        if(panam==='aken') suffixMod='kaken';
                        if(panam==='en') suffixMod='nen';
                    } else {
                        suffixMod = panam;
                    }
                } else if (['e','é','è','o'].includes(rootVowel)) {
                    if(['ake', 'aké', 'aken', 'en', 'e', 'é', 'ipun'].includes(panam)) {
                        if(['ake','aké'].includes(panam)) suffixMod='kake';
                        if(panam==='aken') suffixMod='kaken';
                        if(panam==='en') suffixMod='nen';
                        if(['e', 'é'].includes(panam)) suffixMod='ne';
                        if(panam==='ipun') suffixMod='nipun';
                    } else suffixMod = panam;
                } else {
                    suffixMod = panam;
                }
            }

            let fullBody = prefixAppended ? (prefixAppended + body) : body;
            resultLatin = fullBody + '-' + suffixMod;
        }
    }

    if (outLat) outLat.value = resultLatin;
    if (outJaw) outJaw.innerText = transliterasiKalimat(resultLatin);
}

function prosesTransliterasi() {
    let inp = document.getElementById('inputLatin');
    let out = document.getElementById('outputJawa');
    if (!inp || !out) return;
    let teksInput = inp.value;
    let hasil = transliterasiKalimat(teksInput);
    out.innerText = hasil;
}

function transliterasiKalimat(teks) {
    let teksDiolah = teks.replace(/e'/g, 'é').replace(/E'/g, 'É');

    // Pre-processing Solusi A: Resolusi Sintaks Pendekatan B [C1*C2] -> C2 & Hapus Simbol Kontrol A, B, C
    teksDiolah = teksDiolah
        .replace(/\[[a-zA-ZéèêÉÈÊ]+\*([a-zA-ZéèêÉÈÊ]+)\]/gi, '$1')
        .replace(/[\~!\#\^]/g, '');

    // Mapping Simbol & Pada Unicode Aksara Jawa
    teksDiolah = teksDiolah
        .replace(/\|\|/g, '\uA9CB')
        .replace(/\|/g, '\uA9CA')
        .replace(/\(\(/g, '\uA9C1')
        .replace(/\)\)/g, '\uA9C2')
        .replace(/<_/g, '\uA9C3')
        .replace(/<>/g, '\uA9C4')
        .replace(/>\^/g, '\uA9C5')
        .replace(/\(o\)/g, '\uA9C6')
        .replace(/:/g, '\uA9C7')
        .replace(/\[\\/g, '\uA9CC')
        .replace(/\\\]/g, '\uA9CD')
        .replace(/\^2/g, '\uA9CE')
        .replace(/_2/g, '\uA9CF')
        .replace(/~~/g, '\uA9DE')
        .replace(/##/g, '\uA9DF')
        .replace(/\^3/g, '\uA980')
        .replace(/\+3/g, '\uA9B3');

    teksDiolah = teksDiolah.replace(/(?<![a-zA-Za-zÀ-ÿ])ngg/gi, function(match) {
        return (match[0] === 'N' || match[0] === 'H') ? 'Hangg' : 'hangg';
    });

    teksDiolah = teksDiolah.replace(/(?<![a-zA-Za-zÀ-ÿ])(mb|ndh|nd|nth|nc|nj)/gim, function(match, p1) {
        return 'ha' + p1;
    });

    let baris = teksDiolah.split('\n');
    let hasilBaris = baris.map(line => {
        let kataKata = line.split(/\s+/);
        let kataJawa = kataKata.map(kata => transliterasiKata(kata));
        
        let lineJoined = kataJawa.join(''); 
        
        lineJoined = lineJoined.replace(/꧀([\u200C\uE000]*)ꦊ/g, '꧀$1ꦭꦼ');
        lineJoined = lineJoined.replace(/꧀([\u200C\uE000]*)([ꦄꦆꦈꦌꦎ]|[ꦏꦢꦒꦗ]꦳)/g, '꧀$1\u200C$2');

        lineJoined = lineJoined.replace(/([ꦀ-꧟])꧀([ꦀ-꧟])(꦳?)꧀([ꦀ-꧟])/g, function(match, p1, p2, p3, p4) {
            if (p2 === 'ꦥ' || p2 === 'ꦱ') return match; 
            return p1 + '꧀\u200C' + p2 + p3 + '꧀' + p4; 
        });

        lineJoined = lineJoined.replace(/꧀([\u200C\uE000]*)ꦣ/g, '꧀$1ꦝ');

        return lineJoined;
    });
    return hasilBaris.join('\n');
}

function transliterasiKata(rawLatin) {
    if (!rawLatin) return "";

    let markerMatch = rawLatin.match(/([\uE000-\uE0FF]+)$/);
    let marker = markerMatch ? markerMatch[1] : "";
    let cleanLatin = marker ? rawLatin.slice(0, -marker.length) : rawLatin;

    return transliterasiSingleKata(cleanLatin) + marker;
}

function koreksiDwipurwa(rawLatin) {
    if (!rawLatin) return "";

    const consPattern = "(?:dh|th|ng|ny|kh|dz|gh|sy|[bcdfghjklmnpqrstvwxyz])";
    const dwipurwaRegex = new RegExp(
        `^(${consPattern})[eêEÊ](${consPattern}(?:[rylw])?)([aiueoéèêAIUEOÉÈÊ])(.*)$`,
        'i'
    );

    return rawLatin.replace(dwipurwaRegex, function(match, c1Prefix, c2Root, v1, rest) {
        let baseC1 = c1Prefix.toLowerCase();
        let baseC2 = c2Root.toLowerCase();

        if (baseC2.startsWith(baseC1)) {
            return c1Prefix + v1 + c2Root + v1 + rest;
        }
        return match;
    });
}

function transliterasiSingleKata(rawLatin) {
    if (!rawLatin) return "";

    rawLatin = koreksiDwipurwa(rawLatin);

    // Pre-processing Solusi A: Resolusi Sintaks Pendekatan B [C1*C2] -> C2 & Hapus Simbol Kontrol A, B, C
    rawLatin = rawLatin
        .replace(/\[[a-zA-ZéèêÉÈÊ]+\*([a-zA-ZéèêÉÈÊ]+)\]/gi, '$1')
        .replace(/[\~!\#\^]/g, '');

    let isKataNingrat = rawLatin.toLowerCase().includes('ningrat');

    if (/^([a-zA-Z]\.)+$/.test(rawLatin)) {
        let abbr = "";
        for (let j = 0; j < rawLatin.length; j += 2) {
            let h = rawLatin[j].toLowerCase();
            let nglegena = KAMUS_AKSARA[h] || (['a','i','u','e','o'].includes(h) ? 'ꦲ' : '');
            if (nglegena) abbr += `${nglegena}꧈`; 
        }
        return abbr;
    }

    if (/^dak[ry]/i.test(rawLatin)) {
        let isY = /^daky/i.test(rawLatin);
        let rest = rawLatin.substring(4); 
        let prefixAksara = KAMUS_AKSARA['d'] + 'ꦏ꧀'; 
        
        if (isY) {
            prefixAksara += KAMUS_AKSARA['y'];
        } else {
            if (/^(e|ê)/i.test(rest)) {
                prefixAksara += 'ꦉ'; 
                rest = rest.substring(1);
            } else {
                prefixAksara += KAMUS_AKSARA['r']; 
            }
        }
        return prefixAksara + transliterasiKata(rest);
    }

    let latinProcessed = rawLatin;
    const cons = "(?:dh|th|ng|ny|kh|dz|gh|kx|rx|hx|ngx|sy|[bcdfghjklmnpqrstvwxyz])";
    const nas = "(?:m|n|ng|ny)";

    let isAnuswaraHanja = /^hanj[aA]|^hany[aA]/i.test(latinProcessed);

    if (!isAnuswaraHanja) {
        if (/^p[aeêEÊ]ndhawa(-[a-zA-ZéèêÉÈÊ]+)?$/i.test(latinProcessed)) {
            latinProcessed = latinProcessed.replace(/^(p)[aeêEÊ](ndhawa(?:-[a-zA-ZéèêÉÈÊ]+)?)$/i, function(match, p1, p2) {
                return p1 + 'a' + p2;
            });
        } else {
            let rule2 = new RegExp(`^(${cons})?[aA](${nas})(${cons})a(${cons})a(-[a-zA-ZéèêÉÈÊ]+)?$`, 'i');
            latinProcessed = latinProcessed.replace(rule2, (m, c1, n, c2, c3, suf) => {
                return (c1 || '') + 'e' + n + c2 + 'a' + c3 + 'a' + (suf || '');
            });
        }

        let rule1 = new RegExp(`^(${cons})[eêEÊ](${cons})a(${cons})a(-[a-zA-ZéèêÉÈÊ]+)?$`, 'i');
        latinProcessed = latinProcessed.replace(rule1, (m, c1, c2, c3, suf) => {
            return c1 + 'a' + c2 + 'a' + c3 + 'a' + (suf || '');
        });
    }

    latinProcessed = latinProcessed.replace(/nc/g, 'nyc').replace(/nj/g, 'nyj');
    latinProcessed = latinProcessed.replace(/Nc/g, 'Nyc').replace(/Nj/g, 'Nyj');
    latinProcessed = latinProcessed.replace(/NC/g, 'NYC').replace(/NJ/g, 'NYJ');

    const prefixRegexStr = "kuma|kami|kapi|dak|tak|kok|tar|pra|ng|ny|ko|di|ha|ka|ke|sa|pa|pi|m|n|a";
    const keretRegex = new RegExp(`^(${prefixRegexStr})?([bcdfghjklmnpqrstvwxyz]*)([eê])r([bcdfghjklmnpqrstvwxyz])`, 'i');
    
    latinProcessed = latinProcessed.replace(keretRegex, function(match, p1, p2, p3, p4) {
        let prefix = p1 || '';
        return prefix + p2 + 'r' + p3 + p4; 
    });

    let wordMatchForExc = latinProcessed.match(/^([a-zA-ZéèêÉÈÊ]+)/);
    let isPrefixException = false;
    
    if (wordMatchForExc) {
        const excBases = "taka.*|taki.*|taku.*|take.*|také.*|takè.*|takê.*|tako.*|daka.*|daki.*|daku.*|dake.*|daké.*|dakè.*|dakê.*|dako.*|koka.*|koki.*|koku.*|koke.*|koké.*|kokè.*|kokê.*|koko.*|koas.*|koala.*|koali.*|koin.*|koord.*|koper.*|dian.*|diar.*|diare.*|dialog.*|diana.*|diaper.*|diastol.*|diat.*|diuretik.*|diet.*|dieng.*|diesel.*|dioda.*|diorama.*|dion.*|dioksida.*|kain.*|kaos.*|kaok.*|kaum.*|kail.*|kait.*|kais.*|kaing.*|keong.*|keok.*";
        const excPattern = new RegExp(`^(${excBases})$`, 'i');
        if (excPattern.test(wordMatchForExc[1])) {
            isPrefixException = true;
        }
    }

    if (!isPrefixException) {
        latinProcessed = latinProcessed.replace(/^(dak|tak|kok|ko|di|ka|ke)([aiueoéèê])/i, function(match, p1, p2) {
            let p1Lower = p1.toLowerCase();
            if (p1Lower === 'di') {
                if (p2.toLowerCase() === 'i') {
                    return p1 + 'hx' + p2;
                } else {
                    return p1 + 'y' + p2;
                }
            } else if (p1Lower === 'ko' || p1Lower === 'ka' || p1Lower === 'ke') {
                return p1 + 'hx' + p2;
            } else {
                return p1.slice(0, -1) + 'kxhx' + p2;
            }
        });
    }

    latinProcessed = latinProcessed.replace(/^(di)-([iI])/i, '$1hx$2');

    // DETEKSI & PENANGANAN KHUSUS TEMBUNG DWILINGGA (KATA ULANG)
    let dwiMatch = latinProcessed.match(/^([a-zA-ZéèêÉÈÊ]+)-([a-zA-ZéèêÉÈÊ]+)([^a-zA-ZéèêÉÈÊ]*)$/i);
    if (dwiMatch) {
        let root = dwiMatch[1];
        let suffix = dwiMatch[2];
        let rest = dwiMatch[3] || "";
        let r = root.toLowerCase();
        let s = suffix.toLowerCase();

        if (r === s || (s.startsWith(r) && r.length >= 2)) {
            return transliterasiSingleKata(root) + transliterasiSingleKata(suffix + rest);
        }
    }

    // PERBAIKAN HIATUS (é/è dikelompokkan dengan vokal h)
    latinProcessed = latinProcessed.replace(/([aAEÊaeêéèÉÈ])-([aiueoéèêAIUEOÉÈÊ])/g, '$1h$2');
    latinProcessed = latinProcessed.replace(/([iI])-([aiueoéèêAIUEOÉÈÊ])/g, '$1y$2');
    latinProcessed = latinProcessed.replace(/([uoUO])-([aiueoéèêAIUEOÉÈÊ])/g, '$1w$2');

    while (/([a-zA-ZéèêÉÈÊ]+)-([a-zA-ZéèêÉÈÊ]+)/.test(latinProcessed)) {
        latinProcessed = latinProcessed.replace(/([a-zA-ZéèêÉÈÊ]+)-([a-zA-ZéèêÉÈÊ]+)/g, function(match, root, suffix) {
            let suffixLower = suffix.toLowerCase();
            let isPepetSuffix = (suffixLower === 'aken' || suffixLower === 'kaken' || suffixLower === 'en' || suffixLower === 'nen');
            let modSuffix = isPepetSuffix ? suffix.replace(/[eéèê]/gi, 'e') : suffix.replace(/[eéèê]/gi, 'é');

            let lastChar = root.slice(-1).toLowerCase();
            let lastTwoChars = root.slice(-2).toLowerCase();
            let vowels = ['a','i','u','e','o','é','è','ê'];

            if ((modSuffix.toLowerCase() === 'kaké' || modSuffix.toLowerCase() === 'kaken') && vowels.includes(lastChar)) {
                modSuffix = 'kxh' + modSuffix.substring(1); 
            }

            let firstCharSuffix = modSuffix.charAt(0).toLowerCase();
            let consonantToDouble = "";

            if (['ni', 'nni', 'i'].includes(suffixLower) && vowels.includes(lastChar)) {
                modSuffix = 'nni';
            } else if (vowels.includes(firstCharSuffix)) {
                if (['ng', 'ny', 'dh', 'th'].includes(lastTwoChars)) {
                    consonantToDouble = lastTwoChars;
                } else if (!vowels.includes(lastChar) && lastChar !== 'y' && lastChar !== 'w') {
                    consonantToDouble = lastChar; 
                }
            }
            return root + consonantToDouble + modSuffix;
        });
    }

    // PERBAIKAN HIATUS BERURUTAN LANGSUNG
    let prevLatin = "";
    while (latinProcessed !== prevLatin) {
        prevLatin = latinProcessed;
        latinProcessed = latinProcessed.replace(/([aeêéèAEÊÉÈ])([aiueoéèê])/g, '$1h$2');
        latinProcessed = latinProcessed.replace(/([iI])([aiueoéèê])/g, '$1y$2');
        latinProcessed = latinProcessed.replace(/([uoUO])([aiueoéèê])/g, '$1w$2');
    }

    let wordMatch = latinProcessed.match(/^([a-zA-ZéèêÉÈÊ]+)([^a-zA-ZéèêÉÈÊ]*)$/);
    if (wordMatch) {
        let wordOnly = wordMatch[1];
        let punctuations = wordMatch[2];

        let token = wordOnly
            .replace(/ng/g, '1').replace(/Ng/g, '5').replace(/NG/g, '!')
            .replace(/ny/g, '2').replace(/Ny/g, '6').replace(/NY/g, '@')
            .replace(/dh/g, '3').replace(/Dh/g, '7').replace(/DH/g, '#')
            .replace(/th/g, '4').replace(/Th/g, '8').replace(/\$/g, 'TH');

        let isTanpa = /^tanpa$/i.test(wordOnly);
        if (!isAnuswaraHanja && !isTanpa) {
            token = token.replace(/a([mnMN125!6@])([bcdfghjklpqrstvwxzBCDFGHJKLPQRSTVWXZ347#8$]+)a(h?a)?$/i, 'o$1$2a$3');
        }

        wordOnly = token
            .replace(/1/g, 'ng').replace(/5/g, 'Ng').replace(/!/g, 'NG')
            .replace(/2/g, 'ny').replace(/6/g, 'Ny').replace(/@/g, 'NY')
            .replace(/3/g, 'dh').replace(/7/g, 'Dh').replace(/#/g, 'DH')
            .replace(/4/g, 'th').replace(/8/g, 'Th').replace(/\$/g, 'TH');
        
        latinProcessed = wordOnly + punctuations;
    }

    let res = "";
    let i = 0;
    let latin = latinProcessed;
    let isFirstAksara = true; 

    while (i < latin.length) {
        if (latin[i] >= '0' && latin[i] <= '9') {
            if (!res.endsWith('꧇') && !/[꧐-꧙]$/.test(res)) { res += '꧇'; }
            res += ANGKA[parseInt(latin[i])];
            i++;
            if (i >= latin.length || !(latin[i] >= '0' && latin[i] <= '9')) { res += '꧇'; }
            continue;
        }

        if (latin[i] === ',') { 
            if (res.endsWith('꧀')) { res += '\u200C'; } else { res += '꧈'; }
            i++; continue; 
        }
        if (latin[i] === '.') { 
            if (res.endsWith('꧀')) { res += '꧈\u200C'; } else { res += '꧉'; }
            i++; continue; 
        }

        if (latin[i] === '-') {
            i++; continue;
        }

        if (/[\~!\#\^\[\]\*]/.test(latin[i])) {
            i++;
            continue;
        }
        
        if (!/[a-zA-ZéèêÉÈÊ]/.test(latin[i])) {
            res += latin[i]; i++; continue; 
        }

        let c = "";
        let jump = 0;
        let isSwara = false;
        let isMurda = false;

        let c3_raw = i+2 < latin.length ? latin.substring(i, i+3) : ""; 
        let c2_raw = i+1 < latin.length ? latin.substring(i, i+2) : "";
        let c1_raw = latin[i];

        let c3 = c3_raw.toLowerCase();
        let c2 = c2_raw.toLowerCase();
        let c1 = c1_raw.toLowerCase();

        if ((c2_raw === 'NY' || c2_raw === 'Ny') && AKSARA_MURDA['ny']) {
            c = 'ny'; jump = 2; isMurda = true;
        } else if (c1_raw === 'J' && AKSARA_MURDA['j']) {
            c = 'j'; jump = 1; isMurda = true;
        } else if (['ngx'].includes(c3)) {
            c = c3; jump = 3;
        } else if (['ng','ny','dh','th','nx','kh','dz','gh','kx','rx','hx','sy'].includes(c2)) {
            c = c2; jump = 2;
        } else if (KAMUS_AKSARA[c1]) {
            c = c1; jump = 1;
            if (c1_raw >= 'A' && c1_raw <= 'Z' && AKSARA_MURDA[c1]) {
                isMurda = true;
            }
        } else if (['A','I','U','E','O','É','È','Ê'].includes(c1_raw)) {
            c = c1_raw; isSwara = true; jump = 1;
        }

        if (c === "" && /[aieéèêou]/.test(c1)) {
            c = "h"; jump = 0;
        } else if (c !== "") {
            i += jump;
        } else {
            res += latin[i]; i++; continue;
        }

        let lowerLatin = latin.toLowerCase();
        let medial = "";
        
        if (!isSwara && i < lowerLatin.length && (lowerLatin[i] === 'y' || lowerLatin[i] === 'r')) {
            if (i+1 < lowerLatin.length && /[aieéèêou]/.test(lowerLatin[i+1])) {
                let rejectMedial = false;
                
                if (c === 'k' && (lowerLatin.substring(i - 3, i) === 'dak' || lowerLatin.substring(i - 3, i) === 'tak')) {
                    rejectMedial = true;
                }

                if (rejectMedial) { 
                    medial = ""; 
                } else { 
                    medial = lowerLatin[i]; 
                    i++; 
                }
            } else if (c === 'h') {
                c = lowerLatin[i]; i++;
            }
        }

        let v = "";
        if (!isSwara && i < lowerLatin.length && /[aieéèêou]/.test(lowerLatin[i])) {
            v = lowerLatin[i]; i++;
        }

        let canTakeSandhangan = !/([꧀ꦁꦂꦃ\u200C]|^)$/.test(res);

        if (medial !== "") {
            let isExplicitX = (c3_raw.toLowerCase() === 'ngx' || c2_raw.toLowerCase() === 'hx' || c2_raw.toLowerCase() === 'rx' || c2_raw.toLowerCase() === 'kx');
            
            if (!isExplicitX && !isFirstAksara && canTakeSandhangan) {
                if (c === 'ng') {
                    if (!(isKataNingrat && medial === 'r')) {
                        res += 'ꦁ'; c = medial; medial = "";
                    }
                } else if (c === 'r') {
                    res += 'ꦂ'; c = medial; medial = "";
                } else if (c === 'h') {
                    res += 'ꦃ'; c = medial; medial = "";
                }
            }
        }

        if (v === "" && !isSwara) {
            if (c === 'ng' && !isFirstAksara && canTakeSandhangan) res += 'ꦁ'; 
            else if (c === 'r' && !isFirstAksara && canTakeSandhangan) res += 'ꦂ'; 
            else if (c === 'h' && !isFirstAksara && canTakeSandhangan) res += 'ꦃ'; 
            else if (c !== "") {
                let base = (c === 'dh' && res.endsWith('꧀')) ? 'ꦝ' : (isMurda ? AKSARA_MURDA[c] : KAMUS_AKSARA[c]);
                res += base + '꧀'; 
            }
            
            if (medial !== "") res += KAMUS_AKSARA[medial] + '꧀';
            if (c !== "") isFirstAksara = false;
            continue;
        }

        let nonPasangan = ['kh','dz','gh','z'].includes(c) || isSwara;
        if (nonPasangan && res.endsWith('꧀')) res += '\u200C';

        if (c === 'l' && (v === 'e' || v === 'ê') && medial === "") {
            res += 'ꦊ'; 
        } else if (c === 'r' && (v === 'e' || v === 'ê') && medial === "") {
            res += 'ꦉ'; 
        } else {
            let base = (c === 'dh' && res.endsWith('꧀')) ? 'ꦝ' : (isSwara ? SWARA_MAP[c] : (isMurda ? AKSARA_MURDA[c] : KAMUS_AKSARA[c]));
            res += base;

            if (medial === 'y') res += 'ꦾ';
            else if (medial === 'r') {
                if (v === 'e' || v === 'ê') { res += 'ꦽ'; v = ''; } 
                else res += 'ꦿ'; 
            }

            if (!isSwara) {
                if (v === 'i') res += 'ꦶ';
                else if (v === 'u') res += 'ꦸ';
                else if (v === 'é' || v === 'è') res += 'ꦺ';
                else if (v === 'e' || v === 'ê') res += 'ꦼ';
                else if (v === 'o') res += 'ꦺꦴ';
            }
        }
        
        if (c !== "") isFirstAksara = false;
    }
    return res;
}

if (typeof window !== 'undefined') {
    window.transliterasiKalimat = transliterasiKalimat;
    window.prosesParamasastra = prosesParamasastra;
    window.updateParamFromManualInput = updateParamFromManualInput;
    window.salinParamLatin = salinParamLatin;
    window.salinParamJawa = salinParamJawa;
    window.prosesDwipurwa = prosesDwipurwa;
    window.salinDwipurwaLatin = salinDwipurwaLatin;
    window.salinDwipurwaJawa = salinDwipurwaJawa;
    window.updateDwipurwaFromManualInput = updateDwipurwaFromManualInput;
    window.koreksiDwipurwa = koreksiDwipurwa;
}

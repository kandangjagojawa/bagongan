// Engine Translasi Basa Bagongan Keraton Ngayogyakarta Hadiningrat (Murni 100%)

function translateToBagongan(text) {
  if (!text || text.trim() === "") {
    return { output: "", breakdown: [] };
  }

  const cleanText = text.trim();
  const words = cleanText.toLowerCase().replace(/[^a-z0-9\s\-]/g, "").split(/\s+/);

  let translatedTokens = [];
  let breakdownList = [];

  words.forEach(rawWord => {
    let word = rawWord;
    let resultWord = "";
    let note = "";
    let ruleCategory = "";

    // Step 1: Check 11 Kosakata Khusus Bagongan Murni Yogyakarta
    if (BAGONGAN_SPECIAL_LEXICON[word]) {
      resultWord = BAGONGAN_SPECIAL_LEXICON[word].bagongan;
      note = BAGONGAN_SPECIAL_LEXICON[word].note;
      ruleCategory = "11 Tembung Khusus Bagongan Yogya";
    }
    // Step 2: Check Morphological Rules (Awalan Pasif ka-, Kata Dasar Krama, Imbuhan Ngoko)
    else {
      let stem = word;
      let hasDiPrefix = false;
      let hasNyaSuffix = false;
      let hasKanSuffix = false;

      // Check suffixes
      if (stem.endsWith("nya")) {
        hasNyaSuffix = true;
        stem = stem.slice(0, -3);
      } else if (stem.endsWith("kan")) {
        hasKanSuffix = true;
        stem = stem.slice(0, -3);
      }

      // Check passive prefixes
      if (stem.startsWith("di")) {
        hasDiPrefix = true;
        stem = stem.slice(2);
      }

      // Lookup stem in Krama Dictionary
      let kramaStem = "";
      if (KRAMA_BASE_DICTIONARY[stem]) {
        kramaStem = KRAMA_BASE_DICTIONARY[stem].krama;
      } else if (KRAMA_BASE_DICTIONARY[word]) {
        kramaStem = KRAMA_BASE_DICTIONARY[word].krama;
        stem = word;
      }

      if (kramaStem) {
        let constructed = kramaStem;
        let rulesApplied = ["Tembung Dasar Krama (" + kramaStem + ")"];

        // Rule Basa Bagongan Yogyakarta:
        // Pasif Menggunakan Awalan ka- (Bukan di- / dipun-)
        if (hasDiPrefix) {
          constructed = "ka" + constructed;
          rulesApplied.push("Ater-ater Pasif Bagongan 'ka-'");
        }
        if (hasKanSuffix) {
          constructed = constructed + "ake";
          rulesApplied.push("Panambang Kausatif Ngoko '-ake'");
        }
        if (hasNyaSuffix) {
          const endsWithVowel = /[aeiou]$/i.test(constructed);
          constructed = constructed + (endsWithVowel ? "ne" : "e");
          rulesApplied.push("Panambang Kepemilikan Ngoko '" + (endsWithVowel ? "-ne" : "-e") + "'");
        }

        resultWord = constructed;
        note = rulesApplied.join(" + ");
        ruleCategory = "Morfologi Bagongan (ka- + Krama + Ngoko)";
      } else {
        resultWord = word;
        note = "Tembung serapan / dereng wonten ing kamus Krama dasar";
        ruleCategory = "Tembung Serapan";
      }
    }

    translatedTokens.push(resultWord);
    breakdownList.push({
      original: word,
      translated: resultWord,
      category: ruleCategory,
      note: note
    });
  });

  let outputString = translatedTokens.join(" ");
  if (outputString.length > 0) {
    outputString = outputString.charAt(0).toUpperCase() + outputString.slice(1);
  }

  return {
    output: outputString,
    breakdown: breakdownList
  };
}

// UI Controllers
document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("inputText");
  const outputEl = document.getElementById("outputText");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const speakBtn = document.getElementById("speakBtn");

  if (inputEl) {
    inputEl.addEventListener("input", () => {
      const res = translateToBagongan(inputEl.value);
      outputEl.textContent = res.output || "Hasil terjemahan Basa Bagongan bakal muncul teng mriki...";
      renderBreakdown(res.breakdown);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = outputEl.textContent;
      if (text && !text.includes("bakal muncul")) {
        navigator.clipboard.writeText(text);
        alert("Puterjemahan Basa Bagongan berhasil disalin!");
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      outputEl.textContent = "Hasil terjemahan Basa Bagongan bakal muncul teng mriki...";
      renderBreakdown([]);
    });
  }

  if (speakBtn) {
    speakBtn.addEventListener("click", () => {
      const text = outputEl.textContent;
      if (text && !text.includes("bakal muncul")) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        window.speechSynthesis.speak(utterance);
      }
    });
  }

  renderDictionaryTable();
});

function loadExample(text) {
  const inputEl = document.getElementById("inputText");
  if (inputEl) {
    inputEl.value = text;
    inputEl.dispatchEvent(new Event("input"));
  }
}

function renderBreakdown(breakdownList) {
  const container = document.getElementById("breakdownContainer");
  if (!container) return;

  if (!breakdownList || breakdownList.length === 0) {
    container.innerHTML = `<p class="text-slate-400 text-sm italic">Ketik kalimat teng inggil damel ningali analisis struktur tembung demi tembung.</p>`;
    return;
  }

  let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
  breakdownList.forEach(item => {
    let badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
    if (item.category.includes("Khusus")) badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (item.category.includes("Morfologi")) badgeColor = "bg-blue-100 text-blue-800 border-blue-300";

    html += `
      <div class="p-3 bg-slate-800/60 rounded-lg border border-slate-700/80">
        <div class="flex items-center justify-between mb-1">
          <span class="font-semibold text-amber-400 text-base">${item.original}</span>
          <span class="text-xs px-2 py-0.5 rounded-full border ${badgeColor}">${item.category}</span>
        </div>
        <div class="text-slate-200 font-medium text-lg">➔ ${item.translated}</div>
        <div class="text-slate-400 text-xs mt-1">ℹ️ ${item.note}</div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderDictionaryTable() {
  const dictContainer = document.getElementById("dictionaryTableBody");
  if (!dictContainer) return;

  let html = "";
  Object.keys(BAGONGAN_SPECIAL_LEXICON).forEach(key => {
    const item = BAGONGAN_SPECIAL_LEXICON[key];
    html += `
      <tr class="border-b border-slate-800 hover:bg-slate-800/40">
        <td class="p-3 font-medium text-amber-300">${key}</td>
        <td class="p-3 font-semibold text-emerald-400">${item.bagongan}</td>
        <td class="p-3 text-slate-400 text-xs">${item.note}</td>
      </tr>
    `;
  });

  dictContainer.innerHTML = html;
}

function filterDictionary() {
  const query = document.getElementById("dictSearchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#dictionaryTableBody tr");
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
  });
}

function checkQuiz(questionNum, answer) {
  const resultEl = document.getElementById(`quizResult${questionNum}`);
  resultEl.classList.remove("hidden");
  const correctAnswers = { 1: 'b', 2: 'a', 3: 'a' };

  if (answer === correctAnswers[questionNum]) {
    resultEl.className = "mt-2 p-2 rounded text-sm bg-emerald-900/50 border border-emerald-500 text-emerald-300";
    resultEl.innerHTML = "✅ <b>Leres!</b> Wangsulan panjenengan trep kaliyan aturan Murni Basa Bagongan Keraton Ngayogyakarta Hadiningrat.";
  } else {
    resultEl.className = "mt-2 p-2 rounded text-sm bg-red-900/50 border border-red-500 text-red-300";
    resultEl.innerHTML = "❌ <b>Dereng Trep.</b> Mangga dipun-inaos malih aturan Murni Basa Bagongan Yogyakarta.";
  }
}

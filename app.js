// Engine Translasi dan Logika UI Aplikasi Basa Bagongan

function translateToBagongan(text) {
  if (!text || text.trim() === "") {
    return { output: "", breakdown: [] };
  }

  // Cleaning & tokenization
  const cleanText = text.trim();
  const sentences = cleanText.split(/([.!?]+)/);
  
  let translatedTokens = [];
  let breakdownList = [];

  // Regex helpers for Indonesian affixes
  // me-kan, di-kan, di-nya, -nya, -kan, di-
  const words = cleanText.toLowerCase().replace(/[^a-z0-9\s\-]/g, "").split(/\s+/);

  words.forEach(rawWord => {
    let word = rawWord;
    let resultWord = "";
    let note = "";
    let ruleCategory = "";

    // Step 1: Check Bagongan Direct Special Lexicon
    if (BAGONGAN_SPECIAL_LEXICON[word]) {
      resultWord = BAGONGAN_SPECIAL_LEXICON[word].bagongan;
      note = BAGONGAN_SPECIAL_LEXICON[word].note;
      ruleCategory = "Kosakata Khusus Bagongan";
    }
    // Step 2: Check morphological patterns
    else {
      let stem = word;
      let hasDiPrefix = false;
      let hasNyaSuffix = false;
      let hasKanSuffix = false;
      let hasMePrefix = false;

      // Check suffixes
      if (stem.endsWith("nya")) {
        hasNyaSuffix = true;
        stem = stem.slice(0, -3);
      } else if (stem.endsWith("kan")) {
        hasKanSuffix = true;
        stem = stem.slice(0, -3);
      }

      // Check prefixes
      if (stem.startsWith("di")) {
        hasDiPrefix = true;
        stem = stem.slice(2);
      } else if (stem.startsWith("mem")) {
        hasMePrefix = true;
        stem = stem.slice(3);
      } else if (stem.startsWith("men") || stem.startsWith("meng")) {
        hasMePrefix = true;
        stem = stem.replace(/^(men|meng)/, "");
      } else if (stem.startsWith("me")) {
        hasMePrefix = true;
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
        let rulesApplied = ["Kata Dasar Krama: (" + kramaStem + ")"];

        // Apply Bagongan Morphological Rules:
        // Rule: Awalan Passive = di- (Ngoko), Akhiran = -e/-ne (Ngoko), Akhiran Causal = -ake (Ngoko)
        if (hasDiPrefix) {
          constructed = "di" + constructed;
          rulesApplied.push("Awalan Pasif Ngoko 'di-'");
        }
        if (hasKanSuffix) {
          constructed = constructed + "ake";
          rulesApplied.push("Akhiran Kausatif Ngoko '-ake'");
        }
        if (hasNyaSuffix) {
          const endsWithVowel = /[aeiou]$/i.test(constructed);
          constructed = constructed + (endsWithVowel ? "ne" : "e");
          rulesApplied.push("Akhiran Kepemilikan Ngoko '" + (endsWithVowel ? "-ne" : "-e") + "'");
        }

        resultWord = constructed;
        note = rulesApplied.join(" + ");
        ruleCategory = "Aturan Kombinasi Morfologi Bagongan";
      } else {
        // Fallback: Retain original word if not in dictionary
        resultWord = word;
        note = "Kata serapan / belum terdaftar di basis data Krama";
        ruleCategory = "Kata Serapan / Asli";
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

  // Capitalize first letter
  let outputString = translatedTokens.join(" ");
  if (outputString.length > 0) {
    outputString = outputString.charAt(0).toUpperCase() + outputString.slice(1);
  }

  return {
    output: outputString,
    breakdown: breakdownList
  };
}

// UI Controller Functions
document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("inputText");
  const outputEl = document.getElementById("outputText");
  const breakdownContainer = document.getElementById("breakdownContainer");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const speakBtn = document.getElementById("speakBtn");

  // Input listener
  if (inputEl) {
    inputEl.addEventListener("input", () => {
      const text = inputEl.value;
      const res = translateToBagongan(text);
      outputEl.textContent = res.output || "Hasil terjemahan Basa Bagongan akan muncul di sini...";
      renderBreakdown(res.breakdown);
    });
  }

  // Copy button
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = outputEl.textContent;
      if (text && text !== "Hasil terjemahan Basa Bagongan akan muncul di sini...") {
        navigator.clipboard.writeText(text);
        alert("Terjemahan berhasil disalin ke clipboard!");
      }
    });
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      outputEl.textContent = "Hasil terjemahan Basa Bagongan akan muncul di sini...";
      renderBreakdown([]);
    });
  }

  // Speech Synthesis
  if (speakBtn) {
    speakBtn.addEventListener("click", () => {
      const text = outputEl.textContent;
      if (text && text !== "Hasil terjemahan Basa Bagongan akan muncul di sini...") {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID"; // Standard Indonesian/Javanese voice
        window.speechSynthesis.speak(utterance);
      }
    });
  }

  // Render Dictionary Table
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
    container.innerHTML = `<p class="text-slate-400 text-sm italic">Ketik kalimat di atas untuk melihat analisis tata bahasa kata demi kata.</p>`;
    return;
  }

  let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
  breakdownList.forEach(item => {
    let badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
    if (item.category.includes("Khusus")) badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (item.category.includes("Morfologi")) badgeColor = "bg-blue-100 text-blue-800 border-blue-300";

    html += `
      <div class="p-3 bg-slate-800/60 rounded-lg border border-slate-700/80 hover:border-amber-500/50 transition">
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
  // Render Bagongan Special Lexicon
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

// Search Dictionary
function filterDictionary() {
  const query = document.getElementById("dictSearchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#dictionaryTableBody tr");

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
}

// Quiz Logic
let currentScore = 0;
function checkQuiz(questionNum, answer) {
  const resultEl = document.getElementById(`quizResult${questionNum}`);
  const correctAnswers = {
    1: 'b', // Manira samen neda teng griya
    2: 'a', // Awalan Pasif Ngoko (di-) + Kata Dasar Krama
    3: 'c'  // Sira / Pakenira
  };

  if (answer === correctAnswers[questionNum]) {
    resultEl.className = "mt-2 p-2 rounded text-sm bg-emerald-900/50 border border-emerald-500 text-emerald-300";
    resultEl.innerHTML = "✅ <b>Benar!</b> Jawaban Anda sesuai dengan kaidah Basa Bagongan Keraton.";
  } else {
    resultEl.className = "mt-2 p-2 rounded text-sm bg-red-900/50 border border-red-500 text-red-300";
    resultEl.innerHTML = "❌ <b>Kurang Tepat.</b> Silakan pelajari kembali aturan tata bahasa Bagongan.";
  }
}

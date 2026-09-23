/*!
 * malayalam-legacy-converter.js
 * Legacy (ASCII/8-bit font-encoded) Malayalam  ->  Unicode Malayalam
 *
 * Works in the browser (window.MalayalamLegacy) and in Node (module.exports).
 *
 * HOW IT WORKS
 * ------------
 * 1. Byte recovery.  A legacy Malayalam font puts Malayalam glyphs on ordinary
 *    8-bit character codes (e.g. byte 0xAF is the glyph "ത്ത" in ML-TT fonts).
 *    When a PDF reader extracts that text it guesses a Latin code page, so the
 *    same byte can come out as different characters:
 *        byte 0xAF  -> "¯"  (Windows-1252 / Latin-1 guess)
 *        byte 0xAF  -> "Ø"  (Mac Roman guess, typical of macOS copy/paste)
 *    So we first turn the extracted string back into the original byte codes,
 *    using a "charset" (win | mac). Tables below are keyed by BYTE, which keeps
 *    them independent of how the text was decoded.
 *
 * 2. Tokenising.  Greedy longest-match over the byte string, so multi-byte
 *    sequences ("ss" = ൈ, "Cu" = ഈ, "sF" = ഐ ...) win over single bytes.
 *    No chained String.replace() calls, so one rule can never corrupt the
 *    output of another.
 *
 * 3. Reordering.  Legacy fonts store text in VISUAL order: the e/ee/ai vowel
 *    signs (െ േ ൈ) and the ra-sign (്ര) are typed BEFORE the consonant they
 *    belong to. Unicode stores them AFTER. The engine holds those "pre-base"
 *    signs, waits for the consonant cluster (+ any ്യ / ്വ post-base signs) and
 *    emits them in logical order.  e.g.  "s" "I" "m"  ->  ക + െ + ാ  ->  കൊ
 *
 * 4. Clean-up.  In-word discretionary hyphens are removed (optional), chillu
 *    style is applied (atomic ൻ ർ ൽ ൾ ൺ, or old ZWJ sequences) and the result is
 *    NFC-normalised (so െ+ാ becomes ൊ, െ+ൗ becomes ൌ, etc.).
 *
 * ADDING / FIXING A MAPPING
 * -------------------------
 * Tables are written in "Windows-1252 view": the key is the character you
 * would see if the byte were shown as cp1252 (what Word/Notepad on Windows
 * shows). They are compiled to byte keys at load time. To fix one glyph just
 * edit its line, or call MalayalamLegacy.registerEncoding(id, {...}).
 *
 * Table sources: ML-TT byte layout cross-checked against the Payyans maps
 * (Swathanthra Malayalam Computing, LGPL/GPL) for Karthika, Uma, Charaka,
 * Revathi and Ambili. The "Ambili"/"Revathi" Payyans maps turned out to be the
 * same ML-TT bytes seen through a Mac Roman decode, which is exactly the
 * pattern in "ssZh-Øns‚" = ദൈവത്തിന്റെ.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MalayalamLegacy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. Code pages                                                       */
  /* ------------------------------------------------------------------ */

  // Windows-1252 0x80..0x9F
  const CP1252_HIGH = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020,
    0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
    0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022,
    0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
    0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178
  };
  const WIN_REVERSE = new Map();
  for (const [b, u] of Object.entries(CP1252_HIGH)) WIN_REVERSE.set(u, +b);

  // Mac Roman 0x80..0xFF
  const MAC_HIGH =
    'ÄÅÇÉÑÖÜáàâäãåçéè' +
    'êëíìîïñóòôöõúùûü' +
    '†°¢£§•¶ß®©™´¨≠ÆØ' +
    '∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ' +
    '–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ' +
    '‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ' +
    'ÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';
  const MAC_REVERSE = new Map();
  for (let i = 0; i < 128; i++) MAC_REVERSE.set(MAC_HIGH.charCodeAt(i), 0x80 + i);
  // Look-alikes that PDF glyph-name mapping sometimes produces instead
  MAC_REVERSE.set(0x2126, 0xBD); // Ohm sign  -> Omega slot
  MAC_REVERSE.set(0x03BC, 0xB5); // Greek mu  -> micro slot
  MAC_REVERSE.set(0x0394, 0xC6); // Greek Delta -> increment slot
  MAC_REVERSE.set(0x00A4, 0xDB); // old Mac Roman currency sign slot
  MAC_REVERSE.set(0x2215, 0xDA); // division slash -> fraction slash slot

  // Adobe StandardEncoding (what PDF readers assume for a simple font with no /Encoding).
  // Only the codes that do NOT come out as their own Latin-1 value are listed.
  const STD_REVERSE = new Map([
    [0x2019, 0x27], [0x2018, 0x60], [0x2044, 0xA4], [0x0192, 0xA6], [0x00A4, 0xA8], [0x0027, 0xA9],
    [0x201C, 0xAA], [0x2039, 0xAC], [0x203A, 0xAD], [0xFB01, 0xAE], [0xFB02, 0xAF], [0x2013, 0xB1],
    [0x2020, 0xB2], [0x2021, 0xB3], [0x00B7, 0xB4], [0x2022, 0xB7], [0x201A, 0xB8], [0x201E, 0xB9],
    [0x201D, 0xBA], [0x2026, 0xBC], [0x2030, 0xBD], [0x0060, 0xC1], [0x00B4, 0xC2], [0x02C6, 0xC3],
    [0x02DC, 0xC4], [0x00AF, 0xC5], [0x02D8, 0xC6], [0x02D9, 0xC7], [0x00A8, 0xC8], [0x02DA, 0xCA],
    [0x00B8, 0xCB], [0x02DD, 0xCD], [0x02DB, 0xCE], [0x02C7, 0xCF], [0x2014, 0xD0], [0x00C6, 0xE1],
    [0x00AA, 0xE3], [0x0141, 0xE8], [0x00D8, 0xE9], [0x0152, 0xEA], [0x00BA, 0xEB], [0x00E6, 0xF1],
    [0x0131, 0xF5], [0x0142, 0xF8], [0x00F8, 0xF9], [0x0153, 0xFA], [0x00DF, 0xFB]
  ]);

  const CHARSETS = ['win', 'mac', 'std'];
  const CHARSET_LABELS = { win: 'Windows-1252', mac: 'Mac Roman', std: 'PDF StandardEncoding' };

  /** character code -> original byte (0..255) under a charset, or -1 if unknown */
  function charToByte(code, charset) {
    if (charset === 'std') {
      const s = STD_REVERSE.get(code);
      if (s !== undefined) return s;
    }
    if (code < 0x80) return code;
    if (code >= 0xF000 && code <= 0xF0FF) return code - 0xF000; // symbol-font PUA
    if (charset === 'mac') {
      const m = MAC_REVERSE.get(code);
      if (m !== undefined) return m;
    }
    if (code <= 0xFF) return code;          // Latin-1 / raw char codes
    const w = WIN_REVERSE.get(code);
    if (w !== undefined) return w;
    return -1;
  }

  /** decode one byte as Windows-1252 (used for bytes a table does not map) */
  function byteToWinChar(b) {
    return String.fromCharCode(CP1252_HIGH[b] || b);
  }

  /**
   * Turn an extracted string into a "byte string": every recoverable char becomes
   * String.fromCharCode(byte) (0..255); anything else (already-Unicode text,
   * Malayalam, CJK...) is kept as-is and can never match a table key.
   */
  function toByteString(text, charset) {
    let out = '';
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      const b = charToByte(cp, charset);
      out += b >= 0 ? String.fromCharCode(b) : ch;
    }
    return out;
  }

  const WIN_ONLY = /[¦²³¹¼½¾Ð×ÝÞðýþŠšŽž]/g;
  const MAC_ONLY = /[∂∑∏π∫ΩΩ√≈∆◊≤≥≠∞]/g;

  /* ------------------------------------------------------------------ */
  /* 2. Encoding tables  (Windows-1252 view; compiled to bytes)          */
  /* ------------------------------------------------------------------ */

  // Atomic chillus are used in the tables; the "zwj" option converts back.
  const ML_TT = {
    // independent vowels (multi-char forms first in meaning; engine does longest-match anyway)
    'A': 'അ', 'B': 'ആ', 'C': 'ഇ', 'Cu': 'ഈ', 'D': 'ഉ', 'Du': 'ഊ', 'E': 'ഋ',
    'F': 'എ', 'G': 'ഏ', 'sF': 'ഐ', 'H': 'ഒ', 'Hm': 'ഓ', 'Hu': 'ഔ',
    // consonants
    'I': 'ക', 'J': 'ഖ', 'K': 'ഗ', 'L': 'ഘ', 'M': 'ങ', 'N': 'ച', 'O': 'ഛ', 'P': 'ജ',
    'Q': 'ഝ', 'R': 'ഞ', 'S': 'ട', 'T': 'ഠ', 'U': 'ഡ', 'V': 'ഢ', 'W': 'ണ', 'X': 'ത',
    'Y': 'ഥ', 'Z': 'ദ', '[': 'ധ', '\\': 'ന', ']': 'പ', '^': 'ഫ', '_': 'ബ', '`': 'ഭ',
    'a': 'മ', 'b': 'യ', 'c': 'ര', 'd': 'റ', 'e': 'ല', 'f': 'ള', 'g': 'ഴ', 'h': 'വ',
    'i': 'ശ', 'j': 'ഷ', 'k': 'സ', 'l': 'ഹ',
    // vowel signs and marks
    'm': 'ാ', 'n': 'ി', 'o': 'ീ', 'p': 'ു', 'q': 'ൂ', 'r': 'ൃ',
    's': 'െ', 't': 'േ', 'ss': 'ൈ', 'u': 'ൗ',
    'v': '്', 'w': 'ം', 'x': 'ഃ',
    'y': '്യ', 'z': '്വ', '{': '്ര',
    // conjunct / ligature glyphs (0x80-0xFF)
    '€': 'ഗ്ഗ', 'Š': 'ങ്ക', 'Œ': 'മ്പ', 'Ž': 'ന്ത', 'š': 'ച്ച', 'œ': 'മ്മ', 'ž': 'പ്പ', 'Ÿ': 'മ്ല',
    '¡': 'ക്ക', '¢': 'ക്ല', '£': 'ക്ഷ', '¤': 'ഗ്ഗ', '¥': 'ഗ്ല', '¦': 'ങ്ക', '§': 'ങ്ങ', '¨': 'ച്ച',
    '©': 'ഞ്ച', 'ª': 'ഞ്ഞ', '«': 'ട്ട', '¬': 'ൺ', '­': 'ണ്ട', '®': 'ണ്ണ', '¯': 'ത്ത',
    '°': 'ത്ഥ', '±': 'ദ്ദ', '²': 'ദ്ധ', '³': 'ൻ', '´': 'ന്ത', 'µ': 'ന്ദ', '¶': 'ന്ന', '·': 'ന്മ',
    '¸': 'പ്പ', '¹': 'പ്ല', 'º': 'ബ്ബ', '»': 'ബ്ല', '¼': 'മ്പ', '½': 'മ്മ', '¾': 'മ്ല', '¿': 'യ്യ',
    'À': 'ർ', 'Á': 'റ്റ', 'Â': 'ൽ', 'Ã': 'ല്ല', 'Ä': 'ൾ', 'Å': 'ള്ള', 'Æ': 'വ്വ', 'Ç': 'ശ്ല',
    'È': 'ശ്ശ', 'É': 'സ്ല', 'Ê': 'സ്സ', 'Ë': 'ഹ്ല', 'Ì': 'സ്റ്റ', 'Í': 'ഡ്ഡ', 'Î': 'ക്ട', 'Ï': 'ബ്ധ',
    'Ð': 'ബ്ദ', 'Ñ': 'ച്ഛ', 'Ò': 'ഹ്മ', 'Ó': 'ഹ്ന', 'Ô': 'ന്ധ', 'Õ': 'ത്സ', 'Ö': 'ജ്ജ', '×': 'ണ്മ',
    'Ø': 'സ്ഥ', 'Ù': 'ന്ഥ', 'Ú': 'ജ്ഞ', 'Û': 'ത്ഭ', 'Ü': 'ഗ്മ', 'Ý': 'ശ്ച', 'Þ': 'ണ്ഡ', 'ß': 'ത്മ',
    'à': 'ക്ത', 'á': 'ഗ്ന', 'â': 'ന്റ', 'ã': 'ഷ്ട', 'ä': 'റ്റ', 'å': 'ന്',
    'ï': 'ണ്ട', 'ð': 'ൽ', 'ñ': 'ല്ല', 'ò': 'ന്മ', 'ó': 'ന്ന', 'ô': 'ഞ്ച',
    'þ': '-',
    // quotes: ML-TT puts curly single quotes on the ASCII quote keys; doubles are typed as two of them
    '"': '\u2018', "'": '\u2019', '""': '\u201C', "''": '\u201D'
    // Unknown in ML-TT so far: 0xE6-0xEE, 0xF5-0xFD, 0xFF. They pass through
    // unchanged and are flagged in the debugger - add them here once identified.
  };

  // MLB-TT / Indulekha-style layout (lower-case row shifted). EXPERIMENTAL:
  // taken from the Payyans "indulekha" map with its broken vowel-sign combos fixed.
  const MLB_TT = {
    'A': 'അ', 'B': 'ആ', 'C': 'ഇ', 'D': 'ഉ', 'E': 'ഋ', 'F': 'എ', 'G': 'ഏ', 'H': 'ഒ', 'Hn': 'ഓ',
    'tt': 'ൈ', 'tF': 'ഐ',
    'I': 'ക', 'J': 'ഖ', 'K': 'ഗ', 'L': 'ഘ', 'M': 'ങ', 'N': 'ച', 'O': 'ഛ', 'P': 'ജ',
    'Q': 'ഝ', 'R': 'ഞ', 'S': 'ട', 'T': 'ഠ', 'U': 'ഡ', 'V': 'ഢ', 'W': 'ണ', 'X': 'ത',
    'Y': 'ഥ', 'Z': 'ദ', '[': 'ധ', '\\': 'ന', ']': 'പ', '^': 'ഫ', '_': 'ബ', '`': 'ഭ', 'õ': 'ഭ',
    'a': 'മ', 'b': 'യ', 'c': 'ര', 'd': 'ല', 'e': 'വ', 'f': 'ശ', 'g': 'ഷ', 'h': 'സ',
    'i': 'ഹ', 'j': 'ള', 'k': 'ഴ', 'l': 'റ',
    'm': '്', 'n': 'ാ', 'o': 'ി', 'p': 'ീ', 'q': 'ു', 'r': 'ൂ', 's': 'ൃ', 't': 'െ', 'u': 'േ',
    'v': 'ൗ', 'w': 'ം', 'x': 'ഃ', 'y': '്യ', 'z': '്വ', '{': '്ര', '|': '്വ', '}': '്ര',
    '$': 'സ്റ്റ', '¤': 'ഈ', '¨': 'ഓ',
    '€': 'ഗ്ഗ', 'Š': 'ങ്ക', 'Œ': 'മ്പ', 'Ž': 'ന്ത', 'š': 'ച്ച', 'œ': 'മ്മ', 'ž': 'പ്പ', 'Ÿ': 'മ്ല',
    '¡': 'ക്ക', '¢': 'ക്ല', '£': 'ക്ഷ', '¥': 'ദ്ദ', '¦': 'ങ്ക', '§': 'ങ്ങ', '©': 'ഞ്ച', 'ª': 'ദ്ധ',
    '«': 'ട്ട', '¬': 'ൺ', '­': 'ണ്ട', '®': 'ണ്ണ', '¯': 'ത്ത', '°': 'ൻ', '±': 'ർ', '²': 'ൽ',
    '³': 'ൾ', '´': 'ന്ത', 'µ': 'ന്ദ', '¶': 'ന്ന', '·': 'ന്മ', '¸': 'ക്ഷ', '¹': 'ങ്ക', 'º': 'ങ്ങ',
    '»': 'ച്ച', '¼': 'ഞ്ഞ', '½': 'ട്ട', '¾': 'ണ്ട', '¿': 'ത്ത', 'À': 'ന്ദ', 'Á': 'ന്ന', 'Â': 'ന്റ',
    'Ã': 'പ്പ', 'Ä': 'മ്പ', 'Å': 'മ്മ', 'Æ': 'വ്വ', 'Ç': 'യ്യ', 'È': 'ല്ല', 'É': 'ള്ള', 'Ê': 'റ്റ',
    'Ë': 'ഹ്ല', 'Ì': 'റ്റ', 'Í': 'ഡ്ഡ', 'Î': 'ക്ട', 'Ï': 'ബ്ധ', 'Ð': 'ന്ത', 'Ñ': 'ച്ഛ', 'Ò': 'ഹ്മ',
    'Ó': 'ഹ്ന', 'Ô': 'ന്ധ', 'Õ': 'ഞ്ച', 'Ö': 'ജ്ജ', '×': 'ണ്മ', 'Ø': 'സ്ഥ', 'Ù': 'സ്ഥ', 'Ú': 'ജ്ഞ',
    'Û': 'ത്ഭ', 'Ü': 'ഗ്മ', 'Ý': 'ശ്ച', 'Þ': 'ണ്ഡ', 'ß': 'ത്മ', 'à': 'ക്ത', 'á': 'ഗ്ന', 'â': 'ന്റ',
    'ã': 'ഷ്ട', 'ä': 'റ്റ', 'å': 'ന്', 'î': 'ന്മ', 'ï': 'ണ്ട', 'ð': 'ൽ', 'ñ': 'ല്ല', 'ò': 'ന്മ',
    'ó': 'ന്ന', 'ô': 'സ്സ', 'þ': '-'
  };

  // Manorama (newspaper) layout. EXPERIMENTAL: from the Payyans "manorama" map.
  const MANORAMA = {
    '@': 'ഥ', 'A': 'ക്ക', 'B': 'ങ്ങ', 'C': 'ങ്ക', 'E': 'ഞ്ഞ', 'F': 'ഞ്ച', 'G': 'ട്ട', 'H': 'ണ്ണ',
    'I': 'ണ്ട', 'J': 'ത്ത', 'K': 'ന്ന', 'L': 'ന്ത', 'M': 'പ്പ', 'N': 'മ്മ', 'O': 'മ്പ', 'P': 'ഗ്ഗ',
    'T': 'സ്സ', 'U': 'ള്ള', 'V': 'ർ', 'W': 'ൽ', 'X': 'ൻ', 'Y': 'ൺ', 'Z': 'ൾ', '`': 'ഋ',
    'a': 'ന്റ', 'b': '്വ', 'c': '്യ', 'd': '്ര', 'f': 'ക്ഷ', 'g': 'ദ്ദ', 'i': 'ദ്ധ', 'j': 'ത്ഥ',
    'm': 'ണ്ഡ', 'o': 'ഗ്ന', 'p': 'ണ്മ', 'q': 'ത്ഭ', 'r': 'ത്സ', 's': 'ന്ഥ', 't': 'ന്ധ', 'u': 'ഗ്മ',
    'v': 'ത്മ', 'w': 'ന്ദ', 'x': 'റ്റ', 'y': 'ത്ന', 'z': 'ന്മ', '{': 'ള', '|': 'മ്ല', '~': 'ഖ',
    '€': 'ശ്ശ', '‚': 'ച്ച', 'ˆ': 'ല്ല', 'Š': 'സ്ല', 'Œ': 'വ്വ',
    '¡': '്', '¢': 'ം', '£': 'ഃ', '¥': 'അ', '¦': 'ആ', '§': 'ഇ', '§ì': 'ഈ', '©': 'ഉ', 'ª': 'ഊ',
    '«': 'ഋ', '®': 'എ', '¯': 'ഏ', '°': 'ഐ', '±': 'ഗ്ല', '²': 'ഒ', '³': 'ഓ',
    'µ': 'ക', '¶': 'ഖ', '·': 'ഗ', '¹': 'ങ', 'º': 'ച', '»': 'ഛ', '¼': 'ജ', '¾': 'ഞ', '¿': 'ട',
    'À': 'ഠ', 'Á': 'ഡ', 'Â': 'ഢ', 'Ã': 'ണ', 'Ä': 'ത', 'Å': 'ഥ', 'Æ': 'ദ', 'Ç': 'ധ', 'È': 'ന',
    'É': 'പ', 'Ë': 'ഫ', 'Ì': 'ബ', 'Í': 'ഭ', 'Î': 'മ', 'Ï': 'യ', 'Ð': 'ക്ല', 'Õ': 'വ', 'Ö': 'ശ',
    '×': 'ഷ', 'Ø': 'സ', 'Ù': 'ഹ', 'Ú': 'റ്റ', 'Û': 'ശ്ശ', 'Ü': 'ല', 'Ý': 'ഴ',
    'Þ': 'ാ', 'ß': 'ി', 'à': 'ീ', 'á': 'ു', 'â': 'ൂ', 'ã': 'ൃ', 'æ': 'െ', 'ææ': 'ൈ', 'ç': 'േ',
    'è': 'ൈ', 'ì': 'ൗ', 'í': '്', 'ï': '്ല', 'ò': 'ി', 'ó': 'ു', 'ô': 'ൂ', 'ø': 'ര', 'ù': 'റ'
  };

  /* ------------------------------------------------------------------ */
  /* 3. Encoding registry                                                */
  /* ------------------------------------------------------------------ */

  const ENCODINGS = {};

  function compileTable(view) {
    const map = new Map();
    let maxLen = 1;
    for (const [k, v] of Object.entries(view)) {
      let bk = '';
      for (const ch of k) {
        const b = charToByte(ch.codePointAt(0), 'win');
        if (b < 0) throw new Error('Table key not representable in cp1252: ' + k);
        bk += String.fromCharCode(b);
      }
      map.set(bk, v);
      if (bk.length > maxLen) maxLen = bk.length;
    }
    return { map, maxLen };
  }

  /**
   * Register (or replace) a legacy encoding.
   * @param {string} id
   * @param {{label:string, table:Object, fontHint?:RegExp, experimental?:boolean, notes?:string}} def
   */
  function registerEncoding(id, def) {
    const compiled = compileTable(def.table);
    ENCODINGS[id] = Object.assign({ id, experimental: false, notes: '' }, def, compiled);
    return ENCODINGS[id];
  }

  registerEncoding('mltt', {
    label: 'ML-TT (Karthika, Revathi, Ambili, Uma, Charaka, FML-TT...)',
    table: ML_TT,
    fontHint: /(^|[+\s])ML-(?!B)|ML-?TT|MLW-?TT|FML|Karthika|Revathi|Ambili|Uma\b|Charaka|Nila|Panchami|Haritha|Gopika|Lalitha|Aparna|Keerthi|Kumudam|Meera-?TT/i,
    notes: 'Most common DTP Malayalam encoding in Kerala (PageMaker / Word era).'
  });
  registerEncoding('mlbtt', {
    label: 'MLB-TT / Indulekha (experimental)',
    table: MLB_TT,
    fontHint: /MLB-?TT/i,
    experimental: true
  });
  registerEncoding('manorama', {
    label: 'Manorama (experimental)',
    table: MANORAMA,
    fontHint: /Manorama/i,
    experimental: true
  });

  const LATIN_FONT_HINT = /Times|Arial|Helvetica|Calibri|Cambria|Georgia|Verdana|Courier|Garamond|Palatino|Bookman|Century|Tahoma|Segoe|Liberation|DejaVu|Symbol|Wingding|Zapf|Minion|Myriad|Frutiger|Futura|Gill ?Sans|Trebuchet|Consolas|Lucida/i;
  const UNICODE_ML_FONT_HINT = /Noto ?Sans ?Malayalam|Noto ?Serif ?Malayalam|Kartika\b|Rachana(?!.*ASCII)|Meera(?!-?TT)|Manjari|Gayathri|AnjaliOldLipi|Chilanka|Keraleeyam|Dyuthi|Suruma|Nirmala|Malayalam ?MN|Malayalam ?Sangam|Baloo ?Chettan/i;

  /* ------------------------------------------------------------------ */
  /* 4. Conversion engine                                                */
  /* ------------------------------------------------------------------ */

  const PREBASE = new Set(['െ', 'േ', 'ൈ', '്ര']);
  const POSTBASE = new Set(['്യ', '്വ', '്ല']);

  const isCons = (c) => c >= 0x0D15 && c <= 0x0D3A;
  const isIndepVowel = (c) => (c >= 0x0D05 && c <= 0x0D14) || c === 0x0D60 || c === 0x0D61;
  const isDepVowel = (c) => (c >= 0x0D3E && c <= 0x0D4C) || c === 0x0D57 || c === 0x0D62 || c === 0x0D63;
  const isMl = (c) => c >= 0x0D00 && c <= 0x0D7F;
  const isChillu = (c) => c >= 0x0D7A && c <= 0x0D7F;

  function classify(out) {
    if (PREBASE.has(out)) return 'PRE';
    if (POSTBASE.has(out)) return 'POST';
    const c = out.codePointAt(0);
    if (isCons(c)) return 'CONS';
    if (isIndepVowel(c)) return 'VOWEL';
    if (isMl(c)) return isChillu(c) ? 'CHILLU' : 'SIGN';
    return 'OTHER';
  }

  const DEFAULT_OPTS = {
    charset: 'auto',           // 'win' | 'mac' | 'auto'
    ordinal: 'independent',    // "32-ാം" -> 'independent' 32-ആം (no dotted circle) | 'sign' keep 32-ാം
    hyphen: 'auto',            // in-word "-": 'auto' | 'remove' | 'nta' | 'keep' (see applyHyphenMode)
    chillu: 'atomic',          // 'atomic' (ൻ, Unicode 5.1+) | 'zwj' (ന്‍, Unicode 5.0)
    normalize: true            // NFC
  };

  const SIGN_TO_VOWEL = { 'ാ': 'ആ', 'ി': 'ഇ', 'ീ': 'ഈ', 'ു': 'ഉ', 'ൂ': 'ഊ', 'ൃ': 'ഋ', 'െ': 'എ', 'േ': 'ഏ', 'ൈ': 'ഐ', 'ൊ': 'ഒ', 'ോ': 'ഓ', 'ൌ': 'ഔ', 'ൗ': 'ഔ' };
  const CHILLU_ZWJ = { 'ൺ': 'ണ്‍', 'ൻ': 'ന്‍', 'ർ': 'ര്‍', 'ൽ': 'ല്‍', 'ൾ': 'ള്‍', 'ൿ': 'ക്‍' };

  /** split a byte string into table tokens (longest match first) */
  function tokenize(bytes, enc) {
    const tokens = [];
    let i = 0;
    while (i < bytes.length) {
      let matched = false;
      for (let len = Math.min(enc.maxLen, bytes.length - i); len >= 1; len--) {
        const key = bytes.substr(i, len);
        const out = enc.map.get(key);
        if (out !== undefined) {
          tokens.push({ src: key, out, kind: classify(out), mapped: true });
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const ch = bytes[i];
        const code = ch.charCodeAt(0);
        const out = code <= 0xFF ? byteToWinChar(code) : ch;
        // high bytes that are not in the table are suspicious (unknown glyphs)
        tokens.push({ src: ch, out, kind: 'OTHER', mapped: false, unknownGlyph: code >= 0x80 && code <= 0xFF && code !== 0xA0 });
        i += 1;
      }
    }
    return tokens;
  }

  /** visual order -> logical (Unicode) order */
  function reorder(tokens, carryIn, holdTrailing) {
    let out = '';
    let pre = carryIn ? carryIn.slice() : [];
    const flushPre = () => { if (pre.length) { out += pre.join(''); pre = []; } };

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.kind === 'PRE') { pre.push(t.out); continue; }
      if (t.kind === 'CONS') {
        let posts = '';
        while (i + 1 < tokens.length && tokens[i + 1].kind === 'POST') { posts += tokens[i + 1].out; i++; }
        if (pre.length) {
          const reph = pre.filter((p) => p === '്ര').join('');
          const vowels = pre.filter((p) => p !== '്ര').join('');
          out += t.out + reph + posts + vowels;
          pre = [];
        } else {
          out += t.out + posts;
        }
        continue;
      }
      // anything else: a pending pre-base sign has no consonant -> keep it (visible in scoring)
      if (holdTrailing && pre.length && tokens.slice(i).every((x) => /^[\s-]*$/.test(x.out))) break;
      flushPre();
      out += t.out;
    }
    if (holdTrailing && pre.length) {
      // a line ending in e/ee/ai/ra signs: the consonant is on the next line
      return { out, pending: pre, hyphen: tokens.some((x, k) => k > 0 && x.out === '-' && tokens.slice(k + 1).every((y) => /^\s*$/.test(y.out))) };
    }
    flushPre();
    return { out, pending: [] };
  }

  const IN_WORD_HYPHEN = /([^\s\d\-])-(?=[^\s\d\-])/g;

  /**
   * In-word "-" handling.
   *  remove : DTP discretionary/line-break hyphen ("ssZh-Øns‚" -> ദൈവത്തിന്റെ)
   *  nta    : PDF readers decode WinAnsi byte 0xAD (the ML-TT glyph ണ്ട) as "-",
   *           so under the Windows charset an in-word "-" is usually ണ്ട
   *  keep   : leave it alone
   *  auto   : 'nta' for the Windows charset when the table maps 0xAD, else 'remove'
   */
  function applyHyphenMode(bytes, enc, charset, mode) {
    if (mode === 'auto') {
      // DTP files often carry a discretionary hyphen at every syllable ("{]h-N-\-hcw");
      // that density is far above how often the glyph ണ്ട occurs, so treat them as hyphens.
      const hy = (bytes.match(IN_WORD_HYPHEN) || []).length;
      const letters = (bytes.match(/[^\s\d\-]/g) || []).length || 1;
      mode = (charset === 'win' && enc.map.has('\u00ad') && hy / letters < 0.06) ? 'nta' : 'remove';
    }
    if (mode === 'remove') return bytes.replace(IN_WORD_HYPHEN, '$1');
    if (mode === 'nta') return bytes.replace(IN_WORD_HYPHEN, '$1\u00ad');
    return bytes;
  }

  const DEP_AFTER = new Set(['SIGN', 'POST']);
  /**
   * PDF readers turn the Mac Roman no-break-space slot (0xCA, the ML-TT glyph സ്സ)
   * into an ordinary space. A space right after a pre-base sign, or right before a
   * vowel sign, cannot be a real space, so the glyph is restored there.
   */
  function restoreLostSpaceGlyph(tokens, enc, charset, carryIn) {
    if (charset !== 'mac') return tokens;
    const out = enc.map.get('\u00ca');
    if (!out) return tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].src !== ' ') continue;
      const prev = tokens[i - 1], next = tokens[i + 1];
      const afterPre = (prev && prev.kind === 'PRE') || (i === 0 && carryIn && carryIn.length);
      if (afterPre || (next && DEP_AFTER.has(next.kind))) {
        tokens[i] = { src: '\u00ca', out, kind: classify(out), mapped: true, restored: true };
        // "a\- n" : a syllable hyphen right before the lost glyph is a discretionary hyphen too
        if (prev && prev.out === '-' && tokens[i - 2] && tokens[i - 2].kind !== 'OTHER') prev.out = '';
        if (next && next.out === '-' && tokens[i + 2] && tokens[i + 2].kind !== 'OTHER') next.out = '';
      }
    }
    return tokens;
  }

  function convertWithCharset(text, enc, charset, o) {
    let bytes = toByteString(text, charset);
    bytes = applyHyphenMode(bytes, enc, charset, o.hyphen || 'auto');
    const tokens = restoreLostSpaceGlyph(tokenize(bytes, enc), enc, charset, o.carryIn);
    const ro = reorder(tokens, o.carryIn, o.holdTrailing);
    let out = ro.out;
    if (o.normalize) out = out.normalize('NFC');
    if (o.chillu === 'zwj') out = out.replace(/[ൺൻർൽൾൿ]/g, (c) => CHILLU_ZWJ[c]);
    // c) ordinals: printed as "32-" + ാം. A vowel SIGN after a hyphen/digit has no consonant to sit on,
    //    so most renderers draw a dotted circle (32-◌ാം). 'independent' writes the vowel letter instead: 32-ആം
    if (o.ordinal === 'independent') out = out.replace(/(\d[-\u2013]?)([\u0D3E-\u0D4C\u0D57])/g, (m, a, v) => a + (SIGN_TO_VOWEL[v] || v));
    return { text: out, tokens, bytes, charset, pending: ro.pending, endsWithHyphen: !!ro.hyphen };
  }

  /**
   * Convert legacy-encoded Malayalam into Unicode Malayalam.
   * @param {string} text      extracted/copied text
   * @param {string} encoding  'mltt' | 'mlbtt' | 'manorama' | any registered id
   *                           (also accepts 'mltt/mac' shorthand)
   * @param {object} [opts]    see DEFAULT_OPTS
   * @returns {string}
   */
  function legacyMalayalamToUnicode(text, encoding, opts) {
    return convertDetailed(text, encoding, opts).text;
  }

  /** Same as legacyMalayalamToUnicode but returns tokens/bytes/charset for debugging. */
  function convertDetailed(text, encoding, opts) {
    const o = Object.assign({}, DEFAULT_OPTS, opts || {});
    let encId = encoding || 'mltt';
    if (encId.includes('/')) { const p = encId.split('/'); encId = p[0]; o.charset = p[1]; }
    if (encId === 'none' || encId === 'unicode') return { text, tokens: [], bytes: text, charset: null };
    const enc = ENCODINGS[encId];
    if (!enc) throw new Error('Unknown legacy encoding: ' + encId);
    if (CHARSETS.includes(o.charset)) return convertWithCharset(text, enc, o.charset, o);
    // auto: pick the charset that yields the most plausible Malayalam
    const bias = charsetBias(text);
    let best = null, bestScore = -1;
    for (const cs of CHARSETS) {
      const r = convertWithCharset(text, enc, cs, o);
      const sc = scoreMalayalam(r.text).score + bias[cs];
      if (sc > bestScore + 1e-9) { best = r; bestScore = sc; }
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  /* 5. Detection                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * How plausible is `s` as Malayalam? Counts orthographic errors that a wrong
   * mapping produces: vowel signs with no consonant, stray viramas, Latin
   * letters glued to Malayalam, unknown glyph bytes...
   */
  function scoreMalayalam(s) {
    let ml = 0, latin = 0, errors = 0;
    const cps = Array.from(s, (ch) => ch.codePointAt(0));
    for (let i = 0; i < cps.length; i++) {
      const c = cps[i], p = i > 0 ? cps[i - 1] : 0x20, n = i + 1 < cps.length ? cps[i + 1] : 0x20;
      if (isMl(c)) {
        ml++;
        if (isDepVowel(c) && !isCons(p)) errors++;
        else if (c === 0x0D4D && !(isCons(p) || p === 0x0D41)) errors++;
        else if ((c === 0x0D02 || c === 0x0D03) && !(isCons(p) || isDepVowel(p) || isIndepVowel(p))) errors++;
        else if (isDepVowel(c) && isDepVowel(n)) errors++;
      } else if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || (c >= 0xC0 && c <= 0x24F)) {
        latin++;
        if (isMl(p) || isMl(n)) errors += 2;
      } else if ((c >= 0x80 && c <= 0xBF) || (c >= 0x2000 && c <= 0x2BFF && c !== 0x2013 && c !== 0x2014 && !(c >= 0x2018 && c <= 0x201F) && c !== 0x2026)) {
        if (isMl(p) || isMl(n)) errors += 2; // symbol glued to Malayalam: likely an unmapped glyph
      }
    }
    const letters = ml + latin;
    if (!letters) return { score: 0, ml, latin, errors };
    const validity = ml / (ml + 3 * errors);
    const coverage = ml / letters;
    return { score: Math.max(0, validity * coverage), ml, latin, errors };
  }

  function charsetBias(text) {
    const w = (text.match(WIN_ONLY) || []).length;
    const m = (text.match(MAC_ONLY) || []).length;
    return { win: w > m ? 0.05 : 0, mac: m > w ? 0.05 : 0, std: 0 };
  }

  const EN_STOP = new Set('the and of to in is a for that with on as by this be are from it at or an was his he not which but have you we they their has had were will all'.split(' '));

  function englishLikeness(text) {
    const toks = text.split(/\s+/).filter(Boolean);
    let words = 0, stop = 0, plain = 0;
    for (const t of toks) {
      const w = t.replace(/^[("'“‘]+|[)"'”’.,;:!?]+$/g, '');
      if (!w) continue;
      words++;
      if (/^[A-Za-z][a-z]+$/.test(w) || /^[A-Z]+$/.test(w)) plain++;
      if (EN_STOP.has(w.toLowerCase())) stop++;
    }
    if (words < 3) return 0;
    return Math.min(1, (stop / words) * 3) * (plain / words);
  }

  /**
   * Detect the legacy Malayalam encoding of `text`.
   * @param {string} text
   * @param {{fontName?:string}} [ctx]
   * @returns {{encoding:string, charset:string|null, confidence:number, label:string, reason:string, candidates:Array}}
   */
  function detectMalayalamEncoding(text, ctx) {
    const fontName = (ctx && ctx.fontName) || '';
    const sample = text.length > 20000 ? text.slice(0, 20000) : text;
    const nonSpace = sample.replace(/\s+/g, '');
    const res = (encoding, charset, confidence, reason, candidates) => ({
      encoding, charset, confidence: Math.round(confidence * 100) / 100, reason, candidates: candidates || [],
      label: encoding === 'unicode' ? 'Unicode (no conversion needed)' : encoding === 'none' ? 'Not Malayalam / keep as-is'
        : ENCODINGS[encoding].label + ' · ' + CHARSET_LABELS[charset]
    });

    if (!nonSpace.length) return res('none', null, 0, 'No text');
    const mlCount = (sample.match(/[ഀ-ൿ]/g) || []).length;
    if (mlCount / nonSpace.length > 0.3) return res('unicode', null, 0.99, 'Text already contains Unicode Malayalam');
    if (UNICODE_ML_FONT_HINT.test(fontName) && !ENCODINGS.mltt.fontHint.test(fontName)) {
      return res('none', null, 0.6, 'Font "' + fontName + '" is a Unicode Malayalam font, but its text did not extract as Malayalam (possible missing ToUnicode map; OCR may be needed)');
    }

    let hinted = null;
    for (const e of Object.values(ENCODINGS)) if (e.fontHint && e.fontHint.test(fontName)) { hinted = e.id; break; }
    if (!hinted && LATIN_FONT_HINT.test(fontName)) return res('none', null, 0.9, 'Latin font "' + fontName + '"');

    const eng = englishLikeness(sample);
    const bias = charsetBias(sample);
    const candidates = [];
    for (const e of Object.values(ENCODINGS)) {
      for (const cs of CHARSETS) {
        const conv = convertWithCharset(sample, e, cs, DEFAULT_OPTS);
        const sc = scoreMalayalam(conv.text);
        let score = sc.score + bias[cs] + (hinted === e.id ? 0.08 : 0) - (e.experimental ? 0.02 : 0);
        candidates.push({ encoding: e.id, charset: cs, score: Math.round(score * 1000) / 1000, errors: sc.errors, preview: conv.text.slice(0, 60), _text: conv.text });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    if (eng > 0.35 && !hinted) return res('none', null, Math.min(0.95, eng), 'Looks like English text', candidates);
    if (best.score < 0.45 && !hinted) return res('none', null, 1 - best.score, 'No legacy mapping produced plausible Malayalam (best ' + best.encoding + '/' + best.charset + ' = ' + best.score + ')', candidates);

    // a candidate that yields the same output is not a competitor
    const second = candidates.find((c) => c._text !== best._text);
    for (const c of candidates) delete c._text;
    const margin = second ? best.score - second.score : best.score;
    const confidence = Math.max(0.05, Math.min(0.99, best.score * 0.7 + Math.min(margin, 0.3)));
    let reason = 'Best scoring mapping';
    if (hinted) reason += '; font name suggests ' + hinted;
    if (bias.mac && best.charset === 'mac') reason += '; Mac-only symbols present (∂ ≤ ≥ Ω ...)';
    if (bias.win && best.charset === 'win') reason += '; Windows-only symbols present (Š ž ³ ...)';
    return res(best.encoding, best.charset, confidence, reason, candidates);
  }

  /* ------------------------------------------------------------------ */
  /* 6. Built-in test vectors                                            */
  /* ------------------------------------------------------------------ */

  const TEST_VECTORS = [
    { legacy: 'ssZh-Øns‚', encoding: 'mltt/mac', expected: 'ദൈവത്തിന്റെ', note: 'Your sample (Mac Roman copy, in-word hyphen)' },
    { legacy: 'ssZh¯nsâ', encoding: 'mltt/win', expected: 'ദൈവത്തിന്റെ', note: 'Same word, Windows-1252 view' },
    { legacy: 'a\\pjy³', encoding: 'mltt/win', expected: 'മനുഷ്യൻ', note: 'Post-base ്യ + chillu' },
    { legacy: 'tbip', encoding: 'mltt/win', expected: 'യേശു', note: 'Pre-base േ' },
    { legacy: 'IÀ¯mhv', encoding: 'mltt/win', expected: 'കർത്താവ്', note: 'Chillu ർ, ligature, chandrakkala' },
    { legacy: 'sIm¨n³', encoding: 'mltt/win', expected: 'കൊച്ചിൻ', note: 'Split vowel ൊ (െ … ാ)' },
    { legacy: 't{]aw', encoding: 'mltt/win', expected: 'പ്രേമം', note: 'Pre-base േ + ്ര before consonant' },
    { legacy: 'hnizmkw', encoding: 'mltt/win', expected: 'വിശ്വാസം', note: 'Post-base ്വ' },
    { legacy: 'HmWw', encoding: 'mltt/win', expected: 'ഓണം', note: 'Multi-char vowel ഓ' },
    { legacy: 'sFIyw', encoding: 'mltt/win', expected: 'ഐക്യം', note: 'Multi-char vowel ഐ' },
    { legacy: 'ae-bmfw', encoding: 'mltt/mac', expected: 'മലയാളം', note: 'Discretionary hyphen removed' },
    { legacy: 'h∂p', encoding: 'mltt/mac', expected: 'വന്നു', note: 'Mac-only symbol ∂ = byte 0xB6' },
    { legacy: 'skuµcyw', encoding: 'mltt/win', expected: 'സൌന്ദര്യം', note: 'Split vowel ൌ + ligature + ്യ' },
    { legacy: 'sIu', encoding: 'mltt/win', expected: 'കൌ', note: 'Split vowel ൌ (െ … ൗ)' },
    { legacy: 'Cu Du', encoding: 'mltt/win', expected: 'ഈ ഊ', note: 'Long vowels built from two glyphs' },
    { legacy: 'IÀ¯mhv', encoding: 'mltt/win', expected: 'കര്‍ത്താവ്', note: 'Old chillu style (option)', opts: { chillu: 'zwj' } },
    { legacy: 'IÀﬂmhv', encoding: 'mltt/std', expected: 'കർത്താവ്', note: 'PDF StandardEncoding view (ﬂ = byte 0xAF)' },
    { legacy: 'a\\pjy³ Hcp ]pXnb hnizmkw D-v', encoding: 'mltt/win', expected: 'മനുഷ്യൻ ഒരു പുതിയ വിശ്വാസം ഉണ്ട്', note: 'PDF.js shows WinAnsi 0xAD (ണ്ട) as "-"' },
    { legacy: 'Bh¿Ø\\w 32˛mw', encoding: 'mltt/mac', expected: 'ആവർത്തനം 32-ആം', note: 'Ordinal: vowel letter instead of a floating sign' },
    { legacy: '{]h-N-\\-hcw', encoding: 'mltt/win', expected: 'പ്രവചനവരം', note: 'Dense syllable hyphens removed even in Windows view' },
    { legacy: 'a\\- n-em-°m\\pw', encoding: 'mltt/mac', expected: 'മനസ്സിലാക്കാനും', note: 'Lost സ്സ after a syllable hyphen' },
    { legacy: '""]pkvXIw\'\' "`mcw\'', encoding: 'mltt/mac', expected: '“പുസ്തകം” ‘ഭാരം’', note: 'ML-TT quote keys' },
    { legacy: 't mw', encoding: 'mltt/mac', expected: 'സ്സോം', note: 'Mac 0xCA (സ്സ) extracted as a space' }
  ];

  function runSelfTests() {
    return TEST_VECTORS.map((t) => {
      const got = legacyMalayalamToUnicode(t.legacy, t.encoding, t.opts);
      return Object.assign({}, t, { got, pass: got === t.expected.normalize('NFC') });
    });
  }

  return {
    legacyMalayalamToUnicode,
    convertDetailed,
    detectMalayalamEncoding,
    scoreMalayalam,
    registerEncoding,
    toByteString,
    charToByte,
    runSelfTests,
    TEST_VECTORS,
    get encodings() { return Object.values(ENCODINGS).map((e) => ({ id: e.id, label: e.label, experimental: e.experimental, notes: e.notes })); },
    /** copy of an encoding's table in Windows-1252 view (edit it and pass back to registerEncoding) */
    getTableView(id) { return Object.assign({}, ENCODINGS[id] && ENCODINGS[id].table); },
    getEncoding(id) { return ENCODINGS[id]; },
    byteToWinChar,
    englishLikeness,
    DEFAULT_OPTS,
    CHARSETS,
    CHARSET_LABELS
  };
});

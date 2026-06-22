// Language-based character filter for bilingual form inputs
// FR mode: only Latin characters allowed (no Arabic script)
// AR mode: only Arabic characters allowed (no Latin script)

// Arabic Unicode ranges
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u060C\u061B\u061F\u00AB\u00BB\u2010-\u2027\u2030-\u205E\u00A0]/g;

// Latin + common punctuation (for French)
const LATIN_REGEX = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/**
 * Filter a string to keep only characters matching the target language.
 * @param {string} value - The input string
 * @param {'fr'|'ar'} lang - Target language
 * @returns {string} Filtered string with only allowed characters
 */
export function filterByLang(value, lang) {
  if (!value || typeof value !== 'string') return value;
  if (!lang) return value;

  if (lang === 'ar') {
    // Keep only Arabic characters, Arabic punctuation, and spaces
    const matches = value.match(ARABIC_REGEX);
    return matches ? matches.join('') : '';
  }

  // FR: keep only Latin characters, Latin punctuation, digits, and spaces
  const matches = value.match(LATIN_REGEX);
  return matches ? matches.join('') : '';
}

/**
 * Check if a character belongs to the specified language script.
 * @param {string} char - Single character to check
 * @param {'fr'|'ar'} lang - Target language
 * @returns {boolean}
 */
export function isCharOfLang(char, lang) {
  if (!char) return false;
  if (lang === 'ar') {
    return ARABIC_REGEX.test(char);
  }
  return !LATIN_REGEX.test(char) || /[a-zA-Z0-9\s\-',.!?;:()àâäéèêëïîôùûüÿçœæ]/.test(char);
}

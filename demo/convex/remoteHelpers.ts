export function summarizeString(text: string) {
  const words = text.trim() === "" ? [] : text.trim().split(/\s+/);
  return {
    firstWord: words[0] ?? "",
    length: text.length,
    upper: text.toUpperCase(),
    wordCount: words.length,
  };
}

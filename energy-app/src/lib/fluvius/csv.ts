/** Découpage générique d'un CSV : détection du délimiteur + gestion des guillemets. */

export function detectDelimiter(headerLine: string): "," | ";" {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  // Les exports belges utilisent la virgule décimale : le séparateur de
  // colonnes est donc quasi toujours ';'. On ne retombe sur ',' que si
  // aucun ';' n'est présent.
  return semicolons >= commas ? ";" : ",";
}

export function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/** Normalise un en-tête pour un matching tolérant aux variantes ("Van (datum)" -> "vandatum"). */
export function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function splitLines(csvText: string): string[] {
  return csvText
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

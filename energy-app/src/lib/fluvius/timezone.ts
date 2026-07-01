/**
 * Conversion d'une heure locale Europe/Brussels (celle utilisée par les
 * exports Mijn Fluvius) vers un instant UTC, sans dépendance externe.
 *
 * Limite connue : lors du changement d'heure d'automne, le créneau
 * dupliqué (02:00-03:00 existe deux fois) est résolu en choisissant
 * l'occurrence "heure d'été" (la première) ; Fluvius marque déjà ces
 * créneaux dans la colonne Validatiestatus, hors scope du parsing MVP.
 */

const BRUSSELS_TZ = "Europe/Brussels";

function getBrusselsOffsetMinutes(utcInstant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: BRUSSELS_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(utcInstant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const hour = get("hour") % 24; // Intl peut renvoyer "24" pour minuit
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );

  return (asIfUtc - utcInstant.getTime()) / 60000;
}

export function brusselsLocalToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const naiveUtcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetPass1 = getBrusselsOffsetMinutes(new Date(naiveUtcGuess));
  const utcMillisPass1 = naiveUtcGuess - offsetPass1 * 60000;

  // deuxième passe pour rester correct pile autour d'un changement d'heure
  const offsetPass2 = getBrusselsOffsetMinutes(new Date(utcMillisPass1));
  const utcMillisFinal = naiveUtcGuess - offsetPass2 * 60000;

  return new Date(utcMillisFinal).toISOString();
}

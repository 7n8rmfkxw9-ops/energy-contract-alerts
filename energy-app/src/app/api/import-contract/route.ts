// Extraction de texte à partir d'un document de contrat uploadé (PDF ou
// image), puis extraction des champs de prix (voir
// src/lib/import/contractDocument.ts). Tout tourne en local sur le
// serveur Next.js : aucun envoi du document à un service tiers.
//
// PDF : le calque texte est lu directement (PDFParse.getText). S'il est
// quasi vide (PDF scanné, sans texte), on rend la première page en image
// et on bascule sur l'OCR local (Tesseract.js).
// Image : OCR local direct.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import { extractContractFromText } from "@/lib/import/contractDocument";

export const runtime = "nodejs";

const MIN_TEXT_LENGTH = 40;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 Mo
// Les fichiers de langue Tesseract (~7 Mo) sont mis en cache hors du
// repo, sinon tesseract.js les écrit dans le cwd du process. Le
// répertoire doit exister avant l'appel : tesseract.js ne le crée pas.
const TESSERACT_CACHE_PATH = path.join(os.tmpdir(), "voltwatch-tesseract");

async function ocrImage(buffer: Buffer): Promise<string> {
  fs.mkdirSync(TESSERACT_CACHE_PATH, { recursive: true });
  const worker = await createWorker("fra+nld", undefined, {
    cachePath: TESSERACT_CACHE_PATH,
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text ?? "";
    if (text.trim().length >= MIN_TEXT_LENGTH) {
      return text;
    }
    // PDF sans calque texte exploitable (probablement scanné) : on
    // rend la première page en image et on passe par l'OCR. Les fiches
    // tarifaires tiennent sur une page ; les documents multi-pages plus
    // complexes ne sont pas couverts par ce fallback.
    const screenshot = await parser.getScreenshot({ scale: 2, first: 1 });
    const page = screenshot.pages[0];
    if (!page) return text;
    return ocrImage(Buffer.from(page.data));
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun fichier reçu (champ 'file' attendu)." },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 15 Mo)." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    if (file.type === "application/pdf") {
      text = await extractPdfText(buffer);
    } else if (file.type.startsWith("image/")) {
      text = await ocrImage(buffer);
    } else {
      return NextResponse.json(
        { error: "Format non supporté : envoie un PDF ou une image (PNG/JPG)." },
        { status: 415 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `Échec de l'extraction : ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  if (text.trim().length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error:
          "Aucun texte exploitable trouvé dans le document. Essaie une photo plus nette ou un autre fichier.",
      },
      { status: 422 },
    );
  }

  const extraction = extractContractFromText(text);
  return NextResponse.json({ extraction, textPreview: text.slice(0, 2000) });
}

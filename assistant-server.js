/* ==========================================================================
   Parvenir asszisztens – Node.js szerver a Claude API-hoz
   Indítás: ANTHROPIC_API_KEY=sk-ant-... node assistant-server.js
   ========================================================================== */
const http = require('http');

const API_KULCS = process.env.ANTHROPIC_API_KEY;
const PORT      = process.env.PORT || 8787;
const MODELL    = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';

const MAX_KERES_MERET   = 20000; // bájt
const MAX_UZENET_SZAM   = 10;    // ennyi utolsó üzenetet küldünk el a modellnek
const MAX_UZENET_HOSSZ  = 2000;  // karakter
const MAX_VALASZ_TOKEN  = 400;

const RENDSZER_UZENET = `Te a Parvenir Gallery ügyfélszolgálati asszisztense vagy. Magyarul válaszolsz, röviden, udvariasan, legfeljebb néhány mondatban.
A Parvenir egy digitális galéria közkincs festményekkel, és keretezett reprodukciós nyomatokat árul.
Tudnivalók (a tulajdonos írja át a valós adatokra):
- Nyomat méretek (hosszabbik oldal): 30 cm 12 900 Ft-tól, 50 cm 24 900 Ft-tól, 80 cm 44 900 Ft-tól. Keret +30–45%, paszpartu +10–18%.
- Keretek: arany, ébenfa, fehér, dió. Paszpartu: nincs, keskeny, széles. Cédula kérhető.
- Házhozszállítás 3–5 munkanap, 1 990 Ft, 60 000 Ft felett ingyenes. Személyes átvétel egyeztetve.
- Fizetés: utánvét, átutalás, bankkártya.
- Az eredeti festmények nem eladók, csak nyomatok.
Szabályok: ne találj ki rendelési adatot, árat vagy szabályt, amit fent nem kaptál. Ha nem tudod, vagy rendelési adatot kérnek, irányítsd az info@parvenir.example címre. Ne mondd, hogy ember vagy.`;

/* ---------------- Segédfüggvények ---------------- */
function jsonValasz(valasz, statusz, adat) {
  valasz.writeHead(statusz, { 'Content-Type': 'application/json' });
  valasz.end(JSON.stringify(adat));
}

function torzOlvasasa(keres) {
  return new Promise((sikeres, hibas) => {
    let torzs = '';
    keres.on('data', darab => {
      torzs += darab;
      if (torzs.length > MAX_KERES_MERET) {
        keres.destroy();
        hibas(new Error('Túl nagy kérés'));
      }
    });
    keres.on('end', () => sikeres(torzs));
    keres.on('error', hibas);
  });
}

/** Csak az utolsó néhány, érvényes üzenetet tartja meg. Az első üzenet mindig a felhasználóé kell legyen. */
function uzenetekTisztitasa(nyersLista) {
  if (!Array.isArray(nyersLista)) return [];

  const uzenetek = nyersLista
    .slice(-MAX_UZENET_SZAM)
    .filter(u => u && (u.role === 'user' || u.role === 'assistant') && typeof u.content === 'string')
    .map(u => ({ role: u.role, content: u.content.slice(0, MAX_UZENET_HOSSZ) }));

  while (uzenetek.length && uzenetek[0].role !== 'user') uzenetek.shift();
  return uzenetek;
}

async function claudeValasz(uzenetek) {
  const valasz = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KULCS,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODELL,
      max_tokens: MAX_VALASZ_TOKEN,
      system: RENDSZER_UZENET,
      messages: uzenetek
    })
  });

  if (!valasz.ok) throw new Error(`Az API hibát adott: ${valasz.status}`);

  const adat = await valasz.json();
  return (adat.content || []).map(blokk => blokk.text || '').join('').trim();
}

/* ---------------- Szerver ---------------- */
http.createServer(async (keres, valasz) => {
  valasz.setHeader('Access-Control-Allow-Origin', '*');
  valasz.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  valasz.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (keres.method === 'OPTIONS') {
    valasz.writeHead(204);
    return valasz.end();
  }
  if (keres.method !== 'POST' || keres.url !== '/api/assistant') {
    valasz.writeHead(404);
    return valasz.end();
  }

  try {
    const { uzenetek } = JSON.parse(await torzOlvasasa(keres));
    const tisztaUzenetek = uzenetekTisztitasa(uzenetek);
    if (!tisztaUzenetek.length) return jsonValasz(valasz, 400, { hiba: 'nincs üzenet' });

    jsonValasz(valasz, 200, { valasz: await claudeValasz(tisztaUzenetek) });
  } catch (hiba) {
    console.error('Asszisztens hiba:', hiba.message);
    jsonValasz(valasz, 500, { hiba: 'hiba' });
  }
}).listen(PORT, () => {
  if (!API_KULCS) console.warn('Figyelem: nincs ANTHROPIC_API_KEY beállítva.');
  console.log(`Asszisztens: http://localhost:${PORT}/api/assistant`);

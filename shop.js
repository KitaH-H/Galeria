/* ==========================================================================
   Parvenir Gallery – Webshop, fiók és ügyfélszolgálati asszisztens

   Felépítés:
     1. Beállítások és árak
     2. Segédfüggvények és helyi tárolás
     3. Felület felépítése
     4. Kosár
     5. Vásárlás a részletezőből
     6. Felugró ablak és űrlapmezők
     7. Fiók (belépés, regisztráció)
     8. Pénztár
     9. Ügyfélszolgálati asszisztens
    10. Billentyűkezelés
   ========================================================================== */
(() => {
'use strict';

const GALERIA = window.GALERIA;
if (!GALERIA) return;
const { FESTMENYEK, kepUrl } = GALERIA;

/* ==========================================================================
   1. Beállítások és árak
   ========================================================================== */
const BEALLITASOK = {
  email: 'info@parvenir.example',
  szallitas: { dij: 1990, ingyenesFelett: 60000, ido: '3–5 munkanap' },
  // Ha a Node szerver fut, ide jön a címe (pl. 'http://localhost:8787/api/assistant').
  // Üresen hagyva az előre megírt, szabályalapú válaszok működnek.
  asszisztensCim: ''
};

// Hosszabbik oldal szerinti méretek (a kulcsok a HTML-ből nem függenek, itt vannak használatban).
const MERETEK = {
  S: { felirat: '30 cm', alapar: 12900 },
  M: { felirat: '50 cm', alapar: 24900 },
  L: { felirat: '80 cm', alapar: 44900 }
};

// felar: az alapár hányszorosával drágul a keret (0,45 = +45%)
// A kulcsok megegyeznek a galéria KERETEK kulcsaival.
const KERETEK = {
  arany: { nev: 'Arany keret',  felar: 0.45 },
  eben:  { nev: 'Ébenfa keret', felar: 0.35 },
  feher: { nev: 'Fehér keret',  felar: 0.30 },
  dio:   { nev: 'Dió keret',    felar: 0.40 }
};

// A sorrend megegyezik a galéria PASZPARTU_ARANYOK sorrendjével.
const PASZPARTUK = [
  { nev: 'paszpartu nélkül',  felar: 0 },
  { nev: 'keskeny paszpartu', felar: 0.10 },
  { nev: 'széles paszpartu',  felar: 0.18 }
];

const MAX_DARAB_TETELENKENT = 9;

/* ==========================================================================
   2. Segédfüggvények és helyi tárolás
   ========================================================================== */
const egy = valaszto => document.querySelector(valaszto);
const mind = valaszto => [...document.querySelectorAll(valaszto)];

const HTML_KARAKTEREK = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const htmlBiztonsagos = szoveg => String(szoveg).replace(/[&<>"']/g, karakter => HTML_KARAKTEREK[karakter]);

const forint = szam => `${szam.toLocaleString('hu-HU')} Ft`;
const szazalek = ertek => Math.round(ertek * 100);
const keresztnev = teljesNev => teljesNev.split(' ')[0];
const darabSzam = tetelek => tetelek.reduce((osszeg, tetel) => osszeg + tetel.db, 0);

const festmenyKeres = id => FESTMENYEK.find(f => f.id === id);

/** Ár = alapár × (1 + keret felára + paszpartu felára), kerekítve százasra. */
function nyomatAr(meret, keret, paszpartu) {
  const szorzo = 1 + KERETEK[keret].felar + PASZPARTUK[paszpartu].felar;
  return Math.round(MERETEK[meret].alapar * szorzo / 100) * 100;
}

function tetelLeirasa(tetel) {
  const cedula = tetel.cedula ? ', cédulával' : '';
  return `${MERETEK[tetel.meret].felirat} · ${KERETEK[tetel.keret].nev}, ${PASZPARTUK[tetel.paszpartu].nev}${cedula}`;
}

const tarolo = {
  olvas(kulcs, alapertek) {
    try {
      const ertek = localStorage.getItem(kulcs);
      return ertek ? JSON.parse(ertek) : alapertek;
    } catch {
      return alapertek;
    }
  },
  ir(kulcs, ertek) {
    try { localStorage.setItem(kulcs, JSON.stringify(ertek)); } catch { /* nem baj */ }
  }
};

/** Jelszó titkosítása sóval együtt (SHA-256). Régi böngészőkben egyszerűbb tartalék-hash. */
async function jelszoHash(jelszo, so) {
  const adat = new TextEncoder().encode(`${so}:${jelszo}`);
  if (window.crypto?.subtle) {
    const puffer = await crypto.subtle.digest('SHA-256', adat);
    return [...new Uint8Array(puffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 5381;
  for (const bajt of adat) hash = ((hash << 5) + hash + bajt) >>> 0;
  return 'x' + hash.toString(16);
}
const ujSo = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');

// A tárolt adatok. Figyelem: új kulcsokat használnak, mert a mezőnevek magyarra változtak.
let felhasznalok  = tarolo.olvas('parvenir-felhasznalok', {});      // { email: { nev, so, hash, letrehozva } }
let rendelesek    = tarolo.olvas('parvenir-rendelesek', []);
let belepettEmail = tarolo.olvas('parvenir-munkamenet', null);
let kosar = tarolo.olvas('parvenir-kosar', []).filter(tetel =>
  festmenyKeres(tetel.festmenyId) && MERETEK[tetel.meret] && KERETEK[tetel.keret] && PASZPARTUK[tetel.paszpartu] && tetel.db > 0
);

const bejelentkezettFelhasznalo = () =>
  (belepettEmail && felhasznalok[belepettEmail]) ? { email: belepettEmail, nev: felhasznalok[belepettEmail].nev } : null;

/* ==========================================================================
   3. Felület felépítése
   ========================================================================== */
const FELULET_HTML = `
  <div id="topbar">
    <button class="tool" id="acctBtn" type="button">Belépés</button>
    <button class="tool" id="cartBtn" type="button">Kosár <b id="cartN">0</b></button>
  </div>

  <div class="scrim" id="scrim" hidden></div>
  <aside class="drawer" id="drawer" hidden aria-label="Kosár">
    <div class="dhead"><h3>Kosár</h3><button class="mclose" id="drawerX" type="button" aria-label="Bezár">×</button></div>
    <div class="dbody" id="dbody"></div>
    <div class="dfoot" id="dfoot"></div>
  </aside>

  <div class="modal" id="modal" hidden>
    <div class="mbox" role="dialog" aria-modal="true">
      <button class="mclose" id="modalX" type="button" aria-label="Bezár">×</button>
      <div id="mbody"></div>
    </div>
  </div>

  <div id="toast" role="status" hidden></div>

  <button id="chatBtn" class="chatbtn" type="button" aria-expanded="false">Segítség</button>
  <section id="chat" hidden aria-label="Ügyfélszolgálati asszisztens">
    <div class="chead">
      <div><b>Parvenir asszisztens</b><span id="chatSub"></span></div>
      <button class="mclose" id="chatX" type="button" aria-label="Bezár">×</button>
    </div>
    <div class="cmsgs" id="cmsgs" aria-live="polite"></div>
    <form class="cform" id="cform" autocomplete="off">
      <input id="cin" type="text" placeholder="Írd ide a kérdésed…" aria-label="Üzenet" maxlength="400">
      <button class="tool gold" type="submit">Küldés</button>
    </form>
  </section>`;

const gyoker = Object.assign(document.createElement('div'), { id: 'shopRoot', innerHTML: FELULET_HTML });
document.body.appendChild(gyoker);

/** Rövid értesítés a képernyő alján, opcionális gombbal. */
let uzenetIdozito;
function uzenet(szoveg, gombFelirat, gombKattintas) {
  const doboz = egy('#toast');
  doboz.innerHTML = `<span></span>${gombFelirat ? `<button type="button">${htmlBiztonsagos(gombFelirat)}</button>` : ''}`;
  doboz.firstChild.textContent = szoveg;
  if (gombFelirat) {
    doboz.querySelector('button').onclick = () => {
      doboz.hidden = true;
      gombKattintas?.();
    };
  }
  doboz.hidden = false;
  clearTimeout(uzenetIdozito);
  uzenetIdozito = setTimeout(() => { doboz.hidden = true; }, 4200);
}

/* ==========================================================================
   4. Kosár
   ========================================================================== */
const tetelKulcs   = tetel => [tetel.festmenyId, tetel.meret, tetel.keret, tetel.paszpartu, tetel.cedula ? 1 : 0].join('|');
const egysegar     = tetel => nyomatAr(tetel.meret, tetel.keret, tetel.paszpartu);
const reszosszeg   = () => kosar.reduce((osszeg, tetel) => osszeg + egysegar(tetel) * tetel.db, 0);
const kosarDarabok = () => darabSzam(kosar);

function szallitasiDij(osszeg, szallitasMod) {
  const ingyenes = szallitasMod === 'atvetel' || osszeg === 0 || osszeg >= BEALLITASOK.szallitas.ingyenesFelett;
  return ingyenes ? 0 : BEALLITASOK.szallitas.dij;
}

function kosarMentese() {
  tarolo.ir('parvenir-kosar', kosar);
  egy('#cartN').textContent = kosarDarabok();
}

function kosarbaTesz() {
  if (!galeriaAllapot.id) return;
  const ujTetel = {
    festmenyId: galeriaAllapot.id,
    meret: valasztottMeret,
    keret: galeriaAllapot.keret,
    paszpartu: galeriaAllapot.paszpartu,
    cedula: Boolean(galeriaAllapot.cedula),
    db: 1
  };

  const meglevo = kosar.find(tetel => tetelKulcs(tetel) === tetelKulcs(ujTetel));
  if (meglevo) meglevo.db = Math.min(MAX_DARAB_TETELENKENT, meglevo.db + 1);
  else kosar.push(ujTetel);

  kosarMentese();
  uzenet(`Kosárba került: ${festmenyKeres(galeriaAllapot.id).cim}`, 'Kosár megnyitása', kosarMegnyitasa);
}

function tetelSorHtml(tetel, index) {
  const f = festmenyKeres(tetel.festmenyId);
  return `<div class="line" data-ix="${index}">
    <img src="${kepUrl(f.fajl, 160)}" alt="" onerror="this.style.visibility='hidden'">
    <div class="li"><div class="lt">${htmlBiztonsagos(f.cim)}</div><div class="ld">${htmlBiztonsagos(tetelLeirasa(tetel))}</div>
      <div class="lq"><button type="button" data-q="-1" aria-label="Kevesebb">−</button><span>${tetel.db}</span><button type="button" data-q="1" aria-label="Több">+</button><button type="button" class="rm" data-rm>Törlés</button></div></div>
    <div class="lp">${forint(egysegar(tetel) * tetel.db)}</div></div>`;
}

function kosarKirajzolasa() {
  const torzs = egy('#dbody');
  const lab = egy('#dfoot');

  if (!kosar.length) {
    torzs.innerHTML = '<p class="empty-s">A kosarad üres. Nyiss meg egy festményt, állítsd össze a keretet, és válaszd a „Kosárba” gombot.</p>';
    lab.innerHTML = '';
    return;
  }

  torzs.innerHTML = kosar.map(tetelSorHtml).join('');

  const osszeg = reszosszeg();
  const dij = szallitasiDij(osszeg, 'haz');
  lab.innerHTML = `
    <div class="sum"><span>Részösszeg</span><b>${forint(osszeg)}</b></div>
    <div class="sum"><span>Szállítás</span><b>${dij ? forint(dij) : 'Ingyenes'}</b></div>
    <p class="pnote">${forint(BEALLITASOK.szallitas.ingyenesFelett)} felett a házhozszállítás ingyenes.</p>
    <button class="tool gold wide" id="goCheckout" type="button">Tovább a pénztárhoz</button>`;
}

egy('#dbody').addEventListener('click', esemeny => {
  const sor = esemeny.target.closest('.line');
  if (!sor) return;
  const index = Number(sor.dataset.ix);
  const tetel = kosar[index];
  if (!tetel) return;

  if (esemeny.target.dataset.q) {
    tetel.db = Math.min(MAX_DARAB_TETELENKENT, Math.max(1, tetel.db + Number(esemeny.target.dataset.q)));
  } else if (esemeny.target.hasAttribute('data-rm')) {
    kosar.splice(index, 1);
  } else {
    return;
  }
  kosarMentese();
  kosarKirajzolasa();
});

egy('#dfoot').addEventListener('click', esemeny => {
  if (esemeny.target.id === 'goCheckout') penztarInditasa();
});

function kosarMegnyitasa() {
  kosarKirajzolasa();
  egy('#drawer').hidden = false;
  egy('#scrim').hidden = false;
}
function kosarBezarasa() {
  egy('#drawer').hidden = true;
  egy('#scrim').hidden = true;
}
egy('#cartBtn').addEventListener('click', kosarMegnyitasa);
egy('#drawerX').addEventListener('click', kosarBezarasa);
egy('#scrim').addEventListener('click', kosarBezarasa);

/* ==========================================================================
   5. Vásárlás a részletezőből
   ========================================================================== */
let valasztottMeret = 'M';
let galeriaAllapot = GALERIA.allapot(); // { id, keret, paszpartu, cedula }

const vasarlasDoboz = Object.assign(document.createElement('div'), {
  className: 'blk',
  id: 'buy',
  innerHTML: `
    <h4>Nyomat vásárlása</h4>
    <div class="opts" id="sizeOpts" role="group" aria-label="Méret">
      ${Object.keys(MERETEK).map(jel => `<button class="chip" data-size="${jel}" aria-pressed="${jel === valasztottMeret}" type="button">${jel} · ${MERETEK[jel].felirat}</button>`).join('')}
    </div>
    <div class="buyline"><span id="buyDesc"></span><strong id="buyPrice"></strong></div>
    <button class="tool gold" id="addCart" type="button">Kosárba</button>
    <p class="pnote">Bemutató árak. A keretet és a paszpartut a Keretező műhelyben választod. A méret a nyomat hosszabbik oldala.</p>`
});
egy('.side .acts')?.before(vasarlasDoboz);

function vasarlasFrissitese() {
  if (!galeriaAllapot?.id) return;
  const cedula = galeriaAllapot.cedula ? ', cédulával' : '';
  egy('#buyDesc').textContent = `${KERETEK[galeriaAllapot.keret].nev}, ${PASZPARTUK[galeriaAllapot.paszpartu].nev}${cedula}`;
  egy('#buyPrice').textContent = forint(nyomatAr(valasztottMeret, galeriaAllapot.keret, galeriaAllapot.paszpartu));
}

document.addEventListener('galeria:allapot', esemeny => {
  galeriaAllapot = esemeny.detail;
  vasarlasFrissitese();
});

egy('#sizeOpts').addEventListener('click', esemeny => {
  const gomb = esemeny.target.closest('[data-size]');
  if (!gomb) return;
  valasztottMeret = gomb.dataset.size;
  mind('#sizeOpts .chip').forEach(masik => masik.setAttribute('aria-pressed', String(masik === gomb)));
  vasarlasFrissitese();
});
egy('#addCart').addEventListener('click', kosarbaTesz);
vasarlasFrissitese();

/* ==========================================================================
   6. Felugró ablak és űrlapmezők
   ========================================================================== */
const felugro = egy('#modal');
const felugroTorzs = egy('#mbody');
let belepesUtaniMuvelet = null; // ezt hajtjuk végre, ha a belépés után folytatni kell valamit (pl. pénztár)

function felugroMegnyitasa(html) {
  felugroTorzs.innerHTML = html;
  felugro.hidden = false;
  setTimeout(() => felugroTorzs.querySelector('input,select,button')?.focus(), 30);
}
function felugroBezarasa() {
  felugro.hidden = true;
  felugroTorzs.innerHTML = '';
  belepesUtaniMuvelet = null;
}
egy('#modalX').addEventListener('click', felugroBezarasa);
felugro.addEventListener('mousedown', esemeny => { if (esemeny.target === felugro) felugroBezarasa(); });

const urlapMezo = (id, felirat, tipus = 'text', automatikus = '', extra = '') =>
  `<label class="fld" for="${id}"><span>${felirat}</span><input id="${id}" name="${id}" type="${tipus}" autocomplete="${automatikus}" ${extra}></label>`;
const mezoErtek = (urlap, id) => urlap.querySelector(`#${id}`)?.value || '';

/* ==========================================================================
   7. Fiók (belépés, regisztráció)
   ========================================================================== */
function fiokGombFrissitese() {
  const felhasznalo = bejelentkezettFelhasznalo();
  egy('#acctBtn').textContent = felhasznalo ? `Fiók · ${keresztnev(felhasznalo.nev)}` : 'Belépés';
  egy('#chatSub').textContent = BEALLITASOK.asszisztensCim ? 'AI ügyfélszolgálat' : 'Automata ügyfélszolgálat';
}

function munkamenetBeallitasa(email) {
  belepettEmail = email;
  tarolo.ir('parvenir-munkamenet', email);
  fiokGombFrissitese();
}

/** Visszatérési érték: hibaüzenet, vagy null, ha minden rendben. */
async function regisztral(email, jelszo, nev) {
  if (nev.length < 2) return 'Add meg a neved.';
  if (jelszo.length < 8) return 'A jelszó legalább 8 karakter legyen.';
  if (felhasznalok[email]) return 'Ezzel az e-mail-címmel már van fiók. Lépj be.';

  const so = ujSo();
  felhasznalok[email] = { nev, so, hash: await jelszoHash(jelszo, so), letrehozva: Date.now() };
  tarolo.ir('parvenir-felhasznalok', felhasznalok);
  return null;
}

async function ellenorizBelepest(email, jelszo) {
  const felhasznalo = felhasznalok[email];
  const joJelszo = felhasznalo && await jelszoHash(jelszo, felhasznalo.so) === felhasznalo.hash;
  return joJelszo ? null : 'Hibás e-mail-cím vagy jelszó.';
}

/** fulSor: 'belepes' vagy 'regisztracio' */
function belepesNezet(fulSor, tajekoztatas) {
  const regisztracio = fulSor === 'regisztracio';

  felugroMegnyitasa(`
    <h3>${regisztracio ? 'Fiók létrehozása' : 'Belépés'}</h3>
    <div class="opts">
      <button class="chip" data-tab="belepes" aria-pressed="${!regisztracio}" type="button">Belépés</button>
      <button class="chip" data-tab="regisztracio" aria-pressed="${regisztracio}" type="button">Regisztráció</button>
    </div>
    ${tajekoztatas ? `<p class="note">${htmlBiztonsagos(tajekoztatas)}</p>` : ''}
    <form id="authForm" novalidate>
      ${regisztracio ? urlapMezo('a-name', 'Név', 'text', 'name') : ''}
      ${urlapMezo('a-email', 'E-mail-cím', 'email', 'email')}
      ${urlapMezo('a-pw', `Jelszó${regisztracio ? ' (legalább 8 karakter)' : ''}`, 'password', regisztracio ? 'new-password' : 'current-password')}
      <p class="err" id="authErr" role="alert"></p>
      <button class="tool gold wide" type="submit">${regisztracio ? 'Regisztrálok' : 'Belépek'}</button>
    </form>
    <p class="pnote">Bemutató oldal: a fiókod csak ebben a böngészőben tárolódik, a jelszó titkosítva (SHA-256 és só). Éles használathoz szerveroldali fiókkezelés kell.</p>`);

  const urlap = egy('#authForm');
  const hibaHely = egy('#authErr');

  felugroTorzs.querySelectorAll('[data-tab]').forEach(gomb => {
    gomb.addEventListener('click', () => belepesNezet(gomb.dataset.tab, tajekoztatas));
  });

  urlap.addEventListener('submit', async esemeny => {
    esemeny.preventDefault();
    hibaHely.textContent = '';

    const email = mezoErtek(urlap, 'a-email').trim().toLowerCase();
    const jelszo = mezoErtek(urlap, 'a-pw');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      hibaHely.textContent = 'Adj meg érvényes e-mail-címet.';
      return;
    }

    const hiba = regisztracio
      ? await regisztral(email, jelszo, mezoErtek(urlap, 'a-name').trim())
      : await ellenorizBelepest(email, jelszo);
    if (hiba) {
      hibaHely.textContent = hiba;
      return;
    }

    munkamenetBeallitasa(email);
    const folytatas = belepesUtaniMuvelet;
    belepesUtaniMuvelet = null;
    uzenet(`Üdv, ${keresztnev(felhasznalok[email].nev)}!`);
    if (folytatas) folytatas();
    else fiokNezet();
  });
}

function rendelesSorHtml(rendeles) {
  const datum = new Date(rendeles.letrehozva).toLocaleDateString('hu-HU');
  return `<li><div><b>${htmlBiztonsagos(rendeles.id)}</b><span>${datum} · ${darabSzam(rendeles.tetelek)} db</span></div><div class="ot">${forint(rendeles.vegosszeg)}<span>Beérkezett</span></div></li>`;
}

function fiokNezet() {
  const felhasznalo = bejelentkezettFelhasznalo();
  if (!felhasznalo) {
    belepesNezet('belepes');
    return;
  }

  const sajatRendelesek = rendelesek
    .filter(r => r.email === felhasznalo.email)
    .sort((a, b) => b.letrehozva - a.letrehozva);

  felugroMegnyitasa(`
    <h3>Szia, ${htmlBiztonsagos(felhasznalo.nev)}!</h3>
    <p class="sub2">${htmlBiztonsagos(felhasznalo.email)}</p>
    <h4 class="h4">Rendeléseim</h4>
    ${sajatRendelesek.length
      ? `<ul class="olist">${sajatRendelesek.map(rendelesSorHtml).join('')}</ul>`
      : '<p class="pnote">Még nincs rendelésed. Nyiss meg egy festményt, és rendelj belőle keretezett nyomatot.</p>'}
    <button class="tool wide" id="logout" type="button">Kijelentkezés</button>`);

  egy('#logout').addEventListener('click', () => {
    munkamenetBeallitasa(null);
    felugroBezarasa();
    uzenet('Kijelentkeztél.');
  });
}
egy('#acctBtn').addEventListener('click', () => bejelentkezettFelhasznalo() ? fiokNezet() : belepesNezet('belepes'));

/* ==========================================================================
   8. Pénztár
   ========================================================================== */
function penztarInditasa() {
  if (!kosar.length) return;

  if (!bejelentkezettFelhasznalo()) {
    belepesUtaniMuvelet = penztarInditasa;
    kosarBezarasa();
    belepesNezet('belepes', 'A pénztárhoz be kell lépned, vagy létre kell hoznod egy fiókot. A kosarad megmarad.');
    return;
  }
  kosarBezarasa();
  penztarNezet();
}

function rovidTetelSorHtml(tetel, ar, darab) {
  return `<li><div><b>${htmlBiztonsagos(tetel.cim)}</b><span>${htmlBiztonsagos(tetelLeirasa(tetel))} × ${darab}</span></div><div class="ot">${forint(ar * darab)}</div></li>`;
}

/** A pénztárűrlap ellenőrzése. Visszatérés: hibaüzenet vagy null. */
function rendelesAdatokEllenorzese(adatok, feltetelekElfogadva) {
  if (adatok.nev.length < 2) return 'Add meg a neved.';
  if (adatok.telefon.replace(/\D/g, '').length < 7) return 'Adj meg érvényes telefonszámot.';

  if (adatok.mod === 'haz') {
    if (!/^\d{4}$/.test(adatok.iranyitoszam)) return 'Az irányítószám négy számjegy legyen.';
    if (adatok.varos.length < 2 || adatok.utca.length < 4) return 'Add meg a települést és a címet.';
  }
  if (!feltetelekElfogadva) return 'A rendeléshez el kell fogadnod a feltételeket.';
  return null;
}

function rendelesAzonosito() {
  const datum = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const veletlenresz = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PG-${datum}-${veletlenresz}`;
}

function penztarNezet() {
  const felhasznalo = bejelentkezettFelhasznalo();
  const osszeg = reszosszeg();

  const tetelekHtml = kosar.map(tetel => {
    const f = festmenyKeres(tetel.festmenyId);
    return rovidTetelSorHtml({ ...tetel, cim: f.cim }, egysegar(tetel), tetel.db);
  }).join('');

  felugroMegnyitasa(`
    <h3>Pénztár</h3>
    <ul class="olist mini">${tetelekHtml}</ul>
    <form id="coForm" novalidate>
      <div class="two">${urlapMezo('c-name', 'Név', 'text', 'name', `value="${htmlBiztonsagos(felhasznalo.nev)}"`)}${urlapMezo('c-phone', 'Telefonszám', 'tel', 'tel')}</div>
      <label class="fld" for="c-ship"><span>Szállítási mód</span>
        <select id="c-ship"><option value="haz">Házhozszállítás (${BEALLITASOK.szallitas.ido})</option><option value="atvetel">Személyes átvétel (egyeztetett időpontban)</option></select></label>
      <div id="addrBox">
        <div class="two">${urlapMezo('c-zip', 'Irányítószám', 'text', 'postal-code', 'inputmode="numeric" maxlength="4"')}${urlapMezo('c-city', 'Település', 'text', 'address-level2')}</div>
        ${urlapMezo('c-addr', 'Utca, házszám', 'text', 'street-address')}
      </div>
      <label class="fld" for="c-pay"><span>Fizetési mód</span>
        <select id="c-pay"><option value="utanvet">Utánvét</option><option value="atutalas">Banki átutalás</option><option value="kartya">Online bankkártyás fizetés (bemutató)</option></select></label>
      <label class="fld" for="c-note"><span>Megjegyzés (nem kötelező)</span><textarea id="c-note" rows="2" maxlength="300"></textarea></label>
      <label class="chk"><input type="checkbox" id="c-terms"> Elfogadom az általános szerződési feltételeket és az adatkezelési tájékoztatót.</label>
      <div class="sum"><span>Részösszeg</span><b>${forint(osszeg)}</b></div>
      <div class="sum"><span>Szállítás</span><b id="coShip"></b></div>
      <div class="sum tot"><span>Összesen</span><b id="coTotal"></b></div>
      <p class="err" id="coErr" role="alert"></p>
      <button class="tool gold wide" type="submit">Megrendelem</button>
      <p class="pnote">Bemutató oldal: a rendelés itt nem teljesül, bankkártyaadatot sem kérünk. Éles webshophoz fizetési szolgáltató (például Stripe, Barion vagy SimplePay) és szerveroldali rendeléskezelés kell.</p>
    </form>`);

  const urlap = egy('#coForm');
  const hibaHely = egy('#coErr');

  const vegosszegFrissitese = () => {
    const mod = mezoErtek(urlap, 'c-ship');
    const dij = szallitasiDij(osszeg, mod);
    egy('#addrBox').hidden = mod === 'atvetel';
    egy('#coShip').textContent = dij ? forint(dij) : 'Ingyenes';
    egy('#coTotal').textContent = forint(osszeg + dij);
  };
  urlap.querySelector('#c-ship').addEventListener('change', vegosszegFrissitese);
  vegosszegFrissitese();

  urlap.addEventListener('submit', esemeny => {
    esemeny.preventDefault();
    hibaHely.textContent = '';

    const adatok = {
      mod:          mezoErtek(urlap, 'c-ship'),
      nev:          mezoErtek(urlap, 'c-name').trim(),
      telefon:      mezoErtek(urlap, 'c-phone').trim(),
      iranyitoszam: mezoErtek(urlap, 'c-zip').trim(),
      varos:        mezoErtek(urlap, 'c-city').trim(),
      utca:         mezoErtek(urlap, 'c-addr').trim()
    };
    const hiba = rendelesAdatokEllenorzese(adatok, urlap.querySelector('#c-terms').checked);
    if (hiba) {
      hibaHely.textContent = hiba;
      return;
    }

    const dij = szallitasiDij(osszeg, adatok.mod);
    const rendeles = {
      id: rendelesAzonosito(),
      email: felhasznalo.email,
      letrehozva: Date.now(),
      tetelek: kosar.map(tetel => {
        const f = festmenyKeres(tetel.festmenyId);
        return { ...tetel, cim: f.cim, alkoto: f.alkoto, egysegar: egysegar(tetel) };
      }),
      reszosszeg: osszeg,
      szallitasDij: dij,
      vegosszeg: osszeg + dij,
      szallitas: adatok,
      fizetes: mezoErtek(urlap, 'c-pay'),
      megjegyzes: mezoErtek(urlap, 'c-note').trim()
    };

    rendelesek.push(rendeles);
    tarolo.ir('parvenir-rendelesek', rendelesek);
    kosar = [];
    kosarMentese();
    visszaigazolasNezet(rendeles);
  });
}

function visszaigazolasNezet(rendeles) {
  const fizetesNeve = { utanvet: 'utánvét', atutalas: 'banki átutalás', kartya: 'online bankkártyás fizetés' }[rendeles.fizetes];
  const tetelekHtml = rendeles.tetelek.map(tetel => rovidTetelSorHtml(tetel, tetel.egysegar, tetel.db)).join('');

  felugroMegnyitasa(`
    <h3>Köszönjük a rendelésed!</h3>
    <p class="sub2">Rendelésszám: <b>${htmlBiztonsagos(rendeles.id)}</b></p>
    <ul class="olist mini">${tetelekHtml}</ul>
    <div class="sum"><span>Szállítás</span><b>${rendeles.szallitasDij ? forint(rendeles.szallitasDij) : 'Ingyenes'}</b></div>
    <div class="sum tot"><span>Összesen</span><b>${forint(rendeles.vegosszeg)}</b></div>
    <p class="pnote">Fizetési mód: ${fizetesNeve}. Bemutató rendelés: valódi fizetés és szállítás nem történik. A rendelést a Fiókodban találod, és az asszisztenstől is megkérdezheted az állapotát.</p>
    <button class="tool gold wide" id="okBtn" type="button">Rendben</button>`);
  egy('#okBtn').addEventListener('click', felugroBezarasa);
}

/* ==========================================================================
   9. Ügyfélszolgálati asszisztens
   ========================================================================== */
const csevegoAblak = egy('#chat');
const uzenetLista  = egy('#cmsgs');
const uzenetMezo   = egy('#cin');
const beszelgetes  = []; // { role, content } párok; a szervernek ebben a formában kell (Claude API)

// Ékezetek nélküli, kisbetűs szöveg a kulcsszavas kereséshez.
const ekezetNelkul = szoveg => szoveg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// A gombok: felirat = amit a gomb mutat; kuld = elküldött szöveg; megnyit = festmény azonosítója; muvelet = beépített művelet.
const ALAP_GOMBOK = [
  { felirat: 'Mennyibe kerül egy nyomat?',  kuld: 'Mennyibe kerül egy nyomat?' },
  { felirat: 'Hogyan működik a szállítás?', kuld: 'Hogyan működik a szállítás?' },
  { felirat: 'Ajánlj egy képet',            kuld: 'Ajánlj egy képet' },
  { felirat: 'Rendelésem állapota',         kuld: 'Hol tart a rendelésem?' }
];

// Szándékfelismerés: a legtöbb kulcsszóval egyező szándék nyer. A kulcsszavak ékezet nélküliek.
const SZANDEK_SZABALYOK = [
  { szandek: 'szallitas', kulcsszavak: ['szallit', 'kiszallit', 'csomag', 'futar', 'posta', 'erkezik', 'mikor kapom', 'kezbesit', 'atvetel'] },
  { szandek: 'fizetes',   kulcsszavak: ['fizet', 'kartya', 'utanvet', 'atutal', 'szamla', 'barion', 'simplepay', 'stripe'] },
  { szandek: 'visszaru',  kulcsszavak: ['visszakuld', 'visszaad', 'cser', 'elallas', 'reklamac', 'serult', 'hibas', 'garancia'] },
  { szandek: 'ar',        kulcsszavak: ['mennyibe', 'kerul', 'koltseg', 'draga', 'olcso', 'mennyi', 'arak', 'ara', 'arat'], regex: /\bar\b/ },
  { szandek: 'keret',     kulcsszavak: ['keret', 'paszpartu', 'cedula', 'ebenfa'] },
  { szandek: 'meret',     kulcsszavak: ['meret', 'centi', 'cm', 'mekkora'] },
  { szandek: 'rendeles',  kulcsszavak: ['rendeles', 'megrendel', 'allapot', 'nyomkovet', 'hol tart'] },
  { szandek: 'fiok',      kulcsszavak: ['regisztr', 'belep', 'jelszo', 'fiok', 'kijelent'] },
  { szandek: 'kosar',     kulcsszavak: ['kosar', 'penztar', 'vasarol', 'megvesz', 'venni', 'rendelni'] },
  { szandek: 'ki',        kulcsszavak: ['ki vagy', 'mesterseges', 'robot', 'chatbot', 'emberrel', 'te ai', 'ai vagy'] },
  { szandek: 'kapcsolat', kulcsszavak: ['kapcsolat', 'telefon', 'email', 'e-mail', 'elerhet', 'nyitvatart', 'operator', 'ugyfelszolgalat'] },
  { szandek: 'koszones',  kulcsszavak: ['szia', 'hello', 'jo napot', 'jo estet', 'udvozl', 'helo', 'csumi'] },
  { szandek: 'koszonet',  kulcsszavak: ['koszon', 'koszi'] },
  { szandek: 'ajanlas',   kulcsszavak: ['ajanl', 'javasol', 'tipp', 'melyiket', 'ajandek', 'mit vegyek', 'nem tudom'] },
  { szandek: 'funkciok',  kulcsszavak: ['funkcio', 'mit tud', 'hogyan mukodik', 'lampa', 'nagyito', 'paletta', 'idoutazas', 'csuszka'] },
  { szandek: 'eredeti',   kulcsszavak: ['eredeti', 'valodi festmeny', 'elado a festmeny'] },
  { szandek: 'akcio',     kulcsszavak: ['kedvezmeny', 'akcio', 'kupon'] }
];

// Hangulat szerinti képajánlások.
const HANGULAT_AJANLASOK = [
  { kulcsszavak: ['nyugod', 'derus', 'vidam', 'tavasz', 'termeszet', 'feny'], festmenyek: ['mezo', 'ballon', 'monet'] },
  { kulcsszavak: ['dramai', 'sotet', 'komor', 'szorong', 'erzelm'],           festmenyek: ['night', 'munch'] },
  { kulcsszavak: ['arany', 'luxus', 'romantik', 'szerelm'],                   festmenyek: ['klimt'] },
  { kulcsszavak: ['magyar', 'hazai'],                                         festmenyek: ['cedrus', 'libanon', 'mosztar'] },
  { kulcsszavak: ['klasszik', 'reneszansz', 'hagyomanyos'],                   festmenyek: ['mona', 'vermeer'] },
  { kulcsszavak: ['tenger', 'hullam', 'japan'],                               festmenyek: ['hullam'] }
];

/** szerep: 'me' vagy 'bot' (a CSS ezekre az osztályokra hivatkozik). */
function uzenetKiirasa(szerep, szoveg, gombok = []) {
  const buborek = Object.assign(document.createElement('div'), { className: `msg ${szerep}` });
  buborek.appendChild(Object.assign(document.createElement('p'), { textContent: szoveg }));

  if (gombok.length) {
    const gombSor = Object.assign(document.createElement('div'), { className: 'cchips' });
    gombok.forEach(gomb => {
      const elem = Object.assign(document.createElement('button'), { type: 'button', className: 'chip', textContent: gomb.felirat });
      elem.addEventListener('click', () => gombMuvelet(gomb));
      gombSor.appendChild(elem);
    });
    buborek.appendChild(gombSor);
  }
  uzenetLista.appendChild(buborek);
  uzenetLista.scrollTop = uzenetLista.scrollHeight;
}

function gombMuvelet(gomb) {
  if (gomb.kuld)                        elkuld(gomb.kuld);
  else if (gomb.megnyit)                GALERIA.megnyit(gomb.megnyit);
  else if (gomb.muvelet === 'kosar')    kosarMegnyitasa();
  else if (gomb.muvelet === 'belepes')  belepesNezet('belepes');
  else if (gomb.muvelet === 'fiok')     fiokNezet();
}

/** Megkeresi a szövegben említett festményeket (cím vagy festő alapján, ragozott alakokat is). */
function festmenyekKeresese(szoveg) {
  const kihagyottSzavak = new Set(['felett', 'mellett', 'kozott', 'nagy', 'azon']);

  const talalatok = FESTMENYEK.map(festmeny => {
    const szavak = ekezetNelkul(`${festmeny.cim} ${festmeny.alkoto}`)
      .split(/[^a-z0-9]+/)
      .filter(szo => szo.length >= 4 && !kihagyottSzavak.has(szo));
    // A szó töve (az utolsó két betű nélkül) is elég, így a ragozott alakot is megtaláljuk.
    const pont = szavak.filter(szo => szoveg.includes(szo.slice(0, Math.max(4, szo.length - 2)))).length;
    return { festmeny, pont };
  }).filter(talalat => talalat.pont > 0);

  if (!talalatok.length) return [];
  const legjobbPont = Math.max(...talalatok.map(t => t.pont));
  return talalatok.filter(t => t.pont === legjobbPont).map(t => t.festmeny);
}

function szandekFelismerese(szoveg) {
  const pontok = SZANDEK_SZABALYOK.map(szabaly => ({
    szandek: szabaly.szandek,
    pont: szabaly.kulcsszavak.filter(kulcs => szoveg.includes(kulcs)).length + (szabaly.regex?.test(szoveg) ? 1 : 0)
  })).sort((a, b) => b.pont - a.pont);
  return pontok[0].pont > 0 ? pontok[0].szandek : null;
}

/** Rendelésszám (PG-ÉÉÉÉHHNN-XXXX) alapján megadja a rendelés adatait. */
function rendelesLekerdezese(nyersSzoveg) {
  const talalat = nyersSzoveg.match(/pg-\d{8}-[a-z0-9]{4}/i);
  if (!talalat) return null;

  const felhasznalo = bejelentkezettFelhasznalo();
  if (!felhasznalo) {
    return { szoveg: 'A rendelések adatait csak bejelentkezve tudom megmutatni.', gombok: [{ felirat: 'Belépés', muvelet: 'belepes' }] };
  }

  const szam = talalat[0].toUpperCase();
  const rendeles = rendelesek.find(r => r.id.toUpperCase() === szam && r.email === felhasznalo.email);
  if (!rendeles) {
    return { szoveg: `Ezen a fiókon nem találom a ${szam} számú rendelést. Ellenőrizd a számot, vagy írj ide: ${BEALLITASOK.email}`, gombok: [{ felirat: 'Fiókom megnyitása', muvelet: 'fiok' }] };
  }
  const datum = new Date(rendeles.letrehozva).toLocaleDateString('hu-HU');
  return { szoveg: `${rendeles.id}: ${darabSzam(rendeles.tetelek)} tétel, összesen ${forint(rendeles.vegosszeg)}, leadva: ${datum}. Állapot: beérkezett. Szállítási idő: ${BEALLITASOK.szallitas.ido}.` };
}

function festmenyValasz(festmenyek, szandek) {
  if (festmenyek.length > 1) {
    return { szoveg: `Ezeket találtam ${festmenyek[0].alkoto} műveiből:`, gombok: festmenyek.slice(0, 4).map(f => ({ felirat: f.cim, megnyit: f.id })) };
  }
  const f = festmenyek[0];
  const arSzoveg = szandek === 'ar' ? ` Nyomat ${MERETEK.S.felirat}-es méretben ${forint(MERETEK.S.alapar)}-tól kapható (keret nélkül, bemutató ár).` : '';
  const meretSzoveg = f.magassag ? ` Az eredeti mérete ${String(f.magassag).replace('.', ',')} × ${String(f.szelesseg).replace('.', ',')} cm.` : '';
  return { szoveg: `${f.cim} – ${f.alkoto}, ${f.evszoveg}. ${f.leiras}${meretSzoveg}${arSzoveg}`, gombok: [{ felirat: 'Megnyitom', megnyit: f.id }] };
}

/** Előre megírt válaszok. Ide kerül minden szándékhoz tartozó szöveg. */
function szandekValaszai(szoveg, felhasznalo) {
  const szallitas = BEALLITASOK.szallitas;

  const valaszok = {
    koszones: () => ({ szoveg: `Szia${felhasznalo ? `, ${keresztnev(felhasznalo.nev)}` : ''}! Miben segíthetek?`, gombok: ALAP_GOMBOK }),
    koszonet: () => ({ szoveg: 'Szívesen! Ha van más kérdésed, szólj.' }),
    ki: () => ({ szoveg: `Automata asszisztens vagyok: ${BEALLITASOK.asszisztensCim ? 'nyelvi modell segít a válaszokban.' : 'előre megírt tudásbázisból válaszolok, nem szabad szöveges nyelvi modell vagyok.'} Emberi kollégát itt érsz el: ${BEALLITASOK.email}.` }),
    kapcsolat: () => ({ szoveg: `E-mailben érsz el minket: ${BEALLITASOK.email}. A rendelésekkel kapcsolatos kérdéseknél add meg a rendelésszámot.` }),
    szallitas: () => ({ szoveg: `Házhozszállítás: ${szallitas.ido}, ${forint(szallitas.dij)}. ${forint(szallitas.ingyenesFelett)} felett ingyenes. Személyes átvétel egyeztetett időpontban is lehetséges, ez ingyenes.`, gombok: [{ felirat: 'Kosár megnyitása', muvelet: 'kosar' }] }),
    fizetes: () => ({ szoveg: 'A pénztárnál választhatsz utánvétet, banki átutalást vagy online bankkártyás fizetést. Ezen a bemutató oldalon valódi fizetés nem történik.' }),
    visszaru: () => ({ szoveg: `Sérült vagy hibás nyomatot kicseréljük. A pontos visszaküldési és elállási feltételeket az általános szerződési feltételek tartalmazzák. Kérdés esetén írj ide: ${BEALLITASOK.email}.` }),
    keret: () => ({ szoveg: 'Négy keretből választhatsz: arany, ébenfa, fehér, dió. Paszpartu: nincs, keskeny vagy széles. Kérhetsz cédulát is a kép alá a mű címével és az alkotó nevével. Nyiss meg egy festményt, a Keretező műhelyben élőben látod az eredményt.' }),
    eredeti: () => ({ szoveg: 'Az eredeti festmények múzeumok és gyűjtemények tulajdonában vannak, nem eladók. Mi hű reprodukciós nyomatokat kínálunk belőlük, a képek közkincsnek számítanak.' }),
    akcio: () => ({ szoveg: `Jelenleg nincs kupon vagy akció. ${forint(szallitas.ingyenesFelett)} felett ingyenes a házhozszállítás.` }),
    funkciok: () => ({ szoveg: 'A képek között az Időutazás csúszkával korszakot választhatsz. Egy festményt megnyitva nagyítóval nézheted, kiolvashatod a domináns színeit, valós méretben látod, megformázhatod keretben, és le is töltheted PNG-ként. A Szobalámpa elsötétíti a termet, és a kurzorod világít.' }),

    ar: () => {
      const keretFelarak = Object.values(KERETEK).map(k => k.felar);
      const meretek = Object.values(MERETEK).map(m => `${m.felirat} – ${forint(m.alapar)}-tól`).join(', ');
      return { szoveg: `Keretezett nyomataink hosszabbik oldal szerinti méretei: ${meretek}. A keret az alapárhoz képest +${szazalek(Math.min(...keretFelarak))}–${szazalek(Math.max(...keretFelarak))}%, a paszpartu +${szazalek(PASZPARTUK[1].felar)}–${szazalek(PASZPARTUK[2].felar)}%. A pontos árat a festménynél látod, ahogy összeállítod. Az árak bemutató árak.` };
    },

    rendeles: () => {
      if (!felhasznalo) {
        return { szoveg: 'A rendeléseidet bejelentkezés után látom. Lépj be, vagy írd ide a rendelésszámot (PG-…), de azt is csak belépve tudom megnézni.', gombok: [{ felirat: 'Belépés', muvelet: 'belepes' }] };
      }
      const sajat = rendelesek.filter(r => r.email === felhasznalo.email).sort((a, b) => b.letrehozva - a.letrehozva);
      if (!sajat.length) return { szoveg: 'Még nincs rendelésed ezen a fiókon.' };
      const utolso = sajat[0];
      return { szoveg: `Legutóbbi rendelésed: ${utolso.id}, ${forint(utolso.vegosszeg)}, ${new Date(utolso.letrehozva).toLocaleDateString('hu-HU')}. Állapot: beérkezett. Összesen ${sajat.length} rendelésed van.`, gombok: [{ felirat: 'Összes rendelésem', muvelet: 'fiok' }] };
    },

    fiok: () => ({
      szoveg: felhasznalo
        ? `Be vagy jelentkezve: ${felhasznalo.email}. Kijelentkezni a Fiók menüben tudsz. Elfelejtett jelszó visszaállítása ebben a bemutatóban nincs, ehhez éles szerveroldali fiókkezelés kell.`
        : 'Regisztrálni és belépni a jobb felső sarokban a Belépés gombbal tudsz. A vásárláshoz fiók kell. Elfelejtett jelszó visszaállítása ebben a bemutatóban nincs.',
      gombok: felhasznalo ? [] : [{ felirat: 'Belépés / regisztráció', muvelet: 'belepes' }]
    }),

    kosar: () => {
      const db = kosarDarabok();
      return {
        szoveg: db
          ? `A kosaradban ${db} tétel van, ${forint(reszosszeg())} értékben.`
          : 'Vásárláshoz nyiss meg egy festményt, válassz méretet és keretet, majd kattints a Kosárba gombra. A pénztárhoz belépés kell.',
        gombok: [{ felirat: 'Kosár megnyitása', muvelet: 'kosar' }]
      };
    },

    ajanlas: () => {
      const talalat = HANGULAT_AJANLASOK.find(h => h.kulcsszavak.some(kulcs => szoveg.includes(kulcs)));
      const azonositok = talalat ? talalat.festmenyek : ['starry', 'vermeer', 'cedrus'];
      return {
        szoveg: `Ezeket ajánlom: ${azonositok.map(id => festmenyKeres(id).cim).join(', ')}. Ha megmondod, milyen hangulatot keresel (nyugodt, drámai, ragyogó, magyar, klasszikus), pontosabban tudok válogatni.`,
        gombok: azonositok.map(id => ({ felirat: festmenyKeres(id).cim, megnyit: id }))
      };
    }
  };

  valaszok.meret = valaszok.ar; // a méretről kérdezőnek is az árlistát mutatjuk
  return valaszok;
}

/** Szabályalapú válasz: rendelésszám → festmény neve → szándék. Ha semmi nem illik, általános válasz. */
function helyiValasz(nyersSzoveg) {
  const szoveg = ekezetNelkul(nyersSzoveg);
  const felhasznalo = bejelentkezettFelhasznalo();

  const rendelesValasz = rendelesLekerdezese(nyersSzoveg);
  if (rendelesValasz) return rendelesValasz;

  const szandek = szandekFelismerese(szoveg);
  const festmenyek = festmenyekKeresese(szoveg);
  if (festmenyek.length && (!szandek || szandek === 'ar' || szandek === 'meret')) {
    return festmenyValasz(festmenyek, szandek);
  }

  const valaszok = szandekValaszai(szoveg, felhasznalo);
  if (szandek && valaszok[szandek]) return valaszok[szandek]();

  return { szoveg: `Ezt nem tudom biztosan megmondani. Megpróbálhatod másképp megfogalmazni, vagy írj nekünk: ${BEALLITASOK.email}.`, gombok: ALAP_GOMBOK };
}

/** Ha van beállított szerver, azt kérdezi meg, hiba esetén a helyi válaszra esik vissza. */
async function valaszKeszitese(szoveg) {
  if (BEALLITASOK.asszisztensCim) {
    try {
      const felhasznalo = bejelentkezettFelhasznalo();
      const valasz = await fetch(BEALLITASOK.asszisztensCim, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uzenetek: beszelgetes.slice(-10),
          kontextus: { felhasznalo: felhasznalo ? { nev: felhasznalo.nev } : null, kosarDarab: kosarDarabok() }
        })
      });
      if (valasz.ok) {
        const adat = await valasz.json();
        if (adat?.valasz) return { szoveg: String(adat.valasz), gombok: [] };
      }
    } catch { /* hálózati hiba: marad a helyi válasz */ }
  }
  return helyiValasz(szoveg);
}

async function elkuld(szoveg) {
  szoveg = szoveg.trim();
  if (!szoveg) return;

  uzenetKiirasa('me', szoveg);
  beszelgetes.push({ role: 'user', content: szoveg });

  const gepelesJelzo = Object.assign(document.createElement('div'), { className: 'msg bot', innerHTML: '<p class="typing">…</p>' });
  uzenetLista.appendChild(gepelesJelzo);
  uzenetLista.scrollTop = uzenetLista.scrollHeight;

  // Kis szünet, hogy a válasz ne tűnjön azonnalinak.
  const kesleltetes = new Promise(kesz => setTimeout(kesz, 450 + Math.random() * 400));
  const [valasz] = await Promise.all([valaszKeszitese(szoveg), kesleltetes]);

  gepelesJelzo.remove();
  uzenetKiirasa('bot', valasz.szoveg, valasz.gombok);
  beszelgetes.push({ role: 'assistant', content: valasz.szoveg });
}

egy('#cform').addEventListener('submit', esemeny => {
  esemeny.preventDefault();
  const szoveg = uzenetMezo.value;
  uzenetMezo.value = '';
  elkuld(szoveg);
});

let koszontottuk = false;
function csevegoMegjelenitese(nyitva) {
  csevegoAblak.hidden = !nyitva;
  egy('#chatBtn').setAttribute('aria-expanded', String(nyitva));
  egy('#chatBtn').hidden = nyitva;
  if (!nyitva) return;

  if (!koszontottuk) {
    koszontottuk = true;
    const felhasznalo = bejelentkezettFelhasznalo();
    uzenetKiirasa('bot', `Szia${felhasznalo ? `, ${keresztnev(felhasznalo.nev)}` : ''}! A Parvenir automata ügyfélszolgálati asszisztense vagyok. Segítek a nyomatokkal, a kerettel, a szállítással és a rendeléssel.`, ALAP_GOMBOK);
  }
  setTimeout(() => uzenetMezo.focus(), 30);
}
egy('#chatBtn').addEventListener('click', () => csevegoMegjelenitese(true));
egy('#chatX').addEventListener('click', () => csevegoMegjelenitese(false));

/* ==========================================================================
   10. Billentyűkezelés
   ========================================================================== */
// Capture módban fut, hogy az Esc először a bolt ablakait zárja be, és ne a galéria részletezőjét.
window.addEventListener('keydown', esemeny => {
  if (esemeny.key === 'Escape') {
    if (!felugro.hidden)              { esemeny.stopImmediatePropagation(); felugroBezarasa(); }
    else if (!egy('#drawer').hidden)  { esemeny.stopImmediatePropagation(); kosarBezarasa(); }
    else if (!csevegoAblak.hidden)    { esemeny.stopImmediatePropagation(); csevegoMegjelenitese(false); }
    return;
  }

  // A bolt mezőibe gépelés közben a galéria gyorsbillentyűi (L, F, nyilak) ne lépjenek életbe.
  const boltonBelul = esemeny.target.closest?.('#shopRoot');
  if (boltonBelul && esemeny.target.matches?.('input, textarea, select')) esemeny.stopImmediatePropagation();
}, true);

fiokGombFrissitese();
kosarMentese();
})();

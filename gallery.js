/* ==========================================================================
   Parvenir Gallery – Galéria logika

   Felépítés:
     1. Segédfüggvények
     2. Adatok (festmények, keretek)
     3. Állapot
     4. Nyitóképernyő
     5. Időutazás
     6. Rács és szűrés
     7. Szobalámpa
     8. Részletező (lightbox)
     9. Nagyító
    10. Keretező műhely és PNG-letöltés
    11. Domináns színek
    12. Billentyűk és a bolt számára nyitott felület
   ========================================================================== */
(() => {
'use strict';

/* ==========================================================================
   1. Segédfüggvények
   ========================================================================== */
const egy   = valaszto => document.querySelector(valaszto);
const mind  = valaszto => [...document.querySelectorAll(valaszto)];
const veletlen = (min, max) => min + Math.random() * (max - min);

const kepUrl        = (fajlnev, szelesseg) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fajlnev)}?width=${szelesseg}`;
const commonsOldal  = fajlnev => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fajlnev)}`;
const tizedesvesszo = szam => String(szam).replace('.', ',');
const szinHex       = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/* ==========================================================================
   2. Adatok
   ========================================================================== */
// eredet: 'hu' = magyar, 'world' = világ (a HTML szűrőgombjai is ezeket használják)
// kepArany: szélesség / magasság
// magassag, szelesseg: az eredeti kép mérete cm-ben (ha ismert)
const FESTMENYEK = [
  {
    id: 'mona', eredet: 'world',
    fajl: 'Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg',
    cim: 'Mona Lisa', alkoto: 'Leonardo da Vinci', evszoveg: 'kb. 1503–06', ev: 1503,
    kepArany: 53 / 77, muzeum: 'Louvre, Párizs', technika: 'olaj, nyárfatábla', magassag: 77, szelesseg: 53,
    leiras: 'A világ legismertebb portréja: a híres mosoly, a lágy átmenetek, a sfumato mestermunkája.'
  },
  {
    id: 'night', eredet: 'world',
    fajl: 'The_Night_Watch_-_HD.jpg',
    cim: 'Az éjszakai őrjárat', alkoto: 'Rembrandt van Rijn', evszoveg: '1642', ev: 1642,
    kepArany: 437 / 363, muzeum: 'Rijksmuseum, Amszterdam', technika: 'olaj, vászon', magassag: 363, szelesseg: 437,
    leiras: 'Egy polgárőrcsapat csoportképe, amely a fény és árnyék drámájává alakult.'
  },
  {
    id: 'vermeer', eredet: 'world',
    fajl: 'Meisje_met_de_parel.jpg',
    cim: 'A gyöngyfülbevalós lány', alkoto: 'Johannes Vermeer', evszoveg: 'kb. 1665', ev: 1665,
    kepArany: 39 / 44.5, muzeum: 'Mauritshuis, Hága', technika: 'olaj, vászon', magassag: 44.5, szelesseg: 39,
    leiras: 'Tronie, vagyis jellemfej, nem portré. A sötét háttérből világít elő a fordulat pillanata.'
  },
  {
    id: 'friedrich', eredet: 'world',
    fajl: 'Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg',
    cim: 'Vándor a ködtenger felett', alkoto: 'Caspar David Friedrich', evszoveg: 'kb. 1818', ev: 1818,
    kepArany: 74.8 / 94.8, muzeum: 'Hamburger Kunsthalle', technika: 'olaj, vászon', magassag: 94.8, szelesseg: 74.8,
    leiras: 'A romantika ikonikus képe: az egyedül álló alak hátulról látszik, szemben a végtelen tájjal.'
  },
  {
    id: 'hullam', eredet: 'world',
    fajl: 'Tsunami_by_hokusai_19th_century.jpg',
    cim: 'A nagy hullám Kanagawa mellett', alkoto: 'Hokusai', evszoveg: 'kb. 1831', ev: 1831,
    kepArany: 37.9 / 25.7, muzeum: 'több gyűjtemény', technika: 'színes fametszet', magassag: 25.7, szelesseg: 37.9,
    leiras: 'Az ukiyo-e legismertebb lapja. A hullám karmai mögött a Fudzsi hegy kicsiny csúcsa látszik.'
  },
  {
    id: 'monet', eredet: 'world',
    fajl: 'Claude_Monet,_Impression,_soleil_levant,_1872.jpg',
    cim: 'Impresszió, a felkelő nap', alkoto: 'Claude Monet', evszoveg: '1872', ev: 1872,
    kepArany: 63 / 48, muzeum: 'Musée Marmottan Monet, Párizs', technika: 'olaj, vászon', magassag: 48, szelesseg: 63,
    leiras: 'Ez a kép adta az impresszionizmus nevét: Le Havre kikötője hajnali ködben.'
  },
  {
    id: 'pilatus', eredet: 'hu',
    fajl: 'Munkacsy_-_Christ_in_front_of_Pilate.jpg',
    cim: 'Krisztus Pilátus előtt', alkoto: 'Munkácsy Mihály', evszoveg: '1881', ev: 1881,
    kepArany: 2244 / 1470, muzeum: 'Déri Múzeum, Debrecen', technika: 'olaj, vászon', magassag: 417, szelesseg: 636,
    leiras: 'Munkácsy Krisztus-trilógiájának első darabja. Európát és Amerikát bejárta, és hatalmas sikert aratott.'
  },
  {
    id: 'ballon', eredet: 'hu',
    fajl: 'Szinyei_Merse,_Pál_-_Balloon_(1882).jpg',
    cim: 'A léggömb', alkoto: 'Szinyei Merse Pál', evszoveg: '1882', ev: 1882,
    kepArany: 766 / 838, muzeum: '', technika: 'olaj',
    leiras: 'Szinyei szabadtéri, derűs színvilága a plein air festészet magyar úttörőjének kézjegye.'
  },
  {
    id: 'starry', eredet: 'world',
    fajl: 'Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    cim: 'Csillagos éj', alkoto: 'Vincent van Gogh', evszoveg: '1889', ev: 1889,
    kepArany: 92.1 / 73.7, muzeum: 'MoMA, New York', technika: 'olaj, vászon', magassag: 73.7, szelesseg: 92.1,
    leiras: 'A saint-rémy-i elmegyógyintézet ablakából látott éjszakai égbolt, kavargó ecsetvonásokkal.'
  },
  {
    id: 'munch', eredet: 'world',
    fajl: 'Edvard_Munch,_1893,_The_Scream,_oil,_tempera_and_pastel_on_cardboard,_91_x_73_cm,_National_Gallery_of_Norway.jpg',
    cim: 'A sikoly', alkoto: 'Edvard Munch', evszoveg: '1893', ev: 1893,
    kepArany: 73.5 / 91, muzeum: 'Nasjonalmuseet, Oslo', technika: 'olaj, tempera, pasztell, karton', magassag: 91, szelesseg: 73.5,
    leiras: 'Az expresszionizmus előfutára: a vérvörös ég és a görbülő vonalak a szorongást festik meg.'
  },
  {
    id: 'mosztar', eredet: 'hu',
    fajl: 'Cskt-tavasz_mosztarban_(1903).jpg',
    cim: 'Tavasznyílás Mosztárban', alkoto: 'Csontváry Kosztka Tivadar', evszoveg: '1903', ev: 1903,
    kepArany: 999 / 749, muzeum: 'Csontváry Múzeum, Pécs', technika: 'olaj, vászon', magassag: 69, szelesseg: 91,
    leiras: 'A herzegovinai Mostar tavaszi látképe élénk, szinte sűrített színekkel.'
  },
  {
    id: 'cedrus', eredet: 'hu',
    fajl: 'Cskt-maganyos_cedrus_(1907).jpg',
    cim: 'Magányos cédrus', alkoto: 'Csontváry Kosztka Tivadar', evszoveg: '1907', ev: 1907,
    kepArany: 1427 / 1117, muzeum: 'Csontváry Múzeum, Pécs', technika: 'olaj, vászon', magassag: 194, szelesseg: 248,
    leiras: 'Csontváry legismertebb képe: egyetlen fa a libanoni naplementében, szimmetrikus, szinte jelképes kompozícióban.'
  },
  {
    id: 'libanon', eredet: 'hu',
    fajl: 'Pilgrimage_to_the_Cedars_of_Libanon.jpg',
    cim: 'Zarándoklás a cédrusokhoz Libanonban', alkoto: 'Csontváry Kosztka Tivadar', evszoveg: '1907', ev: 1907,
    kepArany: 2581 / 2673, muzeum: 'Magyar Nemzeti Galéria, Budapest', technika: 'olaj, vászon', magassag: 200, szelesseg: 205,
    leiras: 'Zarándokok vonulnak az ősi cédrusligetbe. A magyar festészet egyik legismertebb alkotása.'
  },
  {
    id: 'klimt', eredet: 'world',
    fajl: 'The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg',
    cim: 'A csók', alkoto: 'Gustav Klimt', evszoveg: '1907–08', ev: 1908,
    kepArany: 1, muzeum: 'Belvedere, Bécs', technika: 'olaj, aranylevél, vászon', magassag: 180, szelesseg: 180,
    leiras: 'A szecesszió csúcsműve. Díszes aranymezőben ölelkező pár.'
  },
  {
    id: 'mezo', eredet: 'hu',
    fajl: 'Szinyei_Merse,_Pál_-_Field_(1909).jpg',
    cim: 'Mező', alkoto: 'Szinyei Merse Pál', evszoveg: '1909', ev: 1909,
    kepArany: 1120 / 945, muzeum: '', technika: 'olaj',
    leiras: 'Nyári rét lágy fényekkel, Szinyei késői tájképeinek egyike.'
  }
];

const festmenyKeres = id => FESTMENYEK.find(festmeny => festmeny.id === id);

// A kulcsok megegyeznek a HTML-ben lévő data-fr értékekkel.
const KERETEK = {
  arany: { keret: '#c5a059', paszpartu: '#eee7d6', felirat: '#3b3526' },
  eben:  { keret: '#141210', paszpartu: '#f2efe8', felirat: '#2c2a25' },
  feher: { keret: '#e9e7e1', paszpartu: '#fbfaf7', felirat: '#4a4840' },
  dio:   { keret: '#5b3d27', paszpartu: '#e9dfcc', felirat: '#3a2f22' }
};

// Paszpartu szélessége a kép hosszabbik oldalának arányában (nincs / keskeny / széles).
const PASZPARTU_ARANYOK = [0, 0.035, 0.085];

/* ==========================================================================
   3. Állapot
   ========================================================================== */
const KEDVENCEK_KULCS = 'parvenir-fav';

let kedvencek = new Set();
try {
  kedvencek = new Set(JSON.parse(localStorage.getItem(KEDVENCEK_KULCS) || '[]'));
} catch { /* sérült vagy tiltott tároló: üres lista marad */ }

function kedvencekMentese() {
  try {
    localStorage.setItem(KEDVENCEK_KULCS, JSON.stringify([...kedvencek]));
  } catch { /* nem baj, ha nem sikerül */ }
}

const allapot = {
  szuro: 'all',            // all | hu | world | fav
  kereses: '',
  aktualis: null,          // a megnyitott festmény azonosítója
  lista: [],               // a rácson most látható festmények
  korszak: null,           // az időutazás kiválasztott éve (null = nincs szűrés)
  keret: 'arany',
  paszpartu: 1,            // a PASZPARTU_ARANYOK indexe
  cedula: true,
  nagyitoBekapcsolva: true,
  nagyitas: 2.6
};

/* ==========================================================================
   4. Nyitóképernyő
   ========================================================================== */
function betukLetrehozasa() {
  mind('.letter-line').forEach(sor => {
    const szo = sor.dataset.word || '';
    const eltolas = Number(sor.dataset.offset || 0);

    sor.innerHTML = [...szo].map((betu, index) => {
      const sorszam = eltolas + index;
      // Az „e” betűnek három, a többinek két alkotóeleme van.
      const alkotoelemek = betu === 'e' ? '<div></div><div></div><div></div>' : '<div></div><div></div>';
      return `<div id="l${sorszam}" style="--g:${sorszam}" class="letter letter-${betu}">${alkotoelemek}</div>`;
    }).join('');
  });
}

function porszemekLetrehozasa() {
  const doboz = egy('#dust');
  if (!doboz) return;

  const darabok = document.createDocumentFragment();
  for (let i = 0; i < 42; i++) {
    const szem = document.createElement('span');
    const meret = veletlen(1, 3.5);
    Object.assign(szem.style, {
      left: `${veletlen(0, 100)}vw`,
      width: `${meret}px`,
      height: `${meret}px`,
      animationDuration: `${veletlen(14, 32)}s`,
      animationDelay: `${-veletlen(0, 30)}s`
    });
    szem.style.setProperty('--dx', `${veletlen(-7, 7)}vw`);
    darabok.appendChild(szem);
  }
  doboz.appendChild(darabok);
}

betukLetrehozasa();
porszemekLetrehozasa();

window.addEventListener("scroll", ()=>{
  if (this.scrollY > 1100 && !egy('#baroff')){
    let el = document.createElement('style');
    el.id = "baroff";
    el.innerHTML = 'body::before, body::after {visibility:hidden}';
    document.body.before(el);
  }
  else if (this.scrollY <= 1100 && egy('#baroff')){
    egy('html').removeChild(egy('#baroff'));
  }
})

/* ==========================================================================
   5. Időutazás
   ========================================================================== */
const KORSZAK_KEZDETE   = 1500;
const KORSZAK_HOSSZA    = 420;   // 1500-tól 1920-ig
const KORSZAK_SZELESSEG = 40;    // a kiválasztott év ± ennyi év számít „közelinek”

const csuszka       = egy('#tl');
const evKijelzo     = egy('#tlYear');
const evJelolok     = egy('#ticks');
const korszakLeiras = egy('#tlNote');
const ALAP_LEIRAS   = 'A pontok az egyes művek keletkezési évét jelölik. Kattints egyre a megnyitásához.';

const evPozicio = ev => `${((ev - KORSZAK_KEZDETE) / KORSZAK_HOSSZA * 100).toFixed(2)}%`;
const korszakban = festmeny => allapot.korszak === null || Math.abs(festmeny.ev - allapot.korszak) <= KORSZAK_SZELESSEG;

evJelolok.innerHTML = FESTMENYEK.map(f =>
  `<button class="tick" data-id="${f.id}" style="left:${evPozicio(f.ev)}" title="${f.cim} · ${f.evszoveg}" aria-label="${f.cim}, ${f.evszoveg}" type="button"></button>`
).join('');

evJelolok.addEventListener('click', esemeny => {
  const jelolo = esemeny.target.closest('.tick');
  if (jelolo) megnyit(jelolo.dataset.id);
});

function korszakFrissitese() {
  mind('.card').forEach(kartya => {
    kartya.classList.toggle('out', !korszakban(festmenyKeres(kartya.dataset.id)));
  });
  mind('.tick').forEach(jelolo => {
    const kijelolt = allapot.korszak !== null && korszakban(festmenyKeres(jelolo.dataset.id));
    jelolo.classList.toggle('in', kijelolt);
  });

  if (allapot.korszak === null) {
    evKijelzo.textContent = '—';
    evKijelzo.classList.add('dim');
    korszakLeiras.textContent = ALAP_LEIRAS;
    return;
  }

  evKijelzo.textContent = allapot.korszak;
  evKijelzo.classList.remove('dim');

  const talalatok = FESTMENYEK
    .filter(korszakban)
    .sort((a, b) => Math.abs(a.ev - allapot.korszak) - Math.abs(b.ev - allapot.korszak));
  const tol = allapot.korszak - KORSZAK_SZELESSEG;
  const ig  = allapot.korszak + KORSZAK_SZELESSEG;

  korszakLeiras.textContent = talalatok.length
    ? `${tol}–${ig} között ${talalatok.length} mű. Legközelebb: ${talalatok[0].cim} (${talalatok[0].alkoto}, ${talalatok[0].evszoveg}).`
    : `${tol}–${ig} között nincs mű a gyűjteményben. Húzd tovább a csúszkát.`;
}

csuszka.addEventListener('input', () => {
  allapot.korszak = Number(csuszka.value);
  korszakFrissitese();
});
egy('#tlReset').addEventListener('click', () => {
  allapot.korszak = null;
  korszakFrissitese();
});

/* ==========================================================================
   6. Rács és szűrés
   ========================================================================== */
const racs = egy('#grid');

function lathatoFestmenyek() {
  const keresettSzoveg = allapot.kereses.trim().toLowerCase();

  return FESTMENYEK
    .filter(f => {
      if (allapot.szuro === 'hu'    && f.eredet !== 'hu')    return false;
      if (allapot.szuro === 'world' && f.eredet !== 'world') return false;
      if (allapot.szuro === 'fav'   && !kedvencek.has(f.id)) return false;
      if (keresettSzoveg && !`${f.cim} ${f.alkoto} ${f.evszoveg} ${f.muzeum}`.toLowerCase().includes(keresettSzoveg)) return false;
      return true;
    })
    .sort((a, b) => a.ev - b.ev);
}

function kartyaHtml(f) {
  return `
    <figure class="card" data-id="${f.id}" tabindex="0" aria-label="${f.cim}, ${f.alkoto}">
      <div class="ph"><div class="im" style="aspect-ratio:${f.kepArany.toFixed(4)}"><img src="${kepUrl(f.fajl, 700)}" alt="${f.cim} – ${f.alkoto}" loading="lazy"><span class="msg"></span></div></div>
      <button class="fav ${kedvencek.has(f.id) ? 'on' : ''}" data-fav="${f.id}" aria-label="Gyűjteményembe" type="button">♥</button>
      <figcaption class="plq"><div><h3>${f.cim}</h3><div class="by">${f.alkoto}</div></div><div class="yr">${f.evszoveg}</div></figcaption>
    </figure>`;
}

function racsKirajzolasa() {
  allapot.lista = lathatoFestmenyek();
  egy('#favn').textContent = kedvencek.size;
  egy('#count').textContent = `${allapot.lista.length} mű látható`;

  if (!allapot.lista.length) {
    const uzenet = allapot.szuro === 'fav'
      ? 'A gyűjteményed még üres. Jelölj meg egy képet a szívvel.'
      : 'Nincs találat.';
    racs.innerHTML = `<div class="empty">${uzenet}</div>`;
    return;
  }

  racs.innerHTML = allapot.lista.map(kartyaHtml).join('');
  // A gyorsítótárból már betöltött képeknél nem érkezik load esemény.
  mind('#grid img').forEach(kep => { if (kep.complete && kep.naturalWidth) kep.classList.add('ok'); });
  korszakFrissitese();
}

// A load és error esemény nem buborékol, ezért „capture” módban figyeljük.
racs.addEventListener('load', esemeny => {
  if (esemeny.target.tagName === 'IMG') esemeny.target.classList.add('ok');
}, true);

racs.addEventListener('error', esemeny => {
  if (esemeny.target.tagName !== 'IMG') return;
  const kepDoboz = esemeny.target.closest('.im');
  if (!kepDoboz) return;
  kepDoboz.classList.add('broken');
  kepDoboz.querySelector('.msg').textContent = 'A kép most nem tölthető be.';
}, true);

racs.addEventListener('click', esemeny => {
  const kedvencGomb = esemeny.target.closest('[data-fav]');
  if (kedvencGomb) {
    esemeny.stopPropagation();
    kedvencValtas(kedvencGomb.dataset.fav);
    return;
  }
  const kartya = esemeny.target.closest('.card');
  if (kartya) megnyit(kartya.dataset.id);
});

racs.addEventListener('keydown', esemeny => {
  const entertVagySzokozt = esemeny.key === 'Enter' || esemeny.key === ' ';
  if (entertVagySzokozt && esemeny.target.classList.contains('card')) {
    esemeny.preventDefault();
    megnyit(esemeny.target.dataset.id);
  }
});

const kedvencGombFelirat = id => kedvencek.has(id) ? '♥ A gyűjteményemben' : '♥ Gyűjteményembe';

function kedvencValtas(id) {
  if (kedvencek.has(id)) kedvencek.delete(id);
  else kedvencek.add(id);
  kedvencekMentese();

  egy('#favn').textContent = kedvencek.size;
  mind(`[data-fav="${id}"]`).forEach(gomb => gomb.classList.toggle('on', kedvencek.has(id)));

  if (allapot.aktualis === id) egy('#favb').textContent = kedvencGombFelirat(id);
  else if (allapot.szuro === 'fav') racsKirajzolasa();
}

mind('.bar .chip').forEach(gomb => gomb.addEventListener('click', () => {
  allapot.szuro = gomb.dataset.f;
  mind('.bar .chip').forEach(masik => masik.setAttribute('aria-pressed', String(masik === gomb)));
  racsKirajzolasa();
}));

egy('#q').addEventListener('input', esemeny => {
  allapot.kereses = esemeny.target.value;
  racsKirajzolasa();
});

egy('#rnd').addEventListener('click', () => {
  megnyit(FESTMENYEK[Math.floor(Math.random() * FESTMENYEK.length)].id);
});

/* ==========================================================================
   7. Szobalámpa
   ========================================================================== */
const lampaBekapcsolva = () => document.body.classList.contains('lamp');

function lampaBeallitas(be) {
  document.body.classList.toggle('lamp', be);
  egy('#lampbtn').setAttribute('aria-pressed', String(be));
  egy('#lampbtn').textContent = be ? 'Villany fel' : 'Szobalámpa';
}
egy('#lampbtn').addEventListener('click', () => lampaBeallitas(!lampaBekapcsolva()));

const fenykor = egy('#spot');
const fenykorMozgatas = (x, y) => {
  fenykor.style.setProperty('--x', `${x}px`);
  fenykor.style.setProperty('--y', `${y}px`);
};
addEventListener('pointermove', e => fenykorMozgatas(e.clientX, e.clientY), { passive: true });
addEventListener('touchmove', e => {
  if (e.touches[0]) fenykorMozgatas(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

/* ==========================================================================
   8. Részletező (lightbox)
   ========================================================================== */
const reszletezo    = egy('#lb');
const szinpad       = egy('#stage');
const nagyKep       = egy('#big');
const paszpartuElem = egy('#mat');
const nagyito       = egy('#loupe');

function reszletekKiirasa(f) {
  egy('#t').textContent = f.cim;
  egy('#s').textContent = `${f.alkoto}, ${f.evszoveg}`;
  egy('#d').textContent = f.leiras;
  egy('#cm').href = commonsOldal(f.fajl);
  egy('#favb').textContent = kedvencGombFelirat(f.id);
  egy('#dlnote').textContent = '';

  const meret = f.magassag ? `${tizedesvesszo(f.magassag)} × ${tizedesvesszo(f.szelesseg)} cm` : '—';
  egy('#dl').innerHTML = [
    ['Technika', f.technika],
    ['Gyűjtemény', f.muzeum || '—'],
    ['Méret', meret]
  ].map(([cimke, ertek]) => `<dt>${cimke}</dt><dd>${ertek}</dd>`).join('');
}

function nagyKepBetoltese(f) {
  szinpad.querySelector('.brokenbig')?.remove();
  paszpartuElem.style.display = '';

  nagyKep.alt = `${f.cim} – ${f.alkoto}`;
  nagyKep.onload = keretMegjelenitese;
  nagyKep.onerror = () => {
    paszpartuElem.style.display = 'none';
    const hibaUzenet = document.createElement('div');
    hibaUzenet.className = 'brokenbig';
    hibaUzenet.textContent = 'A kép most nem tölthető be. A Commons gombbal megnyithatod az eredetit.';
    szinpad.appendChild(hibaUzenet);
  };
  nagyKep.src = kepUrl(f.fajl, 1600);
}

function megnyit(id) {
  const f = festmenyKeres(id);
  if (!f) return;

  allapot.aktualis = id;
  reszletezo.classList.add('open');
  nagyito.style.display = 'none';

  reszletekKiirasa(f);
  nagyKepBetoltese(f);
  keretMegjelenitese();
  szinekBetoltese(f);
}

function bezar() {
  reszletezo.classList.remove('open');
  nagyito.style.display = 'none';
  allapot.aktualis = null;
  if (allapot.szuro === 'fav') racsKirajzolasa(); // a közben kivett kedvencek tűnjenek el
}

/** irany: +1 következő, -1 előző. A látható lista szerint lapoz, körbe-körbe. */
function lapozas(irany) {
  const azonositok = (allapot.lista.length ? allapot.lista : FESTMENYEK).map(f => f.id);
  const jelenlegi = Math.max(0, azonositok.indexOf(allapot.aktualis));
  megnyit(azonositok[(jelenlegi + irany + azonositok.length) % azonositok.length]);
}

egy('#close').addEventListener('click', bezar);
egy('#prev').addEventListener('click', () => lapozas(-1));
egy('#next').addEventListener('click', () => lapozas(1));
egy('#favb').addEventListener('click', () => allapot.aktualis && kedvencValtas(allapot.aktualis));

/* ==========================================================================
   9. Nagyító
   ========================================================================== */
const NAGYITO_ATMERO = 200;
const NAGYITAS_MIN = 1.5;
const NAGYITAS_MAX = 6;

function nagyitoBeallitas(be) {
  allapot.nagyitoBekapcsolva = be;
  egy('#lpb').setAttribute('aria-pressed', String(be));
  nagyKep.classList.toggle('noloupe', !be);
  if (!be) nagyito.style.display = 'none';
}
egy('#lpb').addEventListener('click', () => nagyitoBeallitas(!allapot.nagyitoBekapcsolva));

function nagyitoMozgatas(esemeny) {
  if (!allapot.nagyitoBekapcsolva || !allapot.aktualis) return;

  const kepTeglalap = nagyKep.getBoundingClientRect();
  const x = esemeny.clientX - kepTeglalap.left;
  const y = esemeny.clientY - kepTeglalap.top;
  const kepenKivul = x < 0 || y < 0 || x > kepTeglalap.width || y > kepTeglalap.height;
  if (kepenKivul) {
    nagyito.style.display = 'none';
    return;
  }

  const szinpadTeglalap = szinpad.getBoundingClientRect();
  const nagyitas = allapot.nagyitas;
  Object.assign(nagyito.style, {
    display: 'block',
    left: `${esemeny.clientX - szinpadTeglalap.left - NAGYITO_ATMERO / 2}px`,
    top:  `${esemeny.clientY - szinpadTeglalap.top  - NAGYITO_ATMERO / 2}px`,
    backgroundImage: `url("${nagyKep.currentSrc}")`,
    backgroundSize: `${kepTeglalap.width * nagyitas}px ${kepTeglalap.height * nagyitas}px`,
    backgroundPosition: `${-(x * nagyitas - NAGYITO_ATMERO / 2)}px ${-(y * nagyitas - NAGYITO_ATMERO / 2)}px`
  });
}

nagyKep.addEventListener('pointermove', nagyitoMozgatas);
nagyKep.addEventListener('pointerleave', () => { nagyito.style.display = 'none'; });

szinpad.addEventListener('wheel', esemeny => {
  if (!allapot.nagyitoBekapcsolva) return;
  esemeny.preventDefault();
  const szorzo = esemeny.deltaY < 0 ? 1.1 : 1 / 1.1;
  allapot.nagyitas = Math.min(NAGYITAS_MAX, Math.max(NAGYITAS_MIN, allapot.nagyitas * szorzo));
  nagyitoMozgatas(esemeny);
}, { passive: false });

/* ==========================================================================
   10. Keretező műhely és PNG-letöltés
   ========================================================================== */
/** A keret és a paszpartu CSS-változóit állítja be, és értesíti a boltot a változásról. */
function keretMegjelenitese() {
  const szinek = KERETEK[allapot.keret];
  const kepTeglalap = nagyKep.getBoundingClientRect();
  const hosszabbOldal = Math.max(kepTeglalap.width, kepTeglalap.height) || 520;

  paszpartuElem.style.setProperty('--fc', szinek.keret);
  paszpartuElem.style.setProperty('--mc', szinek.paszpartu);
  paszpartuElem.style.setProperty('--pk', szinek.felirat);
  paszpartuElem.style.setProperty('--fw', `${Math.max(6, hosszabbOldal * 0.018).toFixed(1)}px`);
  paszpartuElem.style.setProperty('--mw', `${(hosszabbOldal * PASZPARTU_ARANYOK[allapot.paszpartu]).toFixed(1)}px`);

  const felirat = egy('#plq');
  const f = festmenyKeres(allapot.aktualis);
  felirat.hidden = !allapot.cedula;
  if (f) felirat.textContent = `${f.cim} — ${f.alkoto}, ${f.evszoveg}`;

  document.dispatchEvent(new CustomEvent('galeria:allapot', { detail: keretAllapot() }));
}

const keretAllapot = () => ({
  id: allapot.aktualis,
  keret: allapot.keret,
  paszpartu: allapot.paszpartu,
  cedula: allapot.cedula
});

addEventListener('resize', () => { if (allapot.aktualis) keretMegjelenitese(); });

/** Egy gombsor (pl. keretválasztó) kattintásait kezeli: a kiválasztott gomb kapja az aria-pressed-et. */
function gombsorFigyelese(csoportValaszto, adatNev, beallit) {
  egy(csoportValaszto).addEventListener('click', esemeny => {
    const gomb = esemeny.target.closest(`[data-${adatNev}]`);
    if (!gomb) return;
    beallit(gomb.dataset[adatNev]);
    mind(`${csoportValaszto} .chip`).forEach(masik => masik.setAttribute('aria-pressed', String(masik === gomb)));
    keretMegjelenitese();
  });
}
gombsorFigyelese('#frOpts',  'fr',  ertek => { allapot.keret = ertek; });
gombsorFigyelese('#matOpts', 'mat', ertek => { allapot.paszpartu = Number(ertek); });

egy('#plqChk').addEventListener('change', esemeny => {
  allapot.cedula = esemeny.target.checked;
  keretMegjelenitese();
});

/** A teljes felbontású képből, kerettel, paszpartuval és felirattal vásznat (canvas) rajzol. */
function keretezettVaszon(kep, f) {
  const szinek = KERETEK[allapot.keret];
  const kepSzel = kep.naturalWidth;
  const kepMag  = kep.naturalHeight;
  const hosszabbOldal = Math.max(kepSzel, kepMag);

  const keretVastagsag    = Math.round(hosszabbOldal * 0.018);
  const paszpartuVastagsag = Math.round(hosszabbOldal * PASZPARTU_ARANYOK[allapot.paszpartu]);
  const betuMeret         = Math.round(hosszabbOldal * 0.026);
  const cedulaMagassag    = allapot.cedula ? Math.round(hosszabbOldal * 0.06) : 0;
  const szegely           = keretVastagsag + paszpartuVastagsag;

  const szelesseg = kepSzel + 2 * szegely;
  const magassag  = kepMag + 2 * szegely + cedulaMagassag;

  const vaszon = Object.assign(document.createElement('canvas'), { width: szelesseg, height: magassag });
  const ctx = vaszon.getContext('2d');

  // keret, majd paszpartu, majd a kép finom árnyékvonallal
  ctx.fillStyle = szinek.keret;
  ctx.fillRect(0, 0, szelesseg, magassag);
  ctx.fillStyle = szinek.paszpartu;
  ctx.fillRect(keretVastagsag, keretVastagsag, szelesseg - 2 * keretVastagsag, magassag - 2 * keretVastagsag);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(szegely - 1, szegely - 1, kepSzel + 2, kepMag + 2);
  ctx.drawImage(kep, szegely, szegely, kepSzel, kepMag);

  if (allapot.cedula) {
    ctx.fillStyle = szinek.felirat;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic ${betuMeret}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText(`${f.cim} — ${f.alkoto}, ${f.evszoveg}`, szelesseg / 2, szegely + kepMag + (paszpartuVastagsag + cedulaMagassag) / 2);
  }
  return vaszon;
}

function pngLetoltes(vaszon, fajlnev, megjegyzes) {
  vaszon.toBlob(blob => {
    if (!blob) {
      megjegyzes.textContent = 'A példány nem készíthető el ennél a képnél.';
      return;
    }
    const hivatkozas = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: fajlnev
    });
    document.body.appendChild(hivatkozas);
    hivatkozas.click();
    hivatkozas.remove();
    setTimeout(() => URL.revokeObjectURL(hivatkozas.href), 5000);
    megjegyzes.textContent = `Letöltve: ${fajlnev} (${vaszon.width} × ${vaszon.height} px)`;
  }, 'image/png');
}

egy('#dlbtn').addEventListener('click', () => {
  const f = festmenyKeres(allapot.aktualis);
  const megjegyzes = egy('#dlnote');
  if (!f) return;
  megjegyzes.textContent = 'Példány készítése…';

  const kep = new Image();
  kep.crossOrigin = 'anonymous';
  kep.onload = () => {
    try {
      pngLetoltes(keretezettVaszon(kep, f), `parvenir-${f.id}-${allapot.keret}.png`, megjegyzes);
    } catch {
      megjegyzes.textContent = 'A böngésző nem engedi a képet vászonra tenni, ezért a letöltés most nem érhető el.';
    }
  };
  kep.onerror = () => { megjegyzes.textContent = 'A kép nem tölthető be, ezért nem készíthető példány.'; };
  kep.src = kepUrl(f.fajl, 1600);
});

/* ==========================================================================
   11. Domináns színek
   ========================================================================== */
const PALETTA_MERET    = 72;  // ekkora kicsinyített képből számolunk
const PALETTA_SZINEK   = 5;
const PALETTA_MIN_TAVOLSAG = 60; // ennél közelebbi színeket nem veszünk fel kétszer

const szinTavolsag = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Összesíti a pixeleket 16-os színkosarakba, és gyakoriság szerint adja vissza az átlagszíneket. */
function gyakoriSzinek(pixelek) {
  const kosarak = new Map();
  for (let i = 0; i < pixelek.length; i += 4) {
    const [r, g, b] = [pixelek[i], pixelek[i + 1], pixelek[i + 2]];
    const kulcs = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const kosar = kosarak.get(kulcs) || { db: 0, r: 0, g: 0, b: 0 };
    kosar.db++;
    kosar.r += r; kosar.g += g; kosar.b += b;
    kosarak.set(kulcs, kosar);
  }
  return [...kosarak.values()]
    .sort((x, y) => y.db - x.db)
    .map(k => [Math.round(k.r / k.db), Math.round(k.g / k.db), Math.round(k.b / k.db)]);
}

/** A leggyakoribb, egymástól kellően eltérő színeket választja ki. */
function elteroSzinek(rendezettSzinek) {
  const kivalasztott = [];
  for (const szin of rendezettSzinek) {
    if (kivalasztott.every(mas => szinTavolsag(mas, szin) > PALETTA_MIN_TAVOLSAG)) kivalasztott.push(szin);
    if (kivalasztott.length === PALETTA_SZINEK) break;
  }
  return kivalasztott;
}

function szinekBetoltese(f) {
  const doboz = egy('#pal');
  const megjegyzes = egy('#pnote');
  doboz.innerHTML = '';
  megjegyzes.textContent = 'Színek kiolvasása…';

  const kep = new Image();
  kep.crossOrigin = 'anonymous';
  kep.onload = () => {
    if (allapot.aktualis !== f.id) return; // közben másik képre léptek
    try {
      const magassag = Math.max(8, Math.round(PALETTA_MERET * kep.naturalHeight / kep.naturalWidth));
      const vaszon = Object.assign(document.createElement('canvas'), { width: PALETTA_MERET, height: magassag });
      const ctx = vaszon.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(kep, 0, 0, PALETTA_MERET, magassag);

      const pixelek = ctx.getImageData(0, 0, PALETTA_MERET, magassag).data;
      const szinek = elteroSzinek(gyakoriSzinek(pixelek));

      doboz.innerHTML = szinek.map(szin => {
        const hex = szinHex(szin);
        return `<button type="button" style="background:${hex}" data-hex="${hex}" aria-label="${hex} másolása"><span>${hex}</span></button>`;
      }).join('');
      megjegyzes.textContent = 'Kattints egy színre a másoláshoz.';
    } catch {
      megjegyzes.textContent = 'A paletta ennél a képnél nem érhető el.';
    }
  };
  kep.onerror = () => {
    if (allapot.aktualis === f.id) megjegyzes.textContent = 'A paletta ennél a képnél nem érhető el.';
  };
  kep.src = kepUrl(f.fajl, 500);
}

egy('#pal').addEventListener('click', esemeny => {
  const gomb = esemeny.target.closest('button');
  if (!gomb) return;
  const hex = gomb.dataset.hex;
  const megjegyzes = egy('#pnote');

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(hex).then(
      () => { megjegyzes.textContent = `${hex} a vágólapra másolva.`; },
      () => { megjegyzes.textContent = hex; }
    );
  } else {
    megjegyzes.textContent = hex;
  }
});

/* ==========================================================================
   12. Billentyűk és a bolt számára nyitott felület
   ========================================================================== */
addEventListener('keydown', esemeny => {
  // Szövegmezőbe gépelés közben ne működjenek a parancsok (a csúszka és a jelölőnégyzet kivétel).
  const szovegMezo = esemeny.target.tagName === 'INPUT' && !['range', 'checkbox'].includes(esemeny.target.type);
  if (szovegMezo) return;

  const nyitva = reszletezo.classList.contains('open');
  const billentyu = esemeny.key.toLowerCase();

  if (esemeny.key === 'Escape' && nyitva)          bezar();
  else if (esemeny.key === 'ArrowRight' && nyitva) lapozas(1);
  else if (esemeny.key === 'ArrowLeft' && nyitva)  lapozas(-1);
  else if (billentyu === 'l')                      lampaBeallitas(!lampaBekapcsolva());
  else if (billentyu === 'f' && nyitva && allapot.aktualis) kedvencValtas(allapot.aktualis);
});

// Ezt használja a bolt (shop.js).
window.GALERIA = {
  FESTMENYEK,
  kepUrl,
  megnyit,
  allapot: keretAllapot
};

racsKirajzolasa();
})();

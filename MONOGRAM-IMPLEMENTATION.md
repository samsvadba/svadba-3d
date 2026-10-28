# Schválený monogram a skrátený úvod V3

## Výsledok

Veľké spoločné srdce po náraze malých srdiečok je vynechané. Náraz a rozbitie
častíc teraz priamo vytvárajú geografiu glóbusu a pokračujú do existujúcej
CESTY. Celkový čas je 25,5 s namiesto 29 s; náraz ostáva v 21,7 s a premena
častíc na glóbus prebieha od 22,4 do 25,3 s. Predchádzajúce fázy sa nemenia.

Schválená rasterová predloha monogramu bola trasovaná do pravých SVG kriviek.
Geometria je iba v `branding/monogram.svg`; písma ani raster nie sú súčasťou
loga. S, oblý ampersand a M majú samostatné skupiny a priehľadné otvory.
Hlavička, pôvodné video/line-art intro, načítavanie, pozvánka a izolovaný
časticový prototyp používajú spoločný inline komponent. Bežné mená zostali
nezmenené. Archív pôvodného úvodu zostal zachovaný.

## Nastavenia

- `branding/monogram.css`: `--monogram-color` (predvolene `currentColor`),
  nepovinné `--monogram-ampersand-color`, `--monogram-s-color`,
  `--monogram-m-color`. Vymazanie konkrétnej výnimky obnoví spoločnú farbu.
- V rovnakom CSS: `--monogram-header-width`, `--monogram-loader-width`,
  `--monogram-invitation-width`; mobilná hlavička má 58 px. Pomer strán je
  odvodený zo schváleného viewBoxu, bez deformácie.
- `brand-v3.js` exportuje `weddingMonogram({width, label})`; čistý renderer je
  v `branding/monogram-component.js`. Každý výskyt má jedinečné ID skupín.
  Bez `label` ide o dekoratívne SVG; tlačidlo na úvod má vlastný názov.
- `branding/export-config.mjs`: explicitné farby statických faviconov a
  zdieľaného oznámenia. `npm run brand:export` ich obnoví; export je aj v
  `npm run build`. Podrobnosti sú v `branding/README.md`.

## Vytvorené alebo upravené súbory

Aktívna V3:

- `brand-v3.js`
- `main-v3.js`
- `index-v3.html`
- `style-v3.css`
- `wedding-v3.js`
- `wedding-v3.css`
- `intro-particles-v3.js`
- `package.json`
- `MONOGRAM-IMPLEMENTATION.md`

Spoločná značka a export:

- `branding/monogram.svg`
- `branding/monogram-component.js`
- `branding/monogram.css`
- `branding/monogram.test.mjs`
- `branding/preview.html` (vývojová kontrola, nie nový produkčný vstup)
- `branding/export-config.mjs`
- `branding/share-announcement-art.png` (pôvodné mená/dátum bez monogramu)
- `branding/README.md`
- `scripts/brand-export.mjs`
- `scripts/brand-export.test.mjs`

Spoločný úvod a jeho kontroly:

- `experiments/intro-particles/particles.js`
- `experiments/intro-particles/choreography.js`
- `experiments/intro-particles/pacing.js`
- `experiments/intro-particles/main.js`
- `experiments/intro-particles/style.css`
- `experiments/intro-particles/tests.mjs`
- `experiments/intro-particles/heart-morph.test.mjs`
- `experiments/intro-particles/continent-visibility.test.mjs`
- `experiments/intro-particles/README.md`

Generované súbory:

- `public/favicon.svg`
- `public/favicon.ico`
- `public/favicon-16.png`
- `public/favicon-32.png`
- `public/simona-martin-wedding-1200x630.jpg`
- `public/branding-assets.json`
- `public/intro-particles-test.html`
- `public/experiments/intro-particles/assets/intro-particles-test-CViPHc-3.js`
- `public/experiments/intro-particles/assets/intro-particles-test-CW457p7g.css`

## Overenie a hranice overenia

- Vektor porovnaný vedľa predlohy aj farebným prekrytím. Zachované rozmery,
  vlasové línie, oblý ampersand a priehľadné vnútorné otvory; žiadne fonty.
- V prehliadači overené tri veľkosti komponentu, všetky štyri farebné
  kombinácie, spoločné prefarbenie, samostatný ampersand aj reset.
- Skutočná šablóna pozvánky a hlavičky overená v rozmeroch 1280 × 720 a
  390 × 844. Pri kontrole statického rozloženia sa vynechala vstupná časová
  os; produkčné animácie tým neboli upravené.
- Favicon skontrolovaný pri 16 a 32 px. Pri 16 px sa časť najjemnejších
  detailov ampersandu prirodzene zmenší; odvodený raster má jemnú podporu
  vlasových línií, ktorá nemení základný SVG.
- Prešli kontroly SVG/komponentu/exportov, natívneho životného cyklu úvodu,
  1 001 stavov pri posune dopredu aj dozadu, projekcie a stretu malých sŕdc,
  geografickej premeny a viditeľnosti kontinentov.
- Prešli offline regresné kontroly RSVP, Instagramu a čistenia pôvodných
  značiek miest. Žiadne ostré RSVP odoslania ani úpravy backendu.
- Produkčná aj izolovaná zostava prešli. Prototyp má pôvodné upozornenie na
  veľký balík, bez novej chyby zostavenia.
- Reálny iPhone/Android nebol pripojený. Plynulosť na fyzickom zariadení
  zostáva na overenie; numerické kontroly nenahrádzajú meranie jeho GPU.

Dočasný lokálny súbor `.brand-wedding-qa.html` nie je súčasťou publikovania.

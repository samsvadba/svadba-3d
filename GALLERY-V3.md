# Galéria vo V3

Fotoikonka otvára galériu priamo v aktuálnej stránke. Externý album Google Fotky už neotvára. Rozhranie používa pôvodný monogram, písma a premenné tém Classic a Olive & Ivory.

## Aktuálny stav

Rozhranie aj serverová implementácia sú pripravené. **Živý Google Disk a HTTPS hosting servera zatiaľ nie sú autorizované ani nasadené.** `config-v3.js` preto obsahuje `gallery.apiUrl: null`. V tomto stave galéria pravdivo vysvetľuje prípravu úložiska a nahrávanie je vypnuté. Nezobrazuje skúšobné fotografie ani falošné potvrdenia.

## Jednorazové dokončenie

1. Majiteľ vytvorí samostatného OAuth klienta Google Drive a spustí pripravený `server/gallery/setup-google.mjs`. Skript vyžiada iba `drive.file` a vytvorí vyhradený privátny svadobný priečinok.
2. Nasadí `server/gallery/` na HTTPS Node hosting. Google údaje a refresh token patria iba do serverových secrets. Neposielajte ich cez chat a nevkladajte ich do GitHub Pages.
3. Nad osobitným testovacím priečinkom spustí `live-smoke.mjs`; tento test ešte nebol vykonaný proti skutočnému Google Disku.
4. Po úspešnom teste sa nastaví `gallery.apiUrl` na skutočnú adresu `https://HOST/api/gallery` a V3 sa publikuje existujúcim Pages postupom.

Presný postup, Render/Docker konfigurácia, bezpečnostné nastavenia, limity a odkazy na náklady sú v [server/gallery/README.md](server/gallery/README.md). GitHub Pages zostáva statický; server potrebuje samostatný hosting. Bezplatný hosting je vhodný na skúšanie, pre svadobný deň odporúčame trvalo bežiaci server s aspoň 1 GiB RAM. Úložisko originálov aj náhľadov sa započítava do kapacity účtu Google Disk.

## Čo bolo overené

- Lokálne HTTP testy servera s pamäťovým testovacím adaptérom Disku: uloženie pôvodných bajtov, náhľady, opakovanie chyby, deduplikácia, nový server nad rovnakým úložiskom, stránkovanie, kontrola typov/veľkostí a izolácia priečinka.
- Skutočný prevod HEIC vzorky z projektu libheif na JPEG náhľad. Originál sa nemení; na mobiloch bez podpory HEIC sa zobrazuje odvodený JPEG.
- V prehliadači: viacnásobný výber JPEG/PNG/HEIC, potvrdené uloženie do testovacieho adaptéra, retry po simulovanej chybe, veľký náhľad, klávesnica, obnovenie stránky a opätovné načítanie fotografií.
- SK/EN, mobilná šírka a farby aktuálnych tém. Pôvodný zvuk, Intro a RSVP prešli svojimi kontrolami; produkčný build prešiel.

**Neoverené:** živé uloženie na Google Disk, skutočný mobilný fotoaparát a výber fotografií na fyzickom iPhone/Androide. Tieto skúšky zostávajú po autorizácii a HTTPS nasadení. Testovacie fotografie sa do produkčnej galérie nekopírujú.

## Zdrojové súbory

- `gallery-v3.js`, `gallery-v3.css`: galéria a nahrávanie.
- `main-v3.js`: existujúca fotoikonka, jazyk a pozastavenie úvodu počas otvorenej galérie.
- `config-v3.js`: jediná adresa servera; žiadne Google prihlasovacie údaje.
- `server/gallery/`: oddelený server, konfigurácia a testy.

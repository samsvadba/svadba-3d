# Simona & Martin — svadobný web V3

Produkcia: https://samsvadba.github.io/svadba-3d/

Hlavná aplikácia je `index-v3.html`. Kratší odkaz na koreň webu presmeruje na V3 a používa rovnaký náhľad pri zdieľaní. Úvod, Cesta, svadobné informácie, RSVP a galéria zostávajú jednou aplikáciou.

## Lokálne spustenie

Použite Node.js 24 LTS a npm. Verzie závislostí sú uložené v `package-lock.json`.

```sh
npm ci
npm run dev
```

## Kontroly a nasadenie

```sh
npm test
npm run build
npm run preview
```

`npm test` spúšťa 15 existujúcich kontrol produkčnej V3. Používa simulované rozhrania; neposiela RSVP a nenahráva fotografie na živý Disk. `npm run build` exportuje monogram, favicony a čiernobiely náhľad, zostaví aplikáciu a overí produkčné súbory, base path `/svadba-3d/` a zhodu metadát oboch adries.

GitHub Pages nasadí `main` iba po úspešnom `npm ci`, testoch a builde. Po zmene závislostí aktualizujte a commitnite aj lockfile. Zmenu náhľadu robte v hlavičke `index-v3.html`; koreňová stránka ju prevezme automaticky. Geometria a exporty značky sú popísané v [branding/README.md](branding/README.md).

## Externé služby a praktické overenie

- RSVP používa existujúci `config.wedding.rsvpEndpoint`. Nemeňte polia payloadu bez overenia prijímača. Úspešné uloženie musí potvrdiť backend; načítanie iframe nestačí. Úplnú živú kontrolu urobte na skutočnej odpovedi a skontrolujte ju v cieľovej Google tabuľke.
- Bezplatná galéria používa Apps Script a Google Disk: [nasadenie a limity](server/gallery/README.md). Automatické testy nenahrádzajú kontrolu skutočného uloženia.
- Na fyzickom iPhone a Androide overte vstup, videá, hudbu, RSVP a fotoaparát/výber fotografií. Emulácia veľkosti displeja nepotvrdzuje správanie mobilného Safari, režimu nízkej spotreby ani aplikácie Instagram.

Aktuálne palety sú Neutrálna, Olive & Ivory a dvojfarebná fialová. Ich jediný zdroj je `public/theme-v3.js`; svetlý/tmavý režim je nezávislý. Po zmene tohto súboru aktualizujte jeho verziu v hlavičke V3, aby prehliadače načítali nové nastavenie.

Starší návrh Depth Gallery bol vizuálne inšpirovaný Atmospheric Depth Gallery od Houmahani Kane / Codrops: https://github.com/houmahani/codrops-depth-gallery. Implementácia bola vlastná, bez preberania zdrojového kódu alebo ukážkových fotografií.

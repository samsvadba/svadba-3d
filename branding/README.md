# Schválený monogram S & M

`monogram.svg` je jediná autoritatívna geometria monogramu. Obsahuje skutočné
krivky a tri skupiny `data-monogram-part="s"`, `"ampersand"` a `"m"`.
Písmo ani rastrový podklad sa na vykreslenie samotného monogramu nepoužívajú.
Pozadie a vnútorné otvory znakov sú priehľadné.

Na stránke sa používa spoločný inline komponent z `brand-v3.js`. Jeho základná
farba prirodzene vychádza z `currentColor` a existujúcej témy. Globálne alebo
na konkrétnom obale možno nastaviť:

```css
:root {
  --monogram-color: currentColor; /* predvolené: farba príslušnej sekcie */
  /* Nepovinné; bez nich zostáva logo jednofarebné. */
  /* --monogram-ampersand-color: #884422; */
  /* --monogram-s-color: #303D29; */
  /* --monogram-m-color: #303D29; */
}
```

Tieto živé nastavenia sú sústredené v `branding/monogram.css`. Predvolené
`--monogram-color: currentColor` rešpektuje aj odlišnú farbu úvodného videa.
Farbu samostatnej časti vymažte, ak sa má vrátiť jednofarebné logo.
Veľkosti v rovnakom súbore: `--monogram-header-width`,
`--monogram-loader-width`, `--monogram-invitation-width`. Mobilná hlavička
má v `style-v3.css` 58 px; nízke obrazovky zmenšujú pozvánku na najviac 126 px.
Komponent `weddingMonogram({ width: 146, label: 'Simona a Martin' })`
podporuje aj samostatnú šírku. Bez `label` je SVG dekoratívne a skryté pred
čítačkami; hlavné tlačidlo na úvod má vlastný prístupný názov.
SVG vždy zachováva pomer strán a používa `preserveAspectRatio="xMidYMid meet"`.
`branding/preview.html` je lokálna kontrola všetkých paliet, veľkostí a
samostatného prefarbenia; nie je ďalším produkčným vstupom aplikácie.

## Statické exporty pre prehliadače a zdieľanie

Statické súbory nepreberajú farbu z otvorenej stránky. Ich výslovné farby a
umiestnenie sú v `branding/export-config.mjs`: `foreground`, `background` a
voliteľné `parts.s`, `parts.ampersand`, `parts.m`. Predvolené hodnoty sú Olive
`#303D29` a Ivory `#F4EBDC`.

Po zmene geometrie alebo tejto konfigurácie spustite:

```sh
npm run brand:export
```

Rovnaký export je súčasťou produkčného buildu. Vytvára `public/favicon.svg`,
`favicon.ico`, `favicon-16.png`, `favicon-32.png`,
`simona-martin-wedding-1200x630.jpg` a kontrolný `branding-assets.json` s hashom
zdrojovej geometrie. Commitnite zdroj aj odvodené súbory. Export používa
vývojovú závislosť `sharp` a nevyžaduje nainštalované písma, prehliadač ani
externé sieťové služby. Lokálny kontrolný príkaz je `npm run test:brand`.

`share-announcement-art.png` uchováva presné pôvodné kaligrafické mená a dátum
zo schváleného náhľadu ako priehľadnú masku. Monogram nie je jej súčasťou:
pri každom exporte sa pridáva z čerstvého `monogram.svg`. Rozloženie aj
typografický charakter oznámenia sa tým zachovávajú.

Len rasterizovaný favicon má drobnú odvodenú podporu vlasových línií
(`favicon.hairlinePixels`, predvolene 0,18 obrazového bodu). Nemení geometriu
hlavného monogramu ani jeho použitia na stránke. Pri 16 px sa zákonite stráca
časť najjemnejších detailov malého ampersandu; ikony 32 px a SVG ich zachovávajú
lepšie.

```sh
npm run test:brand
```

Kontrola overí zhodu exportov so zdrojom, nezávislé prefarbenie ampersandu a
návrat k jednofarebnej verzii, priehľadnosť hlavného SVG, rozmery faviconov,
štruktúru ICO a rozmer sociálneho náhľadu 1200 × 630 px.

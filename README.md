# Simona & Martin — Depth Gallery

Svadobná galéria s deviatimi vlastnými fotografiami. Three.js posúva kameru pozdĺž Z osi podľa natívneho scrollu; rýchlosť scrollu ovplyvňuje jemné naklonenie fotografií. Atmosféra sa mení podľa aktívnej kapitoly. Fotografie si zachovávajú pomer strán.

## Spustenie

npm install
npm run dev

## Kontrola a produkcia

npm run build
npm run preview

GitHub Pages používa base /svadba-3d/ vo vite.config.js. Fotografie sú v public/photos, poradie, texty a palety v src/galleryData.js. Svadobné informácie sú v index.html.

Pokojné zobrazenie ponúka čitateľný fotoalbum. Aktivuje sa automaticky pri prefers-reduced-motion alebo nedostupnom WebGL. Pri zlyhaní načítania textúr zostávajú fotografie aj texty v HTML albume. Externé písmo má systémové náhrady.

Vizuál je inšpirovaný Atmospheric Depth Gallery od Houmahani Kane / Codrops: https://github.com/houmahani/codrops-depth-gallery. Implementácia galérie je vlastná, bez preberania zdrojového kódu alebo ukážkových fotografií.

# Galéria Simona & Martin – server a nasadenie

V3 na GitHub Pages zostáva statická. Tento samostatný Node server poskytuje nahrávanie, zoznam a JPEG náhľady. Produkčný server **nikdy** nepoužíva testovací `MemoryDrive`.

## Čo je pripravené a čo ešte chýba

Implementované: Drive adaptér, privátne originály, odvodené náhľady, kontrola typov/limitov, opakovanie uploadu, API a jednorazová autorizácia majiteľa. Bez OAuth autorizácie majiteľa a samostatného HTTPS hostingu nie je pripojenie k jeho Disku aktívne. `gallery.apiUrl` vo V3 preto zostáva `null`, kým existuje skutočne nasadený server. Rozhranie v tomto stave ukáže, že nahrávanie sa pripravuje; nepredstiera uloženie.

## Jednorazové nastavenie majiteľa

1. V Google Cloud vytvorte samostatný projekt pre túto galériu a povoľte **Google Drive API**. Nastavte OAuth consent a klienta typu **Desktop app**. Žiada sa výhradne rozsah `https://www.googleapis.com/auth/drive.file`.
2. Stiahnutý OAuth JSON uložte mimo verejného repozitára. V lokálnom termináli nastavte `GOOGLE_OAUTH_CREDENTIALS` na jeho úplnú cestu. V `server/gallery` spustite `npm ci` a `npm run setup`.
3. Otvorte vypísaný odkaz, prihláste **iba účet majiteľa** a udeľte súhlas. Lokálny callback používa náhodný port na `127.0.0.1`, kontrolu state a PKCE. Hostia tento krok nerobia.
4. Skript vytvorí nový označený privátny priečinok a lokálny, gitom ignorovaný `.env`. Tokeny sa nevypisujú. Skript existujúci `.env` neprepíše. Obsah `.env` preneste do **serverových secrets hostingu**, nikdy do `config-v3.js`, HTML, GitHub Pages, verejného buildu alebo chatu.
5. OAuth aplikáciu nenechávajte dlhodobo v režime **External / Testing**: Google pri Drive scope vydáva v tomto režime refresh token s platnosťou približne 7 dní. Pred svadbou nastavte zodpovedajúci produkčný stav OAuth aplikácie a opakujte autorizáciu. Zrušený alebo expirovaný súhlas vyžaduje novú autorizáciu majiteľa; runtime scope nikdy automaticky nerozširuje.

Google `drive.file` povoľuje súbory vytvorené/otvorené danou aplikáciou, nie kryptografické obmedzenie tokenu na jeden priečinok. Preto použite samostatný OAuth projekt/klienta; aplikačný kód navyše pri každom čítaní/nahrávaní vynucuje jediný `GOOGLE_DRIVE_FOLDER_ID`, vlastný marker a rolu súboru. Žiadne API neprijíma ľubovoľné Drive ID. Priečinok nezverejňujte cez „Anyone with the link“; server odmietne priečinok zdieľaný verejne alebo na doménu.

## Hosting

Použite Node **22.12+**, odporúčame Node 24 a aspoň **1 GiB RAM**, jednu repliku. `render.yaml` je pripravená šablóna pre Render; pri vytváraní Blueprint vyberte jej cestu `server/gallery/render.yaml`, prípadne vytvorte Node Web Service ručne:

- Root directory: `server/gallery`
- Build: `npm ci --omit=dev`
- Start: `npm start`
- Health: `/health`
- Secrets: štyri `GOOGLE_*` hodnoty z `.env`
- `ALLOWED_ORIGINS=https://samsvadba.github.io`
- `PUBLIC_API_URL=https://SKUTOCNY-HOST/api/gallery`

Súčasťou je aj Dockerfile; Docker build context musí byť `server/gallery`. TLS zabezpečí hosting. Proxy musí povoliť telo aspoň 20 MiB a timeout aspoň 120 sekúnd. Nespúšťajte viac replík: koordinácia súbežných uploadov a rate limit je zámerne v jednom procese. Viac replík by vyžadovalo distribuovaný zámok a rate limiter.

Šablóna nastavuje bezplatný plán iba na skúšanie. Bezplatný Render po nečinnosti uspáva službu a má limity zdrojov; studený štart môže trvať približne minútu. Na svadobný deň odporúčame trvalo bežiaci plán s aspoň 1 GiB, cenu potvrďte v aktuálnom cenníku hostingu. Originály aj náhľady spotrebúvajú úložisko účtu Google Disk; môže byť potrebné navýšiť kapacitu. Pri reštarte hostingu sa fotografie nestratia, pretože autoritatívne úložisko je Disk.

**Proxy a limity:** `TRUST_PROXY_HOPS=0` bezpečne používa adresu socketu. Za proxy potom všetci hostia zdieľajú jej limit 60 uploadov/hodinu a 600 čítaní/5 minút. Pred produkciou overte u hostingu presný počet dôveryhodných proxy a nastavte `TRUST_PROXY_HOPS` (1–8); pravá strana `X-Forwarded-For` sa vyhodnocuje podľa tohto počtu. Server nesmie byť zároveň priamo dostupný z internetu mimo týchto proxy. Nezapínajte dôveru všetkým proxy a nevyberajte neoverenú prvú IP hlavičky. Na Render potvrďte aktuálny reťazec Cloudflare/Render; jeho počet tu úmyselne nie je odhadnutý. Limity sú prevádzková ochrana, nie dôkaz identity hosťa; doplňte limitovanie požiadaviek na okraji hostingu.

Po funkčnom nasadení nastavte **jedinú** hodnotu `gallery.apiUrl` v `config-v3.js` na presnú `PUBLIC_API_URL`, znovu zostavte a publikujte V3 existujúcim Pages postupom. Starý Google Fotky odkaz už fotoikonka neotvára. Google účet ani token nepatria do klienta.

## Súkromie a správa

Hostia nepotrebujú Google prihlásenie. Galéria je určená na spoločné prezeranie cez web: jej zmenšené obrázky sú dostupné ľuďom s odkazom/UUID a nie sú súkromným trezorom. CORS nie je autentifikácia; klient mimo prehliadača ho vie obísť. Nepovinný `GALLERY_INVITE_KEY` + zodpovedajúci klientsky `gallery.inviteKey` obmedzí zoznam/nahrávanie na držiteľov zdieľaného kódu. Takýto verejný kód **nie je serverové tajomstvo ani administrátorské oprávnenie**. JPEG URL nevyžadujú vlastné hlavičky, aby fungovali bežné obrázky v Safari/Chrome.

API nemá verejné mazanie, úpravu oprávnení, OAuth callback ani administrátorské operácie. Fotografie spravuje a maže iba majiteľ po prihlásení do Google Disku. Každá fotografia má originál a dva odvodené súbory. Odstránenie originálu ju skryje aj v API; súvisiace UUID náhľady je možné odstrániť majiteľom tiež, aby nezaberali miesto. Kompletný priečinok môže majiteľ spravovať priamo na Disku. Nevytvárajú sa verejné Drive permissions.

Originál sa ukladá bajtovo nezmenený vrátane pôvodných metadát. Náhľad 480 px a preview do 1800 px sú samostatné JPEG bez EXIF/GPS. Server číta len tieto odvodené JPEG, nikdy neposkytuje originál verejnou cestou.

## Súbory, HEIC a opakovanie

Limit: 20 MiB/súbor, 50 megapixelov, najdlhšia strana 16 000 px, najviac 20 položiek vo výbere. JPEG, PNG, WebP a HEIC/HEIF s HEVC sa overujú podľa skutočných bajtov a dekodéra, nie iba prípony/MIME. SVG, video, AVIF, nečitateľné a príliš veľké súbory sa odmietnu. Animované PNG/WebP sa odmietnu. Z HEIC sekvencie/Live Photo kontajnera sa zobrazuje primárna statická fotografia, nie pohybové video; originálny odoslaný súbor zostane zachovaný.

HEIC dekóduje na serveri `heic-decode` / `libheif-js`; stock sharp nemá zabalený HEVC dekóder. Zobrazenie preto funguje aj v prehliadačoch, ktoré HEIC nevedia otvoriť. Konverzia beží v jednom izolovanom worker vlákne s 25 s timeoutom. Limity JS heapu **neohraničujú** všetku natívnu/WASM pamäť, preto odporúčame 1 GiB RAM a obmedzujeme rozmery ešte pred dekódovaním. Pri nedostatku pamäte/poškodenom HEIC server vráti chybu; nesmie hlásiť úspešné uloženie.

Každá položka používa stabilné `X-Upload-Id` UUID. Drive ID pre originál a oba náhľady sa predalokujú; retry používa tie isté súbory. Originály väčšie než 5 MiB používajú oficiálny resumable upload; server sleduje iba session na overenej Google upload doméne. Nedokončený originál má stav `pending` a vo verejnom zozname nie je viditeľný. Až po uložení originálu a oboch JPEG sa nastaví `ready` a vráti úspech. Retry po výpadku pokračuje z Drive metadát. Rovnaké bajty sa deduplikujú podľa SHA-256; nový obsah s už použitým UUID je konflikt. Súbory s neúspešným dokončením zostávajú iba v privátnom priečinku pre bezpečné opakovanie/správu majiteľa.

## API

Base `/api/gallery`:

- `GET /status`: readiness, limity a podporované MIME.
- `GET /photos?cursor=...`: `{photos:[{id,name,width,height,createdAt,thumbnailUrl,displayUrl}],nextCursor}`.
- `POST /photos`: jeden originálny súbor ako binárne telo; `Content-Type`, `X-Upload-Id`, `X-File-Name=encodeURIComponent(name)`, prípadne `X-Gallery-Key`. `{photo}` s HTTP 201 až po potvrdení uloženia.
- `GET /photos/:UUID/thumbnail` a `/image`: JPEG proxy; UUID nie je Drive ID.
- Chyby `{error:{code,message}}`; 400 neplatné údaje, 401 pozvánkový kód, 413 veľkosť, 415 typ, 422 dekódovanie/rozmery, 429 dočasný limit/súbeh, 503 nedostupný Disk. Pri 429 je `Retry-After: 30`.

## Overenie

`npm test` spustí skutočný HTTP server a reálnu JPEG konverziu proti **pamäťovému testovaciemu Drive adaptéru**, nie proti Google účtu. Overuje viac súborov, identické originály, oba náhľady, nový server nad rovnakým úložiskom, stránkovanie, retry, deduplikáciu, prerušené ukladanie, neplatné typy/veľkosti/CORS a izoláciu Drive priečinka. Voliteľný úspešný HEIC test nastavte cez `HEIC_TEST_FILE=/cesta/subor.heic`; bez tejto hodnoty je HEIC úspešný scenár označený ako preskočený. Počas implementácie bol osobitne skutočne vykonaný na oficiálnom `libheif/examples/example.heic` (originál nezmenený, JPEG preview vytvorené).

**Reálny Google Disk zatiaľ nebol otestovaný**, pretože v pracovnom prostredí nie je autorizácia majiteľa ani testovací Google účet. Po autorizácii použite pripravený `live-smoke.mjs` iba s oddeleným testovacím priečinkom:

1. Vytvorte ďalší označený testovací priečinok tým istým setup skriptom, s `GOOGLE_SETUP_ENV_FILE=.env.test` a `GOOGLE_FOLDER_NAME=TEST – svadobná galéria` (nový súbor nesmie existovať).
2. Do prostredia testu nastavte produkčné ID priečinka v `GOOGLE_DRIVE_FOLDER_ID` (iba na kontrolu odlišnosti), ID testu do `GALLERY_TEST_FOLDER_ID`, klienta/token oprávnený pre test a `GALLERY_TEST_CONFIRM=isolated`.
3. `node --env-file=.env.test live-smoke.mjs` vytvorí dva jasne označené testovacie obrázky, preverí náhľady, obnovenie servera a chybu neplatného obrázka. Skript odmietne test, ak sú produkčný a testovací priečinok rovnaké. Pri použití `.env.test` pozor na prepísanie `GOOGLE_DRIVE_FOLDER_ID` týmto súborom: procesové premenné majú prednosť; produkčné ID nastavte vopred.
4. Testovacie fotografie odstráni majiteľ manuálne z **testovacieho** priečinka. Skript nevykonáva mazanie ani nepoužíva údaje hostí.

Praktické otvorenie fotoaparátu a výber viacerých fotografií na skutočnom iPhone/Androide treba potvrdiť po HTTPS nasadení. Simulovaná mobilná šírka nepotvrdzuje natívnu aplikáciu fotoaparátu.

## Zdroje a licencie

- [Drive scope drive.file](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Drive file metadata](https://developers.google.com/workspace/drive/api/reference/rest/v3/files), [OAuth a expirácia tokenov](https://developers.google.com/identity/protocols/oauth2#expiration).
- [Render free tier](https://render.com/docs/free), [Render proxy a rate limiting](https://render.com/articles/how-render-handles-ddos-attacks).
- `sharp` 0.35.5: Apache-2.0; [oficiálne vstupné limity](https://sharp.pixelplumbing.com/api-input/).
- `heic-decode` 2.1.0: ISC, [oficiálny zdroj](https://github.com/catdad-experiments/heic-decode). Závislý `libheif-js` je LGPL-3.0; server používa nezmenený distribuovaný modul a zachováva jeho licenčné súbory v npm balíku. [Licencia a zdroj libheif-js](https://github.com/catdad-experiments/libheif-js). Dekóder sa neposiela návštevníkom do frontend buildu.

# Bezplatná galéria – Google Apps Script + Disk

Node, Render, Docker a localhost OAuth callback sa už nepoužívajú. Žiadne platené služby ani karta. Dáta spotrebúvajú kapacitu existujúceho Google účtu; Apps Script po vyčerpaní kvót požiadavku odmietne. Kód neaktivuje fakturáciu.

Staré Node súbory zostávajú iba ako neaktívna záloha do overenia živého Disku. V3 ich neimportuje, ich API nevolá a samostatný hosting nie je súčasťou nového nasadenia. Starý `render.yaml` ani `setup-google.mjs` nespúšťajte.

## Webové nasadenie

Pripravený projekt majiteľa: https://script.google.com/home/projects/1XsW4zeT74u2VBuXLsfHUkaa87qhWbIlvD3A5l6RuMMB-Mv3PhO3Vc2GG/edit

Autoritatívne súbory: `Code.gs` (Drive/RPC), `Bridge.html` (HTML Service) a `appsscript.json` (Drive v3, V8, úzke scopes).

Pri opakovaní vložte súbory do samostatného Apps Script projektu. Project Settings → zobraziť manifest → vložiť manifest. Rozšírená služba Drive sa povolí v predvolenom Cloud projekte bez plateného hostingu. Deploy → New deployment → Web app → Execute as Me → Who has access Anyone. Majiteľ udelí súhlas cez web Google; hostia sa neprihlasujú. Priečinok vytvorí aplikácia pri prvom `status`; ID zostane v Script Properties. Žiadny refresh token sa nekopíruje.

Po autorizácii nastavte `gallery.scriptUrl` na skutočnú `/exec` adresu. Najprv overte: upload testovacej fotky → pôvodné bajty na Disku → JPEG náhľad → obnovenie stránky. Až potom je nahrávanie prevádzkovo hotové. Aktualizácie servera publikujte ako novú verziu existujúceho deploymentu so stabilnou adresou.

## Oprávnenia a hranice

`drive.file` povoľuje iba súbory vytvorené/otvorené touto aplikáciou; token nie je kryptograficky viazaný na priečinok. Kód navyše vynucuje jediný označený priečinok a roly súborov. API neprijíma ľubovoľné Drive ID, neposkytuje mazanie ani správu. Originály nemajú verejné Drive linky. Správca ich spravuje na Disku. Galéria je pre hostí s odkazom; origin/nonce chráni most, nenahrádza identifikáciu hostí ani komplexnú ochranu verejnej služby pred úmyselným zneužitím.

Limit 10 MiB/originál; JPEG deriváty 180/800 kB a 480/1600 px. Kontroluje sa podpis formátu. Apps Script nemá HEIC dekodér. Prehliadač dekóduje lokálne (natívne alebo cez `vendor/heic-to.js`) a posiela nezmenený originál + JPEG náhľady. Nepodporované HEIC sa odmietnu s radou na JPEG.

Bezplatné kvóty sa môžu meniť: https://developers.google.com/apps-script/guides/services/quotas . Consumer účet má aktuálne 20 000 UrlFetch/deň, 6 minút/vykonanie a 30 súbežných vykonaní/majiteľa. Ďalšie limity platia pre Drive a kapacitu účtu. Prevádzka nie je neobmedzená.

## Overenie

`node server/gallery/apps-script.test.mjs` používa pamäťový adaptér Google rozhraní, **nie skutočný Disk**. `node gallery-v3.test.mjs` kontroluje most a chyby. Živý tok vyžaduje webový súhlas majiteľa. Testy neobsahujú Google prihlasovacie údaje.

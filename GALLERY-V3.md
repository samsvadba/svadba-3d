# Galéria V3 – bezplatné riešenie

Galéria používa existujúci vzhľad, témy a fotoikonku. Jediný `#bottom-nav` sa počas otvorenia presunie dovnútra natívneho dialógu: nie je inertný, ostáva nad posúvanými fotkami a pôvodné tlačidlá zavrú galériu a otvoria príslušnú sekciu. Pri detaile fotografie je lišta skrytá; po zatvorení sa pôvodný prvok vráti na svoje miesto.

Samostatný Node/Render server bol nahradený Apps Script + Google Disk. Nie je potrebný hosting, platobná karta ani platené API. Platí dostupná kapacita účtu a bezplatné kvóty Google. Pri ich vyčerpaní sa upload zastaví s vysvetlením, nie s platbou.

V3 komunikuje cez skrytý HTML Service iframe a `google.script.run`. Nepoužíva CORS požiadavky na Node REST endpoint ani klientsky Google token. Lokálny OAuth callback sa nepoužíva.

Konfigurácia: `gallery.scriptUrl` v `config-v3.js`, skutočná nasadená `/macros/s/.../exec` adresa, alebo `null`, kým nie je autorizácia a reálny test dokončený. **Null znamená vypnuté nahrávanie; rozhranie nepredstiera uloženie.**

## HEIC a limity

Originál JPEG/PNG/WebP/HEIC sa uloží bez zmeny. Prehliadač pripraví JPEG náhľad 480 px a detail 1600 px; ak natívne HEIC neprečíta, načíta bezplatný lokálny libheif prevodník. Nepodporovaná fotografia má vysvetlenie a možnosť skúsiť JPEG. Apps Script overuje podpis formátu, veľkosť a rozmery JPEG náhľadov. Nemá plnohodnotný serverový HEIC dekodér; úplné dekódovanie prebieha v prehliadači. Podpis súboru nie je antivírusová kontrola.

Limit 10 MiB/originál, 50 MP pri dekódovaní, 20 fotografií na výber, jedna konverzia/upload naraz, 500 pokusov o upload/deň. Náhľady sa čítajú postupne a malé sa ukladajú do dočasnej cache. RPC má neurčitý priebeh; „uložené“ sa zobrazí až po potvrdení všetkých zápisov.

Nasadenie: [server/gallery/README.md](server/gallery/README.md). Živé uloženie na Disk musí byť overené po autorizácii majiteľa; lokálne testy ho nenahrádzajú.

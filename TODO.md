# 📋 n8n-gravity – Jövőbeli Fejlesztések

> Későbbi megvalósításra váró funkciók és ötletek.

---

## 1. Batch generálás
Több projekt/oldal egyszerre generálása CSV fájlból vagy ismétlődő űrlapmezőkből.

## 2. HTTPS/SSL támogatás
Let's Encrypt + nginx konfiguráció a biztonságos eléréshez (publikus használat esetén).

## 3. Felhasználói fiókok az n8n-ben
Több felhasználós kezelés (`N8N_USER_MANAGEMENT`), eltérő jogosultságokkal.

## 4. Webhook biztonság (API key / token authentikáció)
A webhook URL védelme token-alapú hitelesítéssel, hogy csak jogosult kérések érkezzenek.

## 5. Statisztika / analitika
Generálási statisztikák: hány oldal, token felhasználás, költség, népszerű típusok.

---

### ✅ Már megvalósított (v0.8)

| # | Fejlesztés |
|---|-----------|
| ✅ | Workflow → Gravity CMS automatikus deploy (.md fájlok) |
| ✅ | Szerkeszthető prompt a webes űrlapon |
| ✅ | Több AI modell támogatása (DeepSeek, OpenAI, Claude) |
| ✅ | Vizuális leírások a weboldal típusokhoz (emojikkal) |
| ✅ | Email értesítés (opcionális mező a generáláshoz) |
| ✅ | Verziókövetés (minden generálás mentve az output/versions/ mappába) |
| ✅ | Téma előnézet (élő preview card a színek és stílus alapján) |
| ✅ | Plugin ajánlások (AI által generált Gravity CMS plugin lista) |
| ✅ | Többnyelvű generálás (checkbox lista: HU, EN, DE, FR, ES, IT) |
| ✅ | Reszponzív előnézet gombok (mobil/tablet/desktop a CMS-hez) |
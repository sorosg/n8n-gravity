# 🏗️ n8n-gravity – Architektúra és Projekt Dokumentáció

> **Teljes körű műszaki dokumentáció az AI-alapú Gravity CMS weboldal generátorról.**
> 
> Verzió: **v0.3.2** | Frissítve: 2026. július 19.

---

## 📋 Tartalomjegyzék

1. [Projekt áttekintés](#1-projekt-áttekintés)
2. [Architektúra diagram](#2-architektúra-diagram)
3. [Komponensek](#3-komponensek)
4. [Adatfolyam](#4-adatfolyam)
5. [Fájlstruktúra](#5-fájlstruktúra)
6. [Környezeti változók](#6-környezeti-változók)
7. [n8n Workflow](#7-n8n-workflow)
8. [Telepítési folyamat](#8-telepítési-folyamat)
9. [Szerver konfiguráció](#9-szerver-konfiguráció)
10. [Verziókezelés](#10-verziókezelés)
11. [Ismert korlátozások](#11-ismert-korlátozások)
12. [Következő lépések / TODO](#12-következő-lépések--todo)

---

## 1. Projekt áttekintés

Az **n8n-gravity** egy Docker-alapú automatizációs rendszer, amely **DeepSeek AI** segítségével **Gravity CMS** weboldal struktúrákat generál. A felhasználó egy webes űrlapon adja meg a weboldal paramétereit, majd az n8n workflow feldolgozza a kérést, meghívja a DeepSeek API-t, és a generált oldalstruktúrát JSON fájlba menti.

### 🎯 Cél

- Teljesen automatizált, AI-vezérelt Gravity CMS weboldal tervezés
- Webes felület a generáláshoz (nem kell terminál)
- 0,15-0,30 Ft / generálás költség (DeepSeek API)
- Docker-alapú, könnyen telepíthető Ubuntu szervereken

### 📦 Stack

| Réteg | Technológia | Verzió |
|-------|------------|--------|
| **Webszerver** | nginx (alpine) | latest |
| **Automatizáció** | n8n | latest |
| **AI API** | DeepSeek (deepseek-chat) | v1 |
| **Adatbázis** | PostgreSQL | 16-alpine |
| **Konténerizáció** | Docker + Docker Compose | 20.10+ / 2.0+ |
| **OS** | Ubuntu | 20.04/22.04/24.04 LTS |

---

## 2. Architektúra diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    192.168.4.148 (Ubuntu Server)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐ │
│  │  epub-translate  │   │  n8n-gravity     │   │  Internet       │ │
│  │  Port: 80, 443   │   │  (Docker Stack)  │   │  (DeepSeek API) │ │
│  └─────────────────┘   └──────────────────┘   └─────────────────┘ │
│                                 │                         ▲         │
│         ┌───────────────────────┼─────────────────────────┘         │
│         │                       │                                   │
│         ▼                       ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    n8n_gravity_network                       │   │
│  │                     (Docker bridge)                          │   │
│  ├──────────────┬──────────────┬───────────────┬───────────────┤   │
│  │              │              │               │               │   │
│  │  ┌────────┐  │  ┌────────┐  │  ┌─────────┐  │  ┌─────────┐  │   │
│  │  │  nginx │  │  │  n8n   │  │  │  postgres│  │  │optional:│  │   │
│  │  │ :8080  │  │  │ :5678  │  │  │  :5432   │  │  │ qdrant  │  │   │
│  │  │ (web)  │  │  │(motor) │  │  │  (db)    │  │  │ ollama   │  │   │
│  │  └────────┘  │  └────────┘  │  └─────────┘  │  │portainer │  │   │
│  │              │              │               │  └─────────┘  │   │
│  └──────────────┴──────────────┴───────────────┴───────────────┘   │
│                                                                     │
│  Volume-ok:                                                         │
│  n8n_gravity_data      → n8n konfiguráció, credential-ök, adatok  │
│  n8n_gravity_postgres  → PostgreSQL adatbázis fájlok              │
│  ./output:/output      → Generált JSON fájlok                     │
│  ./workflows:/...      → n8n workflow definíciók                  │
│  ./nginx.conf:/...     → nginx konfiguráció                       │
│  ./gravity-generator.html:/...  → Webes űrlap                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Port kiosztás

| Port | Konténer | Külső elérés | Leírás |
|------|----------|-------------|--------|
| **80** | epub-translate | ✅ | Meglévő szolgáltatás (HTTP) |
| **443** | epub-translate | ✅ | Meglévő szolgáltatás (HTTPS) |
| **8080** | nginx (web) | ✅ | **Gravity CMS generátor űrlap** |
| **5678** | n8n | ✅ | n8n webes felület + API |
| **5432** | postgres | ❌ (belső) | n8n adatbázis |
| **6333** | qdrant (opc.) | ✅ | Vektor adatbázis API |
| **9443** | portainer (opc.) | ✅ | Docker menedzsment UI |

---

## 3. Komponensek

### 3.1 nginx (n8n-gravity-web)
- **Kép**: `nginx:alpine`
- **Port**: `8080:80`
- **Feladata**:
  - Kiszolgálja a `gravity-generator.html` fájlt (webes űrlap)
  - Proxy-zza a `/healthz` kéréseket az n8n felé (státuszellenőrzés)
  - Proxy-zza a `/webhook/` kéréseket az n8n felé (generálás indítása)
  - Kiszolgálja az `/output/` mappát (generált fájlok böngészése)
- **Konfiguráció**: `nginx.conf`, mount-olva `/etc/nginx/conf.d/default.conf`

### 3.2 n8n (n8n-gravity)
- **Kép**: `n8nio/n8n:latest`
- **Port**: `5678:5678`
- **Feladata**:
  - Workflow automatizáló motor
  - Webes felület a workflow-k szerkesztéséhez
  - Webhook fogadása a generálási kérésekhez
  - DeepSeek API hívása
  - Válasz feldolgozása és fájlba mentése
- **Konfiguráció**: `docker-compose.yml` környezeti változók + `.env`
- **Fontos beállítások**:
  - `N8N_HOST=0.0.0.0` – minden interfészen figyel (beégetve)
  - `N8N_SECURE_COOKIE=false` – HTTP-n is működik (belső hálózat)
  - `N8N_BASIC_AUTH_ACTIVE=true` – jelszavas védelem
  - `DEEPSEEK_API_KEY` – környezeti változó a `.env`-ből
  - `N8N_ENCRYPTION_KEY` – titkosítási kulcs (NE változzon újratelepítésnél!)

### 3.3 PostgreSQL (n8n-gravity-db)
- **Kép**: `postgres:16-alpine`
- **Port**: `5432` (belső)
- **Feladata**: Perzisztens adattárolás az n8n számára (workflow-k, végrehajtási előzmények, credential-ök)
- **Healthcheck**: `pg_isready` – enélkül az n8n nem indul el

### 3.4 Opcionális komponensek (`--full` / `--ai` profillal)
| Komponens | Port | Leírás |
|-----------|------|--------|
| **Qdrant** | 6333 | Vektor adatbázis RAG-alapú AI műveletekhez |
| **Ollama** | 11434 | Lokális LLM futtatás (GPU támogatással) |
| **Portainer CE** | 9443 | Docker konténerek webes menedzsmentje |

---

## 4. Adatfolyam

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ Böngésző │────▶│ nginx (8080) │────▶│ n8n (5678)  │────▶│ DeepSeek API │
│ Űrlap    │     │ proxy        │     │ Webhook     │     │ chat API     │
└──────────┘     └──────────────┘     └─────────────┘     └──────────────┘
     │                                       │                      │
     │  1. Felhasználó kitölti az űrlapot   │                      │
     │  2. JavaScript POST /webhook/gravity-generate               │
     │                                       │                      │
     │                                       │  3. Bemenet          │
     │                                       │     feldolgozása     │
     │                                       │  4. Prompt           │
     │                                       │     összeállítása    │
     │                                       │  5. POST /v1/chat/  │
     │                                       │     completions ────▶│
     │                                       │                      │
     │                                       │  6. AI válasz ◀─────│
     │                                       │                      │
     │                                       │  7. JSON parse       │
     │                                       │  8. Fájlba írás     │
     │                                       │     (output/*.json)  │
     │                                       │  9. Válasz küldése   │
     │  ◀────────────────────────────────────│                      │
     │  10. Progress bar + letöltés gomb     │                      │
     │                                      │                      │
     ▼                                                                
┌──────────┐
│ Letöltés │  A generált JSON fájl letöltése
│ gomb     │  /output/ fájlnév.json
└──────────┘
```

### Részletes lépések

1. **Felhasználó** megnyitja `http://192.168.4.148:8080` – az nginx kiszolgálja a HTML űrlapot
2. **JavaScript** összegyűjti az űrlap adatait (cégnév, típus, nyelv, színek, logó base64, hero beállítások, oldalak aloldalakkal)
3. **POST kérés** a `/webhook/gravity-generate` URL-re (nginx proxy → n8n)
4. **n8n Webhook node** fogadja a POST kérést (csak POST, `"httpMethod": "POST"`)
5. **Code: Bemenet feldolgozása** – kiolvassa a JSON body-t, alapértelmezett értékeket állít be, normalizálja az oldalak formátumát
6. **Code: Prompt összeállítása** – a bemenetből részletes szöveges promptot készít, beleértve az oldalak leírását, aloldalakat, színeket, hero-t
7. **HTTP Request: DeepSeek API** – POST a `https://api.deepseek.com/v1/chat/completions`-re, Authorization header a `$env.DEEPSEEK_API_KEY`-ből (NEM credential-ből!)
8. **Code: Válasz feldolgozás** – parse-olja a JSON választ (markdown code block kezeléssel), fájlba írja az `output/` mappába
9. **n8n automatikusan** visszaküldi az utolsó node kimenetét a webhook válaszaként
10. **JavaScript** megjeleníti a progress bar-t, a lépéskijelzőt, és a letöltés gombot

---

## 5. Fájlstruktúra

```
n8n-gravity/
├── .env.example              # Környezeti változók sablonja
├── .env                      # (git által ignorált) Éles konfiguráció
├── .gitignore                # Git kizárások
├── .version                  # Aktuális verziószám (pl. v0.3.2)
├── docker-compose.yml        # Docker stack definíció
├── nginx.conf                # nginx konfiguráció
├── install.sh                # Automatikus telepítő script
├── deploy.sh                 # Verziózó és GitHub push script
├── gravity-generator.html    # Webes űrlap (HTML + CSS + JS)
├── ARCHITECTURE.md           # Ez a dokumentum
├── README.md                 # Felhasználói dokumentáció (magyar)
├── felhasznaloikezikonyv.md  # Részletes Windows felhasználói kézikönyv
├── workflows/
│   └── example-gravity-cms-deepseek.json  # n8n workflow definíció
├── scripts/                  # (üres, egyedi script-ek helye)
└── output/                   # (generált JSON fájlok) – mount-olva a konténerbe
    └── *.json                 # Pl. digitalis_megoldasok_2026-07-19T15-30-00.json
```

---

## 6. Környezeti változók

A `.env` fájl tartalmazza az összes konfigurációt. **Soha ne commit-old a `.env`-t!** A `.gitignore` kizárja.

| Változó | Alapérték | Leírás |
|---------|----------|--------|
| `N8N_AUTH_USER` | `admin` | n8n bejelentkezési felhasználónév |
| `N8N_AUTH_PASSWORD` | (generált) | n8n bejelentkezési jelszó |
| `N8N_PORT` | `5678` | n8n webes felület portja |
| `WEB_PORT` | `8080` | nginx/Gravity CMS űrlap portja |
| `DEEPSEEK_API_KEY` | (kötelező) | DeepSeek API kulcs (`sk-...` formátum) |
| `DB_PASSWORD` | (generált) | PostgreSQL jelszó |
| `N8N_ENCRYPTION_KEY` | (generált) | n8n titkosítási kulcs – **NE változtasd!** |

---

## 7. n8n Workflow

### Workflow neve: "Gravity CMS Weboldal Generátor - DeepSeek AI"

#### Node-ok (sorrendben)

| # | Node típus | Név | Leírás |
|---|-----------|-----|--------|
| 1 | **Webhook** | Webhook (Indító) | POST kérések fogadása a `/webhook/gravity-generate` URL-en |
| 2 | **Code** | Bemenet feldolgozása | JSON body kiolvasása, régi/új formátum kezelése, default értékek |
| 3 | **Code** | DeepSeek Prompt összeállítás | Részletes szöveges prompt generálása az oldalleírásokból |
| 4 | **HTTP Request** | DeepSeek API hívás | POST a DeepSeek chat API-ra, `$env.DEEPSEEK_API_KEY` használatával |
| 5 | **Code** | Válasz feldolgozás | JSON parse, fájlba írás (`/home/node/output/`), válasz összeállítás |

#### Fontos tudnivalók

- **Credential NEM kell!** Az API kulcs a `$env.DEEPSEEK_API_KEY`-ből jön
- A `writeFile` node NEM elérhető ebben az n8n verzióban – a fájlba írást a **Code node** végzi (`fs.writeFileSync`)
- A Webhook node `httpMethod: "POST"` – csak POST kéréseket fogad
- A Prompt összeállítás node-ba be vannak égetve a színek, hero, oldalak, aloldalak
- A fájlok a konténer `/home/node/output/` mappájába íródnak, ami a host `./output/` mappájára van mount-olva

---

## 8. Telepítési folyamat

### 8.1 Friss telepítés (Ubuntu szerveren)

```bash
cd ~
git clone https://github.com/sorosg/n8n-gravity.git
cd n8n-gravity
chmod +x install.sh
sudo ./install.sh
```

A telepítő:
1. Ellenőrzi a rendszer erőforrásokat (RAM, tárhely, CPU)
2. Telepíti a szükséges csomagokat (curl, git, jq, ufw, stb.)
3. Telepíti a Dockert és Docker Compose-t (ha hiányzik)
4. Hozzáadja a felhasználót a docker csoporthoz (automatikusan)
5. Létrehozza a `.env` fájlt véletlen jelszavakkal
6. **Interaktívan bekéri a DeepSeek API kulcsot** (`Shift+Insert`-tel beilleszthető)
7. Beállítja a tűzfalat (UFW vagy iptables)
8. Elindítja az összes konténert
9. Ellenőrzi, hogy minden fut-e

### 8.2 Frissítés

```bash
cd ~/n8n-gravity
git pull
sudo docker compose down
sudo docker compose up -d
```

### 8.3 Csak a web konténer frissítése (HTML változás esetén)

```bash
cd ~/n8n-gravity
git pull
sudo docker compose up -d web
```

---

## 9. Szerver konfiguráció

### 9.1 Aktuális szerver

| Paraméter | Érték |
|-----------|-------|
| **IP cím** | `192.168.4.148` |
| **OS** | Ubuntu (LTS) |
| **Docker** | Telepítve és fut |
| **Foglalt portok** | 80, 443 (epub-translate) |
| **n8n-gravity portok** | 5678, 8080, 5432 (belső) |

### 9.2 epub-translate (meglévő projekt)

- A 80-as és 443-as portokat használja
- **NEM érinti** az n8n-gravity – a két stack teljesen független
- Az nginx a 8080-as porton fut, így nincs ütközés

### 9.3 Tűzfal

- UFW szabályok: 5678/tcp, 6333/tcp, 9443/tcp, 8080/tcp
- Az epub-translate portjai (80, 443) változatlanok

---

## 10. Verziókezelés

### 10.1 Git + GitHub

- **Repository**: https://github.com/sorosg/n8n-gravity
- **Branch**: `main`
- **Tag-ek**: `v0.1.0` – `v0.3.2`

### 10.2 deploy.sh

Automatikus verzióemelés és push:

```bash
./deploy.sh           # patch: v0.3.2 → v0.3.3
./deploy.sh minor     # minor: v0.3.2 → v0.4.0
./deploy.sh major     # major: v0.3.2 → v1.0.0
./deploy.sh --force   # push verzió emelés nélkül
./deploy.sh --dry-run # csak mutatja, mit csinálna
```

A script:
- Git add, commit, tag, push
- Changelog generálása a módosított fájlokból
- `.version` fájl frissítése
- Interaktív megerősítés push előtt

---

## 11. Ismert korlátozások

| Korlátozás | Magyarázat | Kerülő megoldás |
|-----------|-----------|----------------|
| **writeFile node hiányzik** | Az n8n ezen verziója nem támogatja a writeFile node-ot | Code node-ban `fs.writeFileSync` |
| **Credential menüpont hiányzik** | Az n8n Cloud Dashboard nézetben nincs Credentials | `$env.DEEPSEEK_API_KEY` használata credential helyett |
| **file:// CORS** | Helyi fájlból nyíló HTML nem tud fetch-elni | nginx konténer (8080) szolgálja ki same-origin |
| **Státuszellenőrzés file://-ról** | A `fetch` blokkolva van | nginx proxy `/healthz` → same-origin működik |
| **Logo base64 küldése** | Nagy fájlok (~1MB+) problémát okozhatnak | Csak kis logók ajánlottak; fájlméret ellenőrzés nincs |

---

## 12. Következő lépések / TODO

### 12.1 Elvégzett feladatok ✅

- [x] n8n + PostgreSQL Docker stack
- [x] DeepSeek API integráció (környezeti változóból)
- [x] Webhook alapú workflow POST támogatással
- [x] Fájlba mentés Code node-on keresztül
- [x] nginx webes felület (8080-as port)
- [x] Interaktív telepítő script (API kulcs bekérése, docker csoport automatikus)
- [x] Automatikus deploy script (verziózás + GitHub push)
- [x] Webes űrlap: színek, hero, logó, dinamikus oldalak/aloldalak
- [x] Progress bar + lépéskijelző + letöltés gomb
- [x] Szerver státuszjelző (same-origin)
- [x] Teljes dokumentáció (README.md, felhasznaloikezikonyv.md)
- [x] GitHub repo: https://github.com/sorosg/n8n-gravity

### 12.2 Jövőbeli fejlesztési lehetőségek

- [ ] Logo automatikus átméretezés/optimalizálás
- [ ] Több AI modell támogatása (OpenAI, Claude választható)
- [ ] Gravity CMS projektfájlok automatikus generálása (nem csak JSON, hanem .yaml, .twig fájlok)
- [ ] Batch generálás (több oldal egyszerre)
- [ ] Szerkeszthető prompt a webes űrlapon
- [ ] Előnézet (preview) a generálás előtt
- [ ] Felhasználói fiókok az n8n-ben (N8N_USER_MANAGEMENT)
- [ ] Email értesítés a generálás végén
- [ ] Webhook biztonság (API key / token authentikáció)
- [ ] HTTPS támogatás (Let's Encrypt + nginx)
- [ ] Docker image build saját extension-ökkel
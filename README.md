# 🚀 n8n + Gravity CMS AI Automatizáció

**AI-vezérelt weboldal generálás Gravity CMS-hez DeepSeek API-val, n8n workflow automatizációval.**

> Egy komplett, Docker-alapú megoldás, ami lehetővé teszi Gravity CMS weboldalak teljesen automatizált tervezését és generálását mesterséges intelligencia segítségével.
>
> **Jelenlegi verzió: v1.1.7** | [Architektúra dokumentáció](./ARCHITECTURE.md) | [GitHub](https://github.com/sorosg/n8n-gravity)

---

## 📋 Tartalomjegyzék

- [Mi ez a projekt?](#mi-ez-a-projekt)
- [Gyors áttekintés](#gyors-áttekintés)
- [Architektúra](#architektúra)
- [Rendszerkövetelmények](#rendszerkövetelmények)
- [Gyors telepítés](#gyors-telepítés)
- [Konfiguráció](#konfiguráció)
- [Használat](#használat)
- [Elérési címek](#elérési-címek)
- [Workflow működése](#workflow-működése)
- [API Referencia](#api-referencia)
- [Karbantartás](#karbantartás)
- [Hibaelhárítás](#hibaelhárítás)
- [Windows-os menedzsment eszközök](#windows-os-menedzsment-eszkozok)
- [Gyakran Ismételt Kérdések](#gyakran-ismételt-kérdések)
- [Dokumentáció](#dokumentáció)
- [Licensz](#licensz)

---

---

## Gyors áttekintés

| Jellemző | Érték |
|----------|-------|
| **Szerver** | `192.168.4.148` (Ubuntu, Docker) |
| **Webes űrlap** | `http://192.168.4.148:8080` |
| **Előnézet oldal** | `http://192.168.4.148:8080/preview.html` |
| **n8n felület** | `http://192.168.4.148:5678` |
| **AI motor** | DeepSeek V4 Flash/Pro + GPT-4o + Claude |
| **Költség** | ~0,15-0,30 Ft / generálás |
| **Telepítés** | `git clone` + `sudo ./install.sh` |
| **Verzió** | v1.1.7 |

---

## Elérési címek

| Szolgáltatás | URL |
|-------------|-----|
| **🌐 Gravity CMS Generátor űrlap** | `http://192.168.4.148:8080` |
| **📄 Előnézet oldal** | `http://192.168.4.148:8080/preview.html` |
| **🧠 n8n felület** | `http://192.168.4.148:5678` |
| **📁 Generált fájlok** | `http://192.168.4.148:8080/output/` |
| **🧪 Gravity CMS** | `http://192.168.4.148:8085` |
| **🧪 CMS Admin** | `http://192.168.4.148:8085/admin` |
| **📖 epub-translate** (meglévő) | `http://192.168.4.148` (80-as port) |

> **Részletes architektúra:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Mi ez a projekt?

Ez a projekt egy **teljes körű automatizációs rendszer**, amely az [n8n](https://n8n.io) workflow automatizáló platformot használja arra, hogy AI segítségével (DeepSeek API) **teljes Gravity CMS weboldal struktúrákat generáljon le**.

### ✅ Miért n8n?

Az n8n **kiválóan alkalmas** erre a feladatra, mert:

| Tulajdonság | Előny |
|-------------|-------|
| **Fair-code licensz** | Ingyenes, önállóan host-olható (self-hosted) |
| **Webhook támogatás** | Külső rendszerekből indítható workflow-k |
| **40+ HTTP node** | Közvetlen API hívások a DeepSeek felé |
| **Code node-ok** | JavaScript/TypeScript testreszabás |
| **Vizuális editor** | Drag-and-drop workflow szerkesztés böngészőben |
| **Credential kezelés** | API kulcsok biztonságos tárolása |
| **PostgreSQL backend** | Megbízható, skálázható adattárolás |
| **Docker natív** | Konténerizált, könnyen telepíthető |
| **REST API** | Programozható vezérlés |
| **Közösségi node-ok** | Több száz előre elkészített integráció |

### 🎯 Mit tud a rendszer?

- **Weboldal struktúra generálás**: Oldalak, route-ok, tartalom automatikus létrehozása
- **Többnyelvű támogatás**: Magyar, angol és bármilyen más nyelv
- **SEO optimalizálás**: Meta adatok, leírások automatikus generálása
- **Téma testreszabás**: Színek, betűtípusok, design stílusok AI által
- **Plugin ajánlások**: Gravity CMS plugin konfigurációk generálása
- **Admin felület blueprint**: Admin űrlapok és struktúrák tervezése
- **Különböző oldaltípusok**: Landing page, blog, portfólió, webshop, admin felület

---

## Architektúra

```
┌──────────────────────────────────────────────────────────────────┐
│                     N8N-GRAVITY DOCKER STACK                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   PostgreSQL  │◄───│     n8n      │───►│  DeepSeek API    │  │
│  │   (Adatbázis) │    │  (Workflow)  │    │  (AI Generálás)  │  │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Bemenet / Kimenet                       │  │
│  │  • Webhook (HTTP POST)                                    │  │
│  │  • JSON fájl output                                       │  │
│  │  • Scheduler (Cron)                                       │  │
│  │  • Email / Slack értesítés                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Opcionális komponensek (--full vagy --ai profillal):          │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐              │
│  │  Qdrant   │  │  Ollama   │  │  Portainer CE │              │
│  │ (Vektor DB)│  │(Lokális AI)│  │  (Docker GUI) │              │
│  └───────────┘  └───────────┘  └───────────────┘              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Komponensek részletesen

| Szolgáltatás | Port | Leírás |
|-------------|------|--------|
| **n8n** | `5678` | Workflow automatizáló motor, webes felület |
| **PostgreSQL** | `5432` | Perzisztens adattárolás az n8n számára |
| **Qdrant** (opc.) | `6333` | Vektor adatbázis RAG-alapú AI műveletekhez |
| **Ollama** (opc.) | `11434` | Lokális LLM modellek futtatása (GPU támogatás) |
| **Portainer CE** (opc.) | `9443` | Docker konténer menedzsment webes felület |

---

## Rendszerkövetelmények

### Minimum (alap stack)
- **CPU**: 2 mag
- **RAM**: 2 GB
- **Tárhely**: 10 GB szabad
- **OS**: Ubuntu 20.04/22.04/24.04 LTS
- **Docker**: v20.10.0+
- **Docker Compose**: v2.0.0+

### Ajánlott (teljes stack AI funkciókkal)
- **CPU**: 4+ mag
- **RAM**: 8 GB (Ollama modellek miatt)
- **Tárhely**: 30+ GB szabad
- **GPU**: NVIDIA GPU (opcionális, Ollama-hoz)

---

## Gyors telepítés

### 1. Klónozd a projektet a szerveredre

```bash
git clone https://your-repo-url/n8n-gravity.git
cd n8n-gravity
```

Vagy egyszerűen másold fel a fájlokat SCP-vel/FTP-vel a szerveredre.

### 2. Futtasd a telepítő scriptet

```bash
# Tedd futtathatóvá
chmod +x install.sh

# Alap telepítés (n8n + PostgreSQL)
./install.sh

# VAGY teljes telepítés AI eszközökkel és Portainer-rel
./install.sh --full

# VAGY AI bővített telepítés (Qdrant + Ollama, Portainer nélkül)
./install.sh --ai
```

A script automatikusan:
- ✅ Ellenőrzi a rendszer erőforrásokat
- ✅ Telepíti a szükséges függőségeket (curl, git, jq, stb.)
- ✅ Telepíti a Dockert és Docker Compose-t (ha hiányzik)
- ✅ Létrehozza és konfigurálja az `.env` fájlt
- ✅ Generál biztonságos véletlen jelszavakat
- ✅ Beállítja a tűzfalat (UFW)
- ✅ Elindítja az összes szolgáltatást
- ✅ Ellenőrzi, hogy minden megfelelően fut

### 3. Nyisd meg a webes felületet

```
http://<szerver-ip>:5678
```

A felhasználónév és jelszó az `.env` fájlban található (alapértelmezetten `admin` / véletlenszerű jelszó).

---

## Konfiguráció

### .env fájl beállítása

A telepítő automatikusan létrehozza az `.env` fájlt az `.env.example` alapján. **FONTOS**: Add meg a DeepSeek API kulcsodat!

```bash
nano .env
```

Szükséges beállítások:

```env
# DeepSeek API kulcs (Kötelező!)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# n8n admin felhasználónév és jelszó (változtasd meg!)
N8N_AUTH_USER=admin
N8N_AUTH_PASSWORD=erős_jelszó_ide

# Adatbázis jelszó
DB_PASSWORD=erős_adatbázis_jelszó

# Titkosítási kulcs (automatikusan generálva, NE változtasd ha már van adat!)
N8N_ENCRYPTION_KEY=...
```

### DeepSeek API kulcs beszerzése

1. Regisztrálj a [DeepSeek Platform](https://platform.deepseek.com) oldalon
2. Menj a **API Keys** szekcióba
3. Hozz létre egy új API kulcsot
4. Másold be a kulcsot az `.env` fájlba: `DEEPSEEK_API_KEY=sk-...`

### Portok módosítása

Ha a default portok foglaltak, módosítsd az `.env` fájlban:

```env
N8N_PORT=5679        # n8n web UI port
PORTAINER_PORT=9444  # Portainer UI port
QDRANT_PORT=6334     # Qdrant API port
```

---

## Használat

### A. Webes felületen keresztül (n8n Editor)

1. Jelentkezz be az n8n felületre: `http://<szerver-ip>:5678`
2. Importáld a példa workflow-t:
   - Kattints a **+ New Workflow** gombra
   - Válaszd az **Import from File** lehetőséget
   - Tallózd ki a `workflows/example-gravity-cms-deepseek.json` fájlt
3. Állítsd be a **DeepSeek API credential**-t:
   - Menj a **Settings → Credentials** menübe
   - Kattints az **Add Credential** gombra
   - Válaszd a **Header Auth** típust
   - Név: `DeepSeek API`
   - Name: `Authorization`
   - Value: `Bearer sk-your-api-key-here`
4. Aktiváld a workflow-t (kapcsold be a toggle-t)
5. Használd a webhook URL-t külső hívásokhoz

### B. API-n keresztül (programozott hívás)

```bash
# Példa: Landing page generálása magyar nyelven
curl -X POST http://<szerver-ip>:5678/webhook/gravity-generate \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Digitális Megoldások Kft.",
    "projectType": "landing_page",
    "language": "hu",
    "description": "Egyedi webfejlesztéssel és digitális marketinggel foglalkozó cég",
    "pages": ["home", "services", "portfolio", "contact"],
    "designStyle": "modern"
  }'
```

#### Válasz formátum

A rendszer egy JSON objektummal válaszol, ami tartalmazza:

```json
{
  "status": "success",
  "message": "Gravity CMS oldalstruktúra sikeresen generálva",
  "generated": {
    "pages": {
      "home": {
        "template": "default",
        "route": "/",
        "title": "Digitális Megoldások Kft. - Kezdőlap",
        "content": {
          "hero": {
            "title": "Professzionális webes megoldások...",
            "subtitle": "Teljes körű digitális szolgáltatások...",
            "cta_text": "Kérjen ajánlatot",
            "cta_link": "/contact"
          },
          "sections": [...]
        },
        "meta": {
          "title": "Digitális Megoldások Kft. | Professzionális webfejlesztés",
          "description": "Egyedi webfejlesztés, SEO optimalizálás..."
        }
      }
    },
    "config": {
      "system": { ... },
      "theme": { ... },
      "plugins": [...]
    },
    "admin_structure": { ... }
  },
  "timestamp": "2026-07-19T08:00:00.000Z",
  "model": "deepseek-chat",
  "usage": {
    "prompt_tokens": 450,
    "completion_tokens": 1200,
    "total_tokens": 1650
  }
}
```

### C. Cron ütemezett generálás

Az n8n-ben beállíthatsz Cron trigger-t is a webhook helyett, így ütemezetten (pl. naponta) generálhatsz új tartalmakat.

---

## Workflow működése

A példa workflow a következő lépésekből áll:

```
[Webhook Trigger]  Beérkező HTTP kérés fogadása
       │
       ▼
[Code: Bemenet]    JSON body feldolgozása, validálás
       │
       ▼
[Code: Prompt]     DeepSeek prompt összeállítása
       │             - Projekt típus, üzleti név, nyelv
       │             - Oldalak, design stílus
       │             - Kimeneti formátum specifikáció
       ▼
[HTTP: DeepSeek]   POST https://api.deepseek.com/v1/chat/completions
       │             - Model: deepseek-chat
       │             - Authorization: Bearer API_KEY
       │             - Temperature: 0.7
       │             - Max tokens: 4096
       ▼
[Code: Feldolgozás] Válasz parse-olása, JSON kinyerés
       │             - Markdown code block kezelés
       │             - Hibakezelés
       ▼
[Write File]       Eredmény mentése JSON fájlba
       │             (opcionális, continueOnFail: true)
       ▼
[Respond]          Válasz visszaküldése a webhook hívónak
```

---

## API Referencia

### POST /webhook/gravity-generate

Weboldal struktúra generálása.

**Request Body (JSON):**

| Paraméter | Típus | Kötelező | Alapérték | Leírás |
|-----------|-------|----------|-----------|--------|
| `businessName` | string | Igen | - | A vállalkozás/projekt neve |
| `projectType` | string | Nem | `landing_page` | landing_page, blog, portfolio, shop, admin |
| `language` | string | Nem | `hu` | Nyelvkód (hu, en, de, stb.) |
| `description` | string | Nem | `""` | A projekt rövid leírása |
| `pages` | array | Nem | `["home", "about", "contact"]` | Generálandó oldalak listája |
| `designStyle` | string | Nem | `modern` | Design stílus: modern, minimal, classic, bold |

**Response (JSON):**

| Mező | Típus | Leírás |
|------|-------|--------|
| `status` | string | `success` vagy `error` |
| `message` | string | Státusz üzenet |
| `generated` | object | A generált Gravity CMS struktúra |
| `generated.pages` | object | Oldalak és tartalmuk |
| `generated.config` | object | Rendszer és téma konfiguráció |
| `generated.admin_structure` | object | Admin felület struktúra |
| `timestamp` | string | Generálás időbélyege (ISO 8601) |
| `model` | string | Használt AI modell |
| `usage` | object | Token felhasználás |

---

## Karbantartás

### Szolgáltatások kezelése

```bash
# Állapot ellenőrzése
docker compose -f docker-compose.yml ps

# Logok megtekintése
docker compose -f docker-compose.yml logs -f
docker compose -f docker-compose.yml logs -f n8n    # Csak n8n logok

# Újraindítás
docker compose -f docker-compose.yml restart

# Leállítás
docker compose -f docker-compose.yml down

# Indítás
docker compose -f docker-compose.yml up -d

# Teljes stack leállítása
docker compose -f docker-compose.yml --profile '*' down
```

### Frissítés

```bash
# Automatikus frissítés a scripttel
./install.sh --update

# VAGY manuálisan
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d --remove-orphans
```

### Biztonsági mentés

```bash
# n8n adatbázis mentése
docker compose exec postgres pg_dump -U n8n n8n > n8n_backup_$(date +%Y%m%d).sql

# Volume-ok mentése
tar -czf n8n_volumes_backup_$(date +%Y%m%d).tar.gz \
  /var/lib/docker/volumes/n8n_gravity_data \
  /var/lib/docker/volumes/n8n_gravity_postgres
```

### Visszaállítás

```bash
# Adatbázis visszaállítása
cat n8n_backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U n8n n8n

# VAGY volume-ok visszaállítása
docker compose down
tar -xzf n8n_volumes_backup_YYYYMMDD.tar.gz -C /
docker compose up -d
```

### Eltávolítás

```bash
# Automatikus eltávolítás
./install.sh --uninstall

# VAGY manuálisan
docker compose -f docker-compose.yml --profile '*' down -v --remove-orphans
docker volume rm n8n_gravity_data n8n_gravity_postgres ...
```

---

## Hibaelhárítás

### Az n8n nem indul el

```bash
# Ellenőrizd a logokat
docker compose logs n8n

# Gyakori okok:
# 1. Az adatbázis nem érhető el: várd meg amíg a health check sikeres
# 2. Port foglalt: ellenőrizd: ss -tlnp | grep 5678
# 3. Hiányzó .env fájl: cp .env.example .env
```

### DeepSeek API hiba

```bash
# Ellenőrizd az API kulcsot és az egyenleget
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'

# Ellenőrizd a network kapcsolatot a konténerből
docker compose exec n8n curl -v https://api.deepseek.com
```

### "No space left on device"

```bash
# Docker takarítás
docker system prune -a -f --volumes

# Régi végrehajtások törlése az n8n-ben (Settings → Execution Data)
# Vagy az .env fájlban:
EXECUTIONS_MAX_AGE=72   # 3 nap
EXECUTIONS_PRUNE_MAX=10000
```

---

## Windows-os menedzsment eszközök

A szerver menedzseléséhez Windows alól az alábbi eszközöket ajánlom:

### 🥇 **Tabby** (Highly Recommended - INGYENES)
![Recommended](https://img.shields.io/badge/RECOMMENDED-Tabby-4CAF50?style=for-the-badge)

**A legjobb választás mindenre!**

- 🌐 **Weboldal**: [https://tabby.sh](https://tabby.sh)
- 💰 **Ár**: Teljesen ingyenes, open-source
- 🖥️ **Platform**: Windows, macOS, Linux

**Főbb funkciók:**
- ✅ **SSH kliens** – terminál kapcsolat a szerveredhez
- ✅ **SFTP fájlkezelő** – fájlok másolása, szerkesztése grafikus felületen
- ✅ **Több fül** – egyszerre több terminál/kapcsolat
- ✅ **Konfiguráció szinkronizálás** – beállítások mentése és átvitele
- ✅ **Téma támogatás** – testreszabható megjelenés
- ✅ **Port forwarding** – SSH alagút
- ✅ **Rendszerfigyelő** – CPU, memória a terminálban
- ✅ **Magyar nyelvű felület** – könnyű használat

**Telepítés:** Töltsd le az MSI telepítőt a [GitHub Releases](https://github.com/Eugeny/tabby/releases) oldalról.

---

### 🥈 **MobaXterm** (Home Edition - INGYENES)
![Alternative](https://img.shields.io/badge/ALTERNATIVE-MobaXterm-FF9800?style=for-the-badge)

- 🌐 **Weboldal**: [https://mobaxterm.mobatek.net](https://mobaxterm.mobatek.net)
- 💰 **Ár**: Home Edition ingyenes, Professional ~$69
- 🖥️ **Platform**: Windows (natív)

**Főbb funkciók:**
- ✅ **SSH, SFTP, FTP, RDP, VNC** – minden egyben
- ✅ **Beépített X11 szerver** – grafikus alkalmazások futtatása távolról
- ✅ **Fájlkezelő** – drag-and-drop fájlátvitel
- ✅ **Makró rögzítés** – ismétlődő feladatok automatizálása
- ✅ **Beépített eszközök** – ping, nslookup, whois hálózati eszközök
- ❌ **Hátrány**: Az ingyenes verzió korlátozott (max 12 munkamenet)

**Telepítés:** Töltsd le a [hivatalos oldalról](https://mobaxterm.mobatek.net/download-home-edition.html).

---

### 🥉 **VS Code + Remote SSH** (INGYENES)

Ha már használsz VS Code-ot:

- 🌐 **Bővítmény**: [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
- 💰 **Ár**: Ingyenes
- 🖥️ **Platform**: Windows, macOS, Linux

**Főbb funkciók:**
- ✅ **Közvetlen fájlszerkesztés** a szerveren
- ✅ **Terminál a szerveren** az IDE-n belül
- ✅ **Git integráció** – commit közvetlenül a szerverről
- ✅ **Docker konténer bővítmény** – konténerek kezelése
- ✅ **.env és JSON szintaxis kiemelés**

**Telepítés:** VS Code → Extensions → "Remote - SSH" → Install

---

### 💡 Ajánlott kombináció

A leghatékonyabb munkafolyamat:

1. **Tabby** – terminál kapcsolatokhoz, logok nézéséhez, gyors szerver parancsokhoz
2. **VS Code + Remote SSH** – workflow-ok szerkesztéséhez, kód íráshoz, fájl módosításhoz
3. **Böngésző** – n8n webes felület (`http://<szerver-ip>:5678`), Portainer (`https://<szerver-ip>:9443`)

---

## Gyakran Ismételt Kérdések

### K: Az n8n valóban alkalmas teljes CMS generálásra?

**V: Igen, kifejezetten alkalmas!** Az n8n egy "workflow automation" platform, ami kiválóan kezeli a többlépcsős folyamatokat:
- API hívások láncolása (bemenet → prompt → AI → feldolgozás → kimenet)
- Hibakezelés és újrapróbálkozás
- Ütemezés és webhook indítás
- Környezeti változók és credential-ök biztonságos kezelése
- Kimenet formázás és fájlba írás

### K: Miért jobb, mint egy egyedi script?

**V:** Az n8n előnyei egy egyedi scripttel szemben:
- **Vizuális debuggolás**: Lásd az adatáramlást lépésről lépésre
- **Beépített naplózás**: Minden végrehajtás rögzítve van
- **Újrapróbálkozás**: Automatikus újrapróbálkozás hiba esetén
- **Credential vault**: API kulcsok biztonságos tárolása
- **Felügyeleti felület**: Böngészőből menedzselhető
- **Közösségi integrációk**: Több száz előre elkészített node

### K: Mennyibe kerül a DeepSeek API használata?

**V:** A DeepSeek az egyik legolcsóbb AI API:
- **deepseek-chat**: ~$0.14 / 1M input token, ~$0.28 / 1M output token
- Egy tipikus oldalgenerálás ~1500-2000 tokent használ
- Tehát egy generálás kb. ~**$0.0005-0.001** (0.15-0.30 Ft)
- **Havi 1000 generálás**: kb. **$0.50-1.00** (150-300 Ft)

### K: Hogyan skálázható a rendszer?

**V:** A Docker Compose alapú architektúra könnyen skálázható:
- **Vertikális**: Adj több RAM-ot/CPU-t a konténereknek a `docker-compose.yml`-ben
- **Horizontális**: Docker Swarm vagy Kubernetes felé migrálható
- **Adatbázis**: A PostgreSQL könnyen replikálható nagyobb terhelésre
- **n8n**: Több worker futtatható a `N8N_EXECUTIONS_PROCESS` beállítással

### K: Mi történik, ha a DeepSeek API nem elérhető?

**V:** A workflow `continueOnFail` opcióval folytatható, de a generálás sikertelen lesz. Javasolt:
1. **Retry mechanizmus** beépítése (n8n Error Trigger node)
2. **Fallback** OpenAI API-ra (a `.env`-ben megadható)
3. **Lokális Ollama** használata (`--full` vagy `--ai` profil)

---

## Hasznos linkek

| Eszköz | Link |
|--------|------|
| n8n Dokumentáció | [https://docs.n8n.io](https://docs.n8n.io) |
| DeepSeek Platform | [https://platform.deepseek.com](https://platform.deepseek.com) |
| DeepSeek API Docs | [https://platform.deepseek.com/api-docs](https://platform.deepseek.com/api-docs) |
| Gravity CMS | [https://getgrav.org](https://getgrav.org) |
| Tabby Terminál | [https://tabby.sh](https://tabby.sh) |
| Docker Dokumentáció | [https://docs.docker.com](https://docs.docker.com) |

---

## Licensz

Ez a projekt **MIT licensz** alatt áll. Az n8n [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) alatt fut (fair-code modell).

---

*Készült ❤️-vel Magyarországon, DeepSeek AI inspirációval.*
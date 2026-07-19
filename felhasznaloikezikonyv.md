# 📘 n8n-gravity Felhasználói Kézikönyv

**AI-vezérelt Gravity CMS weboldal generálás DeepSeek API-val**

> Részletes útmutató a projekt használatához Windows operációs rendszer alól.
> Kifejezetten a `192.168.4.184`-es szerverhez igazítva, ahol a **80-as és 443-as port foglalt** (epub-translate).

---

## 📋 Tartalomjegyzék

1. [A szervered elrendezése](#1-a-szervered-elrendezése)
2. [Windows programok telepítése](#2-windows-programok-telepítése)
   - [Tabby terminál (SSH/SFTP)](#21-tabby-terminál-ssh--sftp--fájlkezelő)
   - [VS Code + Remote SSH](#22-visual-studio-code--remote-ssh)
   - [FileZilla (SFTP, alternatív)](#23-filezilla-sftp-alternatíva)
   - [Webböngésző](#24-webböngésző)
3. [Kapcsolódás a szerverhez](#3-kapcsolódás-a-szerverhez)
   - [SSH kapcsolat Tabby-val](#31-ssh-kapcsolat-tabby-val)
   - [SSH kapcsolat VS Code-dal](#32-ssh-kapcsolat-vs-code-dal)
   - [Fájlok feltöltése a szerverre](#33-fájlok-feltöltése-a-szerverre)
4. [n8n-gravity telepítése a szerverre](#4-n8n-gravity-telepítése-a-szerverre)
5. [A webes felület elérése](#5-a-webes-felület-elérése)
6. [API kulcsok és credential-ök beállítása](#6-api-kulcsok-és-credential-ök-beállítása)
7. [A példa workflow importálása](#7-a-példa-workflow-importálása)
8. [Első weboldal generálása](#8-első-weboldal-generálása)
9. [Port konfliktusok kezelése](#9-port-konfliktusok-kezelése)
10. [Gyakori problémák és megoldások](#10-gyakori-problémák-és-megoldások)
11. [Menedzsment tippek](#11-menedzsment-tippek)

---

## 1. A szervered elrendezése

```
┌─────────────────────────────────────────────────────────┐
│              Szerver: 192.168.4.184                     │
│              Ubuntu (Docker alapú)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │  epub-translate  │    │  n8n-gravity (ÚJ!)       │   │
│  │  Port: 80, 443   │    │  Portok: 5678, 5432,    │   │
│  │  (webes felület) │    │           6333, 9443     │   │
│  └─────────────────┘    └──────────────────────────┘   │
│                                                         │
│  ⚠️ A 80-as és 443-as port FOGLALT!                    │
│  ✅ Az n8n-gravity NEM használja ezeket a portokat!    │
│  ✅ Az 5678, 6333, 9443 portok SZABADOK!              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Használt portok áttekintése

| Port | Szolgáltatás | Leírás | Státusz |
|------|-------------|--------|---------|
| **80** | epub-translate | Webes felület (HTTP) | ❌ Foglalt |
| **443** | epub-translate | Webes felület (HTTPS) | ❌ Foglalt |
| **5678** | **n8n** | Workflow szerkesztő felület | ✅ Szabad |
| **5432** | PostgreSQL | n8n adatbázis (belső) | ✅ Szabad |
| **6333** | Qdrant | Vektor adatbázis (opcionális) | ✅ Szabad |
| **9443** | Portainer | Docker menedzsment (opcionális) | ✅ Szabad |

**Fontos:** Az n8n az **5678**-as porton fut, így nincs ütközés a meglévő epub-translate programmal! A böngészőben ezt a portot kell használnod.

---

## 2. Windows programok telepítése

### 2.1 Tabby terminál (SSH + SFTP + fájlkezelő)

A **Tabby** a legjobb ingyenes eszköz Windows-ra szerverek menedzseléséhez. Egyetlen programban van terminál, SFTP fájlkezelő és konfiguráció szinkronizálás.

#### 2.1.1 Letöltés és telepítés

1. Nyisd meg a böngészőben: **https://github.com/Eugeny/tabby/releases**
2. Keresd a legfrissebb verziót (pl. `v1.0.215` vagy újabb)
3. Töltsd le az `tabby-*-setup.exe` vagy `tabby-*-x64.msi` fájlt
4. Kattints duplán a letöltött fájlra
5. Kövesd a telepítő utasításait (Next → Install → Finish)
6. Indítsd el a Tabby-t a Start menüből

#### 2.1.2 SSH kapcsolat beállítása Tabby-ban

<details>
<summary>📸 Kattints a részletes lépésekért</summary>

1. **Új kapcsolat létrehozása:**
   - Kattints a ⚙️ (Settings) ikonra a bal oldali sávban
   - Válaszd a **Profiles & connections** menüpontot
   - Kattints a **+ New profile** gombra
   - Válaszd az **SSH connection** típust

2. **Kapcsolat adatai (Szerkeszd az alábbi mezőket):**

   | Mező | Érték |
   |------|-------|
   | **Name** | `n8n-gravity szerver` |
   | **Host** | `192.168.4.184` |
   | **Port** | `22` |
   | **Username** | (a te felhasználóneved a szerveren) |
   | **Authentication** | `Password` vagy `Private key` |

3. **SSH kulcs használata (ajánlott, opcionális):**
   - Generálj egy SSH kulcsot: Tabby → Settings → SSH → Generate
   - Másold fel a publikus kulcsot a szerverre
   - Állítsd a hitelesítést `Private key`-re és tallózd ki a privát kulcsot

4. **Mentés és kapcsolódás:**
   - Kattints a **Save** gombra
   - Kattints a 🚀 (Launch) ikonra a kapcsolat mellett
   - Első kapcsolódáskor fogadd el a host key-t (Yes/Accept)

</details>

#### 2.1.3 SFTP fájlkezelő használata Tabby-ban

1. Kapcsolódj a szerverhez SSH-n keresztül
2. Kattints az **SFTP** fülre a terminál ablak alján (vagy a jobb oldali panelen)
3. Most már **drag-and-drop** módszerrel másolhatsz fájlokat a Windows és a szerver között
4. Jobb klikk egy fájlra → **Edit** = közvetlen szerkesztés a szerveren

---

### 2.2 Visual Studio Code + Remote SSH

Ha már használod a VS Code-ot, ez a leghatékonyabb módja a fájlok szerkesztésének közvetlenül a szerveren.

#### 2.2.1 VS Code telepítése

1. Töltsd le a VS Code-ot: **https://code.visualstudio.com**
2. Telepítsd a szokásos módon (Next → Install)

#### 2.2.2 Remote SSH bővítmény telepítése

1. Nyisd meg a VS Code-ot
2. Kattints a bal oldali **Extensions** ikonra (4 négyzet)
3. Keresd: `Remote - SSH`
4. Kattints az **Install** gombra a Microsoft által kiadott bővítménynél
5. Várd meg a telepítést

**További hasznos bővítmények:**

| Bővítmény | Leírás |
|-----------|--------|
| **Docker** | Docker konténerek kezelése VS Code-ból |
| **DotENV** | `.env` fájlok szintaxis kiemelése |
| **YAML** | `docker-compose.yml` szintaxis kiemelés |
| **Prettier** | Kódformázó |

#### 2.2.3 Kapcsolódás a szerverhez

1. Nyomd meg az **F1** billentyűt
2. Írd be: `Remote-SSH: Connect to Host...`
3. Válaszd az **Add New SSH Host...** lehetőséget
4. Írd be: `ssh felhasznaloneved@192.168.4.184`
5. Válaszd a konfigurációs fájlt (általában `C:\Users\Neved\.ssh\config`)
6. Kattints a **Connect** gombra az értesítésben
7. Add meg a jelszavadat

> **Tipp:** Ha SSH kulcsot használsz, add hozzá a `config` fájlhoz: `IdentityFile ~/.ssh/id_rsa`

#### 2.2.4 Mappa megnyitása a szerveren

1. Kapcsolódás után kattints az **Open Folder** gombra
2. Navigálj a projekt mappába, pl. `/home/felhasznalod/n8n-gravity`
3. Kattints az **OK** gombra
4. Most már úgy dolgozhatsz a szerveren lévő fájlokkal, mintha helyi fájlok lennének

---

### 2.3 FileZilla (SFTP, alternatíva)

Ha grafikus fájlkezelőt szeretnél a fájlok másolásához:

1. Töltsd le a FileZilla Client-et: **https://filezilla-project.org**
2. Telepítsd (Figyelj: a telepítőben kapcsold ki az extra ajánlatokat!)
3. Indítsd el a FileZilla-t
4. Töltsd ki a felső gyorskapcsolat sávot:

   | Mező | Érték |
   |------|-------|
   | **Host** | `sftp://192.168.4.184` |
   | **Username** | (a te felhasználóneved) |
   | **Password** | (a jelszavad) |
   | **Port** | `22` |

5. Kattints a **Quickconnect** gombra

A bal oldalon a Windows fájljaid, a jobb oldalon a szerver fájljai látszanak. Fájlokat drag-and-drop-pal tudsz másolni.

---

### 2.4 Webböngésző

Bármilyen modern böngésző megfelel (Chrome, Firefox, Edge). A böngészőben fogod elérni:

| Szolgáltatás | URL |
|-------------|-----|
| **n8n webes felület** | `http://192.168.4.184:5678` |
| **Portainer** (ha telepítve) | `https://192.168.4.184:9443` |
| **epub-translate** (meglévő) | `http://192.168.4.184` (80-as port) |

---

## 3. Kapcsolódás a szerverhez

### 3.1 SSH kapcsolat Tabby-val

```
Host:     192.168.4.184
Port:     22
Felhasználó: [te felhasználóneved]
Jelszó:     [te jelszavad]
```

**Első kapcsolódás lépései:**

1. Nyisd meg a Tabby-t
2. Kattints a **Settings** fogaskerékre (bal alsó sarok)
3. **Profiles & connections** → **+ New profile** → **SSH connection**
4. Írd be: Name: `n8n-gravity szerver`, Host: `192.168.4.184`
5. Add meg a felhasználóneved és jelszavad
6. **Save**
7. Kattints a mentett profil melletti 🚀 ikonra

### 3.2 SSH kapcsolat VS Code-dal

1. Nyisd meg a VS Code-ot
2. **F1** → `Remote-SSH: Connect to Host...`
3. `ssh felhasznaloneved@192.168.4.184`
4. Add meg a jelszót

### 3.3 Fájlok feltöltése a szerverre

Két módszer közül választhatsz:

#### A) Tabby SFTP (ajaxánlott, egyszerű)

1. Kapcsolódj SSH-val a szerverhez Tabby-ban
2. Kattints a terminál alján az **SFTP** fülre
3. Húzd át a fájlokat a Windows Intézőből a kívánt szerver mappába

#### B) Git clone (parancssori)

```bash
# SSH-n keresztül a szerveren:
cd ~
git clone https://github.com/sorosg/n8n-gravity.git
cd n8n-gravity
chmod +x install.sh deploy.sh
```

---

## 4. n8n-gravity telepítése a szerverre

**Fontos:** Ezeket a parancsokat a szerveren kell futtatni, SSH kapcsolaton keresztül!

### 4.1 Projekt letöltése

```bash
# Belépés a szerverre SSH-val, majd:
cd ~
git clone https://github.com/sorosg/n8n-gravity.git
cd n8n-gravity
```

### 4.2 .env fájl beállítása (FONTOS!)

```bash
# Másold át a példa fájlt
cp .env.example .env

# Szerkeszd a fájlt
nano .env
```

**A .env fájlban a következőket KÖTELEZŐ beállítani:**

```env
# DeepSeek API kulcs – kötelező!
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# n8n admin jelszó – változtasd meg!
N8N_AUTH_PASSWORD=egy_eros_jelszo_ide

# Adatbázis jelszó – változtasd meg!
DB_PASSWORD=egy_masik_eros_jelszo

# n8n port – NE változtasd, hacsak nem foglalt!
N8N_PORT=5678
```

#### Nano szerkesztő gyors útmutató (a .env fájl szerkesztéséhez)

A `nano` egy egyszerű, parancssoros szövegszerkesztő. Így használd:

| Művelet | Windows (Tabby) | Mac |
|---------|-----------------|-----|
| **Beillesztés (1. próba)** | **Jobb klikk** a terminálban → **Paste** | `Cmd + V` |
| **Beillesztés (2. próba)** | `Shift + Insert` | – |
| **Beillesztés (3. próba)** | `Ctrl + Insert` (másolás után) | – |
| **Beillesztés (4. próba)** | `Ctrl + Shift + V` (egyes kliensekben) | – |
| **Mentés** | `Ctrl + O` (majd Enter a megerősítéshez) | `Ctrl + O` |
| **Kilépés** | `Ctrl + X` | `Ctrl + X` |
| **Keresés** | `Ctrl + W` | `Ctrl + W` |
| **Sor eleje/ vége** | `Ctrl + A` / `Ctrl + E` | `Ctrl + A` / `Ctrl + E` |

> **Tipp:** A DeepSeek API kulcsodat (`sk-...`) a Windows vágólapról a `Ctrl + Shift + V` billentyűkombinációval tudod beilleszteni a nano-ba. A sima `Ctrl + V` nem működik terminálban! Ha ez sem működne, használd a **Jobb egérgomb → Paste** lehetőséget.

**A szerkesztés lépései:**

1. `nano .env` – megnyitja a fájlt
2. Nyilakkal navigálj a `DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here` sorhoz
3. Töröld a helyőrző szöveget (Backspace / Delete)
4. Illeszd be az API kulcsodat: **`Ctrl + Shift + V`** (Windows/Tabby) vagy **Jobb klikk → Paste**
5. `Ctrl + O` → **Enter** – mentés
6. `Ctrl + X` – kilépés

**API kulcs beszerzése:**

1. Regisztrálj itt: https://platform.deepseek.com
2. Menj az API Keys menübe
3. Kattints a **Create API Key** gombra
4. Másold ki a kulcsot (csak egyszer látható!)
5. Illeszd be a `.env` fájlba a fenti módszerrel: `DEEPSEEK_API_KEY=sk-...`

### 4.3 Telepítő futtatása

```bash
# Tedd futtathatóvá
chmod +x install.sh

# Alap telepítés (n8n + PostgreSQL) – AJÁNLOTT!
./install.sh

# VAGY teljes telepítés (AI eszközökkel + Portainer):
# ./install.sh --full
```

A telepítő automatikusan:
- ✅ Ellenőrzi a rendszer erőforrásokat
- ✅ Telepíti a Docker-t (ha hiányzik)
- ✅ Létrehoz egy `.env` fájlt véletlen jelszavakkal
- ✅ Beállítja a tűzfalat (UFW)
- ✅ Elindítja az n8n-t és a PostgreSQL adatbázist

### 4.4 Telepítés ellenőrzése

```bash
# Ellenőrizd, hogy minden konténer fut-e
docker compose -f docker-compose.yml ps

# Kimenet példa (minden "Up" státuszban kell legyen):
# NAME                  STATUS
# n8n-gravity           Up 2 minutes
# n8n-gravity-db        Up 2 minutes (healthy)
```

```bash
# Ellenőrizd, hogy a webes felület elérhető-e
curl http://192.168.4.184:5678/healthz

# Válasz: {"status":"ok"}
```

---

## 5. A webes felület elérése

### 5.1 Belépés

1. Nyisd meg a böngészőt Windows-on
2. Írd be a címsorba: **`http://192.168.4.184:5678`**
3. Jelentkezz be:
   - **Email / Username:** `admin` (vagy amit a `.env` fájlban beállítottál)
   - **Password:** (az `.env` fájlban beállított jelszó)

### 5.2 Első bejelentkezés után

1. Egy onboarding képernyő fogad (átugorható)
2. A főoldalon a **Workflows** fület fogod látni
3. Bal oldali menüpontok:
   - 🏠 **Workflows** – a workflow-id listája
   - 🕐 **Executions** – végrehajtási előzmények
   - 🎛️ **Settings** – beállítások, credential-ök, API hozzáférés

> **Megjegyzés:** A `http://192.168.4.184` (80-as port) továbbra is az epub-translate felületét mutatja. Az n8n a **5678**-as porton érhető el, így a két alkalmazás nem zavarja egymást!

---

## 6. API kulcsok és credential-ök beállítása

### 6.1 DeepSeek API credential létrehozása

1. Az n8n felületen kattints a jobb felső sarokban a **Settings** ⚙️ gombra
2. Válaszd a **Credentials** fület
3. Kattints a **+ Add Credential** gombra
4. Keresd meg a **Header Auth** típust (a keresőbe írd: "header")
5. Töltsd ki az űrlapot:

   | Mező | Érték |
   |------|-------|
   | **Credential Name** | `DeepSeek API` |
   | **Name** | `Authorization` |
   | **Value** | `Bearer sk-your-deepseek-api-key-here` |

6. Kattints a **Save** gombra

**Fontos:** A `Bearer ` előtag kötelező, és az `sk-` után másold be a teljes API kulcsot!

### 6.2 Ellenőrzés

1. Később a workflow szerkesztésénél a "DeepSeek API hívás" node-nál
2. A **Credential** legördülőben válaszd ki a `DeepSeek API`-t
3. A kapcsolat teszteléséhez kattints a node-ra, majd a **Test Step** gombra

---

## 7. A példa workflow importálása

### 7.1 Importálás a fájlból

1. Az n8n főoldalon kattints a **+ Workflow** gombra (jobb felső)
2. Válaszd az **Import from File...** lehetőséget
3. Tallózd ki a számítógépedről a fájlt:
   - Ha Git-tel klónoztad a szerverre: az `n8n-gravity/workflows/example-gravity-cms-deepseek.json` fájlt
   - Ha letöltötted a GitHub-ról: ugyanez a fájl
4. A feltöltés után a workflow megjelenik a szerkesztőben

### 7.2 Credential hozzárendelés

1. A workflow-ban keresd meg a **DeepSeek API hívás** node-ot (HTTP Request)
2. Kattints rá
3. A jobb oldali panelen a **Credential to connect to** mezőnél válaszd ki a korábban létrehozott `DeepSeek API` credential-t
4. Figyelmeztetés: a credential **Name** mezőben `DeepSeek API` kell legyen (pontosan ez a név, ahogy a 6.1-es pontban létrehoztad)

### 7.3 Workflow aktiválása

1. A workflow szerkesztő jobb felső sarkában találsz egy kapcsolót: **Inactive / Active**
2. Kapcsold **Active** állásba
3. Az n8n mostantól figyeli a webhook URL-t és várja a bejövő kéréseket

### 7.4 Webhook URL másolása

1. Kattints a **Webhook (Indító)** node-ra (ez a workflow első node-ja)
2. A jobb oldali panelen látni fogod a **Webhook URL**-t
3. Formátuma: `http://192.168.4.184:5678/webhook/gravity-generate`
4. Másold ki ezt az URL-t, erre kell küldened a POST kéréseket

---

## 8. Első weboldal generálása

### 8.1 Teszt kérés küldése

Nyiss egy **PowerShell** vagy **Parancssor** ablakot Windows-on, és futtasd:

```powershell
# Windows PowerShell-ben
$body = @{
    businessName = "Teszt Vállalkozás Kft."
    projectType = "landing_page"
    language = "hu"
    description = "Ez egy teszt weboldal generálás"
    pages = @("home", "about", "contact")
    designStyle = "modern"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://192.168.4.184:5678/webhook/gravity-generate" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

```bash
# VAGY ha curl van Windows-on (Git Bash, WSL):
curl -X POST http://192.168.4.184:5678/webhook/gravity-generate \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Teszt Vállalkozás Kft.",
    "projectType": "landing_page",
    "language": "hu",
    "description": "Ez egy teszt weboldal generálás",
    "pages": ["home", "about", "contact"],
    "designStyle": "modern"
  }'
```

### 8.2 Válasz ellenőrzése

A sikeres generálás után egy JSON választ kapsz, például:

```json
{
  "status": "success",
  "message": "Gravity CMS oldalstruktúra sikeresen generálva",
  "generated": {
    "pages": {
      "home": {
        "title": "Teszt Vállalkozás Kft. - Kezdőlap",
        "content": {
          "hero": {
            "title": "Üdvözöljük a Teszt Vállalkozás oldalán!",
            "subtitle": "Professzionális megoldások minden igényre",
            ...
          }
        },
        ...
      }
    },
    "config": {
      "system": { "site_name": "Teszt Vállalkozás Kft.", ... },
      "theme": { "primary_color": "#1a73e8", ... }
    }
  },
  "timestamp": "2026-07-19T08:00:00.000Z",
  "usage": {
    "prompt_tokens": 450,
    "completion_tokens": 1200,
    "total_tokens": 1650
  }
}
```

### 8.3 Generálás ellenőrzése az n8n felületen

1. Menj az **Executions** fülre
2. Itt látod az összes végrehajtást, azok státuszát (✅ sikeres, ❌ hiba)
3. Kattints egy sikeres végrehajtásra
4. Végigkövetheted a workflow minden lépését
5. Minden node-nál látod, hogy milyen adat ment be és jött ki

### 8.4 Különböző oldaltípusok paraméterei

| Paraméter | Értelmezés | Lehetséges értékek |
|-----------|-----------|-------------------|
| `businessName` | A vállalkozás neve | Bármilyen szöveg |
| `projectType` | Weboldal típusa | `landing_page`, `blog`, `portfolio`, `shop`, `admin` |
| `language` | Tartalom nyelve | `hu`, `en`, `de`, `fr`, stb. |
| `description` | Projekt leírása | Részletes szöveges leírás |
| `pages` | Generálandó oldalak | Tömb: pl. `["home","about","services","contact"]` |
| `designStyle` | Vizuális stílus | `modern`, `minimal`, `classic`, `bold`, `corporate` |

---

## 9. Port konfliktusok kezelése

### 9.1 Jelenlegi port kiosztás

| Port | Szolgáltatás | Megjegyzés |
|------|-------------|------------|
| 22 | SSH | Szerver elérés |
| 80 | epub-translate | **Foglalt** - meglévő szolgáltatás |
| 443 | epub-translate | **Foglalt** - meglévő szolgáltatás |
| 5678 | **n8n** | n8n webes felület - **NINCS ütközés!** |
| 5432 | PostgreSQL (belső) | n8n adatbázis - **NINCS ütközés!** |
| 6333 | Qdrant (opc.) | Vektor adatbázis - **NINCS ütközés!** |
| 9443 | Portainer (opc.) | Docker GUI - **NINCS ütközés!** |

✅ **Nincs teendő!** Az n8n-gravity nem használja a 80-as és 443-as portokat, így békésen elfér az epub-translate mellett.

### 9.2 Ha mégis portot kell váltani

Ha bármilyen okból más portot szeretnél, szerkeszd a `.env` fájlt:

```bash
nano ~/n8n-gravity/.env
```

Módosítsd a megfelelő sort:

```env
N8N_PORT=5679          # Pl. 5678 helyett 5679
```

Majd indítsd újra a konténert:

```bash
cd ~/n8n-gravity
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up -d
```

Ezután az új címen éred el: `http://192.168.4.184:5679`

---

## 10. Gyakori problémák és megoldások

### 10.1 "Nem érem el a webes felületet"

**Ellenőrzési lista:**

```bash
# 1. Ellenőrizd, hogy futnak-e a konténerek
docker compose -f ~/n8n-gravity/docker-compose.yml ps

# 2. Ellenőrizd a tűzfalat a szerveren
sudo ufw status

# Ha nincs engedélyezve az 5678-as port:
sudo ufw allow 5678/tcp comment 'n8n web UI'

# 3. Ellenőrizd a portot a szerveren belülről
curl http://localhost:5678/healthz
# Válasz: {"status":"ok"}

# 4. Ha a szerverről működik, de Windows-ról nem:
#    Lehet, hogy a Windows tűzfal vagy a hálózati beállítások blokkolják
#    Próbáld ki: ping 192.168.4.184
```

### 10.2 "Sikertelen a DeepSeek API hívás"

```bash
# Ellenőrizd az API kulcsot és az egyenleget
# A szerveren SSH-n keresztül:
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer sk-te-api-kulcsod" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Szia!"}]}'

# Ha itt is hiba, akkor az API kulcs vagy az egyenleg a probléma.
# Ellenőrizd: https://platform.deepseek.com → Billing
```

### 10.3 "Nem sikerül push-olni a GitHub-ra"

```bash
# Ellenőrizd a git beállításokat
git config --global user.name "A Te Neved"
git config --global user.email "te.email@example.com"

# Ellenőrizd a remote beállítást
git remote -v
# Kimenet: origin  https://github.com/sorosg/n8n-gravity (fetch)
#          origin  https://github.com/sorosg/n8n-gravity (push)

# Ha GitHub token kell:
# 1. Menj ide: https://github.com/settings/tokens
# 2. Generate new token → classic
# 3. Scope: repo (teljes)
# 4. A kapott tokent használd jelszóként git push-nál
```

### 10.4 "Az n8n konténer nem indul el"

```bash
# Nézd meg a logokat
docker compose -f ~/n8n-gravity/docker-compose.yml logs n8n

# Gyakori okok:
# 1. PostgreSQL nem egészséges → várd meg a "healthy" státuszt
# 2. Hibás .env fájl → ellenőrizd: cat ~/n8n-gravity/.env
# 3. Port foglalt → ellenőrizd: ss -tlnp | grep 5678

# Teljes újraindítás tiszta lappal:
cd ~/n8n-gravity
docker compose down
docker compose up -d
```

### 10.5 "Nincs elég tárhely"

```bash
# Ellenőrizd a lemezhasználatot
df -h

# Docker takarítás (nem használt image-ek, volume-ok törlése)
docker system prune -a -f

# Régi n8n végrehajtások törlése (a webes felületen):
# Settings → Usage and plan → Execution Data → Delete
```

---

## 11. Menedzsment tippek

### 11.1 Napi workflow használat

```
Windows-on csinálod:
┌─────────────────────────────────┐
│ 1. Böngésző: n8n felület       │
│    http://192.168.4.184:5678   │
│    - Workflow-k szerkesztése    │
│    - Végrehajtások ellenőrzése  │
│    - Credential-ök kezelése     │
│                                 │
│ 2. Tabby: terminál             │
│    SSH: 192.168.4.184          │
│    - docker compose logok       │
│    - Frissítések futtatása      │
│    - Hibakeresés               │
│                                 │
│ 3. VS Code: fájlszerkesztés    │
│    Remote SSH                  │
│    - .env fájl szerkesztése    │
│    - Workflow JSON módosítása   │
│    - deploy.sh futtatása       │
└─────────────────────────────────┘
```

### 11.2 Rendszeres karbantartás

```bash
# Hetente egyszer:
cd ~/n8n-gravity
docker compose logs --tail 50  # utolsó 50 sor log
df -h                           # tárhely ellenőrzés

# Havonta egyszer:
./deploy.sh                     # verziózás + push a GitHub-ra
docker compose pull             # image-ek frissítése
docker compose up -d            # újraindítás friss image-ekkel
./install.sh --update           # automatikus frissítés

# Kéthavonta:
docker system prune -a -f       # Docker takarítás
```

### 11.3 Biztonsági mentés készítése

```bash
# SSH-n keresztül a szerveren:
cd ~/n8n-gravity

# Adatbázis mentése
docker compose exec postgres pg_dump -U n8n n8n > n8n_backup_$(date +%Y%m%d).sql

# A mentett fájlt töltsd le a Windows gépedre (Tabby SFTP-vel)
```

### 11.4 Új verzió kiadása a GitHub-on

Ha módosítottál a kódon (pl. új workflow, bugfix), így adhatsz ki új verziót:

```bash
# VS Code-ban a szerveren lévő fájlok szerkesztése után
cd ~/n8n-gravity

# Automatikus verzió emelés és push:
./deploy.sh           # patch (v0.1.1 → v0.1.2)
./deploy.sh minor     # minor (v0.1.1 → v0.2.0)
./deploy.sh major     # major (v0.1.1 → v1.0.0)

# Konkrét verzió:
./deploy.sh v2.0.0

# Csak push, verzió emelés nélkül:
./deploy.sh --force
```

### 11.5 Gyors referencia kártya

| Mit akarsz csinálni? | Melyik program? | Mit kell csinálni? |
|---------------------|-----------------|-------------------|
| SSH kapcsolat | **Tabby** | Settings → + New → SSH → 192.168.4.184 |
| Fájlok másolása | **Tabby** | SSH kapcsolat → SFTP fül → drag&drop |
| Fájlok szerkesztése | **VS Code** | F1 → Remote SSH → Open Folder |
| n8n workflow készítés | **Böngésző** | http://192.168.4.184:5678 |
| API kulcs beállítás | **Böngésző** | n8n → Settings → Credentials |
| Konténerek ellenőrzése | **Tabby** | `docker compose ps` |
| Logok nézése | **Tabby** | `docker compose logs -f` |
| Új verzió kiadása | **VS Code / Tabby** | `./deploy.sh` |

---

## 📞 Hibabejelentés

Ha hibát találsz vagy fejlesztési javaslatod van:

- **GitHub Issues:** https://github.com/sorosg/n8n-gravity/issues
- **Pull Request:** https://github.com/sorosg/n8n-gravity/pulls

---

## 📚 Hasznos linkek

| Link | Leírás |
|------|--------|
| https://192.168.4.184:5678 | n8n webes felület (helyi hálózat) |
| https://github.com/sorosg/n8n-gravity | Projekt GitHub oldala |
| https://docs.n8n.io | n8n hivatalos dokumentáció |
| https://platform.deepseek.com | DeepSeek API konzol |
| https://platform.deepseek.com/api-docs | DeepSeek API referencia |
| https://getgrav.org | Gravity CMS hivatalos oldal |
| https://tabby.sh | Tabby terminál letöltés |
| https://code.visualstudio.com | VS Code letöltés |

---

*Dokumentáció verzió: v1.0.0 | Utolsó frissítés: 2026. július 19.*
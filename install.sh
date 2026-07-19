#!/usr/bin/env bash
# ================================================================
# n8n + Gravity CMS Automatizáció Telepítő Script
# Ubuntu 20.04/22.04/24.04 LTS alapú mikro-szerverekhez
#
# Használat:
#   chmod +x install.sh
#   ./install.sh              # Alap telepítés (n8n + PostgreSQL)
#   ./install.sh --full       # Teljes telepítés (AI eszközök + Portainer)
#   ./install.sh --update     # Frissítés a legújabb verzióra
#   ./install.sh --uninstall  # Eltávolítás
# ================================================================

set -euo pipefail

# ---- Színek a szebb kimenethez ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---- Konfiguráció ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="n8n-gravity"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"
MIN_DOCKER_VERSION="20.10.0"
MIN_COMPOSE_VERSION="2.0.0"
MIN_DISK_SPACE_GB=10
MIN_RAM_MB=2048

# ---- Segítő függvények ----
log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()    { echo -e "\n${CYAN}==== $* ====${NC}\n"; }

banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════╗"
    echo "║   n8n + Gravity CMS AI Automatizáció Telepítő   ║"
    echo "║        DeepSeek API-val meghajtott CMS           ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root() {
    # Docker csoport automatikus beállítása
    if ! groups | grep -q docker && [[ "$(id -u)" != "0" ]]; then
        log_warn "A jelenlegi felhasználó ($(whoami)) nincs a 'docker' csoportban."
        log_info "Megpróbálom automatikusan hozzáadni (ehhez sudo kell)..."

        # Ha van SUDO_USER (sudo-val futtatva), a tényleges felhasználót adjuk hozzá
        local target_user="${SUDO_USER:-$(whoami)}"

        if sudo usermod -aG docker "${target_user}" 2>/dev/null; then
            log_success "${target_user} hozzáadva a docker csoporthoz."
            echo ""
            log_warn "═══════════════════════════════════════════════"
            log_warn " A docker csoporttagság csak ÚJ bejelentkezés"
            log_warn " után lép életbe. Két lehetőséged van:"
            log_warn ""
            log_warn " 1. Lépj ki az SSH-ból és jelentkezz be újra,"
            log_warn "    majd futtasd: cd ~/n8n-gravity && ./install.sh"
            log_warn ""
            log_warn " 2. VAGY futtasd a scriptet sudo-val:"
            log_warn "    sudo ./install.sh"
            log_warn "═══════════════════════════════════════════════"
            echo ""
            read -rp "Szeretnéd, hogy a script sudo-val újraindítsa magát? [I/n] " -n 1 -r
            echo
            if [[ -z "${REPLY}" ]] || [[ $REPLY =~ ^[Ii]$ ]]; then
                log_info "Újraindítás sudo-val..."
                exec sudo bash "$0" "$@"
                # ide nem jutunk el, mert az exec lecseréli a process-t
            else
                log_error "Kilépés. Futtasd újra: sudo ./install.sh"
                exit 1
            fi
        else
            log_error "Nem sikerült hozzáadni a docker csoporthoz."
            log_error "Root joggal próbáld: sudo ./install.sh"
            exit 1
        fi
    fi
}

check_ubuntu() {
    if [[ ! -f /etc/os-release ]]; then
        log_warn "Nem sikerült azonosítani az operációs rendszert."
        return
    fi
    source /etc/os-release
    if [[ "${ID}" != "ubuntu" ]]; then
        log_warn "Ez a script Ubuntu Linux-ra van optimalizálva."
        log_warn "Jelenlegi rendszer: ${PRETTY_NAME:-ismeretlen}"
        read -rp "Folytatod? [i/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ii]$ ]]; then
            exit 1
        fi
    else
        log_success "Ubuntu ${VERSION_ID} észlelve."
    fi
}

check_resources() {
    log_step "Rendszer erőforrások ellenőrzése"

    # Szabad lemezterület
    local available_gb
    available_gb=$(df -BG "${SCRIPT_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ ${available_gb:-0} -lt ${MIN_DISK_SPACE_GB} ]]; then
        log_warn "Kevés szabad lemezterület: ${available_gb} GB (minimum ${MIN_DISK_SPACE_GB} GB ajánlott)"
    else
        log_success "Szabad lemezterület: ${available_gb} GB"
    fi

    # RAM
    local total_ram_mb
    total_ram_mb=$(free -m | awk 'NR==2 {print $2}')
    if [[ ${total_ram_mb:-0} -lt ${MIN_RAM_MB} ]]; then
        log_warn "Kevés RAM: ${total_ram_mb} MB (minimum ${MIN_RAM_MB} MB ajánlott)"
    else
        log_success "RAM: ${total_ram_mb} MB"
    fi

    # CPU magok
    local cpu_cores
    cpu_cores=$(nproc 2>/dev/null || echo "ismeretlen")
    log_info "CPU magok: ${cpu_cores}"
}

version_compare() {
    # Visszaadja: 1 ha $1 > $2, 0 ha $1 == $2, -1 ha $1 < $2
    if [[ "$1" == "$2" ]]; then
        echo 0
        return
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    for ((i=0; i<${#ver1[@]}; i++)); do
        if [[ -z ${ver2[i]} ]]; then ver2[i]=0; fi
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            echo 1
            return
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]})); then
            echo -1
            return
        fi
    done
    echo 0
}

install_docker() {
    log_step "Docker telepítés ellenőrzése"

    if command -v docker &>/dev/null; then
        local docker_version
        docker_version=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "Docker már telepítve: v${docker_version}"
        local cmp
        cmp=$(version_compare "${docker_version}" "${MIN_DOCKER_VERSION}")
        if [[ ${cmp} -lt 0 ]]; then
            log_warn "Docker verzió régi. Frissítés ajánlott."
        fi
    else
        log_info "Docker telepítése folyamatban..."
        curl -fsSL https://get.docker.com | sh
        log_success "Docker telepítve."

        # Felhasználó hozzáadása a docker csoporthoz
        if [[ "$(id -u)" != "0" ]] && [[ -n "${SUDO_USER:-}" ]]; then
            sudo usermod -aG docker "${SUDO_USER}"
            log_warn "A felhasználó hozzáadva a docker csoporthoz. Lehet, hogy újra kell indítani a shell-t."
        fi

        # Docker daemon elindítása
        sudo systemctl enable docker
        sudo systemctl start docker
    fi
}

install_docker_compose() {
    log_step "Docker Compose telepítés ellenőrzése"

    if docker compose version &>/dev/null; then
        local compose_version
        compose_version=$(docker compose version --short 2>/dev/null | tr -d 'v')
        log_success "Docker Compose Plugin már telepítve: v${compose_version}"
    elif command -v docker-compose &>/dev/null; then
        local compose_version
        compose_version=$(docker-compose --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "Docker Compose (standalone) telepítve: v${compose_version}"
        log_warn "Ajánlott a Docker Compose Plugin használata a 'docker compose' paranccsal."
    else
        log_info "Docker Compose Plugin telepítése..."
        sudo apt-get update -qq
        sudo apt-get install -y -qq docker-compose-plugin
        log_success "Docker Compose Plugin telepítve."
    fi
}

install_dependencies() {
    log_step "Rendszer függőségek telepítése"

    # Frissítsd a csomaglistát
    sudo apt-get update -qq

    # Alap függőségek
    local pkgs=(
        curl
        wget
        git
        jq
        openssl
        ufw
        htop
        net-tools
        ca-certificates
        gnupg
        lsb-release
    )

    log_info "Csomagok telepítése: ${pkgs[*]}"
    sudo apt-get install -y -qq "${pkgs[@]}"
    log_success "Rendszer függőségek telepítve."
}

setup_env() {
    log_step "Környezeti fájl beállítása"

    local env_file="${ENV_FILE}"
    local env_example="${ENV_EXAMPLE}"

    if [[ -f "${env_file}" ]]; then
        log_warn "A .env fájl már létezik: ${env_file}"
        read -rp "Felülírod egy alapértelmezett konfigurációval? [i/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ii]$ ]]; then
            cp "${env_file}" "${env_file}.backup.$(date +%s)"
            log_info "Biztonsági mentés: ${env_file}.backup.*"
        else
            log_info "Meglévő .env fájl megtartva."
            return
        fi
    fi

    if [[ ! -f "${env_example}" ]]; then
        log_error "Hiányzó fájl: ${env_example}"
        exit 1
    fi

    cp "${env_example}" "${env_file}"

    # Véletlen jelszó és titkosítási kulcs generálása
    local random_password
    random_password=$(openssl rand -base64 24 | tr -d '+/=' | head -c 20)

    local encryption_key
    encryption_key=$(openssl rand -hex 32)

    # Beállítások frissítése
    sed -i "s/CHANGE_THIS_PASSWORD/${random_password}/g" "${env_file}"
    sed -i "s/CHANGE_DB_PASSWORD/${random_password}/g" "${env_file}"
    sed -i "s|N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=${encryption_key}|g" "${env_file}"

    # ===== DeepSeek API kulcs interaktív bekérése =====
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│  DeepSeek API kulcs megadása               │${NC}"
    echo -e "${CYAN}│  (https://platform.deepseek.com/api_keys)   │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────┘${NC}"
    echo ""
    log_info "Add meg a DeepSeek API kulcsodat (sk-... kezdetű)"
    log_info "Ha még nincs kulcsod, regisztrálj itt: https://platform.deepseek.com"
    log_info "Ha most üresen hagyod, később a nano .env paranccsal megadhatod."
    echo ""

    read -rp "DeepSeek API kulcs (teljes, pl. sk-...): " deepseek_key

    if [[ -n "${deepseek_key}" ]]; then
        # Ellenőrizzük, hogy érvényesnek tűnik-e (legalább 20 karakter)
        if [[ ${#deepseek_key} -ge 20 ]]; then
            # Escape-éljük a speciális karaktereket, hogy a sed ne törjön el
            local escaped_key
            escaped_key=$(printf '%s\n' "${deepseek_key}" | sed -e 's/[\/&]/\\&/g')
            sed -i "s|DEEPSEEK_API_KEY=.*|DEEPSEEK_API_KEY=${escaped_key}|g" "${env_file}"
            log_success "DeepSeek API kulcs elmentve!"
            log_info "A kulcs hossza: ${#deepseek_key} karakter"
        else
            log_warn "A megadott kulcs túl rövid (${#deepseek_key} karakter, minimum 20 szükséges)."
            log_warn "Győződj meg róla, hogy a TELJES kulcsot másoltad ki a DeepSeek oldaláról."
            log_warn "A kulcs általában 'sk-' kezdetű és 35-55 karakter hosszú."
            log_warn "A kulcs NEM lett elmentve. Próbáld újra:"
            log_warn "  nano ${env_file}"
        fi
    else
        log_warn "Nem adtál meg API kulcsot."
        log_warn "Később add meg a .env fájlban: nano ${env_file}"
        log_warn "  DEEPSEEK_API_KEY=sk-..."
    fi

    echo ""
    log_success ".env fájl létrehozva."
    echo ""
    echo -e "  ${GREEN}Generált admin jelszó:${NC} ${random_password}"
    echo -e "  ${GREEN}Felhasználónév:${NC}       admin"
    echo ""
    log_warn "Jegyezd fel a fenti jelszót, mert az n8n bejelentkezéshez kell!"
    echo ""
}

setup_firewall() {
    log_step "Tűzfal beállítása (UFW)"

    if command -v ufw &>/dev/null; then
        # Csak ha a tűzfal aktív
        if sudo ufw status | grep -q "Status: active"; then
            log_info "UFW szabályok hozzáadása..."
            sudo ufw allow 5678/tcp comment 'n8n web UI'
            sudo ufw allow 6333/tcp comment 'Qdrant API'
            sudo ufw allow 9443/tcp comment 'Portainer HTTPS'
            log_success "Tűzfal szabályok beállítva."
        else
            log_info "UFW nem aktív, tűzfal szabályok kihagyva."
            log_info "Aktiváláshoz: sudo ufw enable, majd futtasd újra ezt a scriptet."
        fi
    fi
}

check_existing_project() {
    log_step "Meglévő n8n példány ellenőrzése"

    # Ellenőrizzük, hogy nincs-e már futó n8n konténer
    if docker ps -a --format '{{.Names}}' | grep -q "n8n-gravity"; then
        log_warn "Már létezik 'n8n-gravity' konténer!"
        read -rp "Leállítod és újraindítod? [i/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ii]$ ]]; then
            docker compose -f "${COMPOSE_FILE}" down --remove-orphans
            log_info "Régi konténerek leállítva."
        else
            log_info "Meglévő konténer megtartva. Kilépés."
            exit 0
        fi
    fi

    # Ellenőrizzük, hogy a szükséges portok szabadok-e
    local ports_to_check=(5678 5432 6333 9443)
    local busy_ports=()

    for port in "${ports_to_check[@]}"; do
        if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
            busy_ports+=("${port}")
        fi
    done

    if [[ ${#busy_ports[@]} -gt 0 ]]; then
        log_warn "A következő portok már foglaltak: ${busy_ports[*]}"
        log_warn "Állítsd le az ezeket használó szolgáltatásokat, vagy módosítsd a portokat a .env fájlban."
        read -rp "Folytatod így is? [i/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ii]$ ]]; then
            exit 1
        fi
    else
        log_success "Minden szükséges port szabad."
    fi
}

start_services() {
    local profile="${1:-default}"

    log_step "Szolgáltatások indítása (profil: ${profile})"

    cd "${SCRIPT_DIR}"

    if [[ "${profile}" == "full" ]]; then
        log_info "Teljes stack indítása (n8n + PostgreSQL + Qdrant + Ollama + Portainer)..."
        docker compose --profile full up -d --build
    elif [[ "${profile}" == "ai" ]]; then
        log_info "AI stack indítása (n8n + PostgreSQL + Qdrant + Ollama)..."
        docker compose --profile ai up -d --build
    else
        log_info "Alap stack indítása (n8n + PostgreSQL)..."
        docker compose up -d --build
    fi

    log_success "Szolgáltatások elindítva."
}

wait_for_services() {
    log_step "Szolgáltatások indulásának ellenőrzése..."

    local max_wait=60
    local waited=0
    local interval=5

    log_info "Várakozás az adatbázisra..."
    while [[ ${waited} -lt ${max_wait} ]]; do
        if docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U n8n -d n8n &>/dev/null; then
            log_success "Adatbázis elérhető."
            break
        fi
        sleep "${interval}"
        waited=$((waited + interval))
        echo -n "."
    done
    echo

    if [[ ${waited} -ge ${max_wait} ]]; then
        log_error "Az adatbázis nem indult el időben. Ellenőrizd a logokat:"
        log_error "  docker compose -f ${COMPOSE_FILE} logs postgres"
        exit 1
    fi

    log_info "Várakozás az n8n-re..."
    waited=0
    while [[ ${waited} -lt ${max_wait} ]]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5678/healthz" 2>/dev/null | grep -q "200"; then
            log_success "n8n elérhető."
            break
        fi
        sleep "${interval}"
        waited=$((waited + interval))
        echo -n "."
    done
    echo
}

show_success() {
    local server_ip
    server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║             Telepítés sikeresen befejeződött!           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${CYAN}n8n Web UI:${NC}         http://${server_ip}:5678"
    echo -e "  ${CYAN}Felhasználónév:${NC}     (lásd a .env fájlban: N8N_AUTH_USER)"
    echo -e "  ${CYAN}Jelszó:${NC}            (lásd a .env fájlban: N8N_AUTH_PASSWORD)"
    echo ""

    # Ha a teljes stack van telepítve
    if docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null | grep -q "qdrant"; then
        echo -e "  ${CYAN}Qdrant API:${NC}        http://${server_ip}:6333"
    fi
    if docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null | grep -q "portainer"; then
        echo -e "  ${CYAN}Portainer:${NC}         https://${server_ip}:9443"
    fi

    echo ""
    echo -e "  ${YELLOW}Fontos teendők:${NC}"
    echo "  1. Nyisd meg a webes felületet és jelentkezz be"
    echo "  2. Menj a Settings → Credentials menübe"
    echo "  3. Hozz létre egy új HTTP Request credential-t vagy"
    echo "     használd a DeepSeek API node-ot a workflow-ban"
    echo "  4. Importáld az example workflow-t a workflows/ mappából"
    echo "  5. Állítsd be a DeepSeek API kulcsodat a környezeti változókban"
    echo ""
    echo -e "  ${YELLOW}Parancsok:${NC}"
    echo "  docker compose -f ${COMPOSE_FILE} logs -f     # Logok követése"
    echo "  docker compose -f ${COMPOSE_FILE} restart     # Újraindítás"
    echo "  docker compose -f ${COMPOSE_FILE} down        # Leállítás"
    echo "  docker compose -f ${COMPOSE_FILE} up -d       # Indítás"
    echo ""
}

uninstall() {
    log_step "n8n + Gravity CMS eltávolítása"

    read -rp "Biztosan törölni szeretnéd az összes konténert és adatot? [i/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ii]$ ]]; then
        log_info "Eltávolítás megszakítva."
        exit 0
    fi

    cd "${SCRIPT_DIR}"

    log_info "Konténerek leállítása és törlése..."
    docker compose -f "${COMPOSE_FILE}" --profile '*' down -v --remove-orphans 2>/dev/null || true

    log_info "Volume-ok törlése..."
    docker volume rm n8n_gravity_data n8n_gravity_postgres n8n_gravity_qdrant n8n_gravity_ollama n8n_gravity_portainer 2>/dev/null || true

    log_info "Hálózat törlése..."
    docker network rm n8n_gravity_network 2>/dev/null || true

    log_success "Eltávolítás kész."
    log_warn "A .env fájl és a workflow-k megmaradtak a ${SCRIPT_DIR} könyvtárban."
    log_warn "A teljes törléshez: rm -rf ${SCRIPT_DIR}"
}

update_services() {
    log_step "Szolgáltatások frissítése"

    cd "${SCRIPT_DIR}"

    log_info "Legújabb image-ek letöltése..."
    docker compose -f "${COMPOSE_FILE}" pull

    log_info "Konténerek újraindítása frissített image-ekkel..."
    docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

    log_success "Frissítés kész!"
}

# ---- Fő belépési pont ----
main() {
    banner

    local profile="default"

    # Parancssori argumentumok feldolgozása
    case "${1:-}" in
        --full)
            profile="full"
            ;;
        --ai)
            profile="ai"
            ;;
        --update)
            check_ubuntu
            check_root
            update_services
            exit 0
            ;;
        --uninstall)
            check_root
            uninstall
            exit 0
            ;;
        --help|-h)
            echo "Használat: $0 [OPCIÓK]"
            echo ""
            echo "Opciók:"
            echo "  (nincs)       Alap telepítés: n8n + PostgreSQL"
            echo "  --full        Teljes telepítés: + Qdrant, Ollama, Portainer"
            echo "  --ai          AI bővített: + Qdrant, Ollama"
            echo "  --update      Frissítés a legújabb verzióra"
            echo "  --uninstall   Teljes eltávolítás"
            echo "  --help        Ez a súgó"
            exit 0
            ;;
        *)
            profile="default"
            ;;
    esac

    # Telepítési lépések sorrendben
    check_ubuntu
    check_root
    check_resources
    install_dependencies
    install_docker
    install_docker_compose
    check_existing_project
    setup_env
    setup_firewall
    start_services "${profile}"
    wait_for_services
    show_success
}

# Script futtatása
main "$@"
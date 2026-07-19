#!/usr/bin/env bash
# ================================================================
# n8n-gravity Deploy Script
# Automatikus verziózás, commit és push a GitHub repository-ba.
#
# Használat:
#   ./deploy.sh                        # Patch verzió emelés (0.1.0 → 0.1.1)
#   ./deploy.sh patch                  # Patch verzió emelés (alapértelmezett)
#   ./deploy.sh minor                  # Minor verzió emelés (0.1.0 → 0.2.0)
#   ./deploy.sh major                  # Major verzió emelés (0.1.0 → 1.0.0)
#   ./deploy.sh v1.2.3                 # Konkrét verzió beállítása
#   ./deploy.sh --dry-run              # Próba futtatás (nem commitol/pushol)
#   ./deploy.sh --force                # Üres commit nélkül pushol (ha már commitolva)
#
# Konfiguráció:
#   Alapértelmezett GitHub repo: https://github.com/sorosg/n8n-gravity
#   Változtasd meg a GITHUB_REPO változót alább ha másik repot használsz.
# ================================================================

set -euo pipefail

# ---- Konfiguráció ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="n8n-gravity"
GITHUB_REPO="https://github.com/sorosg/n8n-gravity"
MAIN_BRANCH="main"
VERSION_FILE="${SCRIPT_DIR}/.version"

# ---- Színek ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()    { echo -e "\n${CYAN}==== $* ====${NC}\n"; }

# ---- Banner ----
banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════╗"
    echo "║     n8n-gravity Deploy Script                   ║"
    echo "║     GitHub: sorosg/n8n-gravity                  ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ---- Segítség ----
show_help() {
    echo "Használat: $0 [OPCIÓ] [VERZIÓ_TÍPUS]"
    echo ""
    echo "Opciók:"
    echo "  patch               Patch verzió emelés (x.y.Z → x.y.Z+1) [alapértelmezett]"
    echo "  minor               Minor verzió emelés (x.Y.z → x.Y+1.0)"
    echo "  major               Major verzió emelés (X.y.z → X+1.0.0)"
    echo "  vX.Y.Z              Konkrét verzió beállítása (pl. v2.5.1)"
    echo "  X.Y.Z               Konkrét verzió (v nélkül is, pl. 2.5.1)"
    echo "  --dry-run           Próba futtatás – mutatja mi történne, de nem csinál semmit"
    echo "  --force             Nem emel verziót, csak push-olja a meglévő commitokat"
    echo "  --help              Ez a súgó"
    echo ""
    echo "Példák:"
    echo "  $0                  Patch emelés, commit, push"
    echo "  $0 minor            Minor emelés (0.1.5 → 0.2.0)"
    echo "  $0 major            Major emelés (0.9.3 → 1.0.0)"
    echo "  $0 v2.0.0           Verzió beállítása 2.0.0-ra"
    echo "  $0 --dry-run patch  Csak mutatja mi történne"
    echo "  $0 --force          Push meglévő commitok (nincs verzió emelés)"
    echo ""
    echo "Jelenlegi verzió: $(get_current_version)"
}

# ---- Verzió kezelés ----
get_current_version() {
    if [[ -f "${VERSION_FILE}" ]]; then
        cat "${VERSION_FILE}"
    else
        # Próbáljuk a legfrissebb git tag-ből
        if git rev-parse --git-dir &>/dev/null; then
            git describe --tags --abbrev=0 2>/dev/null || echo "v0.1.0"
        else
            echo "v0.1.0"
        fi
    fi
}

save_version() {
    local version="$1"
    echo "${version}" > "${VERSION_FILE}"
    log_info "Verzió fájl frissítve: ${VERSION_FILE} → ${version}"
}

parse_version() {
    # v1.2.3 → 1.2.3 → tömb (1, 2, 3)
    local version="${1#v}"   # 'v' eltávolítása ha van
    IFS='.' read -r major minor patch <<< "${version}"
    echo "${major:-0} ${minor:-0} ${patch:-0}"
}

bump_patch() {
    local version="$1"
    local parts
    parts=($(parse_version "${version}"))
    echo "v$((parts[0])).$((parts[1])).$((parts[2] + 1))"
}

bump_minor() {
    local version="$1"
    local parts
    parts=($(parse_version "${version}"))
    echo "v$((parts[0])).$((parts[1] + 1)).0"
}

bump_major() {
    local version="$1"
    local parts
    parts=($(parse_version "${version}"))
    echo "v$((parts[0] + 1)).0.0"
}

normalize_version() {
    # v2 → v2.0.0, 3.1 → v3.1.0, stb.
    local input="$1"
    local v="${input#v}"
    local parts
    IFS='.' read -ra parts <<< "$v"

    # Hiányzó részek pótlása 0-val
    local major="${parts[0]:-0}"
    local minor="${parts[1]:-0}"
    local patch="${parts[2]:-0}"

    echo "v${major}.${minor}.${patch}"
}

# ---- Git műveletek ----
check_git_repo() {
    if ! git rev-parse --git-dir &>/dev/null; then
        log_error "Ez nem egy git repository! Futtasd először: git init && git remote add origin ${GITHUB_REPO}"
        exit 1
    fi

    # Ellenőrizzük, hogy a megfelelő remote van-e beállítva
    local current_remote
    current_remote=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ -z "${current_remote}" ]]; then
        log_warn "Nincs 'origin' remote beállítva. Beállítom..."
        git remote add origin "${GITHUB_REPO}"
    elif [[ "${current_remote}" != "${GITHUB_REPO}"* ]] && [[ "${current_remote}" != "git@github.com:sorosg/n8n-gravity"* ]]; then
        log_warn "Az 'origin' remote eltér a várttól:"
        log_warn "  Jelenlegi: ${current_remote}"
        log_warn "  Várt:      ${GITHUB_REPO}"
        read -rp "Felülírod? [i/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ii]$ ]]; then
            git remote set-url origin "${GITHUB_REPO}"
        fi
    fi
}

check_uncommitted_changes() {
    if [[ -n $(git status --porcelain) ]]; then
        return 0   # Vannak változások
    else
        return 1   # Nincsenek változások
    fi
}

get_changelog() {
    # Összegyűjti a módosított fájlokat commit message-hez
    local changes=""
    local new_files=""
    local modified_files=""
    local deleted_files=""

    new_files=$(git diff --cached --name-only --diff-filter=A 2>/dev/null || git ls-files --others --exclude-standard)
    modified_files=$(git diff --cached --name-only --diff-filter=M 2>/dev/null || echo "")
    deleted_files=$(git diff --cached --name-only --diff-filter=D 2>/dev/null || echo "")

    if [[ -n "${new_files}" ]]; then
        changes+="Added: ${new_files//$'\n'/, }\n"
    fi
    if [[ -n "${modified_files}" ]]; then
        changes+="Modified: ${modified_files//$'\n'/, }\n"
    fi
    if [[ -n "${deleted_files}" ]]; then
        changes+="Deleted: ${deleted_files//$'\n'/, }\n"
    fi

    echo -e "${changes}"
}

# ---- Fő függvények ----
do_deploy() {
    local new_version="$1"
    local dry_run="$2"

    log_step "Deploy: ${new_version}"

    cd "${SCRIPT_DIR}"

    # Ellenőrizzük a git repot
    check_git_repo

    # Stageljük az összes változást (a .gitignore-t tiszteletben tartva)
    log_info "Változások stage-elése..."
    if [[ "${dry_run}" == "true" ]]; then
        log_warn "[DRY-RUN] git add ."
    else
        git add .
    fi

    # Ellenőrizzük, vannak-e változások
    if ! check_uncommitted_changes && [[ "${dry_run}" != "true" ]]; then
        log_warn "Nincsenek stage-elt változások. Megpróbálok mindent stage-elni..."
        # Lehet, hogy a .gitignore miatt nincs mit commit-olni
        local untracked
        untracked=$(git ls-files --others --exclude-standard)
        if [[ -z "${untracked}" ]]; then
            log_info "Tényleg nincs új vagy módosított fájl. Csak tag létrehozása... (--force mód)"
        fi
    fi

    # Commit message összeállítása
    local commit_msg="🔖 Release ${new_version}"

    # Ha van commit, akkor hozzáadjuk a változás listát is
    if check_uncommitted_changes; then
        local details
        details=$(get_changelog)
        commit_msg+=$'\n\n'"${details}"
    fi

    # Commit
    if [[ "${dry_run}" == "true" ]]; then
        log_warn "[DRY-RUN] git commit -m \"${commit_msg}\""
    else
        log_info "Commit létrehozása..."
        if check_uncommitted_changes; then
            git commit -m "${commit_msg}"
            log_success "Commit létrehozva: ${commit_msg:0:80}..."
        else
            log_info "Nincs mit commitolni (már minden naprakész)."
            # --allow-empty hogy legyen commit akkor is ha nincs változás
            git commit --allow-empty -m "${commit_msg}"
        fi
    fi

    # Tag létrehozása
    if [[ "${dry_run}" == "true" ]]; then
        log_warn "[DRY-RUN] git tag -a ${new_version} -m \"${new_version}\""
    else
        # Töröljük a régi tag-et ha létezik (helyi és távoli)
        if git tag -l | grep -q "^${new_version}$"; then
            log_warn "A ${new_version} tag már létezik helyileg. Felülírom..."
            git tag -d "${new_version}" || true
        fi
        git tag -a "${new_version}" -m "Release ${new_version}"
        log_success "Tag létrehozva: ${new_version}"
    fi

    # Push a GitHub-ra
    if [[ "${dry_run}" == "true" ]]; then
        log_warn "[DRY-RUN] git push origin ${MAIN_BRANCH}"
        log_warn "[DRY-RUN] git push origin ${new_version}"
    else
        log_info "Push a GitHub-ra (${MAIN_BRANCH} branch)..."
        if git push origin "${MAIN_BRANCH}"; then
            log_success "Branch push sikeres: ${MAIN_BRANCH}"
        else
            log_error "Branch push sikertelen. Ellenőrizd a jogosultságokat és a remote beállítást."
            log_error "Lehet, hogy 'git push --set-upstream origin ${MAIN_BRANCH}' kell első alkalommal."
            exit 1
        fi

        log_info "Tag push (${new_version})..."
        if git push origin "${new_version}"; then
            log_success "Tag push sikeres: ${new_version}"
        else
            log_error "Tag push sikertelen."
            exit 1
        fi
    fi

    # Verzió fájl mentése
    if [[ "${dry_run}" == "true" ]]; then
        log_warn "[DRY-RUN] Verzió fájl mentése: ${new_version}"
    else
        save_version "${new_version}"
    fi

    log_success "Deploy sikeresen befejezve! 🚀"
    echo ""
    echo -e "  ${CYAN}GitHub Release:${NC} ${GITHUB_REPO}/releases/tag/${new_version}"
    echo -e "  ${CYAN}Repository:${NC}     ${GITHUB_REPO}"
    echo ""
}

do_force_push() {
    log_step "Force push (verzió emelés nélkül)"

    cd "${SCRIPT_DIR}"
    check_git_repo

    log_info "Változások stage-elése..."
    git add .

    if check_uncommitted_changes; then
        local commit_msg="🔄 Manuális frissítés - $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "${commit_msg}"
        log_success "Commit létrehozva."
    else
        log_info "Nincs mit commitolni."
    fi

    log_info "Push a GitHub-ra..."
    git push origin "${MAIN_BRANCH}"
    log_success "Push sikeres! 🚀"
}

initialize_git_repo() {
    log_step "Git repository inicializálása"

    cd "${SCRIPT_DIR}"

    if git rev-parse --git-dir &>/dev/null; then
        log_info "Git repository már inicializálva van."
        return 0
    fi

    log_info "git init futtatása..."
    git init

    log_info "Branch átnevezése main-re..."
    git branch -m main

    log_info "Remote hozzáadása: ${GITHUB_REPO}"
    git remote add origin "${GITHUB_REPO}"

    # Kezdő verzió
    local initial_version="v0.1.0"
    echo "${initial_version}" > "${VERSION_FILE}"

    log_success "Git repository inicializálva!"
    log_info "  Branch: ${MAIN_BRANCH}"
    log_info "  Remote: ${GITHUB_REPO}"
    log_info "  Verzió: ${initial_version}"
}

# ---- Main ----
main() {
    banner

    cd "${SCRIPT_DIR}"

    local dry_run="false"
    local bump_type="patch"
    local force_mode="false"
    local custom_version=""

    # Argumentumok feldolgozása
    local positional=()

    for arg in "$@"; do
        case "${arg}" in
            --dry-run)
                dry_run="true"
                ;;
            --force)
                force_mode="true"
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            patch|minor|major)
                bump_type="${arg}"
                ;;
            v*)
                custom_version="$(normalize_version "${arg}")"
                bump_type="custom"
                ;;
            *.*.*)
                # Pl. 1.2.3 (v nélkül)
                custom_version="$(normalize_version "v${arg}")"
                bump_type="custom"
                ;;
            *)
                log_error "Ismeretlen argumentum: ${arg}"
                show_help
                exit 1
                ;;
        esac
    done

    # Git inicializálás ha szükséges
    initialize_git_repo

    # Force mód: csak push-ol, nincs verzió emelés
    if [[ "${force_mode}" == "true" ]]; then
        do_force_push
        exit 0
    fi

    # Verzió számítás
    local current_version
    current_version=$(get_current_version)

    local new_version
    case "${bump_type}" in
        patch)
            new_version=$(bump_patch "${current_version}")
            ;;
        minor)
            new_version=$(bump_minor "${current_version}")
            ;;
        major)
            new_version=$(bump_major "${current_version}")
            ;;
        custom)
            new_version="${custom_version}"
            ;;
    esac

    log_info "Verzió emelés: ${current_version} → ${new_version}"
    log_info "Típus: ${bump_type}"

    if [[ "${dry_run}" == "true" ]]; then
        log_warn "DRY-RUN MÓD – nem történik valódi változtatás."
        echo ""
    fi

    # Megerősítés kérése (csak éles futtatásnál, dry-run-nál automatikus)
    if [[ "${dry_run}" != "true" ]]; then
        echo ""
        echo -e "  Verzió:   ${YELLOW}${current_version}${NC} → ${GREEN}${new_version}${NC}"
        echo -e "  Repo:     ${CYAN}${GITHUB_REPO}${NC}"
        echo -e "  Branch:   ${CYAN}${MAIN_BRANCH}${NC}"
        echo ""
        read -rp "Folytatod? [I/n] " -n 1 -r
        echo
        if [[ -n "${REPLY}" ]] && [[ ! $REPLY =~ ^[Ii]$ ]]; then
            log_info "Megszakítva a felhasználó által."
            exit 0
        fi
    fi

    do_deploy "${new_version}" "${dry_run}"
}

# ---- Futtatás ----
main "$@"
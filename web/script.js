/* ================================================================
   n8n-gravity – JavaScript (v1.0)
   Drag & drop, formátumválasztó, AI/manuális tartalom módok
   ================================================================ */

const SERVER_BASE = window.location.origin;
const WEBHOOK_URL = SERVER_BASE + '/webhook/gravity-generate';
const N8N_URL = 'http://192.168.4.148:5678';
document.getElementById('webhookUrl').textContent = WEBHOOK_URL;

/* ---- Státusz ---- */
const serverStatus = document.getElementById('serverStatus'), statusDot = document.getElementById('statusDot');
function updateStatus(o) {
  if (o) { serverStatus.innerHTML = 'Online ✅'; serverStatus.style.color = '#4ade80'; statusDot.style.background = '#4ade80'; }
  else { serverStatus.textContent = 'Offline ❌'; serverStatus.style.color = '#f87171'; statusDot.style.background = '#f87171'; }
}
async function checkServerStatus() {
  try { const c = new AbortController(), t = setTimeout(() => c.abort(), 5000); await fetch('/healthz', { signal: c.signal }); clearTimeout(t); updateStatus(true); } catch (e) { updateStatus(false); }
}
checkServerStatus(); setInterval(checkServerStatus, 30000);

/* ---- AI color toggle ---- */
document.querySelectorAll('.ai-check').forEach(cb => {
  cb.addEventListener('change', function () { const t = document.getElementById(this.dataset.target); if (t) { t.disabled = this.checked; t.style.opacity = this.checked ? '0.3' : '1'; } });
});

/* ---- Logo mode toggle ---- */
function toggleLogoMode() {
  const mode = document.querySelector('input[name="logoMode"]:checked').value;
  document.getElementById('logoUploadGroup').style.display = mode === 'upload' ? 'block' : 'none';
  document.getElementById('logoAiGroup').style.display = mode === 'ai' ? 'block' : 'none';
}

/* ---- Hero bg mode toggle ---- */
function toggleHeroBgMode() {
  const mode = document.getElementById('heroBgModeSelect').value;
  document.getElementById('heroBgAiPromptGroup').style.display = mode === 'ai' ? 'flex' : 'none';
  document.getElementById('heroBgUploadGroup').style.display = mode === 'upload' ? 'flex' : 'none';
}

/* ---- Drag & Drop ---- */
function setupDragDrop(zoneId, fileInputId) {
  const zone = document.getElementById(zoneId);
  const fileInput = document.getElementById(fileInputId);
  if (!zone || !fileInput) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
  });

  zone.addEventListener('dragover', () => zone.classList.add('drag-over'));
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  // Kattintás a zónára megnyitja a fájlválasztót (csak ha nem a file inputra kattintottunk)
  zone.addEventListener('click', (e) => {
    if (e.target !== fileInput) fileInput.click();
  });

  // Megakadályozzuk, hogy a file input click eseménye felbuborékoljon a zónára
  fileInput.addEventListener('click', (e) => e.stopPropagation());
}

/* ---- Képoptimalizálás ---- */
async function optimizeImage(file, maxWidth = 800, quality = 0.8, format = 'image/webp') {
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const ext = format === 'image/webp' ? '.webp' : format === 'image/png' ? '.png' : '.jpg';
        const dataUrl = canvas.toDataURL(format, quality);
        resolve({ data: dataUrl, filename: file.name.replace(/\.[^.]+$/, ext), original: file.name });
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function handleFileUpload(fileInputId, fileNameId, formatSelectId, onOptimized) {
  const fileInput = document.getElementById(fileInputId);
  const fileName = document.getElementById(fileNameId);
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) { fileName.textContent = 'Nincs kiválasztva'; onOptimized(null, null); return; }
    const format = document.getElementById(formatSelectId)?.value || 'image/webp';
    const optimized = await optimizeImage(file, 800, 0.8, format);
    if (optimized) {
      fileName.textContent = '✅ ' + optimized.filename + ' (' + (optimized.data.length / 1024).toFixed(0) + ' KB)';
      onOptimized(optimized.data, optimized.filename);
    } else {
      const reader = new FileReader(); reader.onload = () => onOptimized(reader.result, file.name);
      reader.readAsDataURL(file);
      fileName.textContent = file.name + ' (eredeti)';
    }
  });
}

/* ---- File uploads ---- */
let headerLogoBase64 = null, headerLogoFilename = null;
let footerLogoBase64 = null, footerLogoFilename = null;
let heroBgBase64 = null, heroBgFilename = null;

handleFileUpload('headerLogoFile', 'headerLogoFileName', 'logoFormat', (data, name) => { headerLogoBase64 = data; headerLogoFilename = name; });
handleFileUpload('footerLogoFile', 'footerLogoFileName', 'logoFormat', (data, name) => { footerLogoBase64 = data; footerLogoFilename = name; });
handleFileUpload('heroBgFile', 'heroBgFileName', 'logoFormat', (data, name) => { heroBgBase64 = data; heroBgFilename = name; });

setupDragDrop('headerLogoDrop', 'headerLogoFile');
setupDragDrop('footerLogoDrop', 'footerLogoFile');
setupDragDrop('heroBgDrop', 'heroBgFile');

/* ---- Téma előnézet ---- */
function updatePreview() {
  const primary = document.getElementById('primaryColor').value, secondary = document.getElementById('secondaryColor').value,
    accent = document.getElementById('accentColor').value, headerBg = document.getElementById('headerBg').value;
  document.getElementById('previewHeader').style.background = headerBg;
  document.getElementById('previewHeader').style.color = (headerBg === '#ffffff' || headerBg === '#fff') ? '#333' : '#fff';
  document.getElementById('previewHero').style.background = 'linear-gradient(135deg, ' + primary + ', ' + secondary + ')';
  const btn = document.querySelector('.preview-btn'); if (btn) btn.style.background = accent;
}
updatePreview();

/* ---- Hero slider ---- */
const heroHeight = document.getElementById('heroHeight');
document.getElementById('heroHeightValue').textContent = heroHeight.value;
heroHeight.addEventListener('input', () => { document.getElementById('heroHeightValue').textContent = heroHeight.value; });

/* ---- Dinamikus oldalak ---- */
let pageCounter = 0; const pagesContainer = document.getElementById('pagesContainer');
const defaultPages = [{ name: 'Kezdőlap', slug: 'home', description: 'Főoldal', mode: 'ai', imageCount: 0, subpages: [] }, { name: 'Rólunk', slug: 'about', description: 'Cégbemutató', mode: 'ai', imageCount: 0, subpages: [] }, { name: 'Kapcsolat', slug: 'contact', description: 'Elérhetőségek', mode: 'ai', imageCount: 0, subpages: [] }];

function escapeHtml(s) { return s.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }

function addSubpageEntry(c, n, s, d) {
  const div = document.createElement('div'); div.className = 'subpage-entry';
  div.innerHTML = `<input type="text" class="subpage-name" placeholder="Aloldal neve" value="${escapeHtml(n||'')}" style="flex:2;"><input type="text" class="subpage-slug" placeholder="slug" value="${escapeHtml(s||'')}" style="flex:1;"><input type="text" class="subpage-desc" placeholder="Leírás" value="${escapeHtml(d||'')}" style="flex:2;"><button type="button" class="btn btn-del remove-subpage" style="font-size:11px;padding:4px 8px;">✕</button>`;
  div.querySelector('.remove-subpage').addEventListener('click', () => div.remove()); c.appendChild(div);
}

function createPageEntry(pd) {
  const isDefault = !!pd, name = pd ? pd.name : '', slug = pd ? pd.slug : '', desc = pd ? pd.description : '', mode = pd ? (pd.mode || 'ai') : 'ai', imageCount = pd ? (pd.imageCount || 0) : 0, subpages = pd ? (pd.subpages || []) : [];
  const div = document.createElement('div'); div.className = 'page-entry';
  div.innerHTML = `<div class="page-header"><input type="text" class="page-name" placeholder="Oldal neve" value="${escapeHtml(name)}" style="flex:2;"><input type="text" class="page-slug" placeholder="URL slug" value="${escapeHtml(slug)}" style="flex:1;">${isDefault ? '' : '<button type="button" class="btn btn-del remove-page">✕</button>'}</div><div class="page-content-mode" style="margin-bottom:6px;"><label><input type="radio" name="mode_${pageCounter}" value="ai" ${mode==='ai'?'checked':''} class="page-mode-radio"> 🧠 AI generáljon</label><label><input type="radio" name="mode_${pageCounter}" value="manual" ${mode==='manual'?'checked':''} class="page-mode-radio"> ✏️ Saját szöveg</label></div><div class="form-row"><div class="form-group full"><textarea class="page-description" rows="2" placeholder="${mode==='ai'?'Írd le, miről szóljon az oldal (az AI ez alapján generál)':'Írd meg az oldal teljes szövegét'}">${escapeHtml(desc)}</textarea></div></div><div class="form-row"><div class="form-group half"><label>🖼️ AI által generált képek száma</label><input type="number" class="page-image-count" value="${imageCount}" min="0" max="10"></div></div><div class="subpages-container"></div><button type="button" class="btn btn-sm add-subpage">+ Aloldal</button>`;

  pageCounter++;

  // Mode váltás: frissíti a placeholder-t
  div.querySelectorAll('.page-mode-radio').forEach(r => {
    r.addEventListener('change', function() {
      const ta = div.querySelector('.page-description');
      ta.placeholder = this.value === 'ai' ? 'Írd le, miről szóljon az oldal (az AI ez alapján generál)' : 'Írd meg az oldal teljes szövegét';
    });
  });

  const sc = div.querySelector('.subpages-container'); subpages.forEach(sp => addSubpageEntry(sc, sp.name, sp.slug, sp.description));
  div.querySelector('.add-subpage').addEventListener('click', () => addSubpageEntry(sc, '', '', ''));
  const rb = div.querySelector('.remove-page'); if (rb) rb.addEventListener('click', () => div.remove());
  return div;
}
try {
  defaultPages.forEach(p => pagesContainer.appendChild(createPageEntry(p)));
  document.getElementById('addPageBtn').addEventListener('click', () => {
    try {
      pagesContainer.appendChild(createPageEntry());
    } catch (e) { console.error('Oldal hozzáadás hiba:', e); alert('Hiba: ' + e.message); }
  });
} catch (e) { console.error('Default oldalak hiba:', e); }

/* ---- Log panel ---- */
const LOG_KEY = 'n8n_gravity_logs';
const logPanel = document.getElementById('logPanel'), logEntries = document.getElementById('logEntries');
function getLogs() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; } }
function saveLogs(logs) { if (logs.length > 200) logs = logs.slice(-200); localStorage.setItem(LOG_KEY, JSON.stringify(logs)); }
function addLogEntry(entry) { const logs = getLogs(); logs.push(entry); saveLogs(logs); renderLogs(); logPanel.style.display = 'block'; }
function renderLogs() {
  const logs = getLogs();
  if (logs.length === 0) { logEntries.innerHTML = '<span style="color:rgba(255,255,255,0.4);">Nincsenek naplóbejegyzések.</span>'; }
  else { logEntries.innerHTML = logs.reverse().map(l => { const icon = l.status === 'success' ? '✅' : '❌'; const time = new Date(l.time).toLocaleTimeString('hu-HU'); let line = `${icon} <strong>${time}</strong> – ${l.business} (${l.type})`; if (l.file) line += ` – <a href="/output/${l.file}" target="_blank" style="color:#4ade80;">📄 ${l.file}</a>`; if (l.message) line += ` – <span style="color:#f87171;">${l.message}</span>`; return `<div style="margin-bottom:3px;">${line}</div>`; }).join(''); }
  logPanel.style.display = 'block';
  updateProjectList();
}
document.getElementById('clearLogsBtn').addEventListener('click', () => { if (confirm('Biztosan törlöd?')) { localStorage.removeItem(LOG_KEY); renderLogs(); } });
document.getElementById('refreshLogsBtn').addEventListener('click', renderLogs);
renderLogs();

/* ---- Gravity CMS projekt választó ---- */
const projectSelector = document.getElementById('projectSelector'), openGravityBtn = document.getElementById('openGravityBtn');
async function fetchServerProjects() {
  try {
    const res = await fetch('/output/');
    if (!res.ok) return [];
    const html = await res.text();
    const files = [];
    const regex = /href="([^"]+\.json)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const filename = match[1];
      // Cégnév kinyerése: safeName_timestamp.json
      const underscoreIdx = filename.indexOf('_');
      if (underscoreIdx > 0) {
        const safeName = filename.substring(0, underscoreIdx);
        // Visszaalakítás: alulvonások → szóköz
        const business = safeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        files.push({ business, filename, fromServer: true });
      }
    }
    return files;
  } catch (e) {
    return [];
  }
}

async function updateProjectList() {
  const logs = getLogs(), projects = [], seen = new Set();
  
  // Helyi naplóból
  logs.forEach(l => { if (l.status === 'success' && l.business && !seen.has(l.business)) { seen.add(l.business); projects.push(l); } });
  
  // Szerverről (ha nincs a naplóban)
  const serverProjects = await fetchServerProjects();
  serverProjects.forEach(p => {
    if (!seen.has(p.business)) {
      seen.add(p.business);
      projects.push({ business: p.business, type: 'szerver', status: 'success', file: p.filename });
    }
  });
  
  projectSelector.innerHTML = '<option value="">-- Válassz generált projektet --</option>';
  projects.forEach(p => { 
    const o = document.createElement('option'); 
    o.value = p.business; 
    o.textContent = '📁 ' + p.business + (p.fromServer ? ' (fájl)' : ' (' + (p.type || '?') + ')'); 
    projectSelector.appendChild(o); 
  });
  if (projects.length > 0) projectSelector.value = projects[projects.length - 1].business;
  projectSelector.dispatchEvent(new Event('change'));
}
projectSelector.addEventListener('change', () => {
  const b = projectSelector.value;
  if (b) { openGravityBtn.href = '/gravity/01.' + b.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30); openGravityBtn.style.opacity = '1'; }
  else { openGravityBtn.href = '/gravity/'; openGravityBtn.style.opacity = '0.5'; }
});
updateProjectList();

/* ---- Progress ---- */
const progressContainer = document.getElementById('progressContainer'), progressFill = document.getElementById('progressFill'), steps = document.querySelectorAll('.step'), downloadBtn = document.getElementById('downloadBtn');
function resetUI() { progressContainer.style.display = 'none'; progressFill.className = 'progress-fill'; progressFill.style.width = '0%'; progressFill.style.background = ''; downloadBtn.style.display = 'none'; downloadBtn.href = '#'; steps.forEach(s => { s.className = 'step'; s.querySelector('.step-icon').textContent = '⏳'; }); }
function setStep(i, t) { const s = steps[i]; if (!s) return; if (t === 'active') { s.className = 'step active'; s.querySelector('.step-icon').textContent = '🔄'; } else if (t === 'done') { s.className = 'step done'; s.querySelector('.step-icon').textContent = '✅'; } else if (t === 'error') { s.className = 'step error'; s.querySelector('.step-icon').textContent = '❌'; } }
function getChecked(sel) { const v = []; document.querySelectorAll(sel + ':checked').forEach(c => v.push(c.value)); return v; }
function getColorOrAi(id, aiId) { return document.getElementById(aiId).checked ? 'ai' : document.getElementById(id).value; }

/* ---- Submit ---- */
const form = document.getElementById('generatorForm'), submitBtn = document.getElementById('submitBtn'), responseDiv = document.getElementById('response'), responseContent = document.getElementById('responseContent');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pages = [];
  document.querySelectorAll('.page-entry').forEach(entry => {
    const name = entry.querySelector('.page-name')?.value.trim() || '', slug = entry.querySelector('.page-slug')?.value.trim() || name.toLowerCase().replace(/\s+/g, '_'), desc = entry.querySelector('.page-description')?.value.trim() || '', imageCount = parseInt(entry.querySelector('.page-image-count')?.value || 0);
    const modeRadio = entry.querySelector('.page-mode-radio:checked');
    const mode = modeRadio ? modeRadio.value : 'ai';
    const subpages = [];
    entry.querySelectorAll('.subpage-entry').forEach(sp => { const sn = sp.querySelector('.subpage-name')?.value.trim() || '', ss = sp.querySelector('.subpage-slug')?.value.trim() || sn.toLowerCase().replace(/\s+/g, '_'), sd = sp.querySelector('.subpage-desc')?.value.trim() || ''; if (sn) subpages.push({ name: sn, slug: ss, description: sd }); });
    pages.push({ name, slug, description: desc, mode, imageCount, subpages });
  });

  const languages = getChecked('.lang-opt'); if (languages.length === 0) languages.push('hu');
  const logoMode = document.querySelector('input[name="logoMode"]:checked').value;

  const payload = {
    businessName: document.getElementById('businessName').value.trim(),
    projectType: document.getElementById('projectType').value,
    languages, description: document.getElementById('description').value.trim(),
    designStyle: document.getElementById('designStyle').value,
    apiKeyOverride: document.getElementById('apiKeyOverride').value.trim(),
    aiModel: document.getElementById('aiModel').value,
    customPrompt: document.getElementById('customPrompt').value.trim(),
    notifyEmail: document.getElementById('notifyEmail').value.trim(),
    logoMode, logoPrompt: logoMode === 'ai' ? document.getElementById('logoPrompt').value.trim() : '',
    colors: { primary: getColorOrAi('primaryColor','ai_primary'), secondary: getColorOrAi('secondaryColor','ai_secondary'), accent: getColorOrAi('accentColor','ai_accent'), headerBg: getColorOrAi('headerBg','ai_headerBg'), footerBg: getColorOrAi('footerBg','ai_footerBg') },
    headerLogo: (logoMode==='upload' && headerLogoBase64) ? { filename: headerLogoFilename, data: headerLogoBase64 } : null,
    footerLogo: (logoMode==='upload' && footerLogoBase64) ? { filename: footerLogoFilename, data: footerLogoBase64 } : null,
    header: getChecked('.header-opt'),
    hero: {
      enabled: document.getElementById('heroEnabled').checked,
      height: parseInt(heroHeight.value),
      bgMode: document.getElementById('heroBgModeSelect').value,
      bgPrompt: document.getElementById('heroBgPrompt').value.trim(),
      bgImage: heroBgBase64 ? { filename: heroBgFilename, data: heroBgBase64 } : null,
      bgCount: parseInt(document.getElementById('heroBgCount')?.value || 1)
    },
    footer: getChecked('.footer-opt'),
    pages
  };

  resetUI(); responseContent.textContent = ''; responseContent.className = ''; responseDiv.style.display = 'none';
  submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner"></span>Generálás...';
  progressContainer.style.display = 'block'; progressFill.className = 'progress-fill indeterminate'; setStep(0, 'active');
  const st = []; st.push(setTimeout(() => { setStep(0, 'done'); setStep(1, 'active'); progressFill.style.width = '25%'; }, 500));

  try {
    const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    st.forEach(t => clearTimeout(t)); setStep(0, 'done'); setStep(1, 'done'); setStep(2, 'active'); setStep(3, 'active');
    progressFill.className = 'progress-fill'; progressFill.style.width = '75%';
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    setStep(2, 'done'); setStep(3, 'done'); progressFill.style.width = '100%';
    responseContent.className = 'status-ok'; responseContent.textContent = JSON.stringify(data, null, 2); responseDiv.style.display = 'block';
    if (data.saved_to) { const fn = data.saved_to.split('/').pop(); downloadBtn.href = '/output/' + fn; downloadBtn.textContent = '⬇️ ' + fn + ' letöltése'; downloadBtn.style.display = 'block'; }
    addLogEntry({ time: new Date().toISOString(), business: payload.businessName, type: payload.projectType, status: 'success', file: data.saved_to ? data.saved_to.split('/').pop() : null });
    setTimeout(() => { progressFill.style.width = '0%'; }, 2000);
  } catch (err) {
    addLogEntry({ time: new Date().toISOString(), business: payload ? payload.businessName : '?', type: payload ? payload.projectType : '?', status: 'error', message: err.message });
    st.forEach(t => clearTimeout(t)); setStep(0, 'done'); setStep(1, 'done'); setStep(2, 'error'); setStep(3, 'error');
    progressFill.className = 'progress-fill'; progressFill.style.background = '#f87171'; progressFill.style.width = '100%';
    responseContent.className = 'status-error'; responseContent.textContent = '❌ HIBA: ' + err.message + '\n\n' + SERVER_BASE;
    responseDiv.style.display = 'block';
  } finally { submitBtn.disabled = false; submitBtn.innerHTML = '⚡ Weboldal generálása AI-val'; }
});
/* ================================================================
   n8n-gravity – Gravity CMS Generátor JavaScript (v0.9)
   Képoptimalizálás (canvas resize + WebP) + AI SVG logó generálás
   ================================================================ */

const SERVER_BASE = window.location.origin;
const WEBHOOK_URL = SERVER_BASE + '/webhook/gravity-generate';
const N8N_URL = 'http://192.168.4.148:5678';
document.getElementById('webhookUrl').textContent = WEBHOOK_URL;

/* ---- Státuszellenőrzés ---- */
const serverStatus = document.getElementById('serverStatus'), statusDot = document.getElementById('statusDot');
function updateStatus(o) {
  if (o) {
    serverStatus.innerHTML = 'Online ✅ <a href="' + N8N_URL + '" target="_blank" style="color:#4ade80;text-decoration:underline;">(n8n)</a>';
    serverStatus.style.color = '#4ade80'; statusDot.style.background = '#4ade80';
  } else { serverStatus.textContent = 'Offline ❌'; serverStatus.style.color = '#f87171'; statusDot.style.background = '#f87171'; }
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

function toggleHeroBgMode() {
  const mode = document.querySelector('input[name="heroBgMode"]:checked').value;
  document.getElementById('heroBgAiPromptGroup').style.display = mode === 'ai' ? 'block' : 'none';
  document.getElementById('heroBgUploadGroup').style.display = mode === 'upload' ? 'block' : 'none';
}

/* ---- Képoptimalizálás (canvas resize > 800px + WebP) ---- */
async function optimizeImage(file, maxWidth = 800, quality = 0.8) {
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        // WebP támogatás ellenőrzése, fallback: JPEG
        const mime = 'image/webp';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve({ data: dataUrl, filename: file.name.replace(/\.[^.]+$/, '.webp'), original: file.name });
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---- File uploads ---- */
let headerLogoOptimized = null, footerLogoOptimized = null;

const headerLogoFile = document.getElementById('headerLogoFile');
let headerLogoBase64 = null, headerLogoFilename = null;
headerLogoFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  document.getElementById('headerLogoFileName').textContent = file ? 'Optimalizálás...' : 'Nincs kiválasztva';
  if (!file) { headerLogoBase64 = null; headerLogoFilename = null; headerLogoOptimized = null; return; }
  headerLogoFilename = file.name;
  const optimized = await optimizeImage(file);
  if (optimized) {
    headerLogoOptimized = optimized;
    headerLogoBase64 = optimized.data;
    document.getElementById('headerLogoFileName').textContent = '✅ ' + optimized.filename + ' (' + (optimized.data.length / 1024).toFixed(0) + ' KB)';
  } else {
    const reader = new FileReader(); reader.onload = () => { headerLogoBase64 = reader.result; };
    reader.readAsDataURL(file);
    document.getElementById('headerLogoFileName').textContent = file.name + ' (eredeti)';
  }
});

const footerLogoFile = document.getElementById('footerLogoFile');
let footerLogoBase64 = null, footerLogoFilename = null;
footerLogoFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  document.getElementById('footerLogoFileName').textContent = file ? 'Optimalizálás...' : 'Nincs kiválasztva';
  if (!file) { footerLogoBase64 = null; footerLogoFilename = null; footerLogoOptimized = null; return; }
  footerLogoFilename = file.name;
  const optimized = await optimizeImage(file);
  if (optimized) {
    footerLogoOptimized = optimized;
    footerLogoBase64 = optimized.data;
    document.getElementById('footerLogoFileName').textContent = '✅ ' + optimized.filename + ' (' + (optimized.data.length / 1024).toFixed(0) + ' KB)';
  } else {
    const reader = new FileReader(); reader.onload = () => { footerLogoBase64 = reader.result; };
    reader.readAsDataURL(file);
    document.getElementById('footerLogoFileName').textContent = file.name + ' (eredeti)';
  }
});

/* ---- Hero background image ---- */
const heroBgFile = document.getElementById('heroBgFile');
const heroBgFileName = document.getElementById('heroBgFileName');
let heroBgBase64 = null, heroBgFilename = null, heroBgOptimized = null;

heroBgFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) { heroBgFileName.textContent = 'Nincs kiválasztva'; heroBgBase64 = null; heroBgFilename = null; return; }
  const optimized = await optimizeImage(file);
  if (optimized) {
    heroBgOptimized = optimized;
    heroBgBase64 = optimized.data;
    heroBgFilename = optimized.filename;
    heroBgFileName.textContent = '✅ ' + optimized.filename + ' (' + (optimized.data.length / 1024).toFixed(0) + ' KB)';
  } else {
    heroBgFilename = file.name;
    const reader = new FileReader(); reader.onload = () => { heroBgBase64 = reader.result; };
    reader.readAsDataURL(file);
    heroBgFileName.textContent = file.name + ' (eredeti)';
  }
});

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
const defaultPages = [{ name: 'Kezdőlap', slug: 'home', description: 'Főoldal', subpages: [] }, { name: 'Rólunk', slug: 'about', description: 'Cégbemutató', subpages: [] }, { name: 'Kapcsolat', slug: 'contact', description: 'Elérhetőségek', subpages: [] }];
function escapeHtml(s) { return s.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }
function addSubpageEntry(c, n, s, d) {
  const div = document.createElement('div'); div.className = 'subpage-entry';
  div.innerHTML = `<input type="text" class="subpage-name" placeholder="Aloldal" value="${escapeHtml(n||'')}" style="flex:2;"><input type="text" class="subpage-slug" placeholder="slug" value="${escapeHtml(s||'')}" style="flex:1;"><input type="text" class="subpage-desc" placeholder="Leírás" value="${escapeHtml(d||'')}" style="flex:2;"><button type="button" class="btn btn-del remove-subpage" style="font-size:11px;padding:4px 8px;">✕</button>`;
  div.querySelector('.remove-subpage').addEventListener('click', () => div.remove()); c.appendChild(div);
}
function createPageEntry(pd) {
  const isDefault = !!pd, name = pd ? pd.name : '', slug = pd ? pd.slug : '', desc = pd ? pd.description : '', subpages = pd ? (pd.subpages || []) : [];
  const div = document.createElement('div'); div.className = 'page-entry';
  div.innerHTML = `<div class="page-header"><input type="text" class="page-name" placeholder="Oldal neve" value="${escapeHtml(name)}" style="flex:2;"><input type="text" class="page-slug" placeholder="URL slug" value="${escapeHtml(slug)}" style="flex:1;">${isDefault ? '' : '<button type="button" class="btn btn-del remove-page">✕</button>'}</div><div class="form-group"><label>Tartalom</label><textarea class="page-description" rows="2" placeholder="Leírás...">${escapeHtml(desc)}</textarea></div><div class="subpages-container"></div><button type="button" class="btn btn-sm add-subpage">+ Aloldal</button>`;
  const sc = div.querySelector('.subpages-container'); subpages.forEach(sp => addSubpageEntry(sc, sp.name, sp.slug, sp.description));
  div.querySelector('.add-subpage').addEventListener('click', () => addSubpageEntry(sc, '', '', ''));
  const rb = div.querySelector('.remove-page'); if (rb) rb.addEventListener('click', () => div.remove());
  return div;
}
defaultPages.forEach(p => pagesContainer.appendChild(createPageEntry(p)));
document.getElementById('addPageBtn').addEventListener('click', () => pagesContainer.appendChild(createPageEntry()));

/* ---- Progress ---- */
const progressContainer = document.getElementById('progressContainer'), progressFill = document.getElementById('progressFill'),
  steps = document.querySelectorAll('.step'), downloadBtn = document.getElementById('downloadBtn');
function resetUI() {
  progressContainer.style.display = 'none'; progressFill.className = 'progress-fill'; progressFill.style.width = '0%'; progressFill.style.background = '';
  downloadBtn.style.display = 'none'; downloadBtn.href = '#'; steps.forEach(s => { s.className = 'step'; s.querySelector('.step-icon').textContent = '⏳'; });
}
function setStep(i, t) { const s = steps[i]; if (!s) return; if (t === 'active') { s.className = 'step active'; s.querySelector('.step-icon').textContent = '🔄'; } else if (t === 'done') { s.className = 'step done'; s.querySelector('.step-icon').textContent = '✅'; } else if (t === 'error') { s.className = 'step error'; s.querySelector('.step-icon').textContent = '❌'; } }
function getChecked(sel) { const v = []; document.querySelectorAll(sel + ':checked').forEach(c => v.push(c.value)); return v; }
function getColorOrAi(id, aiId) { return document.getElementById(aiId).checked ? 'ai' : document.getElementById(id).value; }

/* ---- Submit ---- */
const form = document.getElementById('generatorForm'), submitBtn = document.getElementById('submitBtn'),
  responseDiv = document.getElementById('response'), responseContent = document.getElementById('responseContent');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pages = [];
  document.querySelectorAll('.page-entry').forEach(entry => {
    const name = entry.querySelector('.page-name')?.value.trim() || '', slug = entry.querySelector('.page-slug')?.value.trim() || name.toLowerCase().replace(/\s+/g, '_'), desc = entry.querySelector('.page-description')?.value.trim() || '', subpages = [];
    entry.querySelectorAll('.subpage-entry').forEach(sp => {
      const sn = sp.querySelector('.subpage-name')?.value.trim() || '', ss = sp.querySelector('.subpage-slug')?.value.trim() || sn.toLowerCase().replace(/\s+/g, '_'), sd = sp.querySelector('.subpage-desc')?.value.trim() || '';
      if (sn) subpages.push({ name: sn, slug: ss, description: sd });
    });
    pages.push({ name, slug, description: desc, subpages });
  });

  const languages = getChecked('.lang-opt'); if (languages.length === 0) languages.push('hu');
  const logoMode = document.querySelector('input[name="logoMode"]:checked').value;

  const payload = {
    businessName: document.getElementById('businessName').value.trim(),
    projectType: document.getElementById('projectType').value,
    languages: languages,
    description: document.getElementById('description').value.trim(),
    designStyle: document.getElementById('designStyle').value,
    aiModel: document.getElementById('aiModel').value,
    customPrompt: document.getElementById('customPrompt').value.trim(),
    notifyEmail: document.getElementById('notifyEmail').value.trim(),
    logoMode: logoMode,
    logoPrompt: logoMode === 'ai' ? document.getElementById('logoPrompt').value.trim() : '',
    colors: {
      primary: getColorOrAi('primaryColor', 'ai_primary'),
      secondary: getColorOrAi('secondaryColor', 'ai_secondary'),
      accent: getColorOrAi('accentColor', 'ai_accent'),
      headerBg: getColorOrAi('headerBg', 'ai_headerBg')
    },
    headerLogo: (logoMode === 'upload' && headerLogoBase64) ? { filename: headerLogoFilename, data: headerLogoBase64, optimized: !!headerLogoOptimized } : null,
    footerLogo: (logoMode === 'upload' && footerLogoBase64) ? { filename: footerLogoFilename, data: footerLogoBase64, optimized: !!footerLogoOptimized } : null,
    header: getChecked('.header-opt'),
    hero: {
      enabled: document.getElementById('heroEnabled').checked,
      height: parseInt(heroHeight.value),
      bgMode: document.querySelector('input[name="heroBgMode"]:checked').value,
      bgPrompt: document.getElementById('heroBgPrompt').value.trim(),
      bgImage: heroBgBase64 ? { filename: heroBgFilename, data: heroBgBase64, optimized: !!heroBgOptimized } : null
    },
    footer: getChecked('.footer-opt'),
    pages: pages
  };

  resetUI(); responseContent.textContent = ''; responseContent.className = ''; responseDiv.style.display = 'none';
  submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner"></span>Generálás folyamatban...';
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
    setTimeout(() => { progressFill.style.width = '0%'; }, 2000);
  } catch (err) {
    st.forEach(t => clearTimeout(t)); setStep(0, 'done'); setStep(1, 'done'); setStep(2, 'error'); setStep(3, 'error');
    progressFill.className = 'progress-fill'; progressFill.style.background = '#f87171'; progressFill.style.width = '100%';
    responseContent.className = 'status-error'; responseContent.textContent = '❌ HIBA: ' + err.message + '\n\n' + SERVER_BASE;
    responseDiv.style.display = 'block';
  } finally { submitBtn.disabled = false; submitBtn.innerHTML = '⚡ Weboldal generálása AI-val'; }
});
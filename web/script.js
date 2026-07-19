/* ================================================================
   n8n-gravity – Gravity CMS Generátor JavaScript
   ================================================================ */

const SERVER_BASE = window.location.origin;
const WEBHOOK_URL = SERVER_BASE + '/webhook/gravity-generate';
const N8N_URL = 'http://192.168.4.148:5678';
document.getElementById('webhookUrl').textContent = WEBHOOK_URL;

/* ---- Státuszellenőrzés ---- */
const serverStatus = document.getElementById('serverStatus');
const statusDot = document.getElementById('statusDot');

function updateStatus(online) {
  if (online) {
    serverStatus.innerHTML = 'Online ✅ <a href="' + N8N_URL + '" target="_blank" style="color:#4ade80;text-decoration:underline;">(n8n)</a>';
    serverStatus.style.color = '#4ade80';
    statusDot.style.background = '#4ade80';
  } else {
    serverStatus.textContent = 'Offline ❌';
    serverStatus.style.color = '#f87171';
    statusDot.style.background = '#f87171';
  }
}

async function checkServerStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    await fetch('/healthz', { signal: controller.signal });
    clearTimeout(timeoutId);
    updateStatus(true);
  } catch (e) {
    updateStatus(false);
  }
}

checkServerStatus();
setInterval(checkServerStatus, 30000);

/* ---- AI color toggle ---- */
document.querySelectorAll('.ai-check').forEach(cb => {
  cb.addEventListener('change', function () {
    const target = document.getElementById(this.dataset.target);
    if (target) {
      target.disabled = this.checked;
      target.style.opacity = this.checked ? '0.3' : '1';
    }
  });
});

/* ---- Hero szekció ---- */
const heroHeight = document.getElementById('heroHeight');
document.getElementById('heroHeightValue').textContent = heroHeight.value;
heroHeight.addEventListener('input', () => {
  document.getElementById('heroHeightValue').textContent = heroHeight.value;
});

// Hero image toggle
const heroImageEnabled = document.getElementById('heroImageEnabled');
const heroImageGroup = document.getElementById('heroImageGroup');
const heroImageSource = document.getElementById('heroImageSource');
const heroImageUpload = document.getElementById('heroImageUpload');

heroImageEnabled.addEventListener('change', () => {
  heroImageGroup.style.display = heroImageEnabled.checked ? 'block' : 'none';
  heroImageUpload.style.display = heroImageEnabled.checked && heroImageSource.value === 'upload' ? 'flex' : 'none';
});

heroImageSource.addEventListener('change', () => {
  heroImageUpload.style.display = heroImageSource.value === 'upload' ? 'flex' : 'none';
});

// Hero animation toggle
const heroAnimationEnabled = document.getElementById('heroAnimationEnabled');
const heroAnimationGroup = document.getElementById('heroAnimationGroup');

heroAnimationEnabled.addEventListener('change', () => {
  heroAnimationGroup.style.display = heroAnimationEnabled.checked ? 'block' : 'none';
});

/* ---- File uploads ---- */
const heroImageFile = document.getElementById('heroImageFile');
const heroImageFileName = document.getElementById('heroImageFileName');
let heroImageBase64 = null;
let heroImageFilename = null;

heroImageFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) {
    heroImageFileName.textContent = 'Nincs kiválasztva';
    heroImageBase64 = null;
    heroImageFilename = null;
    return;
  }
  heroImageFileName.textContent = file.name;
  heroImageFilename = file.name;
  const reader = new FileReader();
  reader.onload = () => { heroImageBase64 = reader.result; };
  reader.readAsDataURL(file);
});

// Header Logo
const headerLogoFile = document.getElementById('headerLogoFile');
const headerLogoFileName = document.getElementById('headerLogoFileName');
let headerLogoBase64 = null, headerLogoFilename = null;

headerLogoFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) { headerLogoFileName.textContent = 'Nincs kiválasztva'; headerLogoBase64 = null; headerLogoFilename = null; return; }
  headerLogoFileName.textContent = file.name; headerLogoFilename = file.name;
  const reader = new FileReader();
  reader.onload = () => { headerLogoBase64 = reader.result; };
  reader.readAsDataURL(file);
});

// Footer Logo
const footerLogoFile = document.getElementById('footerLogoFile');
const footerLogoFileName = document.getElementById('footerLogoFileName');
let footerLogoBase64 = null, footerLogoFilename = null;

footerLogoFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) { footerLogoFileName.textContent = 'Nincs kiválasztva'; footerLogoBase64 = null; footerLogoFilename = null; return; }
  footerLogoFileName.textContent = file.name; footerLogoFilename = file.name;
  const reader = new FileReader();
  reader.onload = () => { footerLogoBase64 = reader.result; };
  reader.readAsDataURL(file);
});

/* ---- Dinamikus oldalak ---- */
let pageCounter = 0;
const pagesContainer = document.getElementById('pagesContainer');

const defaultPages = [
  { name: 'Kezdőlap', slug: 'home', description: 'Főoldal hero szekcióval, bemutatkozással', subpages: [] },
  { name: 'Rólunk', slug: 'about', description: 'Cégtörténet, csapat', subpages: [] },
  { name: 'Kapcsolat', slug: 'contact', description: 'Kapcsolatfelvételi űrlap, elérhetőségek', subpages: [] }
];

function escapeHtml(str) {
  return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function addSubpageEntry(container, name = '', slug = '', desc = '') {
  const div = document.createElement('div');
  div.className = 'subpage-entry';
  div.innerHTML = `
    <input type="text" class="subpage-name" placeholder="Aloldal neve" value="${escapeHtml(name)}" style="flex:2;">
    <input type="text" class="subpage-slug" placeholder="URL slug" value="${escapeHtml(slug)}" style="flex:1;">
    <input type="text" class="subpage-desc" placeholder="Tartalom leírás" value="${escapeHtml(desc)}" style="flex:2;">
    <button type="button" class="btn btn-del remove-subpage" style="font-size:11px;padding:4px 8px;">✕</button>
  `;
  div.querySelector('.remove-subpage').addEventListener('click', () => div.remove());
  container.appendChild(div);
}

function createPageEntry(pageData = null) {
  const isDefault = !!pageData;
  const name = pageData ? pageData.name : '';
  const slug = pageData ? pageData.slug : '';
  const desc = pageData ? pageData.description : '';
  const subpages = pageData ? (pageData.subpages || []) : [];

  const div = document.createElement('div');
  div.className = 'page-entry';
  div.innerHTML = `
    <div class="page-header">
      <input type="text" class="page-name" placeholder="Oldal neve" value="${escapeHtml(name)}" style="flex:2;">
      <input type="text" class="page-slug" placeholder="URL slug" value="${escapeHtml(slug)}" style="flex:1;">
      ${isDefault ? '' : '<button type="button" class="btn btn-del remove-page">✕</button>'}
    </div>
    <div class="form-group" style="margin-bottom:4px;">
      <label>Oldal tartalma / leírás</label>
      <textarea class="page-description" rows="2" placeholder="Mi jelenjen meg ezen az oldalon?">${escapeHtml(desc)}</textarea>
    </div>
    <div class="subpages-container"></div>
    <button type="button" class="btn btn-sm add-subpage">+ Aloldal</button>
  `;

  const subContainer = div.querySelector('.subpages-container');
  subpages.forEach(sp => addSubpageEntry(subContainer, sp.name, sp.slug, sp.description));
  div.querySelector('.add-subpage').addEventListener('click', () => addSubpageEntry(subContainer, '', '', ''));
  const removeBtn = div.querySelector('.remove-page');
  if (removeBtn) removeBtn.addEventListener('click', () => div.remove());

  return div;
}

defaultPages.forEach(p => pagesContainer.appendChild(createPageEntry(p)));
document.getElementById('addPageBtn').addEventListener('click', () => pagesContainer.appendChild(createPageEntry()));

/* ---- Progress & Steps ---- */
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const steps = document.querySelectorAll('.step');
const downloadBtn = document.getElementById('downloadBtn');

function resetUI() {
  progressContainer.style.display = 'none';
  progressFill.className = 'progress-fill';
  progressFill.style.width = '0%';
  progressFill.style.background = '';
  downloadBtn.style.display = 'none';
  downloadBtn.href = '#';
  steps.forEach(s => { s.className = 'step'; s.querySelector('.step-icon').textContent = '⏳'; });
}

function setStep(index, state) {
  const s = steps[index];
  if (!s) return;
  if (state === 'active') {
    s.className = 'step active';
    s.querySelector('.step-icon').textContent = '🔄';
  } else if (state === 'done') {
    s.className = 'step done';
    s.querySelector('.step-icon').textContent = '✅';
  } else if (state === 'error') {
    s.className = 'step error';
    s.querySelector('.step-icon').textContent = '❌';
  }
}

function getChecked(selector) {
  const vals = [];
  document.querySelectorAll(selector + ':checked').forEach(cb => vals.push(cb.value));
  return vals;
}

function getColorOrAi(id, aiId) {
  return document.getElementById(aiId).checked ? 'ai' : document.getElementById(id).value;
}

/* ---- Submit ---- */
const form = document.getElementById('generatorForm');
const submitBtn = document.getElementById('submitBtn');
const responseDiv = document.getElementById('response');
const responseContent = document.getElementById('responseContent');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Oldalak összegyűjtése
  const pages = [];
  document.querySelectorAll('.page-entry').forEach(entry => {
    const name = entry.querySelector('.page-name')?.value.trim() || '';
    const slug = entry.querySelector('.page-slug')?.value.trim() || name.toLowerCase().replace(/\s+/g, '_');
    const description = entry.querySelector('.page-description')?.value.trim() || '';
    const subpages = [];
    entry.querySelectorAll('.subpage-entry').forEach(sp => {
      const spName = sp.querySelector('.subpage-name')?.value.trim() || '';
      const spSlug = sp.querySelector('.subpage-slug')?.value.trim() || spName.toLowerCase().replace(/\s+/g, '_');
      const spDesc = sp.querySelector('.subpage-desc')?.value.trim() || '';
      if (spName) subpages.push({ name: spName, slug: spSlug, description: spDesc });
    });
    pages.push({ name, slug, description, subpages });
  });

  const payload = {
    businessName: document.getElementById('businessName').value.trim(),
    projectType: document.getElementById('projectType').value,
    language: document.getElementById('language').value,
    description: document.getElementById('description').value.trim(),
    designStyle: document.getElementById('designStyle').value,
    aiModel: document.getElementById('aiModel').value,
    customPrompt: document.getElementById('customPrompt').value.trim(),
    colors: {
      primary: getColorOrAi('primaryColor', 'ai_primary'),
      secondary: getColorOrAi('secondaryColor', 'ai_secondary'),
      text: getColorOrAi('textColor', 'ai_text'),
      accent: getColorOrAi('accentColor', 'ai_accent'),
      headerBg: getColorOrAi('headerBg', 'ai_headerBg'),
      footerBg: getColorOrAi('footerBg', 'ai_footerBg')
    },
    headerLogo: headerLogoBase64 ? { filename: headerLogoFilename, data: headerLogoBase64 } : null,
    footerLogo: footerLogoBase64 ? { filename: footerLogoFilename, data: footerLogoBase64 } : null,
    header: getChecked('.header-opt'),
    hero: {
      enabled: document.getElementById('heroEnabled').checked,
      height: parseInt(heroHeight.value),
      image: heroImageEnabled.checked ? {
        source: heroImageSource.value,
        data: heroImageSource.value === 'upload' && heroImageBase64 ? { filename: heroImageFilename, data: heroImageBase64 } : null
      } : null,
      animation: heroAnimationEnabled.checked ? document.getElementById('heroAnimationType').value : null
    },
    footer: getChecked('.footer-opt'),
    pages: pages
  };

  // UI reset
  resetUI();
  responseContent.textContent = '';
  responseContent.className = '';
  responseDiv.style.display = 'none';

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>Generálás folyamatban...';
  progressContainer.style.display = 'block';
  progressFill.className = 'progress-fill indeterminate';
  setStep(0, 'active');

  const stepTimers = [];
  stepTimers.push(setTimeout(() => { setStep(0, 'done'); setStep(1, 'active'); progressFill.style.width = '25%'; }, 500));
  stepTimers.push(setTimeout(() => { setStep(1, 'done'); setStep(2, 'active'); progressFill.style.width = '50%'; }, 1500));

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    stepTimers.forEach(t => clearTimeout(t));
    setStep(0, 'done');
    setStep(1, 'done');
    setStep(2, 'done');
    setStep(3, 'active');
    progressFill.className = 'progress-fill';
    progressFill.style.width = '75%';

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.message || data.error || `HTTP ${res.status}`);

    setStep(3, 'done');
    progressFill.style.width = '100%';
    responseContent.className = 'status-ok';
    responseContent.textContent = JSON.stringify(data, null, 2);
    responseDiv.style.display = 'block';

    if (data.saved_to) {
      const filename = data.saved_to.split('/').pop();
      downloadBtn.href = '/output/' + filename;
      downloadBtn.textContent = '⬇️ ' + filename + ' letöltése';
      downloadBtn.style.display = 'block';
    }

    setTimeout(() => { progressFill.style.width = '0%'; }, 2000);
  } catch (err) {
    stepTimers.forEach(t => clearTimeout(t));
    setStep(0, 'done');
    setStep(1, 'done');
    setStep(2, 'error');
    setStep(3, 'error');
    progressFill.className = 'progress-fill';
    progressFill.style.background = '#f87171';
    progressFill.style.width = '100%';

    responseContent.className = 'status-error';
    responseContent.textContent = '❌ HIBA: ' + err.message +
      '\n\nEllenőrizd:\n1. Szerver: ' + SERVER_BASE +
      '\n2. Workflow Active?\n3. API kulcs helyes?';
    responseDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '⚡ Weboldal generálása AI-val';
  }
});
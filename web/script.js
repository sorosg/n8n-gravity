/* ================================================================
   n8n-gravity – JavaScript (v1.0.5)
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

/* ---- Logo/Hero mode toggles ---- */
function toggleLogoMode() {
  const m = document.querySelector('input[name="logoMode"]:checked').value;
  document.getElementById('logoUploadGroup').style.display = m === 'upload' ? 'block' : 'none';
  document.getElementById('logoAiGroup').style.display = m === 'ai' ? 'block' : 'none';
}
function toggleHeroBgMode() {
  const m = document.getElementById('heroBgModeSelect').value;
  document.getElementById('heroBgAiPromptGroup').style.display = m === 'ai' ? 'flex' : 'none';
  document.getElementById('heroBgUploadGroup').style.display = m === 'upload' ? 'flex' : 'none';
}

/* ---- Drag & Drop ---- */
function setupDragDrop(zoneId, fileInputId) {
  const zone = document.getElementById(zoneId), fi = document.getElementById(fileInputId);
  if (!zone || !fi) return;
  ['dragenter','dragover','dragleave','drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
  zone.addEventListener('dragover', () => zone.classList.add('drag-over'));
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) { const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); fi.files = dt.files; fi.dispatchEvent(new Event('change')); }
  });
  zone.addEventListener('click', e => { if (e.target !== fi) fi.click(); });
  fi.addEventListener('click', e => e.stopPropagation());
}

/* ---- Képoptimalizálás ---- */
async function optimizeImage(file, maxW=800, quality=0.8, format='image/webp') {
  if (!file) return null;
  return new Promise(resolve => {
    const r = new FileReader(); r.onload = () => {
      const img = new Image(); img.onload = () => {
        let w=img.width, h=img.height;
        if (w>maxW) { h=Math.round(h*maxW/w); w=maxW; }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        const ext=format==='image/webp'?'.webp':format==='image/png'?'.png':'.jpg';
        resolve({data:c.toDataURL(format,quality), filename:file.name.replace(/\.[^.]+$/,ext), original:file.name});
      };
      img.onerror=()=>resolve(null);
      img.src=r.result;
    };
    r.readAsDataURL(file);
  });
}
function handleFileUpload(fiId, fnId, fmtId, cb) {
  const fi=document.getElementById(fiId), fn=document.getElementById(fnId);
  fi.addEventListener('change', async e => {
    const f=e.target.files[0];
    if(!f){fn.textContent='Nincs kiválasztva';cb(null,null);return;}
    const fmt=document.getElementById(fmtId)?.value||'image/webp';
    const opt=await optimizeImage(f,800,0.8,fmt);
    if(opt){fn.textContent='✅ '+opt.filename+' ('+(opt.data.length/1024).toFixed(0)+' KB)';cb(opt.data,opt.filename);}
    else{const r=new FileReader();r.onload=()=>cb(r.result,f.name);r.readAsDataURL(f);fn.textContent=f.name+' (eredeti)';}
  });
}
let hlB64=null,hlFn=null,flB64=null,flFn=null,hbB64=null,hbFn=null;
handleFileUpload('headerLogoFile','headerLogoFileName','logoFormat',(d,n)=>{hlB64=d;hlFn=n;});
handleFileUpload('footerLogoFile','footerLogoFileName','logoFormat',(d,n)=>{flB64=d;flFn=n;});
handleFileUpload('heroBgFile','heroBgFileName','logoFormat',(d,n)=>{hbB64=d;hbFn=n;});
setupDragDrop('headerLogoDrop','headerLogoFile');
setupDragDrop('footerLogoDrop','footerLogoFile');
setupDragDrop('heroBgDrop','heroBgFile');

/* ---- Téma előnézet ---- */
function updatePreview() {
  const p=document.getElementById('primaryColor').value, s=document.getElementById('secondaryColor').value,
    a=document.getElementById('accentColor').value, h=document.getElementById('headerBg').value;
  document.getElementById('previewHeader').style.background=h;
  document.getElementById('previewHeader').style.color=(h==='#ffffff'||h==='#fff')?'#333':'#fff';
  document.getElementById('previewHero').style.background='linear-gradient(135deg, '+p+', '+s+')';
  const btn=document.querySelector('.preview-btn'); if(btn) btn.style.background=a;
}
updatePreview();

/* ---- Hero ---- */
const heroHeight=document.getElementById('heroHeight');
document.getElementById('heroHeightValue').textContent=heroHeight.value;
heroHeight.addEventListener('input',()=>{document.getElementById('heroHeightValue').textContent=heroHeight.value;});

/* ---- Oldalak ---- */
let pc=0; const pcC=document.getElementById('pagesContainer');
const defP=[{name:'Kezdőlap',slug:'home',desc:'Főoldal',mode:'ai',img:0,sub:[]},{name:'Rólunk',slug:'about',desc:'Cégbemutató',mode:'ai',img:0,sub:[]},{name:'Kapcsolat',slug:'contact',desc:'Elérhetőségek',mode:'ai',img:0,sub:[]}];
function esc(s){return s.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');}
function addSub(c,n,s,d){const div=document.createElement('div');div.className='subpage-entry';div.innerHTML=`<input class="sub-name" placeholder="Aloldal" value="${esc(n||'')}" style="flex:2;"><input class="sub-slug" placeholder="slug" value="${esc(s||'')}" style="flex:1;"><input class="sub-desc" placeholder="Leírás" value="${esc(d||'')}" style="flex:2;"><button class="btn btn-del rem-sub" style="font-size:11px;padding:4px 8px;">✕</button>`;div.querySelector('.rem-sub').addEventListener('click',()=>div.remove());c.appendChild(div);}
function createPageEntry(pd){
  const isD=!!pd,name=pd?pd.name:'',slug=pd?pd.slug:'',desc=pd?pd.desc:'',mode=pd?(pd.mode||'ai'):'ai',img=pd?(pd.img||0):0,sub=pd?(pd.sub||[]):[];
  const div=document.createElement('div');div.className='page-entry';
  div.innerHTML=`<div class="page-header"><input class="page-name" placeholder="Oldal neve" value="${esc(name)}" style="flex:2;"><input class="page-slug" placeholder="URL slug" value="${esc(slug)}" style="flex:1;">${isD?'':'<button class="btn btn-del rem-page">✕</button>'}</div><div class="page-content-mode"><label><input type="radio" name="m_${pc}" value="ai" ${mode==='ai'?'checked':''} class="page-mode"> 🧠 AI</label><label><input type="radio" name="m_${pc}" value="manual" ${mode==='manual'?'checked':''} class="page-mode"> ✏️ Saját</label></div><div class="form-row"><div class="form-group full"><textarea class="page-desc" rows="2" placeholder="${mode==='ai'?'Írd le, miről szóljon (AI generál)':'Írd meg a teljes szöveget'}">${esc(desc)}</textarea></div></div><div class="form-row"><div class="form-group half"><label>🖼️ Képek száma</label><input type="number" class="page-img" value="${img}" min="0" max="10"></div></div><div class="sub-container"></div><button class="btn btn-sm add-sub">+ Aloldal</button>`;
  pc++;
  div.querySelectorAll('.page-mode').forEach(r=>r.addEventListener('change',function(){div.querySelector('.page-desc').placeholder=this.value==='ai'?'Írd le, miről szóljon (AI generál)':'Írd meg a teljes szöveget';}));
  const sc=div.querySelector('.sub-container'); sub.forEach(s=>addSub(sc,s.name,s.slug,s.description));
  div.querySelector('.add-sub').addEventListener('click',()=>addSub(sc,'','',''));
  const rb=div.querySelector('.rem-page'); if(rb)rb.addEventListener('click',()=>div.remove());
  return div;
}
try{defP.forEach(p=>pcC.appendChild(createPageEntry(p)));document.getElementById('addPageBtn').addEventListener('click',()=>{try{pcC.appendChild(createPageEntry());}catch(e){alert('Hiba: '+e.message);}});}catch(e){}

/* ---- Log panel ---- */
const LK='n8n_gravity_logs',lP=document.getElementById('logPanel'),lE=document.getElementById('logEntries');
function gL(){try{return JSON.parse(localStorage.getItem(LK)||'[]');}catch(e){return[];}}
function sL(l){if(l.length>200)l=l.slice(-200);localStorage.setItem(LK,JSON.stringify(l));}
function aLE(e){gL().push(e);sL(gL());renderLogs();lP.style.display='block';}
function renderLogs(){
  const l=gL();
  lE.innerHTML=l.length===0?'<span style="color:rgba(255,255,255,0.4);">Nincsenek naplóbejegyzések.</span>':l.reverse().map(x=>{const icon=x.status==='success'?'✅':'❌';const t=new Date(x.time).toLocaleTimeString('hu-HU');let line=`${icon} <strong>${t}</strong> – ${x.business} (${x.type})`;if(x.file)line+=` – <a href="/output/${x.file}" target="_blank" style="color:#4ade80;">📄 ${x.file}</a>`;if(x.message)line+=` – <span style="color:#f87171;">${x.message}</span>`;return`<div>${line}</div>`;}).join('');
  lP.style.display='block';
}
document.getElementById('clearLogsBtn')?.addEventListener('click',()=>{if(confirm('Törlöd?')){localStorage.removeItem(LK);renderLogs();}});
document.getElementById('refreshLogsBtn')?.addEventListener('click',renderLogs);
renderLogs();

/* ---- Dokumentum import / export / mintaadatok ---- */
const docDropZone = document.getElementById('docDropZone');
const docFileInput = document.getElementById('docFileInput');
const docFileName = document.getElementById('docFileName');
const docStatus = document.getElementById('docStatus');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');

// Drag & drop a dokumentum zónához
if (docDropZone && docFileInput) {
  ['dragenter','dragover','dragleave','drop'].forEach(ev => docDropZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
  docDropZone.addEventListener('dragover', () => docDropZone.classList.add('drag-over'));
  docDropZone.addEventListener('dragleave', () => docDropZone.classList.remove('drag-over'));
  docDropZone.addEventListener('drop', e => {
    docDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      docFileInput.files = e.dataTransfer.files;
      docFileInput.dispatchEvent(new Event('change'));
    }
  });
  docDropZone.addEventListener('click', () => docFileInput.click());
  docFileInput.addEventListener('click', e => e.stopPropagation());
}

// Fájl beolvasása és AI elemzés
docFileInput?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  docFileName.textContent = '📄 ' + file.name + ' – elemzés...';
  docStatus.textContent = '⏳ AI feldolgozás folyamatban...';

  const reader = new FileReader();
  reader.onload = async () => {
    const text = reader.result;
    try {
      // API kulcs lekérése
      const apiKey = document.getElementById('apiKeyOverride').value.trim() || 'MISSING';
      if (apiKey === 'MISSING' || !apiKey.startsWith('sk-')) {
        throw new Error('Hiányzó API kulcs! Add meg az API Kulcs felülbírálása mezőben.');
      }

      // AI elemzés a DeepSeek API-n keresztül (nginx proxy)
      const response = await fetch('/deepseek/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: 'You are a form parser. Extract web design project data from the following text. Return ONLY valid JSON with these fields: businessName (string), projectType (one of: landing_page, corporate, blog, portfolio, shop, admin), language (one of: hu, en, de, fr, es, it), description (string), designStyle (one of: modern, minimal, classic, bold, corporate, creative), primaryColor (hex color like #6366f1), secondaryColor (hex color like #8b5cf6), accentColor (hex color like #f59e0b), headerBg (hex color like #ffffff), footerBg (hex color like #1f2937), heroEnabled (boolean), heroHeight (number 300-1000), pages (array of {name, slug, description, mode: "ai"|"manual", imageCount}). If any field is not mentioned, use sensible defaults. No markdown, pure JSON only.' },
            { role: 'user', content: text.substring(0, 8000) }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'API hiba');

      const parsed = JSON.parse(data.choices[0].message.content);

      // Űrlap kitöltése
      fillFormFromData(parsed);
      docFileName.textContent = '✅ ' + file.name + ' – feldolgozva!';
      docStatus.textContent = '✅ Az űrlap kitöltve az AI által elemzett adatokkal. Ellenőrizd és módosítsd, majd generálj!';
    } catch (err) {
      docFileName.textContent = '❌ ' + file.name;
      docStatus.textContent = '❌ Hiba: ' + err.message;
    }
  };
  reader.readAsText(file);
});

// Űrlap adatok kinyerése JSON exportáláshoz
function getFormData() {
  const pages = [];
  document.querySelectorAll('.page-entry').forEach(entry => {
    const name = entry.querySelector('.page-name')?.value.trim() || '';
    const slug = entry.querySelector('.page-slug')?.value.trim() || name.toLowerCase().replace(/\s+/g, '_');
    const desc = entry.querySelector('.page-desc')?.value.trim() || '';
    const img = parseInt(entry.querySelector('.page-img')?.value || 0);
    const modeR = entry.querySelector('.page-mode:checked');
    const mode = modeR ? modeR.value : 'ai';
    const sub = [];
    entry.querySelectorAll('.subpage-entry').forEach(sp => {
      const sn = sp.querySelector('.sub-name')?.value.trim() || '';
      const ss = sp.querySelector('.sub-slug')?.value.trim() || sn.toLowerCase().replace(/\s+/g, '_');
      const sd = sp.querySelector('.sub-desc')?.value.trim() || '';
      if (sn) sub.push({ name: sn, slug: ss, description: sd });
    });
    pages.push({ name, slug, description: desc, mode, imageCount: img, subpages: sub });
  });

  return {
    businessName: document.getElementById('businessName').value.trim(),
    projectType: document.getElementById('projectType').value,
    languages: getChecked('.lang-opt'),
    description: document.getElementById('description').value.trim(),
    designStyle: document.getElementById('designStyle').value,
    aiModel: document.getElementById('aiModel').value,
    customPrompt: document.getElementById('customPrompt').value.trim(),
    notifyEmail: document.getElementById('notifyEmail').value.trim(),
    logoMode: document.querySelector('input[name="logoMode"]:checked')?.value || 'upload',
    colors: {
      primary: document.getElementById('primaryColor').value,
      secondary: document.getElementById('secondaryColor').value,
      accent: document.getElementById('accentColor').value,
      headerBg: document.getElementById('headerBg').value,
      footerBg: document.getElementById('footerBg').value
    },
    heroEnabled: document.getElementById('heroEnabled').checked,
    heroHeight: parseInt(document.getElementById('heroHeight').value),
    heroBgMode: document.getElementById('heroBgModeSelect').value,
    pages: pages
  };
}

// Űrlap kitöltése adatokból (AI elemzés vagy JSON import után)
function fillFormFromData(data) {
  if (data.businessName) document.getElementById('businessName').value = data.businessName;
  if (data.projectType) document.getElementById('projectType').value = data.projectType;
  if (data.description) document.getElementById('description').value = data.description;
  if (data.designStyle) document.getElementById('designStyle').value = data.designStyle;
  if (data.aiModel) document.getElementById('aiModel').value = data.aiModel;
  if (data.customPrompt) document.getElementById('customPrompt').value = data.customPrompt;
  if (data.notifyEmail) document.getElementById('notifyEmail').value = data.notifyEmail;
  if (data.logoMode) {
    const radio = document.querySelector(`input[name="logoMode"][value="${data.logoMode}"]`);
    if (radio) { radio.checked = true; toggleLogoMode(); }
  }
  if (data.colors) {
    if (data.colors.primary) document.getElementById('primaryColor').value = data.colors.primary;
    if (data.colors.secondary) document.getElementById('secondaryColor').value = data.colors.secondary;
    if (data.colors.accent) document.getElementById('accentColor').value = data.colors.accent;
    if (data.colors.headerBg) document.getElementById('headerBg').value = data.colors.headerBg;
    if (data.colors.footerBg) document.getElementById('footerBg').value = data.colors.footerBg;
  }
  if (data.heroEnabled !== undefined) document.getElementById('heroEnabled').checked = data.heroEnabled;
  if (data.heroHeight) { document.getElementById('heroHeight').value = data.heroHeight; document.getElementById('heroHeightValue').textContent = data.heroHeight; }
  if (data.heroBgMode) { document.getElementById('heroBgModeSelect').value = data.heroBgMode; toggleHeroBgMode(); }

  // Oldalak frissítése
  if (data.pages && Array.isArray(data.pages)) {
    // Meglévő oldalak törlése
    document.querySelectorAll('.page-entry').forEach(el => el.remove());
    // Új oldalak hozzáadása
    data.pages.forEach(p => {
      try {
        pagesContainer.appendChild(createPageEntry({
          name: p.name || '', slug: p.slug || '', desc: p.description || '',
          mode: p.mode || 'ai', img: p.imageCount || 0, sub: p.subpages || []
        }));
      } catch (e) {}
    });
  }

  updatePreview();
}

// JSON export
exportJsonBtn?.addEventListener('click', () => {
  const data = getFormData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.businessName || 'urlap') + '_export.json';
  a.click();
  URL.revokeObjectURL(url);
  docStatus.textContent = '✅ Űrlap letöltve JSON-ként!';
});

// Mintaadatok betöltése
loadSampleBtn?.addEventListener('click', () => {
  const sample = {
    businessName: 'Digitális Megoldások Kft.',
    projectType: 'landing_page',
    languages: ['hu'],
    description: 'Professzionális webfejlesztő és digitális marketing ügynökség. 10 év tapasztalat, több mint 100 elégedett ügyfél. Szolgáltatásaink: egyedi weboldalak, webshopok, SEO optimalizálás, online marketing.',
    designStyle: 'modern',
    aiModel: 'deepseek-v4-flash',
    customPrompt: 'Legyen professzionális, letisztult design. Használj modern tipográfiát.',
    logoMode: 'ai',
    colors: { primary: '#2563eb', secondary: '#1e40af', accent: '#f59e0b', headerBg: '#ffffff', footerBg: '#1e293b' },
    heroEnabled: true,
    heroHeight: 600,
    heroBgMode: 'none',
    pages: [
      { name: 'Kezdőlap', slug: 'home', description: 'Főoldal hero szekcióval, szolgáltatások bemutatása, referenciák, ügyfélvélemények', mode: 'ai', imageCount: 3, subpages: [] },
      { name: 'Szolgáltatások', slug: 'services', description: 'Részletes szolgáltatás leírások: webfejlesztés, SEO, marketing', mode: 'ai', imageCount: 2, subpages: [
        { name: 'Webfejlesztés', slug: 'web', description: 'Egyedi weboldalak és webshopok fejlesztése' },
        { name: 'SEO', slug: 'seo', description: 'Keresőoptimalizálás és tartalommarketing' }
      ]},
      { name: 'Kapcsolat', slug: 'contact', description: 'Kapcsolatfelvételi űrlap, elérhetőségek, térkép', mode: 'ai', imageCount: 0, subpages: [] }
    ]
  };

  fillFormFromData(sample);
  docStatus.textContent = '✅ Mintaadatok betöltve! Ellenőrizd és módosítsd, majd generálj!';
  updatePreview();
});

// A projektválasztó és Gravity CMS előnézet átkerült a preview.html oldalra

/* ---- Statikus HTML előnézet generálása ---- */
function renderStaticPreview(data) {
  const container = document.getElementById('staticPreview') || (() => {
    const div = document.createElement('div');
    div.id = 'staticPreview';
    div.style.cssText = 'margin-top:20px;padding:0;background:#fff;border-radius:14px;overflow:hidden;color:#111;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.4);';
    document.querySelector('.container').appendChild(div);
    return div;
  })();
  
  if (!data || !data.generated || !data.generated.pages) {
    container.innerHTML = '<div style="padding:20px;color:#666;">Nincs előnézhető tartalom.</div>';
    return;
  }

  const gen = data.generated;
  const cfg = gen.config || {};
  const theme = cfg.theme || {};
  const colors = theme.colors || { primary: '#6366f1', secondary: '#8b5cf6', accent: '#f59e0b', text: '#1f2937' };
  const home = gen.pages.home || gen.pages[Object.keys(gen.pages)[0]] || {};
  const hero = (home.content && home.content.hero) || {};

  let html = `<div style="background:${colors.primary||'#6366f1'};color:#fff;padding:14px 24px;display:flex;align-items:center;gap:12px;font-weight:700;">`;
  html += `<span>🏠 ${cfg.system?.site_name || 'Weboldal'}</span>`;
  html += `<nav style="margin-left:auto;display:flex;gap:16px;font-size:14px;font-weight:400;">`;
  Object.keys(gen.pages).forEach(s => { if (s !== 'home') html += `<a href="#" style="color:rgba(255,255,255,0.8);text-decoration:none;">${gen.pages[s].title || s}</a>`; });
  html += `</nav></div>`;

  if (hero.title) {
    html += `<div style="background:linear-gradient(135deg, ${colors.primary||'#6366f1'}, ${colors.secondary||'#8b5cf6'});color:#fff;padding:60px 24px;text-align:center;">`;
    html += `<h1 style="font-size:36px;margin:0 0 10px;font-weight:800;">${hero.title}</h1>`;
    if (hero.subtitle) html += `<p style="font-size:18px;opacity:0.9;margin:0 0 16px;">${hero.subtitle}</p>`;
    if (hero.cta_text) html += `<button style="padding:12px 32px;background:${colors.accent||'#f59e0b'};color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;">${hero.cta_text}</button>`;
    html += `</div>`;
  }

  if (home.content && home.content.sections) {
    home.content.sections.forEach(sec => {
      html += `<div style="padding:30px 24px;max-width:800px;margin:0 auto;">`;
      html += `<h2 style="color:${colors.primary||'#6366f1'};font-size:22px;margin:0 0 10px;">${sec.title || ''}</h2>`;
      html += `<p style="color:${colors.text||'#1f2937'};line-height:1.7;">${sec.content || ''}</p>`;
      html += `</div>`;
    });
  }

  html += `<footer style="background:${colors.footerBg||'#1f2937'};color:rgba(255,255,255,0.6);padding:20px 24px;text-align:center;font-size:13px;">© ${cfg.system?.site_name || 'Weboldal'} – AI generált előnézet</footer>`;
  
  container.innerHTML = html;
  container.scrollIntoView({ behavior: 'smooth' });
}

/* ---- Progress ---- */
const prC=document.getElementById('progressContainer'),prF=document.getElementById('progressFill'),st=document.querySelectorAll('.step'),dB=document.getElementById('downloadBtn');
function rUI(){prC.style.display='none';prF.className='progress-fill';prF.style.width='0%';prF.style.background='';dB.style.display='none';dB.href='#';st.forEach(s=>{s.className='step';s.querySelector('.step-icon').textContent='⏳';});}
function sSt(i,t){const s=st[i];if(!s)return;if(t==='active'){s.className='step active';s.querySelector('.step-icon').textContent='🔄';}else if(t==='done'){s.className='step done';s.querySelector('.step-icon').textContent='✅';}else if(t==='error'){s.className='step error';s.querySelector('.step-icon').textContent='❌';}}
function gCk(s){const v=[];document.querySelectorAll(s+':checked').forEach(c=>v.push(c.value));return v;}
function gCAi(id,aiId){return document.getElementById(aiId).checked?'ai':document.getElementById(id).value;}

/* ---- Submit ---- */
const frm=document.getElementById('generatorForm'),sB=document.getElementById('submitBtn'),rD=document.getElementById('response'),rC=document.getElementById('responseContent');
frm.addEventListener('submit',async e=>{
  e.preventDefault();
  const pages=[];
  document.querySelectorAll('.page-entry').forEach(entry=>{
    const name=entry.querySelector('.page-name')?.value.trim()||'',slug=entry.querySelector('.page-slug')?.value.trim()||name.toLowerCase().replace(/\s+/g,'_'),desc=entry.querySelector('.page-desc')?.value.trim()||'',img=parseInt(entry.querySelector('.page-img')?.value||0);
    const modeR=entry.querySelector('.page-mode:checked'),mode=modeR?modeR.value:'ai';
    const sub=[];
    entry.querySelectorAll('.subpage-entry').forEach(sp=>{const sn=sp.querySelector('.sub-name')?.value.trim()||'',ss=sp.querySelector('.sub-slug')?.value.trim()||sn.toLowerCase().replace(/\s+/g,'_'),sd=sp.querySelector('.sub-desc')?.value.trim()||'';if(sn)sub.push({name:sn,slug:ss,description:sd});});
    pages.push({name,slug,description:desc,mode,imageCount:img,subpages:sub});
  });
  const langs=gCk('.lang-opt');if(langs.length===0)langs.push('hu');
  const logoMode=document.querySelector('input[name="logoMode"]:checked').value;
  const payload={
    businessName:document.getElementById('businessName').value.trim(),
    projectType:document.getElementById('projectType').value,
    languages:langs,description:document.getElementById('description').value.trim(),
    designStyle:document.getElementById('designStyle').value,
    apiKeyOverride:document.getElementById('apiKeyOverride').value.trim(),
    aiModel:document.getElementById('aiModel').value,
    customPrompt:document.getElementById('customPrompt').value.trim(),
    notifyEmail:document.getElementById('notifyEmail').value.trim(),
    logoMode,logoPrompt:logoMode==='ai'?document.getElementById('logoPrompt').value.trim():'',
    colors:{primary:gCAi('primaryColor','ai_primary'),secondary:gCAi('secondaryColor','ai_secondary'),accent:gCAi('accentColor','ai_accent'),headerBg:gCAi('headerBg','ai_headerBg'),footerBg:gCAi('footerBg','ai_footerBg')},
    headerLogo:(logoMode==='upload'&&hlB64)?{filename:hlFn,data:hlB64}:null,
    footerLogo:(logoMode==='upload'&&flB64)?{filename:flFn,data:flB64}:null,
    header:gCk('.header-opt'),
    hero:{enabled:document.getElementById('heroEnabled').checked,height:parseInt(heroHeight.value),bgMode:document.getElementById('heroBgModeSelect').value,bgPrompt:document.getElementById('heroBgPrompt').value.trim(),bgImage:hbB64?{filename:hbFn,data:hbB64}:null,bgCount:parseInt(document.getElementById('heroBgCount')?.value||1)},
    footer:gCk('.footer-opt'),pages
  };
  rUI();rC.textContent='';rC.className='';rD.style.display='none';
  sB.disabled=true;sB.innerHTML='<span class="spinner"></span>Generálás...';
  prC.style.display='block';prF.className='progress-fill indeterminate';sSt(0,'active');
  const stm=[];stm.push(setTimeout(()=>{sSt(0,'done');sSt(1,'active');prF.style.width='25%';},500));
  try{
    const res=await fetch(WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    stm.forEach(t=>clearTimeout(t));sSt(0,'done');sSt(1,'done');sSt(2,'active');sSt(3,'active');prF.className='progress-fill';prF.style.width='75%';
    const data=await res.json();
    if(!res.ok||data.error)throw new Error(data.message||data.error||`HTTP ${res.status}`);
    sSt(2,'done');sSt(3,'done');prF.style.width='100%';
    rC.className='status-ok';rC.textContent=JSON.stringify(data,null,2);rD.style.display='block';
    if(data.saved_to){const fn=data.saved_to.split('/').pop();dB.href='/output/'+fn;dB.textContent='⬇️ '+fn+' letöltése';dB.style.display='block';}
    aLE({time:new Date().toISOString(),business:payload.businessName,type:payload.projectType,status:'success',file:data.saved_to?data.saved_to.split('/').pop():null});
    // Statikus HTML előnézet
    renderStaticPreview(data);
    setTimeout(()=>{prF.style.width='0%';},2000);
  }catch(err){
    aLE({time:new Date().toISOString(),business:payload?payload.businessName:'?',type:payload?payload.projectType:'?',status:'error',message:err.message});
    stm.forEach(t=>clearTimeout(t));sSt(0,'done');sSt(1,'done');sSt(2,'error');sSt(3,'error');prF.className='progress-fill';prF.style.background='#f87171';prF.style.width='100%';
    rC.className='status-error';rC.textContent='❌ HIBA: '+err.message+'\n\n'+SERVER_BASE;rD.style.display='block';
  }finally{sB.disabled=false;sB.innerHTML='⚡ Weboldal generálása AI-val';}
});
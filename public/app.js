// Pipeline-ul echipei: citește cererile din /api/leads, calculează scorul și le afișează pe etape.
const STAGES=[{id:'nou',t:'Nou'},{id:'apel',t:'Apel'},{id:'intalnire',t:'Întâlnire'},{id:'contract',t:'Contract'},{id:'achitat',t:'Achitat'},{id:'respins',t:'Respins'}];
const SOURCES=[['site','Site'],['manual','Manual (apel, întâlnire)'],['telegram','Telegram'],['vizitka','Carte de vizită'],['facebook','Facebook'],['instagram','Instagram'],['telefon','Telefon'],['email','Email'],['altul','Altă sursă']];
// La adăugarea manuală se pot alege doar aceste surse (Site, Telegram și Vizitka se pun automat).
const MANUAL_SOURCES=SOURCES.filter(([v])=>['manual','facebook','instagram','telefon','email','altul'].includes(v));
const PKG={start:'Start',standard:'Standard',premium:'Premium'};
const stageName=id=>STAGES.find(s=>s.id===id)?.t||id;
const BUDGET={lt10:{t:'Sub 10.000 €',p:0},mid:{t:'10.000 – 25.000 €',p:30},gt25:{t:'Peste 25.000 €',p:40}};
const SPACE={own:{t:'Are spațiu (propriu/închiriat)',s:'Are spațiu',p:20},searching:{t:'Caută spațiu',s:'Caută spațiu',p:10},none:{t:'Nu are spațiu',s:'Fără spațiu',p:0}};
const TIME={m1:{t:'În maxim 1 lună',s:'≤1 lună',p:15},m3:{t:'În 1–3 luni',s:'1–3 luni',p:10},m6:{t:'În 3–6 luni',s:'3–6 luni',p:5},later:{t:'Peste 6 luni / nu știe',s:'>6 luni',p:0}};
const STATUS_OF={nou:'nouă',apel:'în lucru',intalnire:'în lucru',contract:'în lucru',achitat:'închisă',respins:'închisă'};
const ST_CLASS={'nouă':'s-noua','în lucru':'s-lucru','închisă':'s-inchisa'};
const ST_LABEL={'nouă':'Nouă','în lucru':'În lucru','închisă':'Închisă'};
const statusOf=l=>STATUS_OF[l.stage||'nou']||'nouă';
const stPill=st=>`<span class="st ${ST_CLASS[st]}">${ST_LABEL[st]}</span>`;
let view='board';
try{if(localStorage.getItem('pt_view')==='list')view='list'}catch{}
const CITY_PTS={high:25,med:15,low:5};
const CAT_LABEL={hot:'Fierbinte',warm:'Cald',cold:'Rece',off:'Sub prag'};

let leads=[], cities={high:[],med:[]}, editingId=null, busy=false, loaded=false;
const $=id=>document.getElementById(id);
const norm=s=>(s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const esc=s=>(s??'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- API ----------
async function api(path,opts={}){
  const res=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opts});
  if(res.status===401){location.href='/login';throw new Error('401')}
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||'Eroare de server');
  return data;
}
async function load(){
  try{
    const [l,c]=await Promise.all([api('/api/leads'),api('/api/config')]);
    leads=l.leads||[]; cities=c.cities||cities; loaded=true; notice('');
    updateCityList(); render();
  }catch(e){ if(e.message!=='401') notice('Nu s-au putut încărca cererile: '+e.message) }
}

// ---------- scor ----------
function cityLevel(city){
  const c=norm(city); if(!c) return 'low';
  if((cities.high||[]).some(x=>norm(x)===c)) return 'high';
  if((cities.med||[]).some(x=>norm(x)===c)) return 'med';
  return 'low';
}
function scoreOf(l){
  const b=BUDGET[l.budget]?.p??0, s=SPACE[l.space]?.p??0, t=TIME[l.timeline]?.p??0, c=CITY_PTS[cityLevel(l.city)];
  const total=b+s+t+c;
  const cat=l.budget==='lt10'?'off':total>=70?'hot':total>=45?'warm':'cold';
  return {total,cat,parts:{b,c,s,t}};
}

// ---------- elemente statice ----------
function fillSelect(el,pairs){el.innerHTML=pairs.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('')}
SOURCES.forEach(([v,t])=>$('fsrc').insertAdjacentHTML('beforeend',`<option value="${v}">${esc(t)}</option>`));
fillSelect($('f_budget'),[['','Alege…'],...Object.entries(BUDGET).map(([k,v])=>[k,v.t])]);
fillSelect($('f_space'),[['','Alege…'],...Object.entries(SPACE).map(([k,v])=>[k,v.t])]);
fillSelect($('f_time'),[['','Alege…'],...Object.entries(TIME).map(([k,v])=>[k,v.t])]);
$('f_stage').innerHTML=['nouă','în lucru','închisă'].map(st=>`<optgroup label="${ST_LABEL[st]}">${STAGES.filter(s=>STATUS_OF[s.id]===st).map(s=>`<option value="${s.id}">${ST_LABEL[st]} · ${s.t}</option>`).join('')}</optgroup>`).join('');
const row=(a,b)=>`<tr><td>${esc(a)}</td><td>${b}</td></tr>`, note=t=>`<tr><td class="note" colspan="2">${esc(t)}</td></tr>`;
$('tBudget').innerHTML=Object.values(BUDGET).map(v=>row(v.t,v.p)).join('')+note('Sub 10.000 € = marcat „Sub prag”, oricare ar fi scorul');
$('tCity').innerHTML=row('Prioritate mare',25)+row('Prioritate medie',15)+row('Alte localități / diaspora',5)+note('Listele se schimbă din „Priorități orașe”');
$('tSpace').innerHTML=Object.values(SPACE).map(v=>row(v.t,v.p)).join('')+Object.values(TIME).map(v=>row(v.t,v.p)).join('')+note('Fierbinte 70+ · Cald 45–69 · Rece sub 45');
$('formLinks').innerHTML=[['site','Pe site'],['facebook','Facebook'],['instagram','Instagram']].map(([s,t])=>{
  const u=location.origin+'/aplica'+(s==='site'?'':'?src='+s);
  return `<div><span class="chip">${t}</span> <code>${esc(u)}</code></div>`;
}).join('');
const Q_TEXT=`1. Nume și prenume
2. Număr de telefon
3. Email
4. În ce oraș / localitate doriți să deschideți agenția?
5. Ce buget aveți disponibil pentru investiție?
   ○ Sub 10.000 €   ○ 10.000 – 25.000 €   ○ Peste 25.000 €
6. Aveți un spațiu pentru oficiu?
   ○ Da, propriu sau închiriat   ○ Caut spațiu   ○ Nu
7. Când doriți să deschideți agenția?
   ○ În maxim 1 lună   ○ În 1–3 luni   ○ În 3–6 luni   ○ Peste 6 luni
8. Aveți experiență în turism, vânzări sau business propriu?`;
$('qText').textContent=Q_TEXT;
$('btnCopyQ').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(Q_TEXT);toast('Întrebările au fost copiate')}
  catch{const r=document.createRange();r.selectNodeContents($('qText'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Textul e selectat, apasă Ctrl/Cmd+C')}
});
function updateCityList(){
  $('cityList').innerHTML=[...(cities.high||[]),...(cities.med||[])].map(c=>`<option value="${esc(c)}"></option>`).join('');
}

// ---------- afișare ----------
function withScore(){return leads.map(l=>({...l,_s:scoreOf(l)}))}
function filtered(){
  const q=norm($('fq').value), src=$('fsrc').value, cat=$('fcat').value, st=$('fstatus').value;
  return withScore().filter(l=>{
    if(st&&statusOf(l)!==st) return false;
    if(src&&l.source!==src) return false;
    if(cat&&l._s.cat!==cat) return false;
    if(q&&![l.name,l.phone,l.email,l.city,l.notes,l.comment,l.company].some(v=>norm(v).includes(q))) return false;
    return true;
  });
}
function fmtDateTime(iso){try{return new Date(iso).toLocaleString('ro-RO',{timeZone:'Europe/Chisinau',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return ''}}
function fmtDate(iso){try{return new Date(iso).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'})}catch{return ''}}

function render(){
  const all=withScore(), active=all.filter(l=>l.stage!=='respins');
  const cnt=k=>active.filter(l=>l._s.cat===k).length;
  $('stats').innerHTML=`
    <div class="stat"><b>${all.length}</b><span>cereri în total</span></div>
    <div class="stat hot"><b>${cnt('hot')}</b><span>fierbinți, active</span></div>
    <div class="stat warm"><b>${cnt('warm')}</b><span>calde, active</span></div>
    <div class="stat cold"><b>${cnt('cold')}</b><span>reci, active</span></div>
    <div class="stat"><b>${all.filter(l=>l.stage==='contract').length}</b><span>la contract</span></div>
    <div class="stat paid"><b>${all.filter(l=>l.stage==='achitat').length}</b><span>achitate</span></div>`;
  $('boardWrap').hidden=view!=='board'; $('listWrap').hidden=view!=='list';
  document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.view===view));
  if(view==='list') return renderList();
  const board=$('board');
  if(!leads.length){
    board.innerHTML=STAGES.map(s=>`<div class="col" data-stage="${s.id}"><h2>${s.t}<em>0</em></h2></div>`).join('')+
      `<div class="big-empty"><strong>${loaded?'Nicio cerere încă':'Se încarcă cererile…'}</strong>${loaded?'Cererile din formularul public apar aici automat. Pe cele venite prin telefon, Facebook sau Instagram le adaugi cu „+ Cerere nouă”.':''}</div>`;
    bindDrops(); return;
  }
  const list=filtered();
  board.innerHTML=STAGES.map(s=>{
    const items=list.filter(l=>(l.stage||'nou')===s.id).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    return `<div class="col" data-stage="${s.id}"><h2>${s.t}<em>${items.length}</em></h2>${items.length?items.map(cardHTML).join(''):'<div class="empty">Nimic aici</div>'}</div>`;
  }).join('');
  board.querySelectorAll('.card').forEach(c=>{
    c.addEventListener('click',()=>openLead(c.dataset.id));
    c.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',c.dataset.id);e.dataTransfer.effectAllowed='move'});
  });
  bindDrops();
}
function renderList(){
  const list=filtered().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  const wrap=$('listWrap');
  if(!list.length){wrap.innerHTML=`<div class="list-empty">${loaded?(leads.length?'Nicio cerere pentru filtrele alese':'Nicio cerere încă'):'Se încarcă cererile…'}</div>`;return}
  wrap.innerHTML=`<table class="ltable"><thead><tr><th>Primită</th><th>Nume</th><th>Telefon</th><th>Oraș</th><th>Comentariu</th><th>Status</th><th>Scor</th></tr></thead><tbody>${list.map(l=>`
    <tr data-id="${esc(l.id)}" tabindex="0">
      <td class="when">${fmtDateTime(l.createdAt)}</td>
      <td class="nm">${esc(l.name)}</td>
      <td>${esc(l.phone)}</td>
      <td>${esc(l.city||'—')}</td>
      <td><div class="cm">${esc(l.comment||'')}</div></td>
      <td>${stPill(statusOf(l))} <small>${esc(STAGES.find(s=>s.id===(l.stage||'nou'))?.t||'')}</small></td>
      <td><span class="pill ${l._s.cat}">${l._s.total}</span></td>
    </tr>`).join('')}</tbody></table>`;
  wrap.querySelectorAll('tr[data-id]').forEach(r=>{
    r.addEventListener('click',()=>openLead(r.dataset.id));
    r.addEventListener('keydown',e=>{if(e.key==='Enter')openLead(r.dataset.id)});
  });
}
document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;try{localStorage.setItem('pt_view',view)}catch{};render()}));
function cardHTML(l){
  const s=l._s, src=(SOURCES.find(x=>x[0]===l.source)||[,''])[1];
  return `<button type="button" class="card ${s.cat}" draggable="true" data-id="${esc(l.id)}">
    <div class="top"><span class="name">${esc(l.name)}</span><span class="score">${s.total}<small>/100</small></span></div>
    <div><span class="pill ${s.cat}">${CAT_LABEL[s.cat]}</span> ${stPill(statusOf(l))}</div>
    <div class="meta"><span>${esc(l.city||'—')}</span><span>${esc(l.phone||'')}</span></div>
    <div class="chips">${[l.company,PKG[l.package]&&'Pachet '+PKG[l.package],BUDGET[l.budget]?.t,SPACE[l.space]?.s,TIME[l.timeline]?.s].filter(Boolean).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>
    <div class="meta"><span class="src src-${esc(l.source)}">${esc(src)}</span><span>${fmtDateTime(l.createdAt)}</span></div>
  </button>`;
}
function bindDrops(){
  $('board').querySelectorAll('.col').forEach(col=>{
    col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drop')});
    col.addEventListener('dragleave',()=>col.classList.remove('drop'));
    col.addEventListener('drop',e=>{e.preventDefault();col.classList.remove('drop');const id=e.dataTransfer.getData('text/plain');if(id)moveStage(id,col.dataset.stage)});
  });
}
['fq','fsrc','fcat','fstatus'].forEach(id=>$(id).addEventListener('input',render));

// ---------- dialog cerere ----------
function formVal(){return{name:$('f_name').value.trim(),phone:$('f_phone').value.trim(),email:$('f_email').value.trim(),source:$('f_source').value,company:$('f_company').value.trim(),package:$('f_package').value,city:$('f_city').value.trim(),budget:$('f_budget').value,space:$('f_space').value,timeline:$('f_time').value,experience:$('f_exp').value,stage:$('f_stage').value,notes:$('f_notes').value.trim()}}
function updateLive(){
  const v=formVal(), s=scoreOf(v);
  const lvl={high:'prioritate mare',med:'prioritate medie',low:'prioritate mică'}[cityLevel(v.city)];
  $('liveScore').innerHTML=`<strong class="score">${s.total}/100</strong><span class="pill ${s.cat}">${CAT_LABEL[s.cat]}</span>
    <span class="parts">buget ${s.parts.b} · oraș ${s.parts.c} (${lvl}) · spațiu ${s.parts.s} · termen ${s.parts.t}</span>`;
}
$('leadForm').addEventListener('input',updateLive);
function openLead(id){
  editingId=id||null; const l=id?leads.find(x=>x.id===id):null;
  $('dlgTitle').textContent=l?'Cerere: '+l.name:'Cerere nouă';
  $('f_name').value=l?.name||''; $('f_phone').value=l?.phone||''; $('f_email').value=l?.email||'';
  fillSelect($('f_source'),l?SOURCES:MANUAL_SOURCES); $('f_source').value=l?.source||'manual'; $('f_source').disabled=!!l;
  $('f_company').value=l?.company||''; $('f_package').value=l?.package||''; $('f_city').value=l?.city||''; $('f_budget').value=l?.budget||'';
  $('f_space').value=l?.space||''; $('f_time').value=l?.timeline||''; $('f_exp').value=l?.experience||'';
  $('f_stage').value=l?.stage||'nou'; $('f_notes').value=l?.notes||'';
  $('f_comment').textContent=l?.comment||''; $('f_commentBox').hidden=!l?.comment;
  if(l) $('dlgTitle').textContent='Client: '+l.name;
  else $('dlgTitle').textContent='Client nou (adăugat manual)';
  renderInfo(l);
  $('btnDelete').hidden=!l; $('btnDelete').classList.remove('armed'); $('btnDelete').textContent='Șterge';
  $('formErr').hidden=true; updateLive(); $('dlgLead').showModal();
}
$('btnAdd').addEventListener('click',()=>openLead(null));
$('btnCancel').addEventListener('click',()=>$('dlgLead').close());
$('leadForm').addEventListener('submit',async e=>{
  e.preventDefault(); if(busy) return;
  const v=formVal(), miss=[];
  if(!v.name)miss.push('nume'); if(!v.phone)miss.push('telefon');
  if(miss.length){$('formErr').textContent='Completează: '+miss.join(', ')+'.';$('formErr').hidden=false;return}
  busy=true; $('btnSave').disabled=true;
  try{
    if(editingId) await api('/api/leads?id='+encodeURIComponent(editingId),{method:'PUT',body:JSON.stringify(v)});
    else await api('/api/leads',{method:'POST',body:JSON.stringify(v)});
    $('dlgLead').close(); toast(editingId?'Clientul a fost actualizat':'Clientul a fost adăugat în „Nou”'); await load();
  }catch(err){$('formErr').textContent=err.message;$('formErr').hidden=false}
  finally{busy=false;$('btnSave').disabled=false}
});
$('btnDelete').addEventListener('click',async()=>{
  const b=$('btnDelete');
  if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmă ștergerea';return}
  try{await api('/api/leads?id='+encodeURIComponent(editingId),{method:'DELETE'});$('dlgLead').close();toast('Cererea a fost ștearsă');await load()}
  catch(err){$('formErr').textContent=err.message;$('formErr').hidden=false}
});
// Fișa clientului: sursa, data creării, documentul original și istoria etapelor cu date.
function renderInfo(l){
  const box=$('f_info');
  if(!l){box.hidden=true;box.innerHTML='';return}
  const src=(SOURCES.find(x=>x[0]===l.source)||[,l.source])[1];
  const hist=(l.history&&l.history.length?l.history:[{stage:l.stage,at:l.createdAt}]);
  box.innerHTML=`<div class="info-row"><span><b>Sursa:</b> <span class="src src-${esc(l.source)}">${esc(src)}</span></span><span><b>Creat:</b> ${fmtDateTime(l.createdAt)}</span>
      ${l.docPath?`<a class="btn small" href="/api/doc?id=${encodeURIComponent(l.id)}" target="_blank" rel="noopener">Deschide originalul documentului</a>`:''}</div>
    <b>Istoria etapelor</b>
    <ol class="hist">${hist.map((h,i)=>`<li><span class="hs">${i?'→ ':''}${esc(stageName(h.stage))}</span><time>${fmtDateTime(h.at)}</time></li>`).join('')}</ol>`;
  box.hidden=false;
}
async function moveStage(id,stage){
  const l=leads.find(x=>x.id===id); if(!l||l.stage===stage) return;
  const prev=l.stage; l.stage=stage; render();
  try{const r=await api('/api/leads?id='+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({stage})});Object.assign(l,r.lead);render();toast(`${l.name} → ${STAGES.find(s=>s.id===stage).t} (${ST_LABEL[STATUS_OF[stage]]})`)}
  catch(err){l.stage=prev;render();toast('Nu s-a putut muta: '+err.message)}
}

// ---------- dialog orașe ----------
$('btnCities').addEventListener('click',()=>{$('c_high').value=(cities.high||[]).join('\n');$('c_med').value=(cities.med||[]).join('\n');$('dlgCities').showModal()});
$('btnCityCancel').addEventListener('click',()=>$('dlgCities').close());
$('cityForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const split=s=>s.split(/[\n,;]/).map(x=>x.trim()).filter(Boolean);
  try{const r=await api('/api/config',{method:'PUT',body:JSON.stringify({high:split($('c_high').value),med:split($('c_med').value)})});
    cities=r.cities; updateCityList(); render(); $('dlgCities').close(); toast('Prioritățile au fost salvate')}
  catch(err){toast('Nu s-au putut salva: '+err.message)}
});

// ---------- diverse ----------
$('btnLogout').addEventListener('click',async()=>{try{await fetch('/api/login',{method:'DELETE'})}finally{location.href='/login'}});
let tt; function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2600)}
function notice(m){$('notice').textContent=m;$('notice').hidden=!m}

// ---------- Telegram ----------
async function loadTg(){
  const box=$('tgBox');
  try{
    const d=await api('/api/telegram');
    let h='';
    if(d.ready) h+=`<div class="okline">Activ${d.bot?' · @'+esc(d.bot):''}</div><div>Fiecare cerere din formular ajunge imediat în Telegram.</div><div><button class="btn" id="btnTgTest" type="button">Trimite un mesaj de test</button></div>`;
    else if(!d.hasToken) h+=`<div class="badline">Neconfigurat</div><div>Adaugă <code>TELEGRAM_BOT_TOKEN</code> și <code>TELEGRAM_CHAT_ID</code> în Vercel → Settings → Environment Variables, apoi Redeploy.</div>`;
    else{
      h+=`<div class="badline">Lipsește TELEGRAM_CHAT_ID</div><div>Scrie-i botului${d.bot?' @'+esc(d.bot):''} un mesaj în Telegram, apoi reîncarcă pagina. Copiază ID-ul de mai jos în <code>TELEGRAM_CHAT_ID</code> și fă Redeploy.</div>`;
      h+=d.chats.length?d.chats.map(c=>`<div><code>${esc(c.id)}</code> ${esc(c.name)}</div>`).join(''):'<div>Încă niciun mesaj primit de bot.</div>';
    }
    if(d.hasToken) h+=`<div><b>Mini App:</b> <code>${esc(location.origin)}/tg</code></div><div><button class="btn" id="btnTgMenu" type="button">Pune butonul „Franciza” în meniul botului</button></div>`;
    if(d.error) h+=`<div class="badline">${esc(d.error)}</div>`;
    box.innerHTML=h;
    $('btnTgMenu')?.addEventListener('click',async()=>{try{const r=await api('/api/telegram?action=menu',{method:'POST'});toast('Butonul de meniu deschide acum '+r.url)}catch(e){toast(e.message)}});
    $('btnTgTest')?.addEventListener('click',async()=>{try{await api('/api/telegram',{method:'POST'});toast('Mesajul de test a fost trimis')}catch(e){toast(e.message)}});
  }catch(e){if(e.message!=='401')box.textContent='Nu s-a putut verifica: '+e.message}
}

render();
load();
loadTg();
// Colegii văd modificările celorlalți: reîncărcare la 30 s și când revii pe tab (doar dacă nu e deschis un dialog).
const anyDialog=()=>$('dlgLead').open||$('dlgCities').open||$('dlgScan').open;
setInterval(()=>{if(!document.hidden&&!anyDialog())load()},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!anyDialog())load()});

// ---------- scanare carte de vizită (Claude OCR) ----------
let scan=null; // {docPath, docType, previewUrl}
function scanReset(keepFile){
  if(scan?.previewUrl) URL.revokeObjectURL(scan.previewUrl);
  if(scan?.docPath&&!keepFile) fetch('/api/ocr?path='+encodeURIComponent(scan.docPath),{method:'DELETE',credentials:'same-origin'});
  scan=null; $('scanFile').value=''; $('scanStep1').hidden=false; $('scanStep2').hidden=true;
  $('scanErr').hidden=true; $('scanErr2').hidden=true; $('scanBusy').hidden=true; $('scanDrop').hidden=false;
}
// Fotografiile mari se micșorează în browser (max 2000 px, JPEG), ca să încapă în limita Vercel de 4,5 MB.
async function prepareFile(file){
  if(file.type==='application/pdf'){
    if(file.size>3_200_000) throw new Error('PDF-ul e prea mare (maxim 3 MB).');
    return {blob:file,type:'application/pdf'};
  }
  if(!file.type.startsWith('image/')&&!/\.(heic|heif)$/i.test(file.name)) throw new Error('Încarcă o fotografie sau un PDF.');
  const bmp=await createImageBitmap(file).catch(()=>null);
  if(!bmp) throw new Error('Imaginea nu poate fi deschisă. Încearcă JPG sau PNG.');
  const k=Math.min(1,2000/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas'); c.width=Math.round(bmp.width*k); c.height=Math.round(bmp.height*k);
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.86));
  return {blob,type:'image/jpeg'};
}
const toBase64=blob=>new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=bad;r.readAsDataURL(blob)});
$('btnScan').addEventListener('click',()=>{scanReset(true);$('dlgScan').showModal()});
$('btnScanClose').addEventListener('click',()=>$('dlgScan').close());
$('btnScanCancel').addEventListener('click',()=>{scanReset();$('dlgScan').close()});
$('btnScanAgain').addEventListener('click',()=>scanReset());
$('dlgScan').addEventListener('close',()=>{if(scan&&!$('scanStep2').hidden)scanReset()});
$('scanFile').addEventListener('change',async()=>{
  const file=$('scanFile').files[0]; if(!file) return;
  $('scanErr').hidden=true; $('scanBusy').hidden=false; $('scanDrop').hidden=true;
  try{
    const {blob,type}=await prepareFile(file);
    const res=await fetch('/api/ocr',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({mediaType:type,data:await toBase64(blob)})});
    if(res.status===401){location.href='/login';return}
    const d=await res.json().catch(()=>({error:res.status===413?'Fișierul e prea mare.':'Eroare de server'}));
    if(!res.ok) throw new Error(d.error||'Eroare de server');
    const c=d.card;
    scan={docPath:d.docPath,docType:d.docType,previewUrl:URL.createObjectURL(blob)};
    $('scanPreview').innerHTML=type==='application/pdf'?`<iframe src="${scan.previewUrl}" title="PDF"></iframe>`:`<img src="${scan.previewUrl}" alt="Cartea de vizită încărcată">`;
    $('s_name').value=c.name||''; $('s_phone').value=(c.phones||[])[0]||''; $('s_company').value=c.company||'';
    $('s_position').value=c.position||''; $('s_email').value=c.email||''; $('s_city').value=c.city||'';
    $('s_other').value=[(c.phones||[]).slice(1).map(p=>'Tel.: '+p).join('\n'),c.website&&'Site: '+c.website,c.address&&'Adresă: '+c.address,c.other].filter(Boolean).join('\n');
    $('scanStep1').hidden=true; $('scanStep2').hidden=false;
  }catch(e){
    $('scanErr').textContent=e.message; $('scanErr').hidden=false; $('scanDrop').hidden=false; $('scanFile').value='';
  }finally{$('scanBusy').hidden=true}
});
$('scanStep2').addEventListener('submit',async e=>{
  e.preventDefault(); if(!scan) return;
  const v={name:$('s_name').value.trim(),phone:$('s_phone').value.trim(),email:$('s_email').value.trim(),city:$('s_city').value.trim(),company:$('s_company').value.trim()};
  if(!v.name||!v.phone){$('scanErr2').textContent='Completează numele și telefonul.';$('scanErr2').hidden=false;return}
  const notes=[$('s_position').value.trim()&&'Funcție: '+$('s_position').value.trim(),$('s_other').value.trim()].filter(Boolean).join('\n');
  $('btnScanSave').disabled=true;
  try{
    await api('/api/leads',{method:'POST',body:JSON.stringify({...v,notes,source:'vizitka',stage:'nou',docPath:scan.docPath,docType:scan.docType})});
    scanReset(true); $('dlgScan').close(); toast(v.name+' a fost adăugat în „Nou” (Carte de vizită)'); await load();
  }catch(err){$('scanErr2').textContent=err.message;$('scanErr2').hidden=false}
  finally{$('btnScanSave').disabled=false}
});

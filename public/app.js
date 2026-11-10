// Pipeline-ul echipei: citește cererile din /api/leads, calculează scorul și le afișează pe etape.
const STAGES=[{id:'nou',t:'Nou'},{id:'apel',t:'Apel'},{id:'intalnire',t:'Întâlnire'},{id:'contract',t:'Contract'},{id:'respins',t:'Respins'}];
const SOURCES=[['site','Formular site'],['facebook','Facebook'],['instagram','Instagram'],['telefon','Telefon'],['email','Email'],['altul','Altă sursă']];
const BUDGET={lt10:{t:'Sub 10.000 €',p:0},mid:{t:'10.000 – 25.000 €',p:30},gt25:{t:'Peste 25.000 €',p:40}};
const SPACE={own:{t:'Are spațiu (propriu/închiriat)',s:'Are spațiu',p:20},searching:{t:'Caută spațiu',s:'Caută spațiu',p:10},none:{t:'Nu are spațiu',s:'Fără spațiu',p:0}};
const TIME={m1:{t:'În maxim 1 lună',s:'≤1 lună',p:15},m3:{t:'În 1–3 luni',s:'1–3 luni',p:10},m6:{t:'În 3–6 luni',s:'3–6 luni',p:5},later:{t:'Peste 6 luni / nu știe',s:'>6 luni',p:0}};
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
fillSelect($('f_source'),SOURCES);
SOURCES.forEach(([v,t])=>$('fsrc').insertAdjacentHTML('beforeend',`<option value="${v}">${esc(t)}</option>`));
fillSelect($('f_budget'),[['','Alege…'],...Object.entries(BUDGET).map(([k,v])=>[k,v.t])]);
fillSelect($('f_space'),[['','Alege…'],...Object.entries(SPACE).map(([k,v])=>[k,v.t])]);
fillSelect($('f_time'),[['','Alege…'],...Object.entries(TIME).map(([k,v])=>[k,v.t])]);
fillSelect($('f_stage'),STAGES.map(s=>[s.id,s.t]));
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
  const q=norm($('fq').value), src=$('fsrc').value, cat=$('fcat').value;
  return withScore().filter(l=>{
    if(src&&l.source!==src) return false;
    if(cat&&l._s.cat!==cat) return false;
    if(q&&![l.name,l.phone,l.email,l.city,l.notes].some(v=>norm(v).includes(q))) return false;
    return true;
  });
}
function fmtDate(iso){try{return new Date(iso).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'})}catch{return ''}}

function render(){
  const all=withScore(), active=all.filter(l=>l.stage!=='respins');
  const cnt=k=>active.filter(l=>l._s.cat===k).length;
  $('stats').innerHTML=`
    <div class="stat"><b>${all.length}</b><span>cereri în total</span></div>
    <div class="stat hot"><b>${cnt('hot')}</b><span>fierbinți, active</span></div>
    <div class="stat warm"><b>${cnt('warm')}</b><span>calde, active</span></div>
    <div class="stat cold"><b>${cnt('cold')}</b><span>reci, active</span></div>
    <div class="stat"><b>${all.filter(l=>l.stage==='contract').length}</b><span>la contract</span></div>`;
  const board=$('board');
  if(!leads.length){
    board.innerHTML=STAGES.map(s=>`<div class="col" data-stage="${s.id}"><h2>${s.t}<em>0</em></h2></div>`).join('')+
      `<div class="big-empty"><strong>${loaded?'Nicio cerere încă':'Se încarcă cererile…'}</strong>${loaded?'Cererile din formularul public apar aici automat. Pe cele venite prin telefon, Facebook sau Instagram le adaugi cu „+ Cerere nouă”.':''}</div>`;
    bindDrops(); return;
  }
  const list=filtered();
  board.innerHTML=STAGES.map(s=>{
    const items=list.filter(l=>(l.stage||'nou')===s.id).sort((a,b)=>b._s.total-a._s.total||(b.createdAt||'').localeCompare(a.createdAt||''));
    return `<div class="col" data-stage="${s.id}"><h2>${s.t}<em>${items.length}</em></h2>${items.length?items.map(cardHTML).join(''):'<div class="empty">Nimic aici</div>'}</div>`;
  }).join('');
  board.querySelectorAll('.card').forEach(c=>{
    c.addEventListener('click',()=>openLead(c.dataset.id));
    c.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',c.dataset.id);e.dataTransfer.effectAllowed='move'});
  });
  bindDrops();
}
function cardHTML(l){
  const s=l._s, src=(SOURCES.find(x=>x[0]===l.source)||[,''])[1];
  return `<button type="button" class="card ${s.cat}" draggable="true" data-id="${esc(l.id)}">
    <div class="top"><span class="name">${esc(l.name)}</span><span class="score">${s.total}<small>/100</small></span></div>
    <div><span class="pill ${s.cat}">${CAT_LABEL[s.cat]}</span></div>
    <div class="meta"><span>${esc(l.city||'—')}</span><span>${esc(l.phone||'')}</span></div>
    <div class="chips"><span class="chip">${esc(BUDGET[l.budget]?.t||'buget ?')}</span><span class="chip">${esc(SPACE[l.space]?.s||'')}</span><span class="chip">${esc(TIME[l.timeline]?.s||'')}</span></div>
    <div class="meta"><span>${esc(src)}</span><span>${fmtDate(l.createdAt)}</span></div>
  </button>`;
}
function bindDrops(){
  $('board').querySelectorAll('.col').forEach(col=>{
    col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drop')});
    col.addEventListener('dragleave',()=>col.classList.remove('drop'));
    col.addEventListener('drop',e=>{e.preventDefault();col.classList.remove('drop');const id=e.dataTransfer.getData('text/plain');if(id)moveStage(id,col.dataset.stage)});
  });
}
['fq','fsrc','fcat'].forEach(id=>$(id).addEventListener('input',render));

// ---------- dialog cerere ----------
function formVal(){return{name:$('f_name').value.trim(),phone:$('f_phone').value.trim(),email:$('f_email').value.trim(),source:$('f_source').value,city:$('f_city').value.trim(),budget:$('f_budget').value,space:$('f_space').value,timeline:$('f_time').value,experience:$('f_exp').value,stage:$('f_stage').value,notes:$('f_notes').value.trim()}}
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
  $('f_source').value=l?.source||'telefon'; $('f_city').value=l?.city||''; $('f_budget').value=l?.budget||'';
  $('f_space').value=l?.space||''; $('f_time').value=l?.timeline||''; $('f_exp').value=l?.experience||'';
  $('f_stage').value=l?.stage||'nou'; $('f_notes').value=l?.notes||'';
  $('btnDelete').hidden=!l; $('btnDelete').classList.remove('armed'); $('btnDelete').textContent='Șterge';
  $('formErr').hidden=true; updateLive(); $('dlgLead').showModal();
}
$('btnAdd').addEventListener('click',()=>openLead(null));
$('btnCancel').addEventListener('click',()=>$('dlgLead').close());
$('leadForm').addEventListener('submit',async e=>{
  e.preventDefault(); if(busy) return;
  const v=formVal(), miss=[];
  if(!v.name)miss.push('nume'); if(!v.phone)miss.push('telefon'); if(!v.city)miss.push('oraș');
  if(!v.budget)miss.push('buget'); if(!v.space)miss.push('spațiu'); if(!v.timeline)miss.push('termen');
  if(miss.length){$('formErr').textContent='Completează: '+miss.join(', ')+'.';$('formErr').hidden=false;return}
  busy=true; $('btnSave').disabled=true;
  try{
    if(editingId) await api('/api/leads?id='+encodeURIComponent(editingId),{method:'PUT',body:JSON.stringify(v)});
    else await api('/api/leads',{method:'POST',body:JSON.stringify(v)});
    $('dlgLead').close(); toast(editingId?'Cererea a fost actualizată':'Cererea a fost adăugată'); await load();
  }catch(err){$('formErr').textContent=err.message;$('formErr').hidden=false}
  finally{busy=false;$('btnSave').disabled=false}
});
$('btnDelete').addEventListener('click',async()=>{
  const b=$('btnDelete');
  if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmă ștergerea';return}
  try{await api('/api/leads?id='+encodeURIComponent(editingId),{method:'DELETE'});$('dlgLead').close();toast('Cererea a fost ștearsă');await load()}
  catch(err){$('formErr').textContent=err.message;$('formErr').hidden=false}
});
async function moveStage(id,stage){
  const l=leads.find(x=>x.id===id); if(!l||l.stage===stage) return;
  const prev=l.stage; l.stage=stage; render();
  try{await api('/api/leads?id='+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({stage})});toast(`${l.name} → ${STAGES.find(s=>s.id===stage).t}`)}
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

render();
load();
// Colegii văd modificările celorlalți: reîncărcare la 30 s și când revii pe tab (doar dacă nu e deschis un dialog).
setInterval(()=>{if(!document.hidden&&!$('dlgLead').open&&!$('dlgCities').open)load()},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('dlgLead').open)load()});

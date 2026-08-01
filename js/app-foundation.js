(function(){
 const K={jobs:'shelter_pro_jobs_v5',route:'shelter_pro_route_v5',fav:'shelter_pro_favourites_v5',recent:'shelter_pro_recent_v5'};
 const load=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
 const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
 let jobs=load(K.jobs), route=load(K.route), favourites=load(K.fav), recent=load(K.recent);
 const site=id=>SITES.find(x=>String(x.id).toUpperCase()===String(id).trim().toUpperCase());
 const esc2=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const parseIds=t=>[...new Set(String(t||'').split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean))];
 function jobStatus(id){return statusOf(String(id));}
 function remainingJobs(){return jobs.filter(id=>jobStatus(id)!=='cleaned'&&jobStatus(id)!=='skipped');}
 function activeQueue(){const r=route.filter(id=>jobStatus(id)!=='cleaned'&&jobStatus(id)!=='skipped');return r.length?r:remainingJobs();}
 function nextJobId(){return activeQueue()[0]||null;}
 function applyJobStatus(id,status,advance=false){if(!id)return;saveStatus(String(id),status);document.dispatchEvent(new CustomEvent('shelterpro:statuschange'));renderJobs();renderRouteManager();updateHome();if(advance){const next=nextJobId();if(next){selectSite(next,true);if(typeof currentDriveSite!=='undefined')currentDriveSite=site(next);if(typeof updateDrivingView==='function')updateDrivingView();}else alert('All jobs in today’s route are complete or skipped.');}}
 function startWorkflow(){const id=nextJobId();if(!id){alert('Import Today’s Jobs or add shelters to the route first.');return}closeHome();if(route.length&&typeof activeArea!=='undefined'){activeArea='Route';document.querySelectorAll('[data-area]').forEach(b=>b.classList.toggle('active',b.dataset.area==='Route'));if(typeof render==='function')render();}selectSite(id,true);if(typeof currentDriveSite!=='undefined')currentDriveSite=site(id);setTimeout(()=>startDriving(),120);}
 function updateHome(){const total=jobs.length,rem=remainingJobs().length,done=total-rem;document.getElementById('homeTotal').textContent=total;document.getElementById('homeRemaining').textContent=rem;document.getElementById('homeDone').textContent=total?Math.round(done/total*100)+'%':'0%';const h=new Date().getHours();document.getElementById('homeGreeting').textContent=(h<12?'Good morning':h<18?'Good afternoon':'Good evening')+', Chris';}
 function openHome(){document.querySelectorAll('.sp-screen').forEach(x=>x.classList.remove('open'));document.getElementById('homeOverlay').classList.add('open');updateHome();}
 function closeHome(){document.getElementById('homeOverlay').classList.remove('open');document.querySelectorAll('.sp-screen').forEach(x=>x.classList.remove('open'));setTimeout(()=>map.invalidateSize(),60);}
 function openScreen(id){document.getElementById('homeOverlay').classList.remove('open');document.querySelectorAll('.sp-screen').forEach(x=>x.classList.remove('open'));document.getElementById(id).classList.add('open');if(id==='jobsScreen')renderJobs();if(id==='routeScreen')renderRouteManager();if(id==='searchScreen')renderSmartSearch('');if(id==='favouritesScreen')renderFavourites();}
 document.querySelectorAll('[data-open-screen]').forEach(b=>b.onclick=()=>openScreen(b.dataset.openScreen));document.querySelectorAll('.sp-back').forEach(b=>b.onclick=openHome);
 document.getElementById('openHome').onclick=openHome;document.getElementById('homeMap').onclick=closeHome;document.getElementById('homeSettings').onclick=()=>{closeHome();openSettings();};
 document.getElementById('homeStart').onclick=startWorkflow;
 function addRecent(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,20);save(K.recent,recent)}
 function gotoSite(id,navigate=false){const s=site(id);if(!s)return;addRecent(s.id);closeHome();selectSite(s.id,true);if(navigate)appleMaps(s);}
 function toggleFav(id){favourites=favourites.includes(id)?favourites.filter(x=>x!==id):[...favourites,id];save(K.fav,favourites);renderFavourites();renderSmartSearch(document.getElementById('smartSearch')?.value||'');}
 function addRoute(id){const s=site(id);if(!s){alert('Site '+id+' was not found.');return}if(!route.includes(s.id))route.push(s.id);save(K.route,route);document.dispatchEvent(new CustomEvent('shelterpro:routechange'));renderRouteManager();}
 function renderJobs(){
  const total=jobs.length,completed=jobs.filter(id=>jobStatus(id)==='cleaned').length,skipped=jobs.filter(id=>jobStatus(id)==='skipped').length,done=completed+skipped,rem=total-done,current=nextJobId();
  document.getElementById('jobsCount').textContent=total;
  document.getElementById('jobsProgressText').textContent=done+' / '+total+' • '+rem+' remaining';
  document.getElementById('jobsProgressFill').style.width=(total?done/total*100:0)+'%';
  document.getElementById('jobsList').innerHTML=jobs.map((id,i)=>{const s=site(id),st=jobStatus(id),isCurrent=id===current;return `<div class="sp-card sp-row ${isCurrent?'sp-current-stop':''}"><div class="sp-row-main"><strong>${i+1}. Site ${esc2(id)} ${isCurrent?'🔵 CURRENT':st==='cleaned'?'✅':st==='skipped'?'⏭️':''}</strong><small>${esc2(s?s.address:'Site not found')}</small></div><div class="sp-row-actions"><button data-jgo="${esc2(id)}">Map</button><button data-jroute="${esc2(id)}">+ Route</button><button class="status-cleaned" data-jdone="${esc2(id)}">Cleaned</button><button class="status-skipped" data-jskip="${esc2(id)}">Skip</button><button data-jremove="${esc2(id)}">✕</button></div></div>`}).join('')||'<div class="sp-empty">No jobs loaded yet.</div>';
  document.querySelectorAll('[data-jgo]').forEach(b=>b.onclick=()=>gotoSite(b.dataset.jgo));
  document.querySelectorAll('[data-jroute]').forEach(b=>b.onclick=()=>addRoute(b.dataset.jroute));
  document.querySelectorAll('[data-jdone]').forEach(b=>b.onclick=()=>applyJobStatus(b.dataset.jdone,'cleaned'));
  document.querySelectorAll('[data-jskip]').forEach(b=>b.onclick=()=>applyJobStatus(b.dataset.jskip,'skipped'));
  document.querySelectorAll('[data-jremove]').forEach(b=>b.onclick=()=>{jobs=jobs.filter(x=>x!==b.dataset.jremove);save(K.jobs,jobs);renderJobs();renderRouteManager();updateHome();if(activeArea==='Today')render()});
 }
 function importJobs(replace){const ids=parseIds(document.getElementById('jobImport').value).map(x=>site(x)?.id).filter(Boolean);if(!ids.length){alert('No matching site numbers found.');return}jobs=replace?[...new Set(ids)]:[...new Set([...jobs,...ids])];save(K.jobs,jobs);document.getElementById('jobImport').value='';renderJobs();updateHome();}
 document.getElementById('replaceJobs').onclick=()=>importJobs(true);document.getElementById('addJobs').onclick=()=>importJobs(false);
 function renderRouteManager(){
  const current=nextJobId(),completed=route.filter(id=>jobStatus(id)==='cleaned').length,skipped=route.filter(id=>jobStatus(id)==='skipped').length,done=completed+skipped,total=route.length,rem=total-done;
  document.getElementById('routeCount').textContent=total;
  const rpt=document.getElementById('routeProgressText'),rpf=document.getElementById('routeProgressFill'),rr=document.getElementById('routeRemaining'),rs=document.getElementById('routeSkipped');
  if(rpt)rpt.textContent=done+' / '+total;if(rpf)rpf.style.width=(total?done/total*100:0)+'%';if(rr)rr.textContent=rem+' remaining';if(rs)rs.textContent=skipped+' skipped';
  document.getElementById('routeManagerList').innerHTML=route.map((id,i)=>{const s=site(id),st=jobStatus(id),isCurrent=id===current;return `<div class="sp-card sp-row ${isCurrent?'sp-current-stop':''}"><div class="sp-row-main"><strong>${i+1}. Site ${esc2(id)} ${isCurrent?'🔵 CURRENT':st==='cleaned'?'✅':st==='skipped'?'⏭️':''}</strong><small>${esc2(s?s.address:'Site not found')}</small></div><div class="sp-row-actions"><button data-rup="${i}" ${i===0?'disabled':''}>↑</button><button data-rdown="${i}" ${i===route.length-1?'disabled':''}>↓</button><button class="primary" data-rgo="${esc2(id)}">Navigate</button><button class="status-cleaned" data-rdone="${esc2(id)}">Cleaned</button><button class="status-skipped" data-rskip="${esc2(id)}">Skip</button><button data-rdel="${i}">✕</button></div></div>`}).join('')||'<div class="sp-empty">Your route is empty.</div>';
  document.querySelectorAll('[data-rup]').forEach(b=>b.onclick=()=>moveRoute(+b.dataset.rup,-1));
  document.querySelectorAll('[data-rdown]').forEach(b=>b.onclick=()=>moveRoute(+b.dataset.rdown,1));
  document.querySelectorAll('[data-rgo]').forEach(b=>b.onclick=()=>{gotoSite(b.dataset.rgo);setTimeout(()=>startDriving(),120)});
  document.querySelectorAll('[data-rdone]').forEach(b=>b.onclick=()=>applyJobStatus(b.dataset.rdone,'cleaned',true));
  document.querySelectorAll('[data-rskip]').forEach(b=>b.onclick=()=>applyJobStatus(b.dataset.rskip,'skipped',true));
  document.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{route.splice(+b.dataset.rdel,1);save(K.route,route);document.dispatchEvent(new CustomEvent('shelterpro:routechange'));renderRouteManager()});
  window.routeList=route.map(id=>{const s=site(id);return {id,address:s?.address||''}});
 }
 function moveRoute(i,d){const j=i+d;if(j<0||j>=route.length)return;[route[i],route[j]]=[route[j],route[i]];save(K.route,route);document.dispatchEvent(new CustomEvent('shelterpro:routechange'));renderRouteManager()}
 document.getElementById('routeStart').onclick=startWorkflow;
 document.getElementById('routeAddBtn').onclick=()=>{addRoute(document.getElementById('routeAddInput').value);document.getElementById('routeAddInput').value=''};document.getElementById('routeAddInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('routeAddBtn').click()});document.getElementById('routeFromJobs').onclick=()=>{route=remainingJobs();save(K.route,route);document.dispatchEvent(new CustomEvent('shelterpro:routechange'));renderRouteManager()};document.getElementById('routeClear').onclick=()=>{if(confirm('Clear the saved route?')){route=[];save(K.route,route);document.dispatchEvent(new CustomEvent('shelterpro:routechange'));renderRouteManager()}};
 document.getElementById('routeNearest').onclick=()=>{if(!currentPos){alert('Press My location first so the route can be sorted from your position.');return}let anchor={lat:currentPos.lat,lon:currentPos.lon},pool=route.map(site).filter(Boolean),sorted=[];while(pool.length){pool.sort((a,b)=>haversine(anchor.lat,anchor.lon,a.lat,a.lon)-haversine(anchor.lat,anchor.lon,b.lat,b.lon));const n=pool.shift();sorted.push(n.id);anchor=n}route=sorted;save(K.route,route);document.dispatchEvent(new CustomEvent('shelterpro:routechange'));renderRouteManager()};
 function searchMatches(q){q=String(q||'').trim().toLowerCase();if(!q)return recent.map(site).filter(Boolean);return SITES.filter(s=>[s.id,s.address,s.owner,s.asset,s.area,s.customer].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,100)}
 function renderSmartSearch(q){const rows=searchMatches(q);document.getElementById('searchResultCount').textContent=rows.length;document.getElementById('smartSearchResults').innerHTML=rows.map(s=>`<div class="sp-card sp-row"><div class="sp-row-main"><strong>Site ${esc2(s.id)} ${favourites.includes(s.id)?'⭐':''}</strong><small>${esc2(s.address)}</small></div><div class="sp-row-actions"><button data-smap="${esc2(s.id)}">Map</button><button data-sroute="${esc2(s.id)}">+ Route</button><button class="sp-fav ${favourites.includes(s.id)?'active':''}" data-sfav="${esc2(s.id)}">★</button></div></div>`).join('')||(q?'<div class="sp-empty">No matching shelters.</div>':'<div class="sp-empty">Start typing to search. Recent sites will appear here.</div>');document.querySelectorAll('[data-smap]').forEach(b=>b.onclick=()=>gotoSite(b.dataset.smap));document.querySelectorAll('[data-sroute]').forEach(b=>b.onclick=()=>addRoute(b.dataset.sroute));document.querySelectorAll('[data-sfav]').forEach(b=>b.onclick=()=>toggleFav(b.dataset.sfav));}
 document.getElementById('smartSearch').addEventListener('input',e=>renderSmartSearch(e.target.value));
 function renderFavourites(){document.getElementById('favouriteCount').textContent=favourites.length;document.getElementById('favouritesList').innerHTML=favourites.map(id=>{const s=site(id);return `<div class="sp-card sp-row"><div class="sp-row-main"><strong>⭐ Site ${esc2(id)}</strong><small>${esc2(s?s.address:'Site not found')}</small></div><div class="sp-row-actions"><button data-fgo="${esc2(id)}">Map</button><button data-froute="${esc2(id)}">+ Route</button><button data-fdel="${esc2(id)}">Remove</button></div></div>`}).join('')||'<div class="sp-empty">No favourite shelters yet.</div>';document.querySelectorAll('[data-fgo]').forEach(b=>b.onclick=()=>gotoSite(b.dataset.fgo));document.querySelectorAll('[data-froute]').forEach(b=>b.onclick=()=>addRoute(b.dataset.froute));document.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>toggleFav(b.dataset.fdel));}
 document.getElementById('resumeRoute').onclick=startWorkflow;
 document.getElementById('clearDay').onclick=()=>{if(!confirm('Clear Cleaned and Skipped status for today’s job list?'))return;jobs.forEach(id=>{delete statusMap[id]});localStorage.setItem(STATUS_KEY,JSON.stringify(statusMap));render();updateHome();};
 const originalSaveStatus=window.saveStatus||saveStatus;window.saveStatus=function(id,status){originalSaveStatus(id,status);updateHome();if(document.getElementById('jobsScreen').classList.contains('open'))renderJobs();};
 window.ShelterProWorkflow={
  getJobs:()=>[...jobs],
  getRoute:()=>[...route],
  getQueue:()=>activeQueue(),
  getNextId:()=>nextJobId(),
  setImportedJobs:(ids,replace)=>{const clean=[...new Set(ids.map(String))];jobs=replace?clean:[...new Set([...jobs,...clean])];save(K.jobs,jobs);renderJobs();renderRouteManager();updateHome();if(activeArea==='Today')render();return [...jobs]},
  markStatus:(id,status,advance=false)=>applyJobStatus(id,status,advance),
  start:startWorkflow
 };
 window.ShelterProState={getJobs:()=>[...jobs],getRoute:()=>[...route],getStatus:(id)=>jobStatus(String(id))};
 window.save=save;window.renderJobs=renderJobs;window.updateHome=updateHome;
 window.addEventListener('load',()=>{updateHome();renderRouteManager();});
})();

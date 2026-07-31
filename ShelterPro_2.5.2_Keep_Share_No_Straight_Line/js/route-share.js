/* Shelter Pro 2.5 - Route sharing and navigation actions */
(function(){
  'use strict';
  const APPLE_MAX_STOPS=14;
  const GOOGLE_MAX_STOPS=10;
  let routePartIndex=0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const siteById=id=>SITES.find(s=>String(s.id)===String(id));
  function remainingIds(){
    try{
      if(typeof ShelterProState!=='undefined'){
        const route=ShelterProState.getRoute().filter(id=>!['cleaned','skipped'].includes(ShelterProState.getStatus(id)));
        if(route.length)return route;
        return ShelterProState.getJobs().filter(id=>!['cleaned','skipped'].includes(ShelterProState.getStatus(id)));
      }
      if(typeof ShelterProWorkflow!=='undefined')return ShelterProWorkflow.getQueue();
    }catch(_){ }
    return [];
  }
  function remainingSites(){return remainingIds().map(siteById).filter(Boolean);}
  function split(stops,size){const out=[];for(let i=0;i<stops.length;i+=size)out.push(stops.slice(i,i+size));return out;}
  function coord(s){return `${Number(s.lat).toFixed(6)},${Number(s.lon).toFixed(6)}`;}
  function appleRouteUrl(stops){
    if(!stops.length)return '';
    const destination=stops[stops.length-1];
    const waypoints=stops.slice(0,-1);
    const params=new URLSearchParams();
    params.set('mode','driving');
    params.set('destination-coordinate',coord(destination));
    params.set('destination-name',`Site ${destination.id}`);
    waypoints.forEach(s=>{
      params.append('waypoint-coordinate',coord(s));
      params.append('waypoint-name',`Site ${s.id}`);
    });
    return `https://maps.apple.com/directions?${params.toString()}`;
  }
  function googleRouteUrl(stops){
    if(!stops.length)return '';
    const destination=stops[stops.length-1];
    const waypoints=stops.slice(0,-1);
    const params=new URLSearchParams({api:'1',travelmode:'driving',destination:coord(destination)});
    if(waypoints.length)params.set('waypoints',waypoints.map(coord).join('|'));
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
  function currentSite(){
    try{return currentDriveSite||SITES.find(s=>String(s.id)===String(selectedId));}catch(_){return null;}
  }
  function openExternal(url){if(!url)return;window.location.href=url;}
  function copyText(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();
  }
  function routeText(stops){return stops.map((s,i)=>`${i+1}. Site ${s.id} — ${s.address||coord(s)}`).join('\n');}
  function updateModal(){
    const stops=remainingSites();
    const parts=split(stops,APPLE_MAX_STOPS);
    routePartIndex=Math.min(routePartIndex,Math.max(0,parts.length-1));
    const current=parts[routePartIndex]||[];
    document.getElementById('routeShareCount').textContent=stops.length?`${stops.length} remaining stop${stops.length===1?'':'s'}`:'No active route';
    document.getElementById('routeSharePart').textContent=parts.length>1?`Part ${routePartIndex+1} of ${parts.length} · Stops ${routePartIndex*APPLE_MAX_STOPS+1}–${routePartIndex*APPLE_MAX_STOPS+current.length}`:'All remaining stops';
    document.getElementById('routeSharePrevious').disabled=routePartIndex<=0;
    document.getElementById('routeShareNext').disabled=routePartIndex>=parts.length-1;
    document.getElementById('routeShareApple').disabled=!current.length;
    document.getElementById('routeShareGoogle').disabled=!current.length;
    document.getElementById('routeShareList').innerHTML=current.map((s,i)=>`<li><b>${routePartIndex*APPLE_MAX_STOPS+i+1}. Site ${esc(s.id)}</b><small>${esc(s.address||coord(s))}</small></li>`).join('')||'<li class="empty-share">Import jobs or create a route first.</li>';
    const warning=document.getElementById('routeShareWarning');
    warning.textContent=parts.length>1?'Apple Maps allows a limited number of stops, so Shelter Pro has divided the active route into parts. Open the next part after completing the current part.':'';
  }
  function openShareModal(){routePartIndex=0;updateModal();document.getElementById('routeShareModal').classList.add('open');}
  function closeShareModal(){document.getElementById('routeShareModal').classList.remove('open');}
  function selectedPart(maxStops){
    const stops=remainingSites();
    const start=routePartIndex*APPLE_MAX_STOPS;
    return stops.slice(start,start+maxStops);
  }
  function addNavigateButtons(){
    const selectors=['[data-smap]','[data-jgo]','[data-fgo]'];
    selectors.forEach(sel=>document.querySelectorAll(sel).forEach(mapBtn=>{
      const row=mapBtn.closest('.sp-row-actions');if(!row||row.querySelector('[data-choice-nav]'))return;
      const id=mapBtn.dataset.smap||mapBtn.dataset.jgo||mapBtn.dataset.fgo;
      const btn=document.createElement('button');btn.className='primary';btn.textContent='Navigate';btn.dataset.choiceNav=id;
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();const s=siteById(id);if(window.ShelterProNavigation?.openNavigationChoice)window.ShelterProNavigation.openNavigationChoice(s);};
      row.insertBefore(btn,row.firstChild);
    }));
  }
  function install(){
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop route-share-modal" id="routeShareModal" role="dialog" aria-modal="true"><div class="settings-card route-share-card"><h2>Share Active Route</h2><p><strong id="routeShareCount">No active route</strong><br><span id="routeSharePart">All remaining stops</span></p><div class="route-share-part-nav"><button id="routeSharePrevious">← Previous Part</button><button id="routeShareNext">Next Part →</button></div><ol class="route-share-list" id="routeShareList"></ol><p class="route-share-warning" id="routeShareWarning"></p><div class="route-share-actions"><button class="primary" id="routeShareApple">🍎 Open Route in Apple Maps</button><button id="routeShareGoogle">🌍 Open Route in Google Maps</button><button id="routeShareCurrent">🧭 Current Stop Only</button><button id="routeShareCopy">📋 Copy Route List</button></div><button id="routeShareClose">Cancel</button></div></div>`);
    const driveActions=document.querySelector('#driveDashboard .drive-actions');
    if(driveActions&&!document.getElementById('shareActiveRoute'))driveActions.insertAdjacentHTML('afterbegin','<button id="shareActiveRoute">↗ Share Route</button>');
    const routeButtons=document.querySelector('#routeScreen .sp-row-actions');
    if(routeButtons&&!document.getElementById('routeShareFromManager'))routeButtons.insertAdjacentHTML('afterbegin','<button id="routeShareFromManager">↗ Share Route</button>');
    document.getElementById('shareActiveRoute')?.addEventListener('click',openShareModal);
    document.getElementById('routeShareFromManager')?.addEventListener('click',openShareModal);
    document.getElementById('routeShareClose').onclick=closeShareModal;
    document.getElementById('routeShareModal').onclick=e=>{if(e.target.id==='routeShareModal')closeShareModal();};
    document.getElementById('routeSharePrevious').onclick=()=>{routePartIndex--;updateModal();};
    document.getElementById('routeShareNext').onclick=()=>{routePartIndex++;updateModal();};
    document.getElementById('routeShareApple').onclick=()=>openExternal(appleRouteUrl(selectedPart(APPLE_MAX_STOPS)));
    document.getElementById('routeShareGoogle').onclick=()=>{
      const part=selectedPart(GOOGLE_MAX_STOPS);
      if(selectedPart(APPLE_MAX_STOPS).length>GOOGLE_MAX_STOPS)alert(`Google Maps will open the first ${GOOGLE_MAX_STOPS} stops in this part.`);
      openExternal(googleRouteUrl(part));
    };
    document.getElementById('routeShareCurrent').onclick=()=>{
      const s=currentSite()||remainingSites()[0];if(!s){alert('Choose a shelter first.');return;}
      closeShareModal();window.ShelterProNavigation?.openNavigationChoice(s);
    };
    document.getElementById('routeShareCopy').onclick=async()=>{const stops=remainingSites();if(!stops.length){alert('There is no active route to copy.');return;}await copyText(routeText(stops));alert('Active route copied.');};
    const observer=new MutationObserver(addNavigateButtons);observer.observe(document.body,{childList:true,subtree:true});addNavigateButtons();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.ShelterProRouteShare={open:openShareModal,appleRouteUrl,googleRouteUrl};
})();

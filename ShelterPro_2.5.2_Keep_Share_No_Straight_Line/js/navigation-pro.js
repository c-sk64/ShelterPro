/* Shelter Pro 2.3 - Built-in road navigation (no API key)
 * Uses the public OSRM demonstration service. Online connection required.
 */
(function(){
  'use strict';
  const NAV_KEY='shelter_pro_nav_pref_v1';
  const defaultPref={mode:'ask'};
  let navPref={...defaultPref,...JSON.parse(localStorage.getItem(NAV_KEY)||'{}')};
  let roadRouteLayer=null;
  let routeStopsLayer=null;
  let roadRoute=null;
  let roadSteps=[];
  let lastRouteRequest=0;
  let lastDestinationId=null;
  let lastInstructionKey='';
  let wholeRouteSummary=null;
  let rerouteTimer=null;

  function escNav(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtDistance(m){if(!Number.isFinite(m))return '—';return m<1000?`${Math.max(0,Math.round(m))} m`:`${(m/1000).toFixed(m<10000?1:0)} km`;}
  function fmtDuration(s){if(!Number.isFinite(s))return '—';const min=Math.max(1,Math.round(s/60));if(min<60)return `${min} min`;return `${Math.floor(min/60)} h ${min%60} min`;}
  function fmtArrival(s){if(!Number.isFinite(s))return '—';return new Date(Date.now()+s*1000).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
  function queueIds(){
    try{
      if(typeof ShelterProState!=='undefined'){
        const r=ShelterProState.getRoute().filter(id=>ShelterProState.getStatus(id)!=='cleaned'&&ShelterProState.getStatus(id)!=='skipped');
        if(r.length)return r;
        return ShelterProState.getJobs().filter(id=>ShelterProState.getStatus(id)!=='cleaned'&&ShelterProState.getStatus(id)!=='skipped');
      }
    }catch(e){}
    return [];
  }
  function queueSites(){return queueIds().map(id=>SITES.find(s=>String(s.id)===String(id))).filter(Boolean);}
  function activeSite(){return currentDriveSite || (selectedId?SITES.find(s=>String(s.id)===String(selectedId)):null);}

  async function osrmRoute(points,steps=true){
    if(points.length<2)throw new Error('At least two route points are required.');
    const coords=points.map(p=>`${Number(p.lon).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');
    const url=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=${steps?'true':'false'}&annotations=false`;
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`Road routing failed (${response.status}).`);
    const data=await response.json();
    if(data.code!=='Ok'||!data.routes?.length)throw new Error(data.message||'No drivable route was found.');
    return data.routes[0];
  }
  function clearRoadRoute(){if(roadRouteLayer){map.removeLayer(roadRouteLayer);roadRouteLayer=null;}}
  function drawRoadRoute(route){
    clearRoadRoute();
    const latlngs=route.geometry.coordinates.map(([lon,lat])=>[lat,lon]);
    roadRouteLayer=L.polyline(latlngs,{color:'#1769ff',weight:7,opacity:.9,lineJoin:'round',lineCap:'round'}).addTo(map);
    roadRouteLayer.bringToFront();
  }
  function manoeuvreText(step){
    if(!step)return 'Continue';
    const type=step.maneuver?.type||'continue';
    const modifier=(step.maneuver?.modifier||'').replace(/_/g,' ');
    const road=step.name?` onto ${step.name}`:'';
    if(type==='arrive')return 'Arrive at the shelter';
    if(type==='depart')return `Continue on ${step.name||'the road'}`;
    if(type==='roundabout'||type==='rotary')return `Enter the roundabout${road}`;
    if(type==='merge')return `Merge ${modifier}${road}`.trim();
    if(type==='fork')return `Keep ${modifier}${road}`.trim();
    if(type==='new name'||type==='continue')return `Continue${road||' straight'}`;
    if(type==='turn'||type==='end of road')return `Turn ${modifier}${road}`.trim();
    return `${type} ${modifier}${road}`.replace(/\s+/g,' ').trim();
  }
  function flattenSteps(route){return (route.legs||[]).flatMap(leg=>leg.steps||[]);}
  function nearestStepInfo(){
    if(!currentPos||!roadSteps.length)return null;
    let best=null;
    roadSteps.forEach((step,i)=>{
      const loc=step.maneuver?.location;
      if(!loc)return;
      const d=hav(currentPos.lat,currentPos.lon,loc[1],loc[0])*1000;
      if(!best||d<best.distance)best={step,index:i,distance:d};
    });
    if(!best)return null;
    const next=roadSteps[Math.min(best.index+1,roadSteps.length-1)];
    return {current:best.step,next,distanceToNext:next?.maneuver?.location?hav(currentPos.lat,currentPos.lon,next.maneuver.location[1],next.maneuver.location[0])*1000:0,index:best.index};
  }
  function updateStreetPanel(){
    const info=nearestStepInfo();
    const currentRoad=document.getElementById('navCurrentRoad');
    const nextStreet=document.getElementById('navNextStreet');
    const nextTurn=document.getElementById('navNextTurn');
    if(!currentRoad||!nextStreet||!nextTurn)return;
    if(!info){currentRoad.textContent='Waiting for road route…';nextStreet.textContent='—';nextTurn.textContent='—';return;}
    currentRoad.textContent=info.current.name||'Unnamed road';
    nextStreet.textContent=info.next?.name||'Destination';
    nextTurn.textContent=`${manoeuvreText(info.next)} · ${fmtDistance(info.distanceToNext)}`;
    const key=`${info.index}:${info.next?.name||''}:${info.next?.maneuver?.type||''}`;
    if(driving&&driveSettings.voice&&key!==lastInstructionKey&&info.distanceToNext<450){
      lastInstructionKey=key;
      speak(`${manoeuvreText(info.next)} in ${Math.max(50,Math.round(info.distanceToNext/50)*50)} metres`);
    }
  }
  function updateSummaryPanel(){
    const next=document.getElementById('navNextSummary');
    const final=document.getElementById('navFinalSummary');
    if(next){
      if(roadRoute&&activeSite())next.innerHTML=`<b>Next — Site ${escNav(activeSite().id)}</b><span>${fmtDistance(roadRoute.distance)} · ${fmtDuration(roadRoute.duration)} · arrive ${fmtArrival(roadRoute.duration)}</span>`;
      else next.innerHTML='<b>Next stop</b><span>Waiting for GPS route…</span>';
    }
    if(final){
      const qs=queueSites();
      if(wholeRouteSummary&&qs.length)final.innerHTML=`<b>Final — Site ${escNav(qs[qs.length-1].id)}</b><span>${fmtDistance(wholeRouteSummary.distance)} · ${fmtDuration(wholeRouteSummary.duration)} · arrive ${fmtArrival(wholeRouteSummary.duration)}</span>`;
      else final.innerHTML='<b>Final stop</b><span>Build or import a route</span>';
    }
  }
  async function refreshRoadNavigation(force=false){
    const dest=activeSite();
    if(!currentPos||!dest)return;
    const now=Date.now();
    if(!force&&dest.id===lastDestinationId&&now-lastRouteRequest<25000)return;
    lastDestinationId=dest.id;lastRouteRequest=now;
    try{
      roadRoute=await osrmRoute([{lat:currentPos.lat,lon:currentPos.lon},dest],true);
      roadSteps=flattenSteps(roadRoute);
      drawRoadRoute(roadRoute);
      updateStreetPanel();
      const q=queueSites().slice(0,20);
      if(q.length){wholeRouteSummary=await osrmRoute([{lat:currentPos.lat,lon:currentPos.lon},...q],false);}else wholeRouteSummary=null;
      updateSummaryPanel();
    }catch(err){
      console.warn('Shelter Pro road route unavailable',err);
      updateSummaryPanel();
    }
  }

  function drawRouteStops(fit=false){
    if(routeStopsLayer)map.removeLayer(routeStopsLayer);
    routeStopsLayer=L.layerGroup().addTo(map);
    const qs=queueIds();
    const all=(typeof ShelterProState!=='undefined'&&ShelterProState.getRoute().length?ShelterProState.getRoute():ShelterProState.getJobs());
    all.forEach((id,i)=>{
      const s=SITES.find(x=>String(x.id)===String(id));if(!s)return;
      const st=ShelterProState.getStatus(id);
      const current=activeSite()&&String(activeSite().id)===String(id);
      const color=current?'#1769ff':st==='cleaned'?'#16a34a':st==='skipped'?'#eab308':'#f97316';
      const icon=L.divIcon({className:'route-stop-icon',html:`<span style="--route-color:${color}">${escNav(s.id)}</span>`,iconSize:[62,28],iconAnchor:[31,14]});
      L.marker([s.lat,s.lon],{icon,zIndexOffset:current?2000:1200}).addTo(routeStopsLayer).on('click',()=>{selectedId=s.id;currentDriveSite=s;selectSite(s.id,true);updateDrivingView();});
    });
    if(fit&&routeStopsLayer.getLayers().length){map.fitBounds(routeStopsLayer.getBounds().pad(.15),{padding:[35,35]});}
  }

  function openNavigationChoice(s){
    const target=s||activeSite();if(!target){alert('Choose a shelter first.');return;}
    const modal=document.getElementById('navigationChoiceModal');
    modal.dataset.siteId=target.id;
    document.getElementById('navigationChoiceSite').textContent=`Site ${target.id}`;
    modal.classList.add('open');
  }
  function closeNavigationChoice(){document.getElementById('navigationChoiceModal').classList.remove('open');}
  function startShelterProNavigation(s){
    if(!s)return;
    selectedId=s.id;currentDriveSite=s;selectSite(s.id,true);
    closeNavigationChoice();
    if(!driving)startDriving();else{showDrivingDashboard(5000);refreshRoadNavigation(true);drawRouteStops(false);}
  }
  function navigateByMode(mode,s){
    if(mode==='shelter')startShelterProNavigation(s);
    else if(mode==='apple')appleMaps(s);
    else if(mode==='google')googleMaps(s);
    else if(mode==='waze')wazeMaps(s);
  }
  function preferredNavigate(s){if(navPref.mode==='ask')openNavigationChoice(s);else navigateByMode(navPref.mode,s);}

  function installUI(){
    const body=document.body;
    body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop nav-choice" id="navigationChoiceModal" role="dialog" aria-modal="true"><div class="settings-card"><h2>Navigate with</h2><p id="navigationChoiceSite">Selected shelter</p><div class="nav-choice-grid"><button data-nav-mode="shelter">🟠 Shelter Pro GPS</button><button data-nav-mode="apple">🍎 Apple Maps</button><button data-nav-mode="google">🌍 Google Maps</button><button data-nav-mode="waze">🟦 Waze</button></div><button id="closeNavigationChoice">Cancel</button></div></div>`);
    const dashboard=document.getElementById('driveDashboard');
    dashboard.querySelector('.drive-next').insertAdjacentHTML('beforeend',`<div class="nav-street-panel"><small>CURRENT ROAD</small><strong id="navCurrentRoad">Waiting for road route…</strong><small>NEXT STREET</small><span id="navNextStreet">—</span><b id="navNextTurn">—</b></div>`);
    dashboard.querySelector('.drive-progress').insertAdjacentHTML('beforebegin',`<div class="nav-route-summary"><div id="navNextSummary"><b>Next stop</b><span>Waiting for GPS route…</span></div><div id="navFinalSummary"><b>Final stop</b><span>Build or import a route</span></div></div>`);
    const actions=dashboard.querySelector('.drive-actions');
    actions.insertAdjacentHTML('afterbegin',`<button class="primary" id="driveSearch">🔍 Search</button><button id="fitActiveRoute">Fit Route</button>`);
    const navBtn=document.getElementById('driveNavigate');navBtn.textContent='🧭 Navigate';
    const settings=document.querySelector('#settingsModal .settings-card .setting-actions');
    settings.insertAdjacentHTML('beforebegin',`<div class="setting-row"><div><label for="setNavMode">Default navigation</label><small>Ask every time or open your preferred app</small></div><select id="setNavMode"><option value="ask">Ask every time</option><option value="shelter">Shelter Pro GPS</option><option value="apple">Apple Maps</option><option value="google">Google Maps</option><option value="waze">Waze</option></select></div>`);
    document.getElementById('setNavMode').value=navPref.mode;
    document.getElementById('driveSearch').onclick=()=>{showDrivingDashboard(0);openScreen('searchScreen');setTimeout(()=>document.getElementById('smartSearch').focus(),120);};
    document.getElementById('fitActiveRoute').onclick=()=>drawRouteStops(true);
    navBtn.onclick=()=>preferredNavigate(activeSite());
    document.getElementById('closeNavigationChoice').onclick=closeNavigationChoice;
    document.getElementById('navigationChoiceModal').addEventListener('click',e=>{if(e.target.id==='navigationChoiceModal')closeNavigationChoice();});
    document.querySelectorAll('[data-nav-mode]').forEach(b=>b.onclick=()=>{const s=SITES.find(x=>String(x.id)===String(document.getElementById('navigationChoiceModal').dataset.siteId));closeNavigationChoice();navigateByMode(b.dataset.navMode,s);});
    const oldSave=document.getElementById('saveSettings').onclick;
    document.getElementById('saveSettings').onclick=async function(e){navPref.mode=document.getElementById('setNavMode').value;localStorage.setItem(NAV_KEY,JSON.stringify(navPref));if(oldSave)await oldSave.call(this,e);};
    document.addEventListener('click',e=>{
      const routeBtn=e.target.closest('[data-rgo]');
      if(routeBtn){e.preventDefault();e.stopImmediatePropagation();const s=SITES.find(x=>String(x.id)===String(routeBtn.dataset.rgo));preferredNavigate(s);}
    },true);
    const observer=new MutationObserver(()=>drawRouteStops(false));
    observer.observe(document.body,{childList:true,subtree:true});
  }

  // Reliable Apple Maps handoff on iPhone; web page on Windows.
  appleMaps=function(s){
    if(!s){alert('Shelter location is unavailable.');return;}
    const destination=Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lon))?`${s.lat},${s.lon}`:s.address;
    window.location.href=`https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
  };

  const originalHandlePosition=handlePosition;
  handlePosition=function(pos){
    originalHandlePosition(pos);
    clearTimeout(rerouteTimer);
    rerouteTimer=setTimeout(()=>{refreshRoadNavigation(false);updateStreetPanel();},250);
  };
  const originalStartDriving=startDriving;
  startDriving=async function(){await originalStartDriving();setTimeout(()=>{refreshRoadNavigation(true);drawRouteStops(false);},350);};
  const originalUpdateDrivingView=updateDrivingView;
  updateDrivingView=function(){originalUpdateDrivingView();updateStreetPanel();updateSummaryPanel();drawRouteStops(false);};

  installUI();
  drawRouteStops(false);
  window.ShelterProNavigation={openNavigationChoice,refreshRoadNavigation,fitRoute:()=>drawRouteStops(true)};
})();

(function(){
  "use strict";
  const LOCAL_VERSION="3.0.3";
  const LOCAL_BUILD="2026.08.01.303";
  const VERSION_URL="./version.json";
  const byId=id=>document.getElementById(id);
  const parts=v=>String(v||"0").split(/[.-]/).map(x=>parseInt(x,10)||0);
  let checking=false;
  function newer(remote,local){const a=parts(remote),b=parts(local),n=Math.max(a.length,b.length);for(let i=0;i<n;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return false;}
  function setVersionText(){if(byId("currentAppVersion"))byId("currentAppVersion").textContent=LOCAL_VERSION;if(byId("currentBuildNumber"))byId("currentBuildNumber").textContent=LOCAL_BUILD;}
  function safeText(v){return String(v||"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[c]));}
  function closeModal(){byId("updateModal")?.classList.remove("open");}
  function showUpdate(info){const modal=byId("updateModal");if(!modal)return;byId("updateVersion").textContent=info.version||"New version";byId("updateBuild").textContent=info.build?`Build ${info.build}`:"";const list=byId("updateNotes");if(list)list.innerHTML=(info.notes||[]).map(n=>`<li>${safeText(n)}</li>`).join("");const now=byId("updateNow");if(now){now.textContent="Close";now.disabled=false;}const note=modal.querySelector('.update-data-note');if(note)note.textContent="Close Shelter Pro completely, wait 5 seconds, then reopen it from the Home Screen or browser to load the published update.";modal.classList.add("open");}
  async function fetchVersion(){const u=new URL(VERSION_URL,location.href);u.searchParams.set('t',Date.now());const r=await fetch(u,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error(`Version check failed (${r.status})`);return r.json();}
  async function checkForUpdates(manual=true){if(checking)return false;checking=true;const status=byId('updateCheckStatus'),button=byId('checkUpdates');if(button){button.disabled=true;button.textContent='Checking…';}if(status)status.textContent='Checking GitHub Pages for the latest Shelter Pro version…';try{const info=await fetchVersion();const latest=info.version||LOCAL_VERSION;if(newer(latest,LOCAL_VERSION)){if(status)status.textContent=`Update available: version ${latest}. Close and reopen Shelter Pro to load it.`;if(manual)showUpdate(info);return true;}if(status)status.textContent=`You are using the latest published version (${latest}).`;if(manual)alert(`Shelter Pro is up to date.\n\nInstalled: ${LOCAL_VERSION}\nLatest published: ${latest}`);return false;}catch(e){console.warn(e);if(status)status.textContent='Could not check for updates. Check your internet connection and try again.';if(manual)alert('Shelter Pro could not check for updates.');return false;}finally{checking=false;if(button){button.disabled=false;button.textContent='Check Now';}}}
  function wire(){setVersionText();byId('updateNow')?.addEventListener('click',closeModal);byId('updateLater')?.addEventListener('click',closeModal);byId('checkUpdates')?.addEventListener('click',()=>checkForUpdates(true));const status=byId('updateCheckStatus');if(status)status.textContent='Tap Check Now to compare with the latest published version.';}
  window.ShelterProUpdater={check:checkForUpdates,version:LOCAL_VERSION,build:LOCAL_BUILD};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();

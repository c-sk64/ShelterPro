(function(){
  "use strict";
  const LOCAL_VERSION="2.5.4";
  const LOCAL_BUILD="2026.08.01.254";
  const VERSION_URL="version.json";
  const byId=id=>document.getElementById(id);
  const parts=v=>String(v||"0").split(/[.-]/).map(x=>parseInt(x,10)||0);
  function newer(remote,local){
    const a=parts(remote),b=parts(local),n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}
    return false;
  }
  function setVersionText(){
    const v=byId("currentAppVersion"),b=byId("currentBuildNumber");
    if(v)v.textContent=LOCAL_VERSION;
    if(b)b.textContent=LOCAL_BUILD;
  }
  function showUpdate(info){
    const modal=byId("updateModal"); if(!modal)return;
    byId("updateVersion").textContent=info.version||"New version";
    byId("updateBuild").textContent=info.build?`Build ${info.build}`:"";
    const list=byId("updateNotes");
    list.innerHTML=(info.notes||[]).map(n=>`<li>${String(n).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}</li>`).join("");
    modal.classList.add("open");
    modal.dataset.version=info.version||"";
  }
  async function fetchVersion(){
    const url=`${VERSION_URL}?t=${Date.now()}`;
    const r=await fetch(url,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
    if(!r.ok)throw new Error(`Version check failed (${r.status})`);
    return r.json();
  }
  async function checkForUpdates(manual=false){
    const status=byId("updateCheckStatus");
    if(status&&manual)status.textContent="Checking…";
    try{
      const info=await fetchVersion();
      if(newer(info.version,LOCAL_VERSION)){showUpdate(info);if(status)status.textContent=`Version ${info.version} is available.`;return true;}
      if(status&&manual)status.textContent=`Latest published: ${info.version||LOCAL_VERSION}. Installed: ${LOCAL_VERSION}. You are up to date.`;
      return false;
    }catch(err){
      console.warn("Shelter Pro update check:",err);
      if(status&&manual)status.textContent="Could not check for updates. Check your internet connection.";
      return false;
    }
  }
  async function installUpdate(){
    const btn=byId("updateNow"); if(btn){btn.disabled=true;btn.textContent="Updating…";}
    try{
      sessionStorage.setItem("shelterProUpdated","1");
      if("caches" in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}
      if("serviceWorker" in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        for(const reg of regs){
          try{await reg.update();if(reg.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});}catch(_){ }
        }
      }
      const target=byId("updateModal")?.dataset.version||Date.now();
      location.replace(`${location.pathname}?updated=${encodeURIComponent(target)}${location.hash||""}`);
    }catch(err){
      console.error(err);
      if(btn){btn.disabled=false;btn.textContent="Update Now";}
      alert("The update could not be installed. Please try again.");
    }
  }
  function wire(){
    setVersionText();
    byId("updateNow")?.addEventListener("click",installUpdate);
    byId("updateLater")?.addEventListener("click",()=>byId("updateModal")?.classList.remove("open"));
    byId("checkUpdates")?.addEventListener("click",()=>checkForUpdates(true));
    if(sessionStorage.getItem("shelterProUpdated")==="1"){
      sessionStorage.removeItem("shelterProUpdated");
      const toast=byId("updateToast");if(toast){toast.textContent=`Shelter Pro updated to ${LOCAL_VERSION}`;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),4500);}
    }
    setTimeout(()=>checkForUpdates(false),1800);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")checkForUpdates(false);});
  }
  window.ShelterProUpdater={check:checkForUpdates,version:LOCAL_VERSION,build:LOCAL_BUILD};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire);else wire();
})();

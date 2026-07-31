(function(){
  "use strict";

  const LOCAL_VERSION="2.5.5";
  const LOCAL_BUILD="2026.08.01.255";
  const VERSION_URL="./version.json";
  const byId=id=>document.getElementById(id);
  const parts=v=>String(v||"0").split(/[.-]/).map(x=>parseInt(x,10)||0);

  function newer(remote,local){
    const a=parts(remote),b=parts(local),n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++){
      if((a[i]||0)>(b[i]||0))return true;
      if((a[i]||0)<(b[i]||0))return false;
    }
    return false;
  }

  function setVersionText(){
    const version=byId("currentAppVersion");
    const build=byId("currentBuildNumber");
    if(version)version.textContent=LOCAL_VERSION;
    if(build)build.textContent=LOCAL_BUILD;
  }

  function safeText(value){
    return String(value||"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  function showUpdate(info){
    const modal=byId("updateModal");
    if(!modal)return;
    byId("updateVersion").textContent=info.version||"New version";
    byId("updateBuild").textContent=info.build?`Build ${info.build}`:"";
    const list=byId("updateNotes");
    if(list)list.innerHTML=(info.notes||[]).map(note=>`<li>${safeText(note)}</li>`).join("");
    modal.dataset.version=info.version||"";
    modal.dataset.build=info.build||"";
    modal.classList.add("open");
  }

  async function fetchVersion(){
    const url=new URL(VERSION_URL,window.location.href);
    url.searchParams.set("updateCheck",Date.now().toString());
    const response=await fetch(url.toString(),{
      cache:"no-store",
      credentials:"same-origin",
      headers:{"Cache-Control":"no-cache, no-store, must-revalidate","Pragma":"no-cache"}
    });
    if(!response.ok)throw new Error(`Version check failed (${response.status})`);
    return response.json();
  }

  async function checkForUpdates(manual=false){
    const status=byId("updateCheckStatus");
    const button=byId("checkUpdates");
    if(button&&manual){button.disabled=true;button.textContent="Checking…";}
    if(status&&manual)status.textContent="Checking GitHub Pages for the latest Shelter Pro version…";

    try{
      const info=await fetchVersion();
      const latest=info.version||LOCAL_VERSION;
      if(newer(latest,LOCAL_VERSION)){
        if(status)status.textContent=`Update available: version ${latest}. Installed: ${LOCAL_VERSION}.`;
        showUpdate(info);
        return true;
      }
      if(status)status.textContent=`You are using the latest published version (${latest}).`;
      if(manual)alert(`Shelter Pro is up to date.\n\nInstalled: ${LOCAL_VERSION}\nLatest published: ${latest}`);
      return false;
    }catch(error){
      console.warn("Shelter Pro update check:",error);
      if(status)status.textContent="Could not check GitHub Pages. Check your internet connection and try again.";
      if(manual)alert("Shelter Pro could not check for updates. Please check your internet connection and try again.");
      return false;
    }finally{
      if(button&&manual){button.disabled=false;button.textContent="Check Now";}
    }
  }

  async function clearAppCaches(){
    if(!("caches" in window))return;
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("shelter-pro-")).map(key=>caches.delete(key)));
  }

  async function removeServiceWorkers(){
    if(!("serviceWorker" in navigator))return;
    const registrations=await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async registration=>{
      try{
        if(registration.waiting)registration.waiting.postMessage({type:"SKIP_WAITING"});
        await registration.update();
        await registration.unregister();
      }catch(error){console.warn("Service worker refresh:",error);}
    }));
  }

  async function installUpdate(){
    const button=byId("updateNow");
    const later=byId("updateLater");
    if(button){button.disabled=true;button.textContent="Installing…";}
    if(later)later.disabled=true;

    try{
      const targetVersion=byId("updateModal")?.dataset.version||Date.now().toString();
      sessionStorage.setItem("shelterProUpdatedTo",targetVersion);

      // Important for iPhone Home Screen PWAs: remove the old worker and its cache,
      // then reopen the same GitHub Pages URL with a unique query string.
      await clearAppCaches();
      await removeServiceWorkers();

      const freshUrl=new URL(window.location.href);
      freshUrl.searchParams.set("shelterProUpdate",targetVersion);
      freshUrl.searchParams.set("cacheBust",Date.now().toString());
      window.location.replace(freshUrl.toString());
    }catch(error){
      console.error("Shelter Pro update install:",error);
      if(button){button.disabled=false;button.textContent="Update Now";}
      if(later)later.disabled=false;
      alert("The update could not be installed. Close Shelter Pro, reopen it, and press Check Now again.");
    }
  }

  function showUpdatedToast(){
    const updatedTo=sessionStorage.getItem("shelterProUpdatedTo");
    if(!updatedTo)return;
    sessionStorage.removeItem("shelterProUpdatedTo");
    const toast=byId("updateToast");
    if(toast){
      toast.textContent=`Shelter Pro updated to ${LOCAL_VERSION}`;
      toast.classList.add("show");
      setTimeout(()=>toast.classList.remove("show"),5000);
    }
  }

  function wire(){
    setVersionText();
    byId("updateNow")?.addEventListener("click",installUpdate);
    byId("updateLater")?.addEventListener("click",()=>byId("updateModal")?.classList.remove("open"));
    byId("checkUpdates")?.addEventListener("click",()=>checkForUpdates(true));
    showUpdatedToast();
    setTimeout(()=>checkForUpdates(false),1800);
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible")checkForUpdates(false);
    });
  }

  window.ShelterProUpdater={check:checkForUpdates,version:LOCAL_VERSION,build:LOCAL_BUILD,install:installUpdate};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire);else wire();
})();

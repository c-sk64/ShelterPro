(function(){
  "use strict";

  const LOCAL_VERSION="2.5.8";
  const LOCAL_BUILD="2026.08.01.258";
  const VERSION_URL="./version.json";
  const RELOAD_GUARD="shelterProUpdateReloading";
  const byId=id=>document.getElementById(id);
  const parts=v=>String(v||"0").split(/[.-]/).map(x=>parseInt(x,10)||0);
  let checking=false;
  let installing=false;

  function newer(remote,local){
    const a=parts(remote),b=parts(local),n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++){
      if((a[i]||0)>(b[i]||0))return true;
      if((a[i]||0)<(b[i]||0))return false;
    }
    return false;
  }

  function setVersionText(){
    if(byId("currentAppVersion"))byId("currentAppVersion").textContent=LOCAL_VERSION;
    if(byId("currentBuildNumber"))byId("currentBuildNumber").textContent=LOCAL_BUILD;
  }

  function safeText(value){
    return String(value||"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  function closeModal(){byId("updateModal")?.classList.remove("open");}

  function showUpdate(info){
    const modal=byId("updateModal");
    if(!modal)return;
    byId("updateVersion").textContent=info.version||"New version";
    byId("updateBuild").textContent=info.build?`Build ${info.build}`:"";
    const list=byId("updateNotes");
    if(list)list.innerHTML=(info.notes||[]).map(note=>`<li>${safeText(note)}</li>`).join("");
    modal.dataset.version=info.version||"";
    modal.classList.add("open");
  }

  async function fetchVersion(){
    const url=new URL(VERSION_URL,window.location.href);
    url.searchParams.set("t",Date.now().toString());
    const response=await fetch(url.toString(),{cache:"no-store",credentials:"same-origin"});
    if(!response.ok)throw new Error(`Version check failed (${response.status})`);
    return response.json();
  }

  async function checkForUpdates(manual=true){
    if(checking)return false;
    checking=true;
    const status=byId("updateCheckStatus"),button=byId("checkUpdates");
    if(button){button.disabled=true;button.textContent="Checking…";}
    if(status)status.textContent="Checking GitHub Pages for the latest Shelter Pro version…";
    try{
      const info=await fetchVersion();
      const latest=info.version||LOCAL_VERSION;
      if(newer(latest,LOCAL_VERSION)){
        if(status)status.textContent=`Update available: version ${latest}. Installed: ${LOCAL_VERSION}.`;
        if(manual)showUpdate(info);
        return true;
      }
      if(status)status.textContent=`You are using the latest published version (${latest}).`;
      if(manual)alert(`Shelter Pro is up to date.\n\nInstalled: ${LOCAL_VERSION}\nLatest published: ${latest}`);
      return false;
    }catch(error){
      console.warn("Shelter Pro update check:",error);
      if(status)status.textContent="Could not check for updates. Check your internet connection and try again.";
      if(manual)alert("Shelter Pro could not check for updates. Please check your internet connection and try again.");
      return false;
    }finally{
      checking=false;
      if(button){button.disabled=false;button.textContent="Check Now";}
    }
  }

  function reloadLatest(){
    if(sessionStorage.getItem(RELOAD_GUARD)==="1")return;
    sessionStorage.setItem(RELOAD_GUARD,"1");
    const url=new URL(window.location.href);
    url.searchParams.set("updated",Date.now().toString());
    window.location.replace(url.toString());
  }

  async function installUpdate(){
    if(installing)return;
    installing=true;
    const button=byId("updateNow"),later=byId("updateLater");
    if(button){button.disabled=true;button.textContent="Updating…";}
    if(later)later.disabled=true;
    try{
      if(!("serviceWorker" in navigator)){
        closeModal();
        reloadLatest();
        return;
      }

      let registration=await navigator.serviceWorker.getRegistration();
      if(!registration){
        registration=await navigator.serviceWorker.register("./service-worker.js?v=2.5.8",{updateViaCache:"none"});
      }

      const changed=new Promise(resolve=>{
        let done=false;
        const finish=()=>{if(done)return;done=true;resolve();};
        navigator.serviceWorker.addEventListener("controllerchange",finish,{once:true});
        setTimeout(finish,5000);
      });

      await registration.update();
      const worker=registration.waiting||registration.installing;
      if(worker){
        worker.postMessage({type:"SKIP_WAITING"});
      }
      await changed;
      closeModal();
      reloadLatest();
    }catch(error){
      console.error("Shelter Pro update:",error);
      alert("The update could not be installed. Please close Shelter Pro, reopen it, and try Check Now again.");
    }finally{
      installing=false;
      if(button){button.disabled=false;button.textContent="Update Now";}
      if(later)later.disabled=false;
    }
  }

  function wire(){
    sessionStorage.removeItem(RELOAD_GUARD);
    setVersionText();
    byId("updateNow")?.addEventListener("click",installUpdate);
    byId("updateLater")?.addEventListener("click",closeModal);
    byId("checkUpdates")?.addEventListener("click",()=>checkForUpdates(true));
    const status=byId("updateCheckStatus");
    if(status)status.textContent="Tap Check Now to compare with the latest published version.";
  }

  window.ShelterProUpdater={check:checkForUpdates,version:LOCAL_VERSION,build:LOCAL_BUILD,install:installUpdate};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});else wire();
})();

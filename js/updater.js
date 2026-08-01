(function(){
  "use strict";

  const LOCAL_VERSION="2.5.6";
  const LOCAL_BUILD="2026.08.01.256";
  const VERSION_URL="./version.json";
  const LAST_CHECK_KEY="shelterProLastUpdateCheck";
  const AUTO_CHECK_INTERVAL=24*60*60*1000;
  const byId=id=>document.getElementById(id);
  const parts=v=>String(v||"0").split(/[.-]/).map(x=>parseInt(x,10)||0);
  let checking=false;

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
    const response=await fetch(url.toString(),{
      cache:"no-store",
      credentials:"same-origin",
      headers:{"Cache-Control":"no-cache, no-store, must-revalidate","Pragma":"no-cache"}
    });
    if(!response.ok)throw new Error(`Version check failed (${response.status})`);
    return response.json();
  }

  async function checkForUpdates(manual=false){
    if(checking)return false;
    checking=true;
    const status=byId("updateCheckStatus"),button=byId("checkUpdates");
    if(button&&manual){button.disabled=true;button.textContent="Checking…";}
    if(status&&manual)status.textContent="Checking GitHub Pages for the latest Shelter Pro version…";
    try{
      const info=await fetchVersion();
      localStorage.setItem(LAST_CHECK_KEY,String(Date.now()));
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
      if(button&&manual){button.disabled=false;button.textContent="Check Now";}
    }
  }

  async function installUpdate(){
    const button=byId("updateNow"),later=byId("updateLater"),modal=byId("updateModal");
    const targetVersion=modal?.dataset.version||"the new version";
    if(button){button.disabled=true;button.textContent="Preparing…";}
    if(later)later.disabled=true;
    try{
      if("serviceWorker" in navigator){
        const registration=await navigator.serviceWorker.getRegistration();
        if(registration){
          await registration.update();
          if(registration.waiting)registration.waiting.postMessage({type:"SKIP_WAITING"});
        }
      }
      closeModal();
      const status=byId("updateCheckStatus");
      if(status)status.textContent=`Version ${targetVersion} is ready to activate. Close Shelter Pro completely and reopen it.`;
      alert(`Shelter Pro ${targetVersion} is ready.\n\nOn iPhone:\n1. Swipe up and close Shelter Pro completely.\n2. Wait 5 seconds.\n3. Reopen Shelter Pro from the Home Screen.\n\nYour jobs, route, favourites and settings will remain saved.`);
    }catch(error){
      console.error("Shelter Pro update preparation:",error);
      alert("The update could not be prepared. Keep using this version and try again later.");
    }finally{
      if(button){button.disabled=false;button.textContent="Update Now";}
      if(later)later.disabled=false;
    }
  }

  function maybeAutoCheck(){
    const last=Number(localStorage.getItem(LAST_CHECK_KEY)||0);
    if(Date.now()-last<AUTO_CHECK_INTERVAL)return;
    setTimeout(()=>checkForUpdates(false),5000);
  }

  function wire(){
    setVersionText();
    byId("updateNow")?.addEventListener("click",installUpdate);
    byId("updateLater")?.addEventListener("click",closeModal);
    byId("checkUpdates")?.addEventListener("click",()=>checkForUpdates(true));
    maybeAutoCheck();
  }

  window.ShelterProUpdater={check:checkForUpdates,version:LOCAL_VERSION,build:LOCAL_BUILD,install:installUpdate};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});else wire();
})();

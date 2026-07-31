(function(){
  const META_KEY='shelter_pro_csv_meta_v1';

  function parseCSV(text){
    const rows=[]; let row=[], cell='', quoted=false;
    text=String(text||'').replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){
      const ch=text[i], next=text[i+1];
      if(ch==='"'){
        if(quoted && next==='"'){cell+='"';i++;}
        else quoted=!quoted;
      }else if(ch===',' && !quoted){row.push(cell);cell='';}
      else if((ch==='\n'||ch==='\r') && !quoted){
        if(ch==='\r' && next==='\n')i++;
        row.push(cell); cell='';
        if(row.some(v=>String(v).trim()!==''))rows.push(row);
        row=[];
      }else cell+=ch;
    }
    if(cell.length||row.length){row.push(cell);if(row.some(v=>String(v).trim()!==''))rows.push(row);}
    return rows;
  }

  function normaliseHeader(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
  function repairText(v){
    return String(v||'')
      .replace(/â€“|â€”/g,'–')
      .replace(/â€˜|â€™/g,"'")
      .replace(/â€œ|â€/g,'"')
      .replace(/Â /g,' ');
  }

  async function readCsvText(file){
    const buffer=await file.arrayBuffer();
    let text=new TextDecoder('utf-8',{fatal:false}).decode(buffer);
    if(/â€“|â€”|�/.test(text)){
      try{text=new TextDecoder('windows-1252').decode(buffer)}catch(e){}
    }
    return repairText(text);
  }

  async function importVwork(file,replace){
    if(!file){alert('Select a CSV file first.');return;}
    try{
      const rows=parseCSV(await readCsvText(file));
      if(rows.length<2)throw new Error('The file has no job rows.');
      const headers=rows[0].map(normaliseHeader);
      const assetIndex=headers.indexOf('asset name');
      const workerIndex=headers.indexOf('worker');
      const customerIndex=headers.indexOf('customer');
      if(assetIndex<0)throw new Error('The Asset Name column was not found.');

      const found=[],missing=[]; let worker='',customer='';
      for(const row of rows.slice(1)){
        const id=repairText(row[assetIndex]).trim();
        if(!id||/^(total|summary)/i.test(id))continue;
        const matched=SITES.find(s=>String(s.id).toLowerCase()===id.toLowerCase());
        if(matched)found.push(matched.id); else missing.push(id);
        if(!worker&&workerIndex>=0)worker=repairText(row[workerIndex]).trim();
        if(!customer&&customerIndex>=0)customer=repairText(row[customerIndex]).trim();
      }

      const unique=[...new Set(found)];
      if(!unique.length)throw new Error('No CSV site numbers matched the shelter database.');
      if(!window.ShelterProWorkflow)throw new Error('Shelter Pro workflow is not ready. Refresh and try again.');
      window.ShelterProWorkflow.setImportedJobs(unique,replace);

      const meta={file:file.name,worker,customer,imported:new Date().toISOString(),matched:unique.length,missing:[...new Set(missing)]};
      localStorage.setItem(META_KEY,JSON.stringify(meta));
      showMeta(meta);
      alert('Imported '+unique.length+' jobs.'+(meta.missing.length?' '+meta.missing.length+' sites were not found in the map database.':''));
    }catch(err){alert('CSV import failed: '+err.message);}
  }

  function showMeta(meta){
    const el=document.getElementById('csvSummary'); if(!el)return;
    if(!meta){el.textContent='No CSV imported yet.';return;}
    const when=new Date(meta.imported).toLocaleString();
    el.innerHTML='<strong>'+escapeHtml(meta.file||'CSV')+'</strong><br>'+escapeHtml(meta.worker||'Worker not detected')+' · '+escapeHtml(meta.customer||'Customer not detected')+'<br>'+meta.matched+' matched · '+meta.missing.length+' not found · '+escapeHtml(when);
  }
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  window.addEventListener('load',()=>{
    const file=document.getElementById('csvFile');
    document.getElementById('importCsvReplace')?.addEventListener('click',()=>importVwork(file?.files?.[0],true));
    document.getElementById('importCsvAdd')?.addEventListener('click',()=>importVwork(file?.files?.[0],false));
    try{showMeta(JSON.parse(localStorage.getItem(META_KEY)||'null'));}catch(e){showMeta(null);}
    const mute=document.getElementById('driveMute');
    if(mute)mute.addEventListener('click',()=>{
      driveSettings.voice=!driveSettings.voice;
      driveSettings.vibrate=driveSettings.voice?driveSettings.vibrate:false;
      localStorage.setItem('shelter_pro_drive_settings',JSON.stringify(driveSettings));
      mute.textContent=driveSettings.voice?'🔊 Sound':'🔇 Muted';
      if(window.speechSynthesis)window.speechSynthesis.cancel();
    });
  });
})();

window.routeList=[];
function addToRoute(id,address){
 routeList.push({id,address});
 renderRoute();
}
function renderRoute(){
 let p=document.getElementById('routePanel');
 if(!p){
   p=document.createElement('div');p.id='routePanel';p.className='route-panel';
   document.body.appendChild(p);
 }
 p.innerHTML='<h3>🚗 Route ('+routeList.length+')</h3><ol>'+routeList.map(r=>'<li>'+r.id+'<br><small>'+r.address+'</small></li>').join('')+'</ol><button onclick="routeList=[];renderRoute()">Clear Route</button>';
}

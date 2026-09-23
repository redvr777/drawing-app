export function setupUI(e){
  const $=s=>document.querySelector(s);
  const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1600)};
  const openFile=(project)=>{const i=project?$("#projectInput"):$("#fileInput");i.onchange=()=>{const f=i.files[0];if(!f)return;project?e.openProject(f):e.openImage(f);i.value=""};i.click()};
  $("#preset").onchange=ev=>{if(ev.target.value!=="custom"){const [w,h]=ev.target.value.split("x");$("#newW").value=w;$("#newH").value=h}};
  $("#createBtn").onclick=()=>{e.newDocument(+$("#newW").value,+$("#newH").value,$("#newBg").value,$("#transparent").checked);$("#startModal").classList.remove("open")};
  $("#openImageStart").onclick=()=>openFile(false);$("#openProjectStart").onclick=()=>openFile(true);
  $("#size").oninput=x=>{e.size=+x.target.value;$("#sizeOut").textContent=e.size};$("#opacity").oninput=x=>{e.opacity=+x.target.value/100;$("#opacityOut").textContent=x.target.value+"%"};$("#hardness").oninput=x=>$("#hardnessOut").textContent=x.target.value+"%";$("#flow").oninput=x=>{e.flow=+x.target.value/100;$("#flowOut").textContent=x.target.value+"%"};
  document.querySelectorAll(".tool").forEach(b=>b.onclick=()=>e.setTool(b.dataset.tool));
  $("#fillMode").onclick=x=>x.target.classList.toggle("active");
  $("#undoBtn").onclick=()=>e.history.undo();$("#redoBtn").onclick=()=>e.history.redo();$("#saveBtn").onclick=()=>e.save();
  $("#newLayer").onclick=()=>{e.layers.add();e.render();e.snapshot("New Layer")};$("#newGroup").onclick=()=>{e.layers.addGroup();e.snapshot("New Group")};$("#deleteLayer").onclick=()=>e.layers.remove();$("#duplicateLayer").onclick=()=>e.layers.duplicate();$("#layerUp").onclick=()=>e.layers.move(1);$("#layerDown").onclick=()=>e.layers.move(-1);
  $("#layerOpacity").oninput=x=>{const l=e.activeLayer();if(l){l.opacity=+x.target.value/100;e.render()}};
  $("#swapColors").onclick=()=>{[e.color,e.bgColor]=[e.bgColor,e.color];syncColor()};$("#defaultColors").onclick=()=>{e.color="#000000";e.bgColor="#ffffff";syncColor()};
  $("#hue").oninput=()=>updateSV();$("#sv").onclick=ev=>{const r=ev.currentTarget.getBoundingClientRect();const s=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));const v=1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));const h=+$("#hue").value;e.color=hsvHex(h,s,v);syncColor()};
  $("#hex").onchange=()=>{let v=$("#hex").value;if(/^#[0-9a-f]{6}$/i.test(v)){e.color=v;syncColor()}};
  $("#alpha").onchange=()=>e.opacity=Math.max(0,Math.min(100,+$("#alpha").value))/100;
  $("#addPalette").onclick=()=>addColor(e.color);$("#clearPalette").onclick=()=>$("#recentColors").innerHTML="";
  $("#zoomIn").onclick=()=>e.setZoom(e.zoom*1.15);$("#zoomOut").onclick=()=>e.setZoom(e.zoom/1.15);$("#fitBtn").onclick=()=>e.fit();
  $("#fontWrap").classList.add("hidden");
  $("#textCancel").onclick=()=>$("#textModal").classList.remove("open");
  $("#textApply").onclick=()=>{const t=$("#textValue").value;if(t){e.addText(t,e.tools.textPoint.x,e.tools.textPoint.y,+$("#modalFontSize").value,$("#font").value,$("#bold").checked,$("#italic").checked)}$("#textValue").value="";$("#textModal").classList.remove("open")};
  document.querySelectorAll(".menus button").forEach(b=>b.onclick=()=>menu(b.dataset.menu,b));
  document.addEventListener("keydown",ev=>{if(ev.target.matches("input,textarea,select"))return;const k=ev.key.toLowerCase(),mod=ev.ctrlKey||ev.metaKey;if(mod&&k==="z"){ev.preventDefault();e.history.undo()}else if(mod&&(k==="y"||ev.shiftKey&&k==="z")){ev.preventDefault();e.history.redo()}else if(mod&&k==="s"){ev.preventDefault();ev.shiftKey?e.saveAs():e.save()}else if(mod&&k==="o"){ev.preventDefault();openFile(false)}else if(mod&&k==="n"){ev.preventDefault();$("#startModal").classList.add("open")}else if(k==="b")e.setTool("brush");else if(k==="e")e.setTool("eraser");else if(k==="p")e.setTool("pencil");else if(k==="g")e.setTool("fill");else if(k==="i")e.setTool("picker");else if(k==="t")e.setTool("text");else if(k==="m")e.setTool("move");else if(k==="r")e.setTool("rectangle");else if(k==="l")e.setTool("line");else if(k==="escape"){e.tools.poly=[];e.drawOverlay()}});
  $("#canvasArea").addEventListener("wheel",ev=>{if(ev.ctrlKey||true){ev.preventDefault();e.setZoom(e.zoom*(ev.deltaY<0?1.08:.925))}},{passive:false});
  $("#canvasArea").addEventListener("pointerdown",ev=>{if(ev.button===1){ev.preventDefault()}});
  document.addEventListener("dblclick",ev=>{if(e.tool==="polygon")e.tools.finishPolygon()});
  function syncColor(){ $("#hex").value=e.color;$("#fg").style.background=e.color;$("#bg").style.background=e.bgColor;updateSV() }
  function updateSV(){const h=+$("#hue").value;$("#sv").style.background=`linear-gradient(to right,#fff,rgba(255,255,255,0)),linear-gradient(to top,#000,transparent),hsl(${h},100%,50%)`;}
  function hsvHex(h,s,v){const f=(n,k=(n+h/60)%6)=>v-v*s*Math.max(Math.min(k,4-k,1),0);return "#"+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,"0")).join("")}
  function addColor(c){const b=document.createElement("button");b.style.background=c;b.title=c;b.onclick=()=>{e.color=c;syncColor()};$("#recentColors").append(b)}
  function menu(type,anchor){
    const cm=$("#contextMenu");cm.innerHTML="";const items={file:[["New",()=>$("#startModal").classList.add("open")],["Open Project",()=>openFile(true)],["Open Image",()=>openFile(false)],["Save",()=>e.save()],["Save As",()=>e.saveAs()],["Export PNG",()=>e.export("png")],["Export JPG",()=>e.export("jpg")],["Export WEBP",()=>e.export("webp")]],edit:[["Undo",()=>e.history.undo()],["Redo",()=>e.history.redo()],["Duplicate Layer",()=>e.layers.duplicate()]],image:[["Fit Canvas",()=>e.fit()],["Reset Rotation",()=>{e.rotation=0;e.applyView()}]],layer:[["New Layer",()=>e.layers.add()],["Duplicate Layer",()=>e.layers.duplicate()],["Delete Layer",()=>e.layers.remove()]],select:[["Select All",()=>{e.selection={x:0,y:0,w:e.width,h:e.height};e.drawOverlay();e.octx.strokeStyle="#fff";e.octx.setLineDash([5,4]);e.octx.strokeRect(0,0,e.width,e.height)}],["Deselect",()=>{e.selection=null;e.drawOverlay()}]],view:[["Zoom In",()=>e.setZoom(e.zoom*1.2)],["Zoom Out",()=>e.setZoom(e.zoom/1.2)],["Fit",()=>e.fit()]],help:[["Shortcuts",()=>alert("B Brush • E Eraser • P Pencil • G Fill • I Picker • T Text • M Move • R Rectangle • L Line • Ctrl+Z Undo • Ctrl+Y Redo • Ctrl+S Save")]]};for(const [label,fn] of items[type]||[]){const b=document.createElement("button");b.textContent=label;b.onclick=()=>{cm.classList.add("hidden");fn()};cm.append(b)}const r=anchor.getBoundingClientRect();cm.style.left=r.left+"px";cm.style.top=(r.bottom+3)+"px";cm.classList.remove("hidden")}
  document.addEventListener("click",ev=>{if(!ev.target.closest(".menus")&&!ev.target.closest("#contextMenu"))$("#contextMenu").classList.add("hidden")});
  e.newDocument(1920,1080,"#ffffff",false);syncColor();
}

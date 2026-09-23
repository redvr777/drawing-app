class LayerManager{
  constructor(editor){this.e=editor;this.items=[];this.selected=0}
  reset(){this.items=[];this.add("Background");this.selected=0}
  make(name,type="layer"){if(type==="group")return {id:crypto.randomUUID(),name,type,visible:true,locked:false,opacity:1,children:[]};const c=document.createElement("canvas");c.width=this.e.width*(devicePixelRatio||1);c.height=this.e.height*(devicePixelRatio||1);c.style.width=this.e.width+"px";c.style.height=this.e.height+"px";const x=c.getContext("2d");x.setTransform(devicePixelRatio||1,0,0,devicePixelRatio||1,0,0);return {id:crypto.randomUUID(),name,type,visible:true,locked:false,opacity:1,blend:"source-over",canvas:c}}
  add(name="Layer"){const l=this.make(name);this.items.push(l);this.selected=this.items.length-1;this.ui();return l}
  addGroup(name="Group"){const g=this.make(name,"group");this.items.push(g);this.selected=this.items.length-1;this.ui();return g}
  active(){return this.items[this.selected]}
  select(i){if(i>=0&&i<this.items.length)this.selected=i;this.ui();this.e.render()}
  remove(){if(this.items.length<=1)return;this.items.splice(this.selected,1);this.selected=Math.max(0,this.selected-1);this.ui();this.e.render();this.e.snapshot("Delete Layer")}
  duplicate(){const l=this.active();if(!l||l.type!=="layer")return;const n=this.make(l.name+" copy");n.opacity=l.opacity;n.blend=l.blend;n.visible=l.visible;n.canvas.getContext("2d").drawImage(l.canvas,0,0);this.items.splice(this.selected+1,0,n);this.selected++;this.ui();this.e.render();this.e.snapshot("Duplicate Layer")}
  move(d){const i=this.selected,j=i+d;if(j<0||j>=this.items.length)return;[this.items[i],this.items[j]]=[this.items[j],this.items[i]];this.selected=j;this.ui();this.e.render();this.e.snapshot("Move Layer")}
  composite(ctx){for(const l of this.items){if(!l.visible||l.type!=="layer")continue;ctx.save();ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(l.canvas,0,0,this.e.width,this.e.height);ctx.restore()}}
  serialize(){return this.items.map(l=>{if(l.type==="group")return {...l,children:[]};return {id:l.id,name:l.name,type:l.type,visible:l.visible,locked:l.locked,opacity:l.opacity,blend:l.blend,data:l.canvas.toDataURL("image/png")}})}
  async restore(arr){this.items=[];for(const d of arr){if(d.type==="group"){this.items.push({...d,children:[]});continue}const l=this.make(d.name);l.id=d.id;l.visible=d.visible;l.locked=d.locked;l.opacity=d.opacity;l.blend=d.blend;const img=new Image();await new Promise(res=>{img.onload=()=>{l.canvas.getContext("2d").drawImage(img,0,0,this.e.width,this.e.height);res()};img.src=d.data});this.items.push(l)}if(!this.items.length)this.add();this.selected=0;this.ui()}
  ui(){const box=document.querySelector("#layers");box.innerHTML="";this.items.slice().reverse().forEach((l,rev)=>{const i=this.items.length-1-rev,row=document.createElement("div");row.className="layer-row"+(i===this.selected?" selected":"");const eye=document.createElement("button");eye.className="eye";eye.textContent=l.visible?"◉":"○";eye.onclick=e=>{e.stopPropagation();l.visible=!l.visible;this.ui();this.e.render()};const lock=document.createElement("button");lock.className="lock";lock.textContent=l.locked?"🔒":"";lock.onclick=e=>{e.stopPropagation();l.locked=!l.locked;this.ui()};const th=document.createElement("canvas");th.className="layer-thumb";th.width=72;th.height=64;if(l.type==="layer")th.getContext("2d").drawImage(l.canvas,0,0,72,64);const name=document.createElement("span");name.className="layer-name";name.textContent=l.name;name.ondblclick=()=>{const n=prompt("Layer name",l.name);if(n){l.name=n;this.ui();this.e.snapshot("Rename Layer")}};row.append(eye,lock,th,name);row.onclick=()=>this.select(i);box.append(row)})}
}

class History{
  constructor(e){this.e=e;this.states=[];this.index=-1;this.max=60}
  reset(){this.states=[];this.index=-1;this.ui()}
  snapshot(name){
    const state={name,projectName:this.e.projectName,items:this.e.layers.serialize(),time:Date.now()};
    this.states=this.states.slice(0,this.index+1);this.states.push(state);if(this.states.length>this.max)this.states.shift();this.index=this.states.length-1;this.ui()
  }
  async restore(s){this.e.projectName=s.projectName;await this.e.layers.restore(s.items);this.e.render();this.ui()}
  async undo(){if(this.index<=0)return;this.index--;await this.restore(this.states[this.index])}
  async redo(){if(this.index>=this.states.length-1)return;this.index++;await this.restore(this.states[this.index])}
  ui(){const b=document.querySelector("#history");if(!b)return;b.innerHTML="";this.states.slice().reverse().forEach((s,n)=>{const d=document.createElement("div");d.className="history-row"+(this.states.length-1-n===this.index?" current":"");d.textContent=s.name;b.append(d)})}
}

class Tools{
  constructor(e){this.e=e;this.points=[];this.preview=null;this.poly=[]}
  preset(){const p=document.querySelector("#brushPreset").value;return {soft:p==="Soft Round"||p==="Airbrush",pixel:p==="Pixel Brush",pencil:p==="Pencil"}}
  begin(e){
    const t=this.e.tool,p=this.e.screenToCanvas(e);
    if(t==="picker"){this.pick(p);this.e.drawing=false;return}
    if(t==="fill"){this.fill(p);this.e.drawing=false;return}
    if(t==="text"){this.e.drawing=false;this.text(p);return}
    if(t==="polygon"){if(!this.poly.length)this.poly=[p];else this.poly.push(p);this.drawPolyPreview();return}
    if(t==="move"||t==="transform"||t==="selectRect"||t==="selectEllipse"||t==="selectLasso"){this.points=[p];return}
    this.points=[p];this.preview=null
  }
  move(e){
    const t=this.e.tool,p=this.e.screenToCanvas(e);
    if(t==="brush"||t==="pencil"||t==="eraser"){this.points.push(p);this.e.drawStroke(this.points.slice(-2),t==="eraser");return}
    if(["line","rectangle","ellipse","gradient","stencil"].includes(t)){this.preview={a:this.e.start,b:p};this.drawPreview();return}
    if(t==="selectRect"||t==="selectEllipse"||t==="selectLasso"){this.preview={a:this.e.start,b:p};this.drawPreview();return}
  }
  end(e){
    const t=this.e.tool,p=this.e.screenToCanvas(e);
    if(["line","rectangle","ellipse","gradient","stencil"].includes(t)){this.commitShape(this.e.start,p,t);this.e.snapshot(t==="stencil"?"Stencil":t[0].toUpperCase()+t.slice(1))}
    else if(t==="brush"||t==="pencil"||t==="eraser")this.e.snapshot(t==="eraser"?"Erase":"Brush Stroke");
    else if(t==="move"||t==="transform")this.moveLayer(p);
    else if(t.startsWith("select"))this.makeSelection(this.e.start,p,t);
    this.e.drawOverlay()
  }
  drawPreview(){
    const o=this.e.octx,a=this.e.start,b=this.preview.b;o.clearRect(0,0,this.e.width,this.e.height);o.save();o.strokeStyle="#67a0ff";o.setLineDash([7,5]);o.lineWidth=2;
    if(this.e.tool==="line"){o.beginPath();o.moveTo(a.x,a.y);o.lineTo(b.x,b.y);o.stroke()}
    else if(this.e.tool==="rectangle"){o.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y)}
    else if(this.e.tool==="ellipse"){o.beginPath();o.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.abs(b.x-a.x)/2,Math.abs(b.y-a.y)/2,0,0,Math.PI*2);o.stroke()}
    else if(this.e.tool==="stencil"){this.stencilPath(o,a,b);o.stroke()}
    else if(this.e.tool.startsWith("select"))o.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);o.restore()
  }
  drawPolyPreview(){const o=this.e.octx;o.clearRect(0,0,this.e.width,this.e.height);o.strokeStyle="#67a0ff";o.setLineDash([5,4]);o.beginPath();this.poly.forEach((p,i)=>i?o.lineTo(p.x,p.y):o.moveTo(p.x,p.y));o.stroke()}
  commitShape(a,b,t){
    const l=this.e.activeLayer();if(!l||l.locked)return;const c=l.canvas.getContext("2d");c.save();c.globalAlpha=this.e.opacity;c.strokeStyle=this.e.color;c.fillStyle=this.e.color;c.lineWidth=this.e.size;c.lineCap="round";
    const filled=document.querySelector("#fillMode").classList.contains("active");
    if(t==="line"){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke()}
    if(t==="rectangle"){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);filled?c.fillRect(x,y,w,h):c.strokeRect(x,y,w,h)}
    if(t==="ellipse"){c.beginPath();c.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.abs(b.x-a.x)/2,Math.abs(b.y-a.y)/2,0,0,Math.PI*2);filled?c.fill():c.stroke()}
    if(t==="gradient"){const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,this.e.color);g.addColorStop(1,this.e.bgColor);c.fillStyle=g;c.fillRect(0,0,this.e.width,this.e.height)}
    if(t==="stencil"){this.stencilPath(c,a,b);filled?c.fill():c.stroke()}
    c.restore();this.e.render()
  }
  fill(p){
    const l=this.e.activeLayer();if(!l||l.locked)return;const c=l.canvas.getContext("2d"),w=this.e.width,h=this.e.height,d=c.getImageData(0,0,w,h),x=Math.floor(p.x),y=Math.floor(p.y);if(x<0||y<0||x>=w||y>=h)return;const idx=(y*w+x)*4,target=[d.data[idx],d.data[idx+1],d.data[idx+2],d.data[idx+3]],fill=this.hexRgb(this.e.color);const tol=Number(document.querySelector("#hardness").value)*1.5;const q=[[x,y]],seen=new Uint8Array(w*h);
    const same=i=>Math.abs(d.data[i]-target[0])+Math.abs(d.data[i+1]-target[1])+Math.abs(d.data[i+2]-target[2])+Math.abs(d.data[i+3]-target[3])<=tol;
    while(q.length){const [cx,cy]=q.pop();if(cx<0||cy<0||cx>=w||cy>=h)continue;const k=cy*w+cx;if(seen[k])continue;const i=k*4;if(!same(i))continue;seen[k]=1;d.data[i]=fill[0];d.data[i+1]=fill[1];d.data[i+2]=fill[2];d.data[i+3]=Math.round(this.e.opacity*255);q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1])}
    c.putImageData(d,0,0);this.e.render();this.e.snapshot("Fill")
  }
  pick(p){const c=this.e.ctx,x=Math.floor(p.x),y=Math.floor(p.y);if(x<0||y<0||x>=this.e.width||y>=this.e.height)return;const q=c.getImageData(x,y,1,1).data;this.e.color="#"+[q[0],q[1],q[2]].map(v=>v.toString(16).padStart(2,"0")).join("");document.querySelector("#hex").value=this.e.color}
  text(p){document.querySelector("#textModal").classList.add("open");this.textPoint=p}
  makeSelection(a,b,t){this.e.selection={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y),type:t};this.e.drawOverlay();const o=this.e.octx;o.strokeStyle="#fff";o.setLineDash([6,4]);o.strokeRect(this.e.selection.x,this.e.selection.y,this.e.selection.w,this.e.selection.h)}
  moveLayer(p){const l=this.e.activeLayer();if(!l||l.locked||!this.e.start)return;const dx=p.x-this.e.start.x,dy=p.y-this.e.start.y;if(Math.abs(dx)+Math.abs(dy)<1)return;const tmp=document.createElement("canvas");tmp.width=this.e.width*(devicePixelRatio||1);tmp.height=this.e.height*(devicePixelRatio||1);tmp.getContext("2d").drawImage(l.canvas,0,0);const c=l.canvas.getContext("2d"),d=devicePixelRatio||1;c.clearRect(0,0,this.e.width,this.e.height);c.drawImage(tmp,dx*d,dy*d,this.e.width*d,this.e.height*d);this.e.render()}
  hexRgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(x=>x+x).join("");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
  finishPolygon(){if(this.poly.length<3)return;const l=this.e.activeLayer(),c=l.canvas.getContext("2d"),filled=document.querySelector("#fillMode").classList.contains("active");c.beginPath();this.poly.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();filled?c.fill():c.stroke();this.poly=[];this.e.drawOverlay();this.e.render();this.e.snapshot("Polygon")}
  stencilPath(ctx,a,b){
    const type=document.querySelector("#stencil")?.value||"circle";
    const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2, rx=Math.abs(b.x-a.x)/2, ry=Math.abs(b.y-a.y)/2;
    ctx.beginPath();
    if(type==="circle"){ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);return}
    if(type==="square"){const r=Math.min(rx,ry);ctx.rect(cx-r,cy-r,r*2,r*2);return}
    if(type==="triangle"){for(let i=0;i<3;i++){const ang=-Math.PI/2+i*Math.PI*2/3;const x=cx+Math.cos(ang)*rx,y=cy+Math.sin(ang)*ry;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();return}
    if(type==="star"){for(let i=0;i<10;i++){const ang=-Math.PI/2+i*Math.PI/5,r=i%2?0.45:1,x=cx+Math.cos(ang)*rx*r,y=cy+Math.sin(ang)*ry*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();return}
    if(type==="heart"){ctx.moveTo(cx,cy+ry*.85);ctx.bezierCurveTo(cx-rx*1.15,cy+ry*.15,cx-rx*.7,cy-ry*.7,cx-rx*.35,cy-ry*.35);ctx.bezierCurveTo(cx-rx*.1,cy-ry*.7,cx,cy-ry*.7,cx,cy-ry*.35);ctx.bezierCurveTo(cx,cy-ry*.7,cx+rx*.1,cy-ry*.7,cx+rx*.35,cy-ry*.35);ctx.bezierCurveTo(cx+rx*.7,cy-ry*.7,cx+rx*1.15,cy+ry*.15,cx,cy+ry*.85);ctx.closePath();return}
    if(type==="diamond"){ctx.moveTo(cx,cy-ry);ctx.lineTo(cx+rx,cy);ctx.lineTo(cx,cy+ry);ctx.lineTo(cx-rx,cy);ctx.closePath();return}
    if(type==="hexagon"){for(let i=0;i<6;i++){const ang=-Math.PI/2+i*Math.PI/3,x=cx+Math.cos(ang)*rx,y=cy+Math.sin(ang)*ry;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();return}
    if(type==="arrow"){ctx.moveTo(cx-rx,cy-ry*.25);ctx.lineTo(cx+rx*.05,cy-ry*.25);ctx.lineTo(cx+rx*.05,cy-ry*.7);ctx.lineTo(cx+rx,cy);ctx.lineTo(cx+rx*.05,cy+ry*.7);ctx.lineTo(cx+rx*.05,cy+ry*.25);ctx.lineTo(cx-rx,cy+ry*.25);ctx.closePath();return}
    if(type==="lightning"){ctx.moveTo(cx-rx*.15,cy-ry);ctx.lineTo(cx+rx*.2,cy-ry*.15);ctx.lineTo(cx-rx*.05,cy-ry*.1);ctx.lineTo(cx+rx*.35,cy+ry);ctx.lineTo(cx-rx*.2,cy+ry*.15);ctx.lineTo(cx+rx*.02,cy+ry*.1);ctx.closePath();return}
    if(type==="speech"){const r=Math.min(rx*.25,ry*.25);ctx.roundRect(cx-rx,cy-ry,cx?rx*2:1,ry*1.55,r);ctx.moveTo(cx-rx*.45,cy+ry*.55);ctx.lineTo(cx-rx*.65,cy+ry);ctx.lineTo(cx-rx*.05,cy+ry*.58);return}
    if(type==="cloud"){ctx.arc(cx-rx*.45,cy,rx*.38,0,Math.PI*2);ctx.arc(cx-rx*.05,cy-ry*.28,rx*.48,0,Math.PI*2);ctx.arc(cx+rx*.45,cy,rx*.38,0,Math.PI*2);return}
    ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
  }
}


class ProjectIO{
  constructor(e){this.e=e}
  payload(){return {format:"DrawForge",version:1,name:this.e.projectName,width:this.e.width,height:this.e.height,background:this.e.bg,transparent:this.e.transparent,layers:this.e.layers.serialize(),created:new Date().toISOString()}}
  async save(as){
    const data=JSON.stringify(this.payload());const name=(as||this.e.projectName==="Untitled")?(prompt("Project filename","art.draw")||"art.draw"):this.e.projectName;
    this.e.projectName=name.endsWith(".draw")?name:name+".draw";this.download(new Blob([data],{type:"application/json"}),this.e.projectName);this.e.snapshot("Save");localStorage.setItem("drawforge-last",data)
  }
  async openProject(file){try{const d=JSON.parse(await file.text());if(d.format!=="DrawForge")throw Error("Not a DrawForge project");this.e.width=d.width;this.e.height=d.height;this.e.bg=d.background;this.e.transparent=d.transparent;this.e.projectName=d.name||"Untitled";this.e.resizeCanvases();await this.e.layers.restore(d.layers);this.e.render();this.e.history.reset();this.e.snapshot("Open Project");this.e.fit()}catch(err){alert("Could not open project: "+err.message)}}
  async openImage(file){const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{this.e.newDocument(img.naturalWidth,img.naturalHeight,"#fff",true);const l=this.e.activeLayer();l.name=file.name;l.canvas.getContext("2d").drawImage(img,0,0,this.e.width,this.e.height);this.e.render();this.e.snapshot("Open Image");URL.revokeObjectURL(url)};img.onerror=()=>alert("Could not open image");img.src=url}
  export(type){
    const c=document.createElement("canvas");c.width=this.e.width;c.height=this.e.height;const x=c.getContext("2d");if(type==="jpg"){x.fillStyle=this.e.bg;x.fillRect(0,0,c.width,c.height)}this.e.render();x.drawImage(this.e.art,0,0);const mime=type==="jpg"?"image/jpeg":type==="webp"?"image/webp":"image/png";c.toBlob(b=>this.download(b,`${this.e.projectName.replace(/\.[^.]+$/,"")}.${type}`),mime,.92)
  }
  download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
}

import { LayerManager } from "./layers.js";
import { History } from "./history.js";
import { Tools } from "./tools.js";
import { ProjectIO } from "./project.js";

class Editor {
  constructor(){
    this.art=document.querySelector("#artCanvas");
    this.overlay=document.querySelector("#overlayCanvas");
    this.frame=document.querySelector("#canvasFrame");
    this.viewport=document.querySelector("#canvasViewport");
    this.ctx=this.art.getContext("2d",{willReadFrequently:true});
    this.octx=this.overlay.getContext("2d");
    this.width=0; this.height=0; this.zoom=1; this.rotation=0;
    this.bg="#ffffff"; this.transparent=false; this.tool="brush"; this.drawing=false;
    this.size=24; this.opacity=1; this.hardness=.8; this.flow=1; this.color="#000000"; this.bgColor="#ffffff";
    this.last=null; this.start=null; this.selection=null; this.projectName="Untitled";
    this.layers=new LayerManager(this); this.history=new History(this); this.tools=new Tools(this); this.io=new ProjectIO(this);
    this.bindCanvas();
  }
  newDocument(w,h,bg="#fff",transparent=false){
    this.width=Math.max(1,Math.floor(w)); this.height=Math.max(1,Math.floor(h)); this.bg=bg; this.transparent=transparent;
    this.layers.reset(); this.projectName="Untitled"; this.history.reset();
    this.resizeCanvases(); this.render(); this.history.snapshot("New Document"); this.fit();
  }
  resizeCanvases(){
    const dpr=Math.min(3,window.devicePixelRatio||1);
    for(const c of [this.art,this.overlay]){c.width=this.width*dpr;c.height=this.height*dpr;c.style.width=this.width+"px";c.style.height=this.height+"px";}
    this.ctx.setTransform(dpr,0,0,dpr,0,0); this.octx.setTransform(dpr,0,0,dpr,0,0);
    this.frame.style.width=this.width+"px";this.frame.style.height=this.height+"px";
  }
  render(){
    this.ctx.clearRect(0,0,this.width,this.height);
    if(!this.transparent){this.ctx.fillStyle=this.bg;this.ctx.fillRect(0,0,this.width,this.height);}
    this.layers.composite(this.ctx);
    this.drawOverlay();
    document.querySelector("#dimensions").textContent=`${this.width} × ${this.height}`;
  }
  drawOverlay(){this.octx.clearRect(0,0,this.width,this.height);}
  fit(){
    if(!this.width||!this.height)return;
    const r=this.viewport.getBoundingClientRect(); this.zoom=Math.min((r.width-50)/this.width,(r.height-50)/this.height);this.zoom=Math.max(.05,Math.min(8,this.zoom));this.applyView();
  }
  applyView(){this.frame.style.transform=`scale(${this.zoom}) rotate(${this.rotation}deg)`;document.querySelector("#zoomLabel").textContent=Math.round(this.zoom*100)+"%";}
  setZoom(z){this.zoom=Math.max(.05,Math.min(16,z));this.applyView()}
  screenToCanvas(e){
    const rect=this.overlay.getBoundingClientRect();
    return {x:(e.clientX-rect.left)/this.zoom,y:(e.clientY-rect.top)/this.zoom};
  }
  activeLayer(){return this.layers.active()}
  drawStroke(points,erase=false){
    const layer=this.activeLayer(); if(!layer||layer.type!=="layer")return;
    const c=layer.canvas,ctx=c.getContext("2d");
    ctx.save();ctx.globalAlpha=this.opacity*this.flow;
    if(erase)ctx.globalCompositeOperation="destination-out";
    const p=this.tools.preset();
    if(p.soft){const g=ctx.createRadialGradient(points[0].x,points[0].y,0,points[0].x,points[0].y,this.size/2);g.addColorStop(0,this.color);g.addColorStop(1,"transparent");ctx.fillStyle=g}
    else ctx.fillStyle=this.color;
    ctx.lineCap=p.pixel?"butt":"round";ctx.lineJoin="round";ctx.lineWidth=this.size;
    if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,this.size/2,0,Math.PI*2);ctx.fill()}
    else{ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.stroke()}
    ctx.restore();this.render();
  }
  begin(e){
    if(!this.width||!this.height)return;
    const layer=this.activeLayer();
    if(!layer||layer.type!=="layer"||layer.locked)return;
    this.drawing=true;
    this.start=this.screenToCanvas(e);
    this.last=this.start;
    this.tools.begin(e);
  }
  move(e){if(!this.drawing)return;this.tools.move(e)}
  end(e){if(!this.drawing)return;this.drawing=false;this.tools.end(e);this.last=null;this.start=null}
  setTool(t){this.tool=t;document.querySelectorAll(".tool").forEach(b=>b.classList.toggle("active",b.dataset.tool===t));document.querySelector("#toolStatus").textContent=t.replace(/([A-Z])/g," $1")}
  snapshot(name){this.history.snapshot(name)}
  async save(){await this.io.save(false)}
  async saveAs(){await this.io.save(true)}
  async openProject(file){await this.io.openProject(file)}
  async openImage(file){await this.io.openImage(file)}
  export(type){this.io.export(type)}
  addText(text,x,y,size=48,font="Arial",bold=false,italic=false){
    const l=this.activeLayer();if(!l)return;const ctx=l.canvas.getContext("2d");ctx.save();ctx.fillStyle=this.color;ctx.globalAlpha=this.opacity;ctx.font=`${italic?"italic ":""}${bold?"bold ":""}${size}px ${font}`;ctx.textBaseline="top";
    const lines=text.split("\n");lines.forEach((line,i)=>ctx.fillText(line,x,y+i*size*1.15));ctx.restore();this.render();this.snapshot("Text");
  }
  bindCanvas(){
    const c=this.overlay;
    c.addEventListener("pointerdown",e=>{c.setPointerCapture(e.pointerId);this.begin(e)});
    c.addEventListener("pointermove",e=>{const p=this.screenToCanvas(e);document.querySelector("#coords").textContent=`${Math.round(p.x)}, ${Math.round(p.y)}`;this.move(e)});
    c.addEventListener("pointerup",e=>this.end(e));c.addEventListener("pointercancel",e=>this.end(e));
    c.addEventListener("contextmenu",e=>e.preventDefault());
    window.addEventListener("resize",()=>this.applyView());
  }
}

function setupUI(e){
  const $=s=>document.querySelector(s);
  const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1600)};
  const openFile=(project)=>{const i=project?$("#projectInput"):$("#fileInput");i.onchange=()=>{const f=i.files[0];if(!f)return;project?e.openProject(f):e.openImage(f);i.value=""};i.click()};
  $("#preset").onchange=ev=>{if(ev.target.value!=="custom"){const [w,h]=ev.target.value.split("x");$("#newW").value=w;$("#newH").value=h}};
  $("#createBtn").onclick=()=>{
    const w=Math.max(1,Math.min(10000,parseInt($("#newW").value,10)||1920));
    const h=Math.max(1,Math.min(10000,parseInt($("#newH").value,10)||1080));
    $("#newW").value=w;
    $("#newH").value=h;
    e.newDocument(w,h,$("#newBg").value,$("#transparent").checked);
    $("#startModal").classList.remove("open");
    toast(`Created ${w} × ${h} canvas`);
  };
  $("#openImageStart").onclick=()=>openFile(false);$("#openProjectStart").onclick=()=>openFile(true);
  $("#size").oninput=x=>{e.size=+x.target.value;$("#sizeOut").textContent=e.size;const c=$("#brushCursor");c.style.width=(e.size*e.zoom)+"px";c.style.height=(e.size*e.zoom)+"px"};$("#opacity").oninput=x=>{e.opacity=+x.target.value/100;$("#opacityOut").textContent=x.target.value+"%"};$("#hardness").oninput=x=>$("#hardnessOut").textContent=x.target.value+"%";$("#flow").oninput=x=>{e.flow=+x.target.value/100;$("#flowOut").textContent=x.target.value+"%"};
  document.querySelectorAll(".tool").forEach(b=>b.onclick=()=>e.setTool(b.dataset.tool));
  const stencil=$("#stencil"); stencil.onchange=()=>{if(stencil.value!=="none")e.setTool("stencil")};
  const cursor=$("#brushCursor");
  $("#canvasArea").addEventListener("pointermove",ev=>{
    const r=$("#canvasArea").getBoundingClientRect();
    const p=e.screenToCanvas(ev);
    cursor.style.display="block";
    cursor.style.left=(ev.clientX-r.left)+"px";
    cursor.style.top=(ev.clientY-r.top)+"px";
    const size=Math.max(1,e.size*e.zoom);
    cursor.style.width=size+"px";cursor.style.height=size+"px";
    cursor.classList.toggle("eraser",e.tool==="eraser");
    cursor.classList.toggle("stencil",e.tool==="stencil");
  });
  $("#canvasArea").addEventListener("pointerleave",()=>cursor.style.display="none");
  $("#fillMode").onclick=x=>x.target.classList.toggle("active");
  $("#undoBtn").onclick=()=>e.history.undo();$("#redoBtn").onclick=()=>e.history.redo();$("#saveBtn").onclick=()=>e.save();
  $("#newLayer").onclick=()=>{e.layers.add();e.render();e.snapshot("New Layer")};$("#newGroup").onclick=()=>{e.layers.addGroup();e.snapshot("New Group")};$("#deleteLayer").onclick=()=>e.layers.remove();$("#duplicateLayer").onclick=()=>e.layers.duplicate();$("#layerUp").onclick=()=>e.layers.move(1);$("#layerDown").onclick=()=>e.layers.move(-1);
  $("#layerOpacity").oninput=x=>{const l=e.activeLayer();if(l){l.opacity=+x.target.value/100;e.render()}};
  $("#swapColors").onclick=()=>{[e.color,e.bgColor]=[e.bgColor,e.color];syncColor()};$("#defaultColors").onclick=()=>{e.color="#000000";e.bgColor="#ffffff";syncColor()};
  $("#hue").oninput=()=>updateSV();$("#sv").onclick=ev=>{const r=ev.currentTarget.getBoundingClientRect();const s=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));const v=1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));const h=+$("#hue").value;e.color=hsvHex(h,s,v);syncColor()};
  $("#hex").onchange=()=>{let v=$("#hex").value.trim();if(!v.startsWith("#"))v="#"+v;if(/^#[0-9a-f]{6}$/i.test(v)){e.color=v.toLowerCase();syncColor()}else toast("Use a 6-digit HEX color")};
  $("#rgb").onchange=()=>{const m=$("#rgb").value.match(/\d+/g);if(m&&m.length>=3){e.color="#"+m.slice(0,3).map(v=>Math.max(0,Math.min(255,+v)).toString(16).padStart(2,"0")).join("");syncColor()}};
  $("#nativeColor").oninput=ev=>{e.color=ev.target.value;syncColor()};
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
  $("#sv").addEventListener("pointermove",ev=>{if(ev.buttons){const r=ev.currentTarget.getBoundingClientRect();const ss=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));const vv=1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));e.color=hsvHex(+$("#hue").value,ss,vv);syncColor()}});
  function syncColor(){ $("#hex").value=e.color; const m=e.color.match(/[0-9a-f]{2}/gi)||["00","00","00"]; $("#rgb").value=m.slice(0,3).map(v=>parseInt(v,16)).join(", "); $("#nativeColor").value=e.color; $("#fg").style.background=e.color;$("#bg").style.background=e.bgColor;updateSV(); const hsv=rgbToHsv(e.color); $("#hue").value=hsv.h; $("#svCursor").style.left=(hsv.s*100)+"%"; $("#svCursor").style.top=((1-hsv.v)*100)+"%" }
  function updateSV(){const h=+$("#hue").value;$("#sv").style.background=`linear-gradient(to right,#fff,rgba(255,255,255,0)),linear-gradient(to top,#000,transparent),hsl(${h},100%,50%)`;}
  function rgbToHsv(hex){const m=hex.replace("#","").match(/.{2}/g).map(x=>parseInt(x,16)/255);const [r,g,b]=m;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return {h,s:mx?d/mx:0,v:mx}};
  function hsvHex(h,s,v){const f=(n,k=(n+h/60)%6)=>v-v*s*Math.max(Math.min(k,4-k,1),0);return "#"+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,"0")).join("")}
  function addColor(c){const b=document.createElement("button");b.style.background=c;b.title=c;b.onclick=()=>{e.color=c;syncColor()};$("#recentColors").append(b)}
  function menu(type,anchor){
    const cm=$("#contextMenu");cm.innerHTML="";const items={file:[["New",()=>$("#startModal").classList.add("open")],["Open Project",()=>openFile(true)],["Open Image",()=>openFile(false)],["Save",()=>e.save()],["Save As",()=>e.saveAs()],["Export PNG",()=>e.export("png")],["Export JPG",()=>e.export("jpg")],["Export WEBP",()=>e.export("webp")]],edit:[["Undo",()=>e.history.undo()],["Redo",()=>e.history.redo()],["Duplicate Layer",()=>e.layers.duplicate()]],image:[["Fit Canvas",()=>e.fit()],["Reset Rotation",()=>{e.rotation=0;e.applyView()}]],layer:[["New Layer",()=>e.layers.add()],["Duplicate Layer",()=>e.layers.duplicate()],["Delete Layer",()=>e.layers.remove()]],select:[["Select All",()=>{e.selection={x:0,y:0,w:e.width,h:e.height};e.drawOverlay();e.octx.strokeStyle="#fff";e.octx.setLineDash([5,4]);e.octx.strokeRect(0,0,e.width,e.height)}],["Deselect",()=>{e.selection=null;e.drawOverlay()}]],view:[["Zoom In",()=>e.setZoom(e.zoom*1.2)],["Zoom Out",()=>e.setZoom(e.zoom/1.2)],["Fit",()=>e.fit()]],help:[["Shortcuts",()=>alert("B Brush • E Eraser • P Pencil • G Fill • I Picker • T Text • M Move • R Rectangle • L Line • Ctrl+Z Undo • Ctrl+Y Redo • Ctrl+S Save")]]};for(const [label,fn] of items[type]||[]){const b=document.createElement("button");b.textContent=label;b.onclick=()=>{cm.classList.add("hidden");fn()};cm.append(b)}const r=anchor.getBoundingClientRect();cm.style.left=r.left+"px";cm.style.top=(r.bottom+3)+"px";cm.classList.remove("hidden")}
  document.addEventListener("click",ev=>{if(!ev.target.closest(".menus")&&!ev.target.closest("#contextMenu"))$("#contextMenu").classList.add("hidden")});
  e.newDocument(1920,1080,"#ffffff",false);syncColor();
}

const editor = new Editor();
setupUI(editor);
window.drawForge = editor;

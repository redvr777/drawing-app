import { LayerManager } from "./layers.js";
import { History } from "./history.js";
import { Tools } from "./tools.js";
import { ProjectIO } from "./project.js";

export class Editor {
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

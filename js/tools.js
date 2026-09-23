export class Tools{
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
    if(["line","rectangle","ellipse","gradient"].includes(t)){this.preview={a:this.e.start,b:p};this.drawPreview();return}
    if(t==="selectRect"||t==="selectEllipse"||t==="selectLasso"){this.preview={a:this.e.start,b:p};this.drawPreview();return}
  }
  end(e){
    const t=this.e.tool,p=this.e.screenToCanvas(e);
    if(["line","rectangle","ellipse","gradient"].includes(t)){this.commitShape(this.e.start,p,t);this.e.snapshot(t[0].toUpperCase()+t.slice(1))}
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
}

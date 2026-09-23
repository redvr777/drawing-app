export class ProjectIO{
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

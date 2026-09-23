export class History{
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

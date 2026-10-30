'use strict';
// Vida: tudo é guardado só neste aparelho (IndexedDB). Nenhum dado sai daqui.
const $=s=>document.querySelector(s);
const h=(t,p,...k)=>{const e=document.createElement(t);for(const a in p||{}){a==='style'?(e.style.cssText=p[a]):a.startsWith('on')?e.addEventListener(a.slice(2),p[a]):e.setAttribute(a,p[a])}k.flat().forEach(c=>c!=null&&e.append(c));return e};
const day=(d=new Date())=>d.toLocaleDateString('sv-SE');
const brl=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dm=d=>d.split('-').reverse().slice(0,2).join('/');
const dur=m=>m>=60?Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':''):m+' min';
const CATS=['Casa','Comida','Transporte','Saúde','Lazer','Outros'];
const TIPOS=['gasto','foco','tema','treino'];
const ABAS=['hoje','fin','foco','acad'];
let db,items=[],tab='hoje';

const abrir=()=>new Promise((ok,no)=>{const r=indexedDB.open('vida',1);r.onupgradeneeded=()=>r.result.createObjectStore('i',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const st=m=>db.transaction('i',m).objectStore('i');
const lerTudo=()=>new Promise(ok=>{const q=st('readonly').getAll();q.onsuccess=()=>ok(q.result)});
const put=o=>{items=items.filter(x=>x.id!==o.id);items.push(o);st('readwrite').put(o)};
const del=id=>{items=items.filter(x=>x.id!==id);st('readwrite').delete(id)};
const limpar=()=>{items=[];st('readwrite').clear()};
const novo=(t,x)=>put({id:crypto.randomUUID(),t,d:day(),ts:Date.now(),...x});
const doDia=(t,d=day())=>items.filter(x=>x.t===t&&x.d===d).sort((a,b)=>a.ts-b.ts);
const rec=t=>items.filter(x=>x.t===t).sort((a,b)=>b.ts-a.ts);
const soma=l=>l.reduce((s,x)=>s+(x.min||0),0);

let tt;
function aviso(msg,desfazer){const t=$('#toast');t.replaceChildren(msg+' ');if(desfazer)t.append(h('button',{onclick:()=>{desfazer();t.hidden=true;render()}},'Desfazer'));t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,8000)}
const remover=o=>{del(o.id);aviso('Removido.',()=>put(o));render()};
const lixo=o=>h('button',{'aria-label':'Excluir este item',onclick:()=>remover(o)},'Excluir');
const card=(tit,...k)=>h('section',{class:'card'},h('h2',{},tit),...k);
const ir=(t,l)=>h('button',{class:'p',onclick:()=>{tab=t;render()}},l);

function aplicarTema(){const t=localStorage.getItem('vida_tema'),r=document.documentElement;t==='light'||t==='dark'?r.dataset.theme=t:delete r.dataset.theme}

function vHoje(){
  const g=doDia('gasto').reduce((s,x)=>s+x.v,0),f=soma(doDia('foco')),tr=doDia('treino');
  return h('div',{},h('h1',{},new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})),
    card('Gasto de hoje',h('p',{class:'big'},brl(g)),ir('fin','Registrar gasto')),
    card('Foco de hoje',h('p',{class:'big'},f?dur(f):'0 min'),ir('foco','Iniciar foco')),
    card('Academia',h('p',{},tr.length?'Treino feito hoje: '+dur(soma(tr))+'.':'Sem treino registrado hoje.'),ir('acad',tr.length?'Ver':'Registrar treino')),
    vDados());
}
function vDados(){
  const f=h('input',{type:'file',accept:'application/json',hidden:'',onchange:importar});
  return card('Seus dados',h('p',{class:'sub'},'Tudo fica só neste aparelho. Se você limpar os dados do navegador ou perder o celular, só o backup salva. Faça backup de vez em quando.'),
    h('div',{class:'row'},
      h('button',{onclick:exportar},'Salvar backup'),
      h('button',{onclick:()=>f.click()},'Restaurar backup'),
      h('button',{onclick:()=>{if(confirm('Apagar TODOS os seus dados deste aparelho? Isso não pode ser desfeito.')){limpar();localStorage.removeItem('vida_foco');aviso('Tudo foi apagado.');render()}}},'Apagar tudo'),f));
}
function exportar(){
  const b=new Blob([JSON.stringify({app:'vida',v:2,items},null,1)],{type:'application/json'});
  const u=URL.createObjectURL(b),a=h('a',{href:u,download:'vida-backup-'+day()+'.json'});a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);
}
function limpo(o){
  if(!o||typeof o.id!=='string'||o.id.length>64||!TIPOS.includes(o.t)||!/^\d{4}-\d\d-\d\d$/.test(o.d))return null;
  const r={id:o.id,t:o.t,d:o.d,ts:Number.isFinite(o.ts)?o.ts:0},s=(x,n)=>typeof x==='string'?x.slice(0,n):'',mi=x=>Number.isInteger(x)&&x>=1&&x<=1440;
  if(o.t==='gasto'){if(!Number.isInteger(o.v)||o.v<1||o.v>1e12)return null;r.v=o.v;r.c=CATS.includes(o.c)?o.c:'Outros'}
  else if(o.t==='foco'){if(!mi(o.min))return null;r.min=o.min;r.tema=s(o.tema,30)}
  else if(o.t==='treino'){if(!mi(o.min))return null;r.min=o.min}
  else{r.txt=s(o.txt,30);if(!r.txt)return null}
  return r;
}
function importar(e){
  const f=e.target.files[0];if(!f||f.size>20e6)return aviso('Arquivo inválido.');
  const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(j.app!=='vida'||!Array.isArray(j.items))throw 0;
    const ok=j.items.map(limpo).filter(Boolean);ok.forEach(put);aviso(ok.length+' itens restaurados.');render()}catch{aviso('Esse arquivo não é um backup do Vida.')}};
  r.readAsText(f);
}

function vFin(){
  let cat='Outros';
  const v=h('input',{type:'text',inputmode:'decimal',id:'v',autocomplete:'off',placeholder:'Ex.: 12,50'}),er=h('p',{class:'err',role:'alert'});
  const chips=CATS.map(c=>h('label',{class:'chip'},h('input',{type:'radio',name:'cat',value:c,...(c===cat?{checked:''}:{}),onchange:()=>cat=c}),h('span',{},c)));
  const salvar=()=>{const n=Math.round(parseFloat(v.value.trim().replace(/\./g,'').replace(',','.'))*100);
    if(!(n>0&&n<1e12))return er.textContent='O valor precisa ser maior que zero. Digite, por exemplo, 12,50.';
    novo('gasto',{v:n,c:cat});aviso('Gasto salvo.');render()};
  const mes=day().slice(0,7),por={};items.filter(x=>x.t==='gasto'&&x.d.startsWith(mes)).forEach(x=>por[x.c]=(por[x.c]||0)+x.v);
  const tot=Object.values(por).reduce((a,b)=>a+b,0),mx=Math.max(1,...Object.values(por));
  return h('div',{},h('h1',{},'Finanças'),
    card('Novo gasto',h('label',{for:'v'},'Valor em reais'),v,er,h('div',{class:'row',role:'radiogroup','aria-label':'Categoria'},chips),h('button',{class:'p',onclick:salvar},'Salvar')),
    card('Este mês: '+brl(tot),tot?h('ul',{},Object.entries(por).sort((a,b)=>b[1]-a[1]).map(([c,x])=>h('li',{},h('span',{},c+' '+brl(x)),h('span',{class:'hb',style:'width:'+Math.round(x/mx*40)+'%'})))):h('p',{class:'sub'},'Sem gastos neste mês ainda. Registre o primeiro acima.')),
    card('Últimos gastos',rec('gasto').length?h('ul',{},rec('gasto').slice(0,15).map(o=>h('li',{},h('span',{},dm(o.d)+' · '+o.c+' · '+brl(o.v)),lixo(o)))):h('p',{class:'sub'},'Nada por aqui ainda.')));
}

const FK='vida_foco';
const foco=()=>{try{return JSON.parse(localStorage.getItem(FK))}catch{return null}};
function fechar(){const f=foco();localStorage.removeItem(FK);if(!f)return;
  const m=Math.min(f.min,Math.round((Math.min(Date.now(),f.fim)-f.ini)/60000));if(m>=1)novo('foco',{tema:f.tema,min:m})}
function tick(){
  const f=foco();if(!f)return;const r=Math.max(0,f.fim-Date.now());
  if(!r){fechar();navigator.vibrate?.([300,150,300]);aviso('Foco concluído. Bom trabalho!');if(tab==='foco'||tab==='hoje')render();return}
  const el=$('#tm');if(el){const s=Math.ceil(r/1000);el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
}
function vFoco(){
  const a=foco(),temas=items.filter(x=>x.t==='tema').sort((x,y)=>x.ts-y.ts),hoje=doDia('foco');
  const novoT=h('input',{type:'text',maxlength:'30',id:'nt',placeholder:'Ex.: Estudar, Trabalhar, Ler'});
  const add=()=>{const v=novoT.value.trim();if(!v||temas.length>=12||temas.some(t=>t.txt.toLowerCase()===v.toLowerCase()))return;novo('tema',{txt:v.slice(0,30)});render()};
  const op=[{txt:''},...temas].map((t,i)=>h('label',{class:'chip'},h('input',{type:'radio',name:'tm',value:t.txt,...(i===0?{checked:''}:{})}),h('span',{},t.txt||'Sem assunto')));
  const ini=m=>()=>{const t=document.querySelector('input[name=tm]:checked')?.value||'';localStorage.setItem(FK,JSON.stringify({ini:Date.now(),fim:Date.now()+m*60000,min:m,tema:t}));render();tick()};
  const timer=a?h('div',{},h('p',{class:'sub'},a.tema||'Sem assunto'),h('p',{class:'big',id:'tm',role:'timer'}),h('button',{onclick:()=>{fechar();aviso('Foco encerrado.');render()}},'Parar'))
    :h('div',{},h('p',{class:'sub'},'Escolha um assunto e a duração:'),h('div',{class:'row',role:'radiogroup','aria-label':'Assunto'},op),h('div',{class:'row'},[15,25,45,60].map(m=>h('button',{class:'p',onclick:ini(m)},m+' min'))));
  const tema=(k,l)=>h('label',{class:'chip'},h('input',{type:'radio',name:'th',value:k,...((localStorage.getItem('vida_tema')||'auto')===k?{checked:''}:{}),onchange:()=>{k==='auto'?localStorage.removeItem('vida_tema'):localStorage.setItem('vida_tema',k);aplicarTema()}}),h('span',{},l));
  return h('div',{},h('h1',{},'Foco'),
    card('Temporizador',timer,h('p',{class:'sub'},'Mantenha o app aberto. Se a tela apagar, o tempo continua contando e você vê o resultado ao voltar.')),
    card('Seus assuntos',h('label',{for:'nt'},'Novo assunto'),novoT,h('div',{class:'row'},h('button',{class:'p',onclick:add},'Adicionar')),
      temas.length?h('ul',{},temas.map(t=>h('li',{},h('span',{},t.txt+' · hoje '+dur(soma(hoje.filter(x=>x.tema===t.txt)))),lixo(t)))):h('p',{class:'sub'},'Crie assuntos para saber onde seu tempo vai.')),
    card('Aparência',h('div',{class:'row',role:'radiogroup','aria-label':'Tema visual'},tema('auto','Automático'),tema('light','Claro'),tema('dark','Escuro'))));
}

function vAcad(){
  let min=60;
  const ou=h('input',{type:'text',inputmode:'numeric',id:'ou',maxlength:'3',placeholder:'Ex.: 50'}),er=h('p',{class:'err',role:'alert'});
  const chips=[30,45,60,90].map(m=>h('label',{class:'chip'},h('input',{type:'radio',name:'du',value:m,...(m===60?{checked:''}:{}),onchange:()=>{min=m;ou.value=''}}),h('span',{},m+' min')));
  const salvar=()=>{const v=ou.value.trim()?Number(ou.value.trim()):min;
    if(!(Number.isInteger(v)&&v>=1&&v<=600))return er.textContent='Digite a duração em minutos, de 1 a 600. Exemplo: 45.';
    novo('treino',{min:v});aviso('Treino registrado. Boa!');render()};
  const sem=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const on=doDia('treino',day(d)).length>0;
    return h('div',{class:'dia'+(on?' on':'')},h('b',{},on?'✓':'–'),d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''))});
  const mes=items.filter(x=>x.t==='treino'&&x.d.startsWith(day().slice(0,7)));
  return h('div',{},h('h1',{},'Academia'),
    card('Treinei hoje',h('div',{class:'row',role:'radiogroup','aria-label':'Duração'},chips),h('label',{for:'ou'},'Outra duração (minutos)'),ou,er,h('button',{class:'p',onclick:salvar},'Registrar treino')),
    card('Últimos 7 dias',h('div',{class:'dots'},sem),h('p',{class:'sub'},'Neste mês: '+new Set(mes.map(x=>x.d)).size+' dias de treino, '+dur(soma(mes))+' no total.')),
    card('Histórico',rec('treino').length?h('ul',{},rec('treino').slice(0,15).map(o=>h('li',{},h('span',{},dm(o.d)+' · '+dur(o.min)),lixo(o)))):h('p',{class:'sub'},'Seus treinos aparecem aqui.')));
}

function render(){
  document.querySelectorAll('nav button').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  $('nav').style.setProperty('--i',ABAS.indexOf(tab));
  $('#main').replaceChildren({hoje:vHoje,fin:vFin,foco:vFoco,acad:vAcad}[tab]());tick();window.scrollTo(0,0);
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render()}));
document.addEventListener('pointermove',e=>{const c=e.target.closest?.('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}});
setInterval(tick,500);document.addEventListener('visibilitychange',tick);
(async()=>{
  aplicarTema();localStorage.removeItem('vida_fim');
  try{db=await abrir();items=await lerTudo();items.filter(x=>!TIPOS.includes(x.t)).forEach(x=>del(x.id));navigator.storage?.persist?.()}
  catch{$('#main').textContent='Não foi possível guardar dados neste navegador. Saia do modo anônimo e tente de novo.';return}
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
  render();
})();

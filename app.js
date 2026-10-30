'use strict';
// Vida: tudo é guardado só neste aparelho (IndexedDB). Nenhum dado sai daqui.
const $=s=>document.querySelector(s);
const h=(t,p,...k)=>{const e=document.createElement(t);for(const a in p||{}){a.startsWith('on')?e.addEventListener(a.slice(2),p[a]):e.setAttribute(a,p[a])}k.flat().forEach(c=>c!=null&&e.append(c));return e};
const day=(d=new Date())=>d.toLocaleDateString('sv-SE');
const brl=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const CATS=['Casa','Comida','Transporte','Saúde','Lazer','Outros'];
const MOODS=['Muito mal','Mal','Mais ou menos','Bem','Muito bem'];
const TIPOS=['gasto','humor','intencao','grat'];
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

let tt;
function aviso(msg,desfazer){const t=$('#toast');t.replaceChildren(msg+' ');if(desfazer)t.append(h('button',{onclick:()=>{desfazer();t.hidden=true;render()}},'Desfazer'));t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,8000)}
const remover=o=>{del(o.id);aviso('Removido.',()=>put(o));render()};
const lixo=o=>h('button',{'aria-label':'Excluir este item',onclick:()=>remover(o)},'Excluir');
const card=(c,tit,...k)=>h('section',{class:'card '+c},h('h2',{},tit),...k);
const ir=(t,l)=>h('button',{class:'p',onclick:()=>{tab=t;render()}},l);
const cor=c=>document.body.style.setProperty('--ac',`var(--${c})`);

function vHoje(){
  const g=doDia('gasto').reduce((s,x)=>s+x.v,0),m=doDia('humor').at(-1),i=doDia('intencao').at(-1);
  return h('div',{},h('h1',{},new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})),
    card('emo','Humor',h('p',{},m?'Agora há pouco: '+MOODS[m.n-1]+'.':'Você ainda não registrou hoje.'),ir('emo',m?'Registrar de novo':'Registrar humor')),
    card('esp','Intenção do dia',h('p',{},i?i.txt:'Nenhuma intenção definida.'),ir('esp',i?'Ver':'Definir intenção')),
    card('fin','Gasto de hoje',h('p',{class:'big'},brl(g)),ir('fin','Registrar gasto')),
    vDados());
}
function vDados(){
  const f=h('input',{type:'file',accept:'application/json',hidden:'',onchange:importar});
  return card('','Seus dados',h('p',{class:'sub'},'Tudo fica só neste aparelho. Se você limpar os dados do navegador ou perder o celular, só o backup salva. Faça backup de vez em quando.'),
    h('div',{class:'row'},
      h('button',{onclick:exportar},'Salvar backup'),
      h('button',{onclick:()=>f.click()},'Restaurar backup'),
      h('button',{onclick:()=>{if(confirm('Apagar TODOS os seus dados deste aparelho? Isso não pode ser desfeito.')){limpar();aviso('Tudo foi apagado.');render()}}},'Apagar tudo'),f));
}
function exportar(){
  const b=new Blob([JSON.stringify({app:'vida',v:1,items},null,1)],{type:'application/json'});
  const u=URL.createObjectURL(b),a=h('a',{href:u,download:'vida-backup-'+day()+'.json'});a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);
}
function limpo(o){ // validação por lista de campos permitidos
  if(!o||typeof o.id!=='string'||o.id.length>64||!TIPOS.includes(o.t)||!/^\d{4}-\d\d-\d\d$/.test(o.d))return null;
  const r={id:o.id,t:o.t,d:o.d,ts:Number.isFinite(o.ts)?o.ts:0},s=(x,n)=>typeof x==='string'?x.slice(0,n):'';
  if(o.t==='gasto'){if(!Number.isInteger(o.v)||o.v<1||o.v>1e12)return null;r.v=o.v;r.c=CATS.includes(o.c)?o.c:'Outros'}
  else if(o.t==='humor'){if(!Number.isInteger(o.n)||o.n<1||o.n>5)return null;r.n=o.n;r.note=s(o.note,140)}
  else r.txt=s(o.txt,500);
  return r;
}
function importar(e){
  const f=e.target.files[0];if(!f||f.size>20e6)return aviso('Arquivo inválido.');
  const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(j.app!=='vida'||!Array.isArray(j.items))throw 0;
    const ok=j.items.map(limpo).filter(Boolean);ok.forEach(put);aviso(ok.length+' itens restaurados.');render()}catch{aviso('Esse arquivo não é um backup do Vida.')}};
  r.readAsText(f);
}

function vFin(){
  cor('fin');let cat='Outros';
  const v=h('input',{type:'text',inputmode:'decimal',id:'v',autocomplete:'off',placeholder:'Ex.: 12,50'}),er=h('p',{class:'err',role:'alert'});
  const chips=CATS.map(c=>h('label',{class:'chip'},h('input',{type:'radio',name:'cat',value:c,...(c===cat?{checked:''}:{}),onchange:()=>cat=c}),h('span',{},c)));
  const salvar=()=>{const n=Math.round(parseFloat(v.value.trim().replace(/\./g,'').replace(',','.'))*100);
    if(!(n>0&&n<1e12))return er.textContent='O valor precisa ser maior que zero. Digite, por exemplo, 12,50.';
    novo('gasto',{v:n,c:cat});aviso('Gasto salvo.');render()};
  const mes=day().slice(0,7),por={};items.filter(x=>x.t==='gasto'&&x.d.startsWith(mes)).forEach(x=>por[x.c]=(por[x.c]||0)+x.v);
  const tot=Object.values(por).reduce((a,b)=>a+b,0),mx=Math.max(1,...Object.values(por));
  return h('div',{},h('h1',{},'Finanças'),
    card('fin','Novo gasto',h('label',{for:'v'},'Valor em reais'),v,er,h('div',{class:'row',role:'radiogroup','aria-label':'Categoria'},chips),h('button',{class:'p',onclick:salvar},'Salvar')),
    card('fin','Este mês: '+brl(tot),tot?h('ul',{},Object.entries(por).sort((a,b)=>b[1]-a[1]).map(([c,x])=>h('li',{},h('span',{},c+' '+brl(x)),h('span',{class:'hb',style:'width:'+Math.round(x/mx*40)+'%'})))):h('p',{class:'sub'},'Sem gastos neste mês ainda. Registre o primeiro acima.')),
    card('fin','Últimos gastos',rec('gasto').length?h('ul',{},rec('gasto').slice(0,15).map(o=>h('li',{},h('span',{},o.d.split('-').reverse().slice(0,2).join('/')+' · '+o.c+' · '+brl(o.v)),lixo(o)))):h('p',{class:'sub'},'Nada por aqui ainda.')));
}

function vEmo(){
  cor('emo');let n=0;
  const nota=h('input',{type:'text',maxlength:'140',id:'nota',placeholder:'Opcional, até 140 letras'}),er=h('p',{class:'err',role:'alert'});
  const op=MOODS.map((l,i)=>h('label',{class:'chip'},h('input',{type:'radio',name:'m',value:i+1,onchange:()=>n=i+1}),h('span',{},(i+1)+' · '+l)));
  const salvar=()=>{if(!n)return er.textContent='Escolha como você está, de 1 a 5.';novo('humor',{n,note:nota.value.slice(0,140)});aviso('Registrado. Obrigado por parar um momento.');render()};
  const med=d=>{const l=doDia('humor',day(d));return l.length?l.reduce((s,x)=>s+x.n,0)/l.length:null};
  const dias=k=>[...Array(k)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(k-1-i));return med(d)});
  const m30=dias(30).filter(x=>x!=null),mm=m30.length?(m30.reduce((a,b)=>a+b,0)/m30.length).toFixed(1).replace('.',','):null;
  const barras=dias(7).map(x=>h('div',{class:'bar'},x?h('i',{style:'height:'+x*18+'px'}):h('i',{style:'height:2px;opacity:.4'}),x?x.toFixed(1).replace('.',','):'–'));
  return h('div',{},h('h1',{},'Emoções'),
    card('emo','Como você está agora?',h('div',{class:'row',role:'radiogroup','aria-label':'Humor'},op),h('label',{for:'nota'},'Nota rápida'),nota,er,h('button',{class:'p',onclick:salvar},'Salvar')),
    card('emo','Últimos 7 dias',h('div',{class:'bars'},barras),h('p',{class:'sub'},'Média dos últimos 30 dias: '+(mm??'sem registros')+(mm?' (escala de 1 a 5)':''))),
    card('emo','Se estiver difícil',h('p',{},'Este app não substitui um profissional. Se quiser conversar com alguém agora, o CVV atende 24 horas, de graça, pelo telefone 188.')));
}

const FIM='vida_fim';
function tick(){
  const el=$('#tm'),f=+localStorage.getItem(FIM);if(!f)return;
  const r=Math.max(0,f-Date.now());
  if(!r){localStorage.removeItem(FIM);navigator.vibrate?.([300,150,300]);aviso('Tempo concluído.');if(tab==='esp')render();return}
  if(el){const s=Math.ceil(r/1000);el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
}
function vEsp(){
  cor('esp');const ativo=+localStorage.getItem(FIM)>Date.now();
  const inte=h('input',{type:'text',maxlength:'140',id:'int',placeholder:'Uma frase curta',value:doDia('intencao').at(-1)?.txt||''});
  const gr=h('textarea',{id:'gr',rows:'3',maxlength:'280',placeholder:'Pelo que você é grato hoje?'});
  const t=ativo?h('div',{},h('p',{class:'big',id:'tm'}),h('button',{onclick:()=>{localStorage.removeItem(FIM);render()}},'Parar')):
    h('div',{class:'row'},[5,10,15,20].map(m=>h('button',{class:'p',onclick:()=>{localStorage.setItem(FIM,Date.now()+m*60000);render();tick()}},m+' min')));
  return h('div',{},h('h1',{},'Espírito'),
    card('esp','Intenção do dia',h('label',{for:'int'},'Minha intenção'),inte,h('button',{class:'p',onclick:()=>{const v=inte.value.trim();if(!v)return;doDia('intencao').forEach(o=>del(o.id));novo('intencao',{txt:v.slice(0,140)});aviso('Intenção salva.');render()}},'Salvar')),
    card('esp','Foco e meditação',t,h('p',{class:'sub'},'Mantenha o app aberto. Se a tela apagar, o tempo continua contando e você vê o resultado ao voltar.')),
    card('esp','Diário de gratidão',gr,h('div',{class:'row'},h('button',{class:'p',onclick:()=>{const v=gr.value.trim();if(!v)return;novo('grat',{txt:v.slice(0,280)});aviso('Salvo.');render()}},'Salvar')),
      rec('grat').length?h('ul',{},rec('grat').slice(0,10).map(o=>h('li',{},h('span',{},o.d.split('-').reverse().slice(0,2).join('/')+' · '+o.txt),lixo(o)))):h('p',{class:'sub'},'Suas anotações aparecem aqui.')));
}

function render(){
  document.querySelectorAll('nav button').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  cor({hoje:'hoje',fin:'fin',emo:'emo',esp:'esp'}[tab]);
  const m=$('#main');m.replaceChildren({hoje:vHoje,fin:vFin,emo:vEmo,esp:vEsp}[tab]());tick();window.scrollTo(0,0);
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render()}));
setInterval(tick,500);document.addEventListener('visibilitychange',tick);
(async()=>{
  try{db=await abrir();items=await lerTudo();navigator.storage?.persist?.()}
  catch{$('#main').textContent='Não foi possível guardar dados neste navegador. Saia do modo anônimo e tente de novo.';return}
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
  render();
})();

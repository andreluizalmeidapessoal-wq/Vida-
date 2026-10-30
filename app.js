'use strict';
// Vida: tudo é guardado só neste aparelho (IndexedDB). Nenhum dado sai daqui.
const $=s=>document.querySelector(s);
const h=(t,p,...k)=>{const e=document.createElement(t);for(const a in p||{}){a==='style'?(e.style.cssText=p[a]):a.startsWith('on')?e.addEventListener(a.slice(2),p[a]):e.setAttribute(a,p[a])}k.flat().forEach(c=>c!=null&&e.append(c));return e};
const day=(d=new Date())=>d.toLocaleDateString('sv-SE');
const brl=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dm=d=>d.split('-').reverse().slice(0,2).join('/');
const dur=m=>m>=60?Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':''):m+' min';
const ult=n=>[...Array(n)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(n-1-i));return day(d)});
const CATS=['Casa','Comida','Transporte','Saúde','Lazer','Outros'];
const KIND=['Musculação','Cardio','Funcional','Outro'];
const TIPOS=['gasto','foco','tema','treino','habito','check','cfg'];
const ABAS=['hoje','fin','foco','acad','hab'];
let db,items=[],tab='hoje',mes=day().slice(0,7),inst=null;

const abrir=()=>new Promise((ok,no)=>{const r=indexedDB.open('vida',1);r.onupgradeneeded=()=>r.result.createObjectStore('i',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const st=m=>db.transaction('i',m).objectStore('i');
const lerTudo=()=>new Promise(ok=>{const q=st('readonly').getAll();q.onsuccess=()=>ok(q.result)});
const put=o=>{items=items.filter(x=>x.id!==o.id);items.push(o);st('readwrite').put(o)};
const del=id=>{items=items.filter(x=>x.id!==id);st('readwrite').delete(id)};
const limpar=()=>{items=[];st('readwrite').clear()};
const novo=(t,x)=>put({id:crypto.randomUUID(),t,d:day(),ts:Date.now(),...x});
const doDia=(t,d=day())=>items.filter(x=>x.t===t&&x.d===d).sort((a,b)=>a.ts-b.ts);
const rec=t=>items.filter(x=>x.t===t).sort((a,b)=>b.ts-a.ts);
const soma=l=>l.reduce((s,x)=>s+(x.min||0),0),somav=l=>l.reduce((s,x)=>s+(x.v||0),0);
const cfg=()=>({orc:0,foco:60,tr:3,...items.find(x=>x.t==='cfg')});
const baixar=(n,txt,tp)=>{const u=URL.createObjectURL(new Blob([txt],{type:tp}));h('a',{href:u,download:n}).click();setTimeout(()=>URL.revokeObjectURL(u),5000)};

let tt;
function aviso(msg,desfazer){const t=$('#toast');t.replaceChildren(msg+' ');if(desfazer)t.append(h('button',{onclick:()=>{desfazer();t.hidden=true;render()}},'Desfazer'));t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,8000)}
const remover=o=>{del(o.id);aviso('Removido.',()=>put(o));render()};
const lixo=o=>h('button',{'aria-label':'Excluir este item',onclick:()=>remover(o)},'Excluir');
const card=(tit,...k)=>h('section',{class:'card'},h('h2',{},tit),...k);
const ir=(t,l)=>h('button',{class:'p',onclick:()=>{tab=t;render()}},l);
const pg=(v,m)=>{const p=Math.min(100,Math.round(v/m*100));return h('div',{class:'pg',role:'progressbar','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':p},h('i',{style:'width:'+p+'%'}))};
const chip=(nome,val,txt,on,fn)=>h('label',{class:'chip'},h('input',{type:'radio',name:nome,value:val,...(on?{checked:''}:{}),onchange:fn}),h('span',{},txt));
const barras=(l,fmt)=>{const mx=Math.max(1,...l.map(x=>x[1]));return h('div',{class:'bars'},l.map(([d,v])=>h('div',{class:'bar'},h('i',{style:'height:'+(v?6+v/mx*84:3)+'px'}),fmt(v),h('small',{},new Date(d+'T12:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')))))};
function aplicarTema(){const t=localStorage.getItem('vida_tema'),r=document.documentElement;t==='light'||t==='dark'?r.dataset.theme=t:delete r.dataset.theme}

/* hábitos */
const habs=()=>items.filter(x=>x.t==='habito').sort((a,b)=>a.ts-b.ts);
const feito=(b,d)=>items.find(x=>x.t==='check'&&x.h===b.id&&x.d===d);
const marcar=b=>{const c=feito(b,day());c?del(c.id):novo('check',{h:b.id});render()};
function seq(b){let n=0;const d=new Date();if(!feito(b,day(d)))d.setDate(d.getDate()-1);while(feito(b,day(d))){n++;d.setDate(d.getDate()-1)}return n}
const tg=b=>{const on=!!feito(b,day());return h('button',{class:'tg'+(on?' on':''),'aria-pressed':on,onclick:()=>marcar(b)},(on?'✓ ':'')+b.txt)};

function vHoje(){
  const c=cfg(),hj=day(),mv=items.filter(x=>x.t==='gasto'&&x.d.startsWith(hj.slice(0,7))),gas=somav(mv.filter(x=>x.k!=='e')),ent=somav(mv.filter(x=>x.k==='e'));
  const gH=somav(mv.filter(x=>x.d===hj&&x.k!=='e')),f=soma(doDia('foco')),u7=ult(7),tr=new Set(items.filter(x=>x.t==='treino'&&u7.includes(x.d)).map(x=>x.d)).size,hb=habs();
  return h('div',{},h('h1',{},new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})),
    card('Gasto de hoje',h('p',{class:'big'},brl(gH)),h('p',{class:'sub'},'Saldo do mês: '+brl(ent-gas)),ir('fin','Registrar')),
    card('Foco de hoje',h('p',{class:'big'},f?dur(f):'0 min'),pg(f,c.foco),h('p',{class:'sub'},'Meta: '+dur(c.foco)),ir('foco','Iniciar foco')),
    card('Academia',h('p',{class:'big'},tr+' / '+c.tr),pg(tr,c.tr),h('p',{class:'sub'},'dias de treino nos últimos 7 dias'),ir('acad','Registrar treino')),
    card('Hábitos de hoje',hb.length?h('div',{class:'row'},hb.map(tg)):h('p',{class:'sub'},'Crie hábitos simples, como beber água ou ler 10 minutos.'),ir('hab',hb.length?'Ver hábitos':'Criar hábito')),
    vAjustes(),vDados());
}
function vAjustes(){
  const c=cfg(),o=h('input',{type:'text',inputmode:'decimal',id:'mo',value:c.orc?String(c.orc/100).replace('.',','):'',placeholder:'0 = sem meta'}),
    f=h('input',{type:'text',inputmode:'numeric',id:'mf',value:c.foco}),t=h('input',{type:'text',inputmode:'numeric',id:'mt',value:c.tr}),er=h('p',{class:'err',role:'alert'});
  const salvar=()=>{const orc=o.value.trim()?Math.round(parseFloat(o.value.replace(/\./g,'').replace(',','.'))*100):0,fo=Number(f.value),tr=Number(t.value);
    if(!(orc>=0&&orc<1e12&&Number.isInteger(fo)&&fo>=1&&fo<=1440&&Number.isInteger(tr)&&tr>=1&&tr<=7))return er.textContent='Confira: foco de 1 a 1440 minutos e treinos de 1 a 7 por semana.';
    put({id:'cfg',t:'cfg',d:day(),ts:Date.now(),orc,foco:fo,tr});aviso('Metas salvas.');render()};
  return card('Metas',h('label',{for:'mo'},'Orçamento do mês (R$)'),o,h('label',{for:'mf'},'Foco por dia (minutos)'),f,h('label',{for:'mt'},'Treinos por semana'),t,er,h('div',{class:'row'},h('button',{class:'p',onclick:salvar},'Salvar metas')));
}
function vDados(){
  const f=h('input',{type:'file',accept:'application/json',hidden:'',onchange:importar});
  return card('Seus dados',h('p',{class:'sub'},'Tudo fica só neste aparelho. Se você limpar os dados do navegador ou perder o celular, só o backup salva. Faça backup de vez em quando.'),
    h('div',{class:'row'},
      inst?h('button',{class:'p',onclick:()=>{inst.prompt();inst=null}},'Instalar app'):null,
      h('button',{onclick:()=>baixar('vida-backup-'+day()+'.json',JSON.stringify({app:'vida',v:3,items},null,1),'application/json')},'Salvar backup'),
      h('button',{onclick:()=>f.click()},'Restaurar backup'),
      h('button',{onclick:()=>{if(confirm('Apagar TODOS os seus dados deste aparelho? Isso não pode ser desfeito.')){limpar();localStorage.removeItem('vida_foco');aviso('Tudo foi apagado.');render()}}},'Apagar tudo'),f));
}
function limpo(o){
  if(!o||typeof o.id!=='string'||o.id.length>64||!TIPOS.includes(o.t)||!/^\d{4}-\d\d-\d\d$/.test(o.d))return null;
  const r={id:o.id,t:o.t,d:o.d,ts:Number.isFinite(o.ts)?o.ts:0},s=(x,n)=>typeof x==='string'?x.slice(0,n):'',I=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
  if(o.t==='gasto'){if(!I(o.v,1,1e12))return null;r.v=o.v;r.c=CATS.includes(o.c)?o.c:'Outros';r.k=o.k==='e'?'e':'g';r.n=s(o.n,30)}
  else if(o.t==='foco'){if(!I(o.min,1,1440))return null;r.min=o.min;r.tema=s(o.tema,30)}
  else if(o.t==='treino'){if(!I(o.min,1,1440))return null;r.min=o.min;r.k=KIND.includes(o.k)?o.k:'Outro'}
  else if(o.t==='check'){if(typeof o.h!=='string'||o.h.length>64)return null;r.h=o.h}
  else if(o.t==='cfg'){if(!I(o.orc,0,1e12)||!I(o.foco,1,1440)||!I(o.tr,1,7))return null;r.id='cfg';r.orc=o.orc;r.foco=o.foco;r.tr=o.tr}
  else{r.txt=s(o.txt,30);if(!r.txt)return null}
  return r;
}
function importar(e){
  const f=e.target.files[0];if(!f||f.size>20e6)return aviso('Arquivo inválido.');
  const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(j.app!=='vida'||!Array.isArray(j.items))throw 0;
    const ok=j.items.map(limpo).filter(Boolean);ok.forEach(put);aviso(ok.length+' itens restaurados.');render()}catch{aviso('Esse arquivo não é um backup do Vida.')}};
  r.readAsText(f);
}

/* finanças */
function vFin(){
  let cat='Outros',ent=false;const c=cfg();
  const v=h('input',{type:'text',inputmode:'decimal',id:'v',autocomplete:'off',placeholder:'Ex.: 12,50'}),n=h('input',{type:'text',maxlength:'30',id:'dn',placeholder:'Opcional'}),er=h('p',{class:'err',role:'alert'}),cats=h('div',{class:'row',role:'radiogroup','aria-label':'Categoria'},CATS.map(x=>chip('cat',x,x,x===cat,()=>cat=x)));
  const salvar=()=>{const q=Math.round(parseFloat(v.value.trim().replace(/\./g,'').replace(',','.'))*100);
    if(!(q>0&&q<1e12))return er.textContent='O valor precisa ser maior que zero. Digite, por exemplo, 12,50.';
    novo('gasto',{v:q,c:ent?'Entrada':cat,k:ent?'e':'g',n:n.value.trim().slice(0,30)});aviso(ent?'Entrada salva.':'Gasto salvo.');render()};
  const mv=items.filter(x=>x.t==='gasto'&&x.d.startsWith(mes)).sort((a,b)=>b.ts-a.ts),gs=mv.filter(x=>x.k!=='e'),en=somav(mv.filter(x=>x.k==='e')),tot=somav(gs),por={};
  gs.forEach(x=>por[x.c]=(por[x.c]||0)+x.v);const mx=Math.max(1,...Object.values(por));
  const rot=new Date(mes+'-15T12:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const csv=()=>{const q=s=>'"'+(/^[=+\-@]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';
    baixar('vida-'+mes+'.csv','\ufeff'+['data;tipo;categoria;descricao;valor'].concat(mv.map(x=>[x.d,x.k==='e'?'entrada':'gasto',q(x.c),q(x.n||''),(x.v/100).toFixed(2).replace('.',',')].join(';'))).join('\n'),'text/csv')};
  return h('div',{},h('h1',{},'Finanças'),
    card('Novo lançamento',h('div',{class:'row',role:'radiogroup','aria-label':'Tipo'},chip('tp','g','Gasto',1,()=>{ent=false;cats.hidden=false}),chip('tp','e','Entrada',0,()=>{ent=true;cats.hidden=true})),h('label',{for:'v'},'Valor em reais'),v,er,cats,h('label',{for:'dn'},'Descrição'),n,h('div',{class:'row'},h('button',{class:'p',onclick:salvar},'Salvar'))),
    card('Resumo do mês',h('div',{class:'row'},h('button',{'aria-label':'Mês anterior',onclick:()=>mudaMes(-1)},'‹'),h('span',{class:'sub',style:'align-self:center;min-width:9rem;text-align:center;text-transform:capitalize'},rot),h('button',{'aria-label':'Próximo mês',onclick:()=>mudaMes(1)},'›')),
      h('p',{class:'big'},brl(en-tot)),h('p',{class:'sub'},'Entradas '+brl(en)+' · Gastos '+brl(tot)),
      c.orc?h('div',{},pg(tot,c.orc),h('p',{class:'sub'},tot<=c.orc?'Usou '+Math.round(tot/c.orc*100)+'% do orçamento de '+brl(c.orc)+'.':'Passou '+brl(tot-c.orc)+' do orçamento. Dá para ajustar a meta em Hoje.')):h('p',{class:'sub'},'Defina um orçamento em Hoje → Metas.')),
    card('Por categoria',tot?h('ul',{},Object.entries(por).sort((a,b)=>b[1]-a[1]).map(([k,x])=>h('li',{},h('span',{},k+' '+brl(x)),h('span',{class:'hb',style:'width:'+Math.round(x/mx*40)+'%'})))):h('p',{class:'sub'},'Sem gastos neste mês.')),
    card('Lançamentos',mv.length?h('ul',{},mv.slice(0,30).map(o=>h('li',{},h('span',{},dm(o.d)+' · '+(o.k==='e'?'+':'')+brl(o.v)+' · '+o.c+(o.n?' · '+o.n:'')),lixo(o)))):h('p',{class:'sub'},'Nada por aqui ainda.'),mv.length?h('div',{class:'row'},h('button',{onclick:csv},'Exportar CSV do mês')):null));
}
const mudaMes=n=>{const [y,m]=mes.split('-').map(Number);mes=day(new Date(y,m-1+n,1)).slice(0,7);render()};

/* foco */
const FK='vida_foco',foco=()=>{try{return JSON.parse(localStorage.getItem(FK))}catch{return null}};
function fechar(){const f=foco();localStorage.removeItem(FK);if(!f)return;const m=Math.min(f.min,Math.round((Math.min(Date.now(),f.fim)-f.ini)/60000));if(m>=1)novo('foco',{tema:f.tema,min:m})}
function tick(){
  const f=foco();if(!f)return;const r=Math.max(0,f.fim-Date.now());
  if(!r){fechar();navigator.vibrate?.([300,150,300]);aviso('Foco concluído. Bom trabalho!');if(tab==='foco'||tab==='hoje')render();return}
  const el=$('#tm');if(el){const s=Math.ceil(r/1000);el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
}
function vFoco(){
  const a=foco(),c=cfg(),temas=items.filter(x=>x.t==='tema').sort((x,y)=>x.ts-y.ts),hoje=doDia('foco'),tm=soma(hoje);
  const nt=h('input',{type:'text',maxlength:'30',id:'nt',placeholder:'Ex.: Estudar, Trabalhar, Ler'});
  const add=()=>{const v=nt.value.trim();if(!v||temas.length>=12||temas.some(t=>t.txt.toLowerCase()===v.toLowerCase()))return;novo('tema',{txt:v.slice(0,30)});render()};
  const op=[{txt:''},...temas].map((t,i)=>chip('tm',t.txt,t.txt||'Sem assunto',i===0));
  const ini=m=>()=>{const t=document.querySelector('input[name=tm]:checked')?.value||'';localStorage.setItem(FK,JSON.stringify({ini:Date.now(),fim:Date.now()+m*60000,min:m,tema:t}));render();tick()};
  const timer=a?h('div',{},h('p',{class:'sub'},a.tema||'Sem assunto'),h('p',{class:'big',id:'tm',role:'timer'}),h('button',{onclick:()=>{fechar();aviso('Foco encerrado.');render()}},'Parar'))
    :h('div',{},h('p',{class:'sub'},'Escolha um assunto e a duração:'),h('div',{class:'row',role:'radiogroup','aria-label':'Assunto'},op),h('div',{class:'row'},[15,25,45,60,90].map(m=>h('button',{class:'p',onclick:ini(m)},m+' min'))));
  const th=(k,l)=>chip('th',k,l,(localStorage.getItem('vida_tema')||'auto')===k,()=>{k==='auto'?localStorage.removeItem('vida_tema'):localStorage.setItem('vida_tema',k);aplicarTema()});
  return h('div',{},h('h1',{},'Foco'),
    card('Temporizador',timer,h('p',{class:'sub'},'Mantenha o app aberto. Se a tela apagar, o tempo continua contando e você vê o resultado ao voltar.')),
    card('Meta de hoje',h('p',{class:'big'},dur(tm)),pg(tm,c.foco),h('p',{class:'sub'},'Meta: '+dur(c.foco))),
    card('Últimos 7 dias',barras(ult(7).map(d=>[d,soma(doDia('foco',d))]),v=>v||'–')),
    card('Seus assuntos',h('label',{for:'nt'},'Novo assunto'),nt,h('div',{class:'row'},h('button',{class:'p',onclick:add},'Adicionar')),
      temas.length?h('ul',{},temas.map(t=>h('li',{},h('span',{},t.txt+' · hoje '+dur(soma(hoje.filter(x=>x.tema===t.txt)))),lixo(t)))):h('p',{class:'sub'},'Crie assuntos para saber onde seu tempo vai.')),
    card('Aparência',h('div',{class:'row',role:'radiogroup','aria-label':'Tema visual'},th('auto','Automático'),th('light','Claro'),th('dark','Escuro'))));
}

/* academia */
function vAcad(){
  let min=60,k='Musculação';const c=cfg(),u7=ult(7);
  const ou=h('input',{type:'text',inputmode:'numeric',id:'ou',maxlength:'3',placeholder:'Ex.: 50'}),er=h('p',{class:'err',role:'alert'});
  const salvar=()=>{const v=ou.value.trim()?Number(ou.value.trim()):min;
    if(!(Number.isInteger(v)&&v>=1&&v<=600))return er.textContent='Digite a duração em minutos, de 1 a 600. Exemplo: 45.';
    novo('treino',{min:v,k});aviso('Treino registrado. Boa!');render()};
  const sem=u7.map(d=>{const on=doDia('treino',d).length>0;return h('div',{class:'dia'+(on?' on':'')},h('b',{},on?'✓':'–'),new Date(d+'T12:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''))});
  const n7=new Set(items.filter(x=>x.t==='treino'&&u7.includes(x.d)).map(x=>x.d)).size,mm=items.filter(x=>x.t==='treino'&&x.d.startsWith(day().slice(0,7)));
  return h('div',{},h('h1',{},'Academia'),
    card('Treinei hoje',h('div',{class:'row',role:'radiogroup','aria-label':'Tipo de treino'},KIND.map(x=>chip('kd',x,x,x===k,()=>k=x))),
      h('div',{class:'row',role:'radiogroup','aria-label':'Duração'},[30,45,60,90].map(m=>chip('du',m,m+' min',m===60,()=>{min=m;ou.value=''}))),h('label',{for:'ou'},'Outra duração (minutos)'),ou,er,h('button',{class:'p',onclick:salvar},'Registrar treino')),
    card('Meta da semana',h('p',{class:'big'},n7+' / '+c.tr),pg(n7,c.tr),h('div',{class:'dots'},sem),h('p',{class:'sub'},'Neste mês: '+new Set(mm.map(x=>x.d)).size+' dias, '+dur(soma(mm))+' no total.')),
    card('Histórico',rec('treino').length?h('ul',{},rec('treino').slice(0,20).map(o=>h('li',{},h('span',{},dm(o.d)+' · '+(o.k||'Treino')+' · '+dur(o.min)),lixo(o)))):h('p',{class:'sub'},'Seus treinos aparecem aqui.')));
}

/* hábitos */
function vHab(){
  const nh=h('input',{type:'text',maxlength:'30',id:'nh',placeholder:'Ex.: Beber água, Ler 10 min'}),hb=habs();
  const add=()=>{const v=nh.value.trim();if(!v||hb.length>=12)return;novo('habito',{txt:v.slice(0,30)});render()};
  const rm=b=>{const cs=items.filter(x=>x.t==='check'&&x.h===b.id);[b,...cs].forEach(x=>del(x.id));aviso('Hábito removido.',()=>[b,...cs].forEach(put));render()};
  return h('div',{},h('h1',{},'Hábitos'),
    card('Novo hábito',h('label',{for:'nh'},'Nome'),nh,h('div',{class:'row'},h('button',{class:'p',onclick:add},'Adicionar'))),
    card('Hoje',hb.length?h('ul',{},hb.map(b=>{const s=seq(b);return h('li',{class:'col'},h('span',{},b.txt),h('span',{class:'sub'},ult(7).map(d=>feito(b,d)?'●':'○').join(' ')+' · '+(s?s+(s>1?' dias seguidos':' dia'):'Recomece quando quiser')),h('div',{class:'row'},tg(b),h('button',{'aria-label':'Excluir hábito '+b.txt,onclick:()=>rm(b)},'Excluir')))})):h('p',{class:'sub'},'Nenhum hábito ainda. Comece com um só.')));
}

function render(){
  document.querySelectorAll('nav button').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  $('nav').style.setProperty('--i',ABAS.indexOf(tab));
  $('#main').replaceChildren({hoje:vHoje,fin:vFin,foco:vFoco,acad:vAcad,hab:vHab}[tab]());tick();window.scrollTo(0,0);
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render()}));
document.addEventListener('pointermove',e=>{const c=e.target.closest?.('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();inst=e;if(tab==='hoje'&&db)render()});
setInterval(tick,500);document.addEventListener('visibilitychange',tick);
(async()=>{
  aplicarTema();
  try{db=await abrir();items=await lerTudo();items.filter(x=>!TIPOS.includes(x.t)).forEach(x=>del(x.id));navigator.storage?.persist?.()}
  catch{$('#main').textContent='Não foi possível guardar dados neste navegador. Saia do modo anônimo e tente de novo.';return}
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
  render();
})();

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
const TIPOS=['gasto','foco','tema','treino','habito','check','cfg','nota'];
const ABAS=['hoje','fin','foco','acad','mais'];
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
const go=t=>{tab=t;ed=null;render()};
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
  const c=cfg(),hj=day(),mv=items.filter(x=>x.t==='gasto'&&x.d===hj&&x.k!=='e'),f=soma(doDia('foco')),u7=ult(7),hb=habs(),
    tr=new Set(items.filter(x=>x.t==='treino'&&u7.includes(x.d)).map(x=>x.d)).size,lb=items.filter(x=>x.t==='nota'&&x.rem&&!x.ok&&x.rem<=hj);
  const lin=(t,v,b,to)=>h('button',{class:'stat',onclick:()=>go(to)},h('span',{class:'sub'},t),h('strong',{},v),b||null);
  return h('div',{},h('div',{class:'top'},h('h1',{},new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})),h('button',{onclick:()=>{sub.mais='aju';go('mais')}},'Ajustes')),
    h('section',{class:'card stats'},lin('Gasto de hoje',brl(somav(mv)),null,'fin'),lin('Foco de hoje',f?dur(f):'0 min',pg(f,c.foco),'foco'),lin('Treinos na semana',tr+' de '+c.tr,pg(tr,c.tr),'acad')),
    lb.length?card('Lembretes',h('ul',{},lb.map(o=>h('li',{},h('span',{},o.txt+(o.rem<hj?' ('+dm(o.rem)+')':o.hr?' · '+o.hr:'')),h('button',{onclick:()=>{put({...o,ok:true});render()}},'Concluir'))))):null,
    hb.length?h('section',{class:'card'},h('div',{class:'row'},hb.map(tg))):null);
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
  else if(o.t==='nota'){r.txt=s(o.txt,280);if(!r.txt)return null;r.rem=/^\d{4}-\d\d-\d\d$/.test(o.rem)?o.rem:'';r.hr=/^\d\d:\d\d$/.test(o.hr)?o.hr:'';r.ok=o.ok===true}
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

/* navegação interna, edição e notas */
const sub={fin:'lan',foco:'tm',acad:'reg',mais:'hab'};let ed=null;
const seg=(tb,o)=>h('div',{class:'seg',role:'tablist'},o.map(([k,l])=>h('button',{role:'tab','aria-selected':sub[tb]===k,class:sub[tb]===k?'on':'',onclick:()=>{sub[tb]=k;ed=null;render()}},l)));
const editar=(o,tb,sb)=>{ed=o;tab=tb;sub[tb]=sb;render()};
const acoes=(o,tb,sb)=>h('div',{class:'row'},h('button',{'aria-label':'Editar este item',onclick:()=>editar(o,tb,sb)},'Editar'),lixo(o));
const sel=(id,rot,ops,v)=>h('select',{id,'aria-label':rot},ops.map(([k,l])=>h('option',{value:k,...(v===k?{selected:''}:{})},l)));
const mn0=()=>new Date(mes+'-15T12:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const mudaMes=n=>{const [y,m]=mes.split('-').map(Number);mes=day(new Date(y,m-1+n,1)).slice(0,7);render()};
const mnav=()=>h('div',{class:'row'},h('button',{'aria-label':'Mês anterior',onclick:()=>mudaMes(-1)},'‹'),h('span',{class:'sub',style:'align-self:center;min-width:9rem;text-align:center;text-transform:capitalize'},mn0()),h('button',{'aria-label':'Próximo mês',onclick:()=>mudaMes(1)},'›'));
const dok=v=>/^\d{4}-\d\d-\d\d$/.test(v)?v:day();
const par=(l,t)=>h('div',{class:'bars'},l.map(([lb,a,b])=>h('div',{class:'bar'},h('div',{class:'par'},h('i',{style:'height:'+(a?4+a/t*86:2)+'px'}),h('i',{class:'st',style:'height:'+(b?4+b/t*86:2)+'px'})),h('small',{},lb))));
const avisados=new Set(),notif=t=>navigator.serviceWorker?.ready.then(r=>r.showNotification('Vida',{body:t,icon:'icon-192.png'})).catch(()=>{});
function lembretes(){const d=day(),t=new Date().toTimeString().slice(0,5);
  items.filter(x=>x.t==='nota'&&x.rem&&!x.ok&&!avisados.has(x.id)&&(x.rem<d||(x.rem===d&&(!x.hr||x.hr<=t)))).forEach(x=>{avisados.add(x.id);aviso('Lembrete: '+x.txt.slice(0,60));if(window.Notification&&Notification.permission==='granted')notif(x.txt)})}

/* finanças */
const fl={q:'',tp:'',cat:''};
function vFin(){
  const s=sub.fin,c=cfg(),mv=items.filter(x=>x.t==='gasto'&&x.d.startsWith(mes)).sort((a,b)=>b.ts-a.ts),gs=mv.filter(x=>x.k!=='e'),en=somav(mv.filter(x=>x.k==='e')),tot=somav(gs),por={};
  gs.forEach(x=>por[x.c]=(por[x.c]||0)+x.v);const mx=Math.max(1,...Object.values(por));
  let cs;
  if(s==='lan')cs=fLan();
  else if(s==='mes')cs=[card('Resumo',mnav(),h('p',{class:'big'},brl(en-tot)),h('p',{class:'sub'},'Entradas '+brl(en)+' · Gastos '+brl(tot)),
      c.orc?h('div',{},pg(tot,c.orc),h('p',{class:'sub'},tot<=c.orc?'Usou '+Math.round(tot/c.orc*100)+'% do orçamento de '+brl(c.orc)+'.':'Passou '+brl(tot-c.orc)+' do orçamento. Dá para ajustar a meta em Mais → Ajustes.')):h('p',{class:'sub'},'Defina um orçamento em Mais → Ajustes.')),
    card('Por categoria',tot?h('ul',{},Object.entries(por).sort((a,b)=>b[1]-a[1]).map(([k,x])=>h('li',{},h('span',{},k+' '+brl(x)+' ('+Math.round(x/tot*100)+'%)'),h('span',{class:'hb',style:'width:'+Math.round(x/mx*40)+'%'})))):h('p',{class:'sub'},'Sem gastos neste mês.'))];
  else if(s==='his')cs=[card('Mês',mnav()),fHis(mv)];
  else cs=fGra(gs,tot);
  return h('div',{},h('h1',{},'Finanças'),seg('fin',[['lan','Lançar'],['mes','Mês'],['his','Histórico'],['gra','Gráficos']]),...cs);
}
function fLan(){
  const e=ed&&ed.t==='gasto'?ed:null;let cat=e?e.c:'Outros',ent=e?e.k==='e':false;
  const v=h('input',{type:'text',inputmode:'decimal',id:'v',autocomplete:'off',placeholder:'Ex.: 12,50',value:e?String(e.v/100).replace('.',','):''}),n=h('input',{type:'text',maxlength:'30',id:'dn',placeholder:'Opcional',value:e?e.n||'':''}),dt=h('input',{type:'date',id:'dd',value:e?e.d:day()}),er=h('p',{class:'err',role:'alert'}),
    cats=h('div',{class:'row',role:'radiogroup','aria-label':'Categoria'},CATS.map(x=>chip('cat',x,x,x===cat,()=>cat=x)));cats.hidden=ent;
  const salvar=()=>{const q=Math.round(parseFloat(v.value.trim().replace(/\./g,'').replace(',','.'))*100);
    if(!(q>0&&q<1e12))return er.textContent='O valor precisa ser maior que zero. Digite, por exemplo, 12,50.';
    put({...(e||{id:crypto.randomUUID(),t:'gasto',ts:Date.now()}),d:dok(dt.value),v:q,c:ent?'Entrada':cat,k:ent?'e':'g',n:n.value.trim().slice(0,30)});ed=null;aviso(e?'Lançamento atualizado.':'Salvo.');render()};
  return [card(e?'Editar lançamento':'Novo lançamento',h('div',{class:'row',role:'radiogroup','aria-label':'Tipo'},chip('tp','g','Gasto',!ent,()=>{ent=false;cats.hidden=false}),chip('tp','e','Entrada',ent,()=>{ent=true;cats.hidden=true})),
    h('label',{for:'v'},'Valor em reais'),v,er,cats,h('label',{for:'dn'},'Descrição'),n,h('label',{for:'dd'},'Data'),dt,h('div',{class:'row'},h('button',{class:'p',onclick:salvar},'Salvar'),e?h('button',{onclick:()=>{ed=null;render()}},'Cancelar'):null))];
}
function fHis(mv){
  const q=h('input',{type:'text',id:'bq',placeholder:'Buscar por descrição ou categoria',value:fl.q,'aria-label':'Buscar'}),
    tp=sel('bt','Tipo',[['','Todos'],['g','Gastos'],['e','Entradas']],fl.tp),ct=sel('bc','Categoria',[['','Todas as categorias'],...CATS.concat('Entrada').map(x=>[x,x])],fl.cat),ul=h('ul'),tt=h('p',{class:'sub'});
  const pinta=()=>{const l=mv.filter(x=>(!fl.tp||(fl.tp==='e')===(x.k==='e'))&&(!fl.cat||x.c===fl.cat)&&(!fl.q||(x.c+' '+(x.n||'')).toLowerCase().includes(fl.q.toLowerCase())));
    ul.replaceChildren(...l.slice(0,60).map(o=>h('li',{},h('span',{},dm(o.d)+' · '+(o.k==='e'?'+':'')+brl(o.v)+' · '+o.c+(o.n?' · '+o.n:'')),acoes(o,'fin','lan'))));
    tt.textContent=l.length+' lançamentos · '+brl(somav(l.filter(x=>x.k!=='e')))+' em gastos';if(!l.length)ul.append(h('li',{},'Nada encontrado.'))};
  q.addEventListener('input',()=>{fl.q=q.value;pinta()});tp.addEventListener('change',()=>{fl.tp=tp.value;pinta()});ct.addEventListener('change',()=>{fl.cat=ct.value;pinta()});pinta();
  const csv=()=>{const z=s=>'"'+(/^[=+\-@]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';
    baixar('vida-'+mes+'.csv','\ufeff'+['data;tipo;categoria;descricao;valor'].concat(mv.map(x=>[x.d,x.k==='e'?'entrada':'gasto',z(x.c),z(x.n||''),(x.v/100).toFixed(2).replace('.',',')].join(';'))).join('\n'),'text/csv')};
  return card('Buscar e filtrar',q,h('div',{class:'row'},tp,ct),tt,ul,mv.length?h('div',{class:'row'},h('button',{onclick:csv},'Exportar CSV do mês')):null);
}
function fGra(gs,tot){
  const [y,m]=mes.split('-').map(Number),nd=new Date(y,m,0).getDate(),pd=Array(nd).fill(0);gs.forEach(x=>pd[+x.d.slice(8)-1]+=x.v);
  const mxd=Math.max(...pd),im=pd.indexOf(mxd),dd=pd.filter(Boolean).length;
  const ms=[...Array(6)].map((_,i)=>{const k=day(new Date(y,m-1-(5-i),1)).slice(0,7),l=items.filter(x=>x.t==='gasto'&&x.d.startsWith(k));return [new Date(k+'-15T12:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),somav(l.filter(x=>x.k==='e')),somav(l.filter(x=>x.k!=='e'))]});
  const t=Math.max(1,...ms.flatMap(x=>[x[1],x[2]]));
  return [card('Mês',mnav()),
    card('Gasto por dia',h('div',{class:'bars thin','aria-hidden':'true'},pd.map(v=>h('i',{style:'height:'+(v?4+v/Math.max(1,mxd)*86:2)+'px'}))),h('p',{class:'sub'},mxd?'Maior gasto: dia '+(im+1)+' ('+brl(mxd)+'). Média nos dias com gasto: '+brl(Math.round(tot/dd))+'.':'Sem gastos neste mês.')),
    card('Últimos 6 meses',par(ms,t),h('p',{class:'sub'},'Barra lisa: entradas. Barra listrada: gastos.'))];
}

/* foco */
const FK='vida_foco',foco=()=>{try{return JSON.parse(localStorage.getItem(FK))}catch{return null}};
function fechar(){const f=foco();localStorage.removeItem(FK);if(!f)return;const m=Math.min(f.min,Math.round((Math.min(Date.now(),f.fim)-f.ini)/60000));if(m>=1)novo('foco',{tema:f.tema,min:m})}
function tick(){
  const f=foco();if(!f)return;const r=Math.max(0,f.fim-Date.now());
  if(!r){fechar();navigator.vibrate?.([300,150,300]);aviso('Foco concluído. Bom trabalho!');if(tab==='foco'||tab==='hoje')render();return}
  const el=$('#tm');if(el){const s=Math.ceil(r/1000);el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
}
function vFoco(){
  const s=sub.foco,a=foco(),c=cfg(),temas=items.filter(x=>x.t==='tema').sort((x,y)=>x.ts-y.ts),hoje=doDia('foco'),tm=soma(hoje);let cs;
  if(s==='tm'){
    const op=[{txt:''},...temas].map((t,i)=>chip('tm',t.txt,t.txt||'Sem assunto',i===0));
    const ini=m=>()=>{const t=document.querySelector('input[name=tm]:checked')?.value||'';localStorage.setItem(FK,JSON.stringify({ini:Date.now(),fim:Date.now()+m*60000,min:m,tema:t}));render();tick()};
    cs=[card('Temporizador',a?h('div',{},h('p',{class:'sub'},a.tema||'Sem assunto'),h('p',{class:'big',id:'tm',role:'timer'}),h('button',{onclick:()=>{fechar();aviso('Foco encerrado.');render()}},'Parar'))
      :h('div',{},h('p',{class:'sub'},'Escolha um assunto e a duração:'),h('div',{class:'row',role:'radiogroup','aria-label':'Assunto'},op),h('div',{class:'row'},[15,25,45,60,90].map(m=>h('button',{class:'p',onclick:ini(m)},m+' min')))),
      h('p',{class:'sub'},'Mantenha o app aberto. Se a tela apagar, o tempo continua contando e você vê o resultado ao voltar.')),
      card('Meta de hoje',h('p',{class:'big'},dur(tm)),pg(tm,c.foco),h('p',{class:'sub'},'Meta: '+dur(c.foco)))];
  }else if(s==='as'){
    const nt=h('input',{type:'text',maxlength:'30',id:'nt',placeholder:'Ex.: Estudar, Trabalhar, Ler'});
    const add=()=>{const v=nt.value.trim();if(!v||temas.length>=12||temas.some(t=>t.txt.toLowerCase()===v.toLowerCase()))return;novo('tema',{txt:v.slice(0,30)});render()};
    const th=(k,l)=>chip('th',k,l,(localStorage.getItem('vida_tema')||'auto')===k,()=>{k==='auto'?localStorage.removeItem('vida_tema'):localStorage.setItem('vida_tema',k);aplicarTema()});
    cs=[card('Seus assuntos',h('label',{for:'nt'},'Novo assunto'),nt,h('div',{class:'row'},h('button',{class:'p',onclick:add},'Adicionar')),
      temas.length?h('ul',{},temas.map(t=>h('li',{},h('span',{},t.txt+' · hoje '+dur(soma(hoje.filter(x=>x.tema===t.txt)))),lixo(t)))):h('p',{class:'sub'},'Crie assuntos para saber onde seu tempo vai.')),
      card('Aparência',h('div',{class:'row',role:'radiogroup','aria-label':'Tema visual'},th('auto','Automático'),th('light','Claro'),th('dark','Escuro')))];
  }else{
    const u7=ult(7),pt={};items.filter(x=>x.t==='foco'&&u7.includes(x.d)).forEach(x=>{const k=x.tema||'Sem assunto';pt[k]=(pt[k]||0)+x.min});const mx=Math.max(1,...Object.values(pt)),t30=soma(items.filter(x=>x.t==='foco'&&ult(30).includes(x.d)));
    cs=[card('Últimos 7 dias',barras(u7.map(d=>[d,soma(doDia('foco',d))]),v=>v||'–')),
      card('Por assunto (7 dias)',Object.keys(pt).length?h('ul',{},Object.entries(pt).sort((a,b)=>b[1]-a[1]).map(([k,x])=>h('li',{},h('span',{},k+' · '+dur(x)),h('span',{class:'hb',style:'width:'+Math.round(x/mx*40)+'%'})))):h('p',{class:'sub'},'Sem sessões nesta semana.')),
      card('30 dias',h('p',{class:'big'},dur(t30)),h('p',{class:'sub'},'Média: '+dur(Math.round(t30/30))+' por dia.')),
      card('Sessões recentes',rec('foco').length?h('ul',{},rec('foco').slice(0,10).map(o=>h('li',{},h('span',{},dm(o.d)+' · '+(o.tema||'Sem assunto')+' · '+dur(o.min)),lixo(o)))):h('p',{class:'sub'},'Nada ainda.'))];
  }
  return h('div',{},h('h1',{},'Foco'),seg('foco',[['tm','Timer'],['as','Assuntos'],['es','Estatísticas']]),...cs);
}

/* academia */
const fa={k:''};
function vAcad(){
  const s=sub.acad,c=cfg(),u7=ult(7);let cs;
  const n7=new Set(items.filter(x=>x.t==='treino'&&u7.includes(x.d)).map(x=>x.d)).size;
  if(s==='reg'){
    const e=ed&&ed.t==='treino'?ed:null;let min=e?e.min:60,k=e?e.k:'Musculação';
    const ou=h('input',{type:'text',inputmode:'numeric',id:'ou',maxlength:'3',placeholder:'Ex.: 50',value:e&&![30,45,60,90].includes(e.min)?e.min:''}),dt=h('input',{type:'date',id:'td',value:e?e.d:day()}),er=h('p',{class:'err',role:'alert'});
    const salvar=()=>{const v=ou.value.trim()?Number(ou.value.trim()):min;
      if(!(Number.isInteger(v)&&v>=1&&v<=600))return er.textContent='Digite a duração em minutos, de 1 a 600. Exemplo: 45.';
      put({...(e||{id:crypto.randomUUID(),t:'treino',ts:Date.now()}),d:dok(dt.value),min:v,k});ed=null;aviso(e?'Treino atualizado.':'Treino registrado. Boa!');render()};
    cs=[card(e?'Editar treino':'Treinei hoje',h('div',{class:'row',role:'radiogroup','aria-label':'Tipo de treino'},KIND.map(x=>chip('kd',x,x,x===k,()=>k=x))),
      h('div',{class:'row',role:'radiogroup','aria-label':'Duração'},[30,45,60,90].map(m=>chip('du',m,m+' min',m===min&&!ou.value,()=>{min=m;ou.value=''}))),h('label',{for:'ou'},'Outra duração (minutos)'),ou,h('label',{for:'td'},'Data'),dt,er,
      h('div',{class:'row'},h('button',{class:'p',onclick:salvar},'Salvar'),e?h('button',{onclick:()=>{ed=null;render()}},'Cancelar'):null))];
  }else if(s==='pro'){
    const sem=u7.map(d=>{const on=doDia('treino',d).length>0;return h('div',{class:'dia'+(on?' on':'')},h('b',{},on?'✓':'–'),new Date(d+'T12:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''))});
    const mm=items.filter(x=>x.t==='treino'&&x.d.startsWith(day().slice(0,7))),sm=ult(28),w=[0,1,2,3].map(i=>[sm[i*7+6],new Set(items.filter(x=>x.t==='treino'&&sm.slice(i*7,i*7+7).includes(x.d)).map(x=>x.d)).size]);
    cs=[card('Meta da semana',h('p',{class:'big'},n7+' / '+c.tr),pg(n7,c.tr),h('div',{class:'dots'},sem)),
      card('Últimas 4 semanas',barras(w,v=>v+'×'),h('p',{class:'sub'},'Dias de treino por semana, da mais antiga à atual.')),
      card('Este mês',h('p',{class:'big'},new Set(mm.map(x=>x.d)).size+' dias'),h('p',{class:'sub'},dur(soma(mm))+' no total.'))];
  }else{
    const ul=h('ul'),f=sel('fk','Tipo',[['','Todos os tipos'],...KIND.map(x=>[x,x])],fa.k);
    const pinta=()=>{const l=rec('treino').filter(x=>!fa.k||x.k===fa.k);ul.replaceChildren(...l.slice(0,40).map(o=>h('li',{},h('span',{},dm(o.d)+' · '+(o.k||'Treino')+' · '+dur(o.min)),acoes(o,'acad','reg'))));if(!l.length)ul.append(h('li',{},'Nada encontrado.'))};
    f.addEventListener('change',()=>{fa.k=f.value;pinta()});pinta();cs=[card('Histórico',f,ul)];
  }
  return h('div',{},h('h1',{},'Academia'),seg('acad',[['reg','Registrar'],['pro','Progresso'],['his','Histórico']]),...cs);
}

/* mais: hábitos, notas, ajustes */
const fn={q:'',s:'p'};
function vMais(){
  const s=sub.mais;let cs;
  if(s==='hab'){
    const nh=h('input',{type:'text',maxlength:'30',id:'nh',placeholder:'Ex.: Beber água, Ler 10 min'}),hb=habs();
    const add=()=>{const v=nh.value.trim();if(!v||hb.length>=12)return;novo('habito',{txt:v.slice(0,30)});render()};
    const rm=b=>{const cc=items.filter(x=>x.t==='check'&&x.h===b.id);[b,...cc].forEach(x=>del(x.id));aviso('Hábito removido.',()=>[b,...cc].forEach(put));render()};
    cs=[card('Novo hábito',h('label',{for:'nh'},'Nome'),nh,h('div',{class:'row'},h('button',{class:'p',onclick:add},'Adicionar'))),
      card('Hoje',hb.length?h('ul',{},hb.map(b=>{const q=seq(b);return h('li',{class:'col'},h('span',{},b.txt),h('span',{class:'sub'},ult(7).map(d=>feito(b,d)?'●':'○').join(' ')+' · '+(q?q+(q>1?' dias seguidos':' dia'):'Recomece quando quiser')),h('div',{class:'row'},tg(b),h('button',{'aria-label':'Excluir hábito '+b.txt,onclick:()=>rm(b)},'Excluir')))})):h('p',{class:'sub'},'Nenhum hábito ainda. Comece com um só.'))];
  }else if(s==='nt'){
    const e=ed&&ed.t==='nota'?ed:null,tx=h('textarea',{id:'nx',rows:'3',maxlength:'280',placeholder:'Escreva sua nota'},e?e.txt:''),rd=h('input',{type:'date',id:'nr',value:e?e.rem||'':''}),rh=h('input',{type:'time',id:'nh2',value:e?e.hr||'':''}),er=h('p',{class:'err',role:'alert'});
    const salvar=()=>{const v=tx.value.trim();if(!v)return er.textContent='Escreva algo na nota.';
      put({...(e||{id:crypto.randomUUID(),t:'nota',d:day(),ts:Date.now(),ok:false}),txt:v.slice(0,280),rem:rd.value&&/^\d{4}-\d\d-\d\d$/.test(rd.value)?rd.value:'',hr:rd.value&&/^\d\d:\d\d$/.test(rh.value)?rh.value:''});avisados.clear();ed=null;aviso('Nota salva.');render()};
    const q=h('input',{type:'text',id:'sq',placeholder:'Buscar nas notas','aria-label':'Buscar',value:fn.q}),f=sel('sf','Mostrar',[['p','Pendentes'],['c','Concluídas'],['t','Todas']],fn.s),ul=h('ul');
    const pinta=()=>{const l=items.filter(x=>x.t==='nota'&&(fn.s==='t'||(fn.s==='c')===!!x.ok)&&(!fn.q||x.txt.toLowerCase().includes(fn.q.toLowerCase()))).sort((a,b)=>(a.rem||'9')<(b.rem||'9')?-1:1);
      ul.replaceChildren(...l.map(o=>h('li',{class:'col'},h('span',{class:o.ok?'feita':''},o.txt),h('span',{class:'sub'},o.rem?'Lembrete: '+dm(o.rem)+(o.hr?' às '+o.hr:''):'Sem lembrete'),h('div',{class:'row'},h('button',{onclick:()=>{put({...o,ok:!o.ok});render()}},o.ok?'Reabrir':'Concluir'),acoes(o,'mais','nt')))));if(!l.length)ul.append(h('li',{},'Nada por aqui.'))};
    q.addEventListener('input',()=>{fn.q=q.value;pinta()});f.addEventListener('change',()=>{fn.s=f.value;pinta()});pinta();
    cs=[card(e?'Editar nota':'Nova nota',h('label',{for:'nx'},'Nota'),tx,h('label',{for:'nr'},'Lembrar em (opcional)'),rd,h('label',{for:'nh2'},'Hora (opcional)'),rh,er,
        h('p',{class:'sub'},'Lembretes aparecem em Hoje e como aviso quando o app está aberto. O Vida não usa servidor, então não consegue avisar com o app fechado.'),
        h('div',{class:'row'},h('button',{class:'p',onclick:salvar},'Salvar'),e?h('button',{onclick:()=>{ed=null;render()}},'Cancelar'):null,window.Notification&&Notification.permission==='default'?h('button',{onclick:()=>Notification.requestPermission().then(render)},'Ativar avisos'):null)),
      card('Suas notas',q,f,ul)];
  }else cs=[vAjustes(),vDados()];
  return h('div',{},h('h1',{},'Mais'),seg('mais',[['hab','Hábitos'],['nt','Notas'],['aju','Ajustes']]),...cs);
}

function render(){
  document.querySelectorAll('nav button').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  $('nav').style.setProperty('--i',ABAS.indexOf(tab));$('nav').toggleAttribute('data-off',!ABAS.includes(tab));
  $('#main').replaceChildren({hoje:vHoje,fin:vFin,foco:vFoco,acad:vAcad,mais:vMais}[tab]());tick();window.scrollTo(0,0);
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;ed=null;render()}));
document.addEventListener('pointermove',e=>{const c=e.target.closest?.('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();inst=e;if(tab==='hoje'&&db)render()});
setInterval(tick,500);setInterval(lembretes,20000);document.addEventListener('visibilitychange',tick);
(async()=>{
  aplicarTema();
  try{db=await abrir();items=await lerTudo();items.filter(x=>!TIPOS.includes(x.t)).forEach(x=>del(x.id));navigator.storage?.persist?.()}
  catch{$('#main').textContent='Não foi possível guardar dados neste navegador. Saia do modo anônimo e tente de novo.';return}
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
  render();lembretes();
})();

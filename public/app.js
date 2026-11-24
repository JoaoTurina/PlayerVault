const $=s=>document.querySelector(s), app=$('#app'), dialog=$('#dialog'), form=$('#form');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const platforms=['Computador','Mobile','PlayStation','Xbox','Nintendo','Emulador','Outra'], statuses=['Jogando','Concluído','Completado 100%','Pausado','Abandonado','Pretendo jogar'];
let me, current, games=[], timer;
async function api(path,method='GET',data){const r=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const j=await r.json();if(!r.ok)throw Error(j.error);return j}
function toast(msg){$('#toast').textContent=msg;$('#toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',4000)}
const button=(label,action,cls='secondary')=>`<button type="button" class="${cls}" data-action="${action}">${label}</button>`;
const picture=(src,cls,fallback)=>src?`<img class="${cls}" src="${esc(src)}" alt="">`:`<div class="${cls}">${fallback}</div>`;
const remotePicture = (src, cls, fallback) => `<span class="${cls} remote-picture"><span aria-hidden="true">${fallback}</span>${src ? `<img src="${esc(src)}" alt="" loading="lazy" data-steam-art>` : ''}</span>`;
document.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement && event.target.hasAttribute('data-steam-art')) event.target.remove();
}, true);
const dateLabel = date => date.split('-').reverse().join('/');
const platformSymbols={Computador:'monitor',Mobile:'phone',PlayStation:'ps',Xbox:'xbox',Nintendo:'switch',Emulador:'chip',Outra:'gamepad'};
const serviceSymbols={'steam':'steam','epic games':'epic','epic':'epic','gog':'gog','android':'android','ios':'phone','ps4':'ps','ps5':'ps','playstation network':'ps','xbox game pass':'xbox','game pass':'xbox','xbox app':'xbox','nintendo switch':'switch','switch':'switch','dolphin':'chip','pcsx2':'chip','retroarch':'chip','independente':'gamepad','executável independente':'gamepad','itch.io':'gamepad','ea app':'gamepad','ubisoft connect':'gamepad','battle.net':'gamepad'};
const services=['Steam','Epic Games','GOG','Android','iOS','PS4','PS5','PlayStation Network','Xbox Game Pass','Xbox App','Nintendo Switch','Dolphin','PCSX2','RetroArch','Independente','itch.io','EA App','Ubisoft Connect','Battle.net'];
const shapes={monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',ps:'<path d="M8 4v15l3 1V6c3 1 4 2 4 5 3 0 4-1 4-3 0-3-5-5-11-6M6 14l-3 2 3 2m7-3 7-2 2 2-9 4"/>',xbox:'<circle cx="12" cy="12" r="9"/><path d="M6 5c5 2 10 8 13 14M18 5C13 7 8 13 5 19"/>',switch:'<rect x="3" y="3" width="8" height="18" rx="4"/><rect x="13" y="3" width="8" height="18" rx="4"/><circle cx="7" cy="8" r="1"/><circle cx="17" cy="15" r="1"/>',chip:'<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M8 2v3m8-3v3M8 19v3m8-3v3M2 8h3m-3 8h3m14-8h3m-3 8h3"/>',gamepad:'<path d="M7 7h10c4 0 6 10 3 11-2 1-4-3-6-3h-4c-2 0-4 4-6 3C1 17 3 7 7 7Z M7 9v6m-3-3h6m6-1h.01m3 3h.01"/>',steam:'<circle cx="16" cy="8" r="5"/><circle cx="16" cy="8" r="2.5"/><circle cx="7" cy="16" r="3"/><path d="M2 13l5 2m2 3 9-5m-9 0 3-4"/>',epic:'<path d="M4 3h16v14l-8 4-8-4z"/><text x="12" y="13" text-anchor="middle" font-size="7" stroke="none" fill="currentColor">EPIC</text>',gog:'<rect x="2" y="3" width="20" height="18" rx="4"/><text x="12" y="15" text-anchor="middle" font-size="8" stroke="none" fill="currentColor">GOG</text>',android:'<path d="m7 6-2-3m12 3 2-3M3 16v-3a9 9 0 0 1 18 0v3z"/><circle cx="8" cy="12" r=".7"/><circle cx="16" cy="12" r=".7"/>'};
function gameIcon(label,custom='',service=false){const lookup=service?serviceSymbols:platformSymbols, name=service?String(label).trim().toLowerCase():label;const key=Object.hasOwn(lookup,name)?lookup[name]:'gamepad';return custom?`<img class="game-icon" src="${esc(custom)}" alt="">`:`<svg class="game-icon icon-${key}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[key]}</svg>`}
const hours=m=>`${Math.floor(m/60)}h ${m%60?m%60+'min':''}`;
const options=(arr,val)=>arr.map(x=>`<option ${x===val?'selected':''}>${esc(x)}</option>`).join('');
const field=(label,name,value='',type='text',extra='')=>`<label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
const cropSizes={avatar:[400,400],banner:[1500,300],cover:[600,800],image:[256,256],screenshot:[1280,720],platform_icon:[192,192],service_icon:[192,192]};
const file=(name,label,old)=>`<div class="image-field" data-image-field="${name}"><label for="${name}">${label} (até 15 MB antes do recorte)</label><input id="${name}" name="${name}" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><div class="crop-editor" hidden></div>${old?`<div class="existing-image">${picture(old,'image-thumb','')}<button type="button" class="secondary recrop">Recortar imagem atual</button></div><label><input type="checkbox" name="remove_${name}"> Remover imagem atual</label>`:''}</div>`;
let crops=new Map();
function setupCrops(){crops=new Map();for(const field of form.querySelectorAll('[data-image-field]')){const name=field.dataset.imageField,input=field.querySelector('input[type=file]'),editor=field.querySelector('.crop-editor'),remove=field.querySelector('input[type=checkbox]');let revision=0;
async function open(src){const rev=++revision; crops.set(name,{pending:true});try{const im=new Image();im.src=src;await im.decode();if(rev!==revision||!field.isConnected)return;const [w,h]=cropSizes[name];editor.hidden=false;editor.innerHTML=`<p class="muted">Arraste a imagem ou ajuste os controles. A área visível será salva.</p><canvas width="${w}" height="${h}" aria-label="Prévia do recorte"></canvas><label>Zoom <input type="range" min="1" max="4" step="0.01" value="1" data-crop="zoom"></label><label>Posição horizontal <input type="range" min="0" max="100" value="50" data-crop="x"></label><label>Posição vertical <input type="range" min="0" max="100" value="50" data-crop="y"></label><button type="button" class="secondary reset-crop">Centralizar e redefinir zoom</button>`;const canvas=editor.querySelector('canvas'),ctx=canvas.getContext('2d'),zoom=editor.querySelector('[data-crop=zoom]'),x=editor.querySelector('[data-crop=x]'),y=editor.querySelector('[data-crop=y]');let overflowX=0,overflowY=0;
function draw(){const scale=Math.max(w/im.naturalWidth,h/im.naturalHeight)*Number(zoom.value),iw=im.naturalWidth*scale,ih=im.naturalHeight*scale;overflowX=Math.max(0,iw-w);overflowY=Math.max(0,ih-h);ctx.clearRect(0,0,w,h);ctx.drawImage(im,-overflowX*Number(x.value)/100,-overflowY*Number(y.value)/100,iw,ih)}
for(const el of [zoom,x,y])el.addEventListener('input',draw);editor.querySelector('.reset-crop').onclick=()=>{zoom.value=1;x.value=y.value=50;draw()};let drag;canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY,Number(x.value),Number(y.value)]};canvas.onpointermove=e=>{if(!drag)return;const r=canvas.getBoundingClientRect();if(overflowX)x.value=Math.max(0,Math.min(100,drag[2]-(e.clientX-drag[0])*w/r.width/overflowX*100));if(overflowY)y.value=Math.max(0,Math.min(100,drag[3]-(e.clientY-drag[1])*h/r.height/overflowY*100));draw()};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;draw();crops.set(name,{canvas});if(remove)remove.checked=false;
}catch(e){if(rev===revision){editor.hidden=true;crops.set(name,{error:'Não foi possível abrir a imagem.'});form.querySelector('.error').textContent='Não foi possível abrir a imagem.'}}}
input.onchange=()=>{const item=input.files[0];if(!item)return;if(item.size>15*1024*1024){revision++;input.value='';editor.hidden=true;crops.set(name,{error:'Imagem deve ter até 15 MB.'});form.querySelector('.error').textContent='Imagem deve ter até 15 MB.';return}const url=URL.createObjectURL(item);open(url).finally(()=>URL.revokeObjectURL(url))};const recrop=field.querySelector('.recrop');if(recrop)recrop.onclick=()=>open(field.querySelector('.image-thumb').src);if(remove)remove.onchange=()=>{if(remove.checked){revision++;crops.delete(name);input.value='';editor.hidden=true}};}}
async function image(f,name,old=''){if(f.has('remove_'+name))return '';const crop=crops.get(name);if(crop?.pending)throw Error('Aguarde o carregamento da imagem.');if(crop?.error)throw Error(crop.error);if(crop?.canvas){for(const quality of [.92,.8,.65,.45]){const data=crop.canvas.toDataURL('image/webp',quality);if(data.length<1390000)return data}throw Error('O recorte excede 1 MB. Escolha outra imagem.')}return old||''}
function modal(title,fields,submit){form.innerHTML=`<h2>${title}</h2>${fields}<p class="error" role="alert"></p><div class="actions"><button type="submit">Salvar</button>${button('Cancelar','close')}</div>`;dialog.showModal();setupCrops();form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;try{await submit(new FormData(form));dialog.close();toast('Salvo com sucesso');await load()}catch(e){form.querySelector('.error').textContent=e.message}finally{b.disabled=false}}}
function auth(register){app.innerHTML=`<section class="panel auth"><h1>${register?'Criar conta':'Entrar'}</h1><form id="auth">${field('Nome de usuário','username','','text','required autocomplete="username"')}${field('Senha','password','','password',`required autocomplete="${register?'new-password':'current-password'}"`)}<p class="muted">${register?'Use pelo menos 8 caracteres na senha.':''}</p><button>${register?'Cadastrar':'Entrar'}</button><p class="error"></p></form><p><a href="/${register?'login':'register'}">${register?'Já possui conta? Entrar':'Ainda não tem conta? Cadastre-se'}</a></p></section>`;$('#auth').onsubmit=async e=>{e.preventDefault();try{await api(register?'/register':'/login','POST',Object.fromEntries(new FormData(e.target)));location.href='/'}catch(err){e.target.querySelector('.error').textContent=err.message}}}
function render(){const p=current, own=me?.id===p.id;const versions=new Map();for(const game of games){if(game.version_group)versions.set(game.version_group,(versions.get(game.version_group)||0)+1)}document.documentElement.style.setProperty('--accent',p.color);const all=games.flatMap(g=>g.achievements),done=all.filter(a=>a.unlocked).length,pct=all.length?Math.round(done/all.length*100):null;const counts={};games.forEach(g=>counts[g.platform]=(counts[g.platform]||0)+1);const distinct=new Set(games.map(g=>g.name.trim().toLowerCase())).size;
app.innerHTML=`<section class="hero"><div class="banner" ${p.banner?`style="background-image:url('${esc(p.banner)}')"`:''}></div><div class="identity">${picture(p.avatar,'avatar',esc(p.display[0]?.toUpperCase()||'?'))}<div><h1>${esc(p.display)}</h1><small>@${esc(p.username)} ${p.private?'· Perfil privado':''}</small><p>${esc(p.bio||'Minha trajetória no mundo dos jogos.')}</p></div>${own?`<div class="actions">${button('Editar perfil','profile')}${button('Copiar link','share')}</div>`:''}</div></section><section class="stats">${[[distinct,'Jogos únicos'],[hours(games.reduce((n,g)=>n+g.minutes,0)),'Tempo jogado'],[`${done}/${all.length}`,'Conquistas'],[pct===null?'—':pct+'%','Progresso geral']].map(([v,l])=>`<div class="stat"><strong>${v}</strong><small>${l}</small></div>`).join('')}</section><section class="panel"><h2>Minhas plataformas</h2>${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="icon-line">${gameIcon(k,games.find(g=>g.platform===k&&g.platform_icon)?.platform_icon)} ${esc(k)} <small>· ${v} registro(s)</small></div><div class="bar"><i style="width:${100*v/games.length}%"></i></div>`).join('')||'<p class="muted">Nenhuma plataforma registrada.</p>'}</section><div class="section"><h2>Minha biblioteca</h2>${own?`<div class="actions">${button('Importar da Steam','steam')}${button('+ Adicionar jogo','add','primary')}</div>`:''}</div><div class="filters"><input id="search" placeholder="Buscar jogo..." aria-label="Buscar jogo"><select id="platform"><option value="">Todas as plataformas</option>${options(platforms,'')}</select><select id="status"><option value="">Todos os status</option>${options(statuses,'')}</select></div><div id="games" class="games"></div>`;
function cards(){const search=$('#search').value.toLowerCase(),plat=$('#platform').value,status=$('#status').value;$('#games').innerHTML=games.filter(g=>g.name.toLowerCase().includes(search)&&(!plat||g.platform===plat)&&(!status||g.status===status)).map(g=>{const n=g.achievements.filter(a=>a.unlocked).length,t=g.achievements.length;return `<article class="game">${g.cover ? picture(g.cover,'cover','🎮') : remotePicture(g.steam_cover,'cover','🎮')}<div class="gamebody"><h3>${g.favorite?'★ ':''}${esc(g.name)}</h3>${g.version_group ? `<p class="muted version-count">${esc(versionLabel(g))} · ${versions.get(g.version_group)} versão(ões)</p>` : ''}<div class="game-meta"><span class="icon-line">${gameIcon(g.platform,g.platform_icon)}${esc(g.platform)}</span>${g.service?`<span class="icon-line">${gameIcon(g.service,g.service_icon,true)}${esc(g.service)}</span>`:''}</div><p>${hours(g.minutes)} · ${esc(g.status)}</p>${t?`<div class="bar"><i style="width:${100*n/t}%"></i></div><small>${n}/${t} conquistas</small>`:'<small>Sem conquistas cadastradas</small>'}<p class="actions"><a class="btn secondary" href="${gamePath(g)}">Detalhes</a>${own?button('Editar','edit:'+g.id)+button('Excluir','delete:'+g.id,'danger'):''}</p></div></article>`}).join('')||'<div class="empty">Nenhum jogo encontrado.</div>'}
for(const s of ['#search','#platform','#status'])$(s).addEventListener('input',cards);cards();if(all.length===0)document.querySelectorAll('.stat')[3].title='Sem conquistas registradas';}
function details(g){const own=me?.id===current.id;$('#details').innerHTML=`<section class="panel" style="margin-top:22px"><div class="section"><h2>${esc(g.name)} — Conquistas</h2></div>${own?`<div class="actions">${button('+ Conquista','ach:'+g.id,'primary')}</div>`:''}${g.achievements.map(a=>`<div class="ach ${a.unlocked?'':'locked'}">${a.image ? picture(a.image,'symbol',esc(a.icon)) : remotePicture(a.steam_image,'symbol',esc(a.icon))}<div><strong>${esc(a.name)}</strong>${a.imported_from_steam?' <span class="steam-badge">Importada da Steam</span>':''}<br><small>${a.unlocked?'Desbloqueada':'Bloqueada'}${a.unlocked && a.unlocked_date ? ' · '+dateLabel(a.unlocked_date) : ''}${a.description ? ' · '+esc(a.description) : ''}</small></div>${own?`<div class="actions">${button(a.unlocked?'Bloquear':'Desbloquear',`toggle:${g.id}:${a.id}`)}${button('Editar',`ach:${g.id}:${a.id}`)}${button('Excluir',`delach:${g.id}:${a.id}`,'danger')}</div>`:''}</div>`).join('')||'<p class="muted">Nenhuma conquista cadastrada.</p>'}</section>`}
function editGame(g={}){modal(g.id?'Editar jogo':'Adicionar jogo',field('Nome','name',g.name,'text','required maxlength="120"')+`<label>Plataforma</label><select name="platform">${options(platforms,g.platform)}</select>`+file('platform_icon','Ícone personalizado da plataforma',g.platform_icon)+field('Serviço / ambiente (opcional)','service',g.service,'text','list="services" maxlength="80"')+`<datalist id="services">${options(services,'')}</datalist>`+file('service_icon','Ícone personalizado do ambiente',g.service_icon)+field('Horas jogadas','hours',Math.floor((g.minutes||0)/60),'number','min="0" required')+field('Minutos adicionais','minutes',(g.minutes||0)%60,'number','min="0" max="59" required')+`<label>Status</label><select name="status">${options(statuses,g.status)}</select><label><input type="checkbox" name="favorite" ${g.favorite?'checked':''}> Favorito</label>`+file('cover','Capa do jogo',g.cover),async f=>api('/games'+(g.id?'/'+g.id:''),g.id?'PUT':'POST',{...Object.fromEntries(f),minutes:Number(f.get('hours'))*60+Number(f.get('minutes')),favorite:f.has('favorite'),cover:await image(f,'cover',g.cover),platform_icon:await image(f,'platform_icon',g.platform_icon),service_icon:await image(f,'service_icon',g.service_icon)}))}
function editProfile(){const p=current;modal('Editar perfil',field('Nome de exibição','display',p.display,'text','required maxlength="60"')+`<label>Biografia</label><textarea name="bio" maxlength="500">${esc(p.bio)}</textarea>`+field('Cor do tema','color',p.color,'color')+file('avatar','Foto de perfil',p.avatar)+file('banner','Banner',p.banner)+`<label><input type="checkbox" name="private" ${p.private?'checked':''}> Perfil privado</label>`,async f=>api('/profile','PUT',{...Object.fromEntries(f),private:f.has('private'),avatar:await image(f,'avatar',p.avatar),banner:await image(f,'banner',p.banner)}))}
function editAchievement(g,a={}){modal(a.id?'Editar conquista':'Nova conquista',field('Nome','name',a.name,'text','required maxlength="100"')+field('Descrição','description',a.description)+`<label>Ícone padrão</label><select name="icon">${options(['🏆','🏅','⭐','💎','👑'],a.icon)}</select><label><input type="checkbox" name="unlocked" ${a.unlocked?'checked':''}> Desbloqueada</label>`+field('Data de aquisição (opcional)','unlocked_date',a.unlocked_date??'','date')+file('image','Ícone personalizado',a.image)+(!a.id?achievementVersions(g):''),async f=>api(`/games/${g.id}/achievements${a.id?'/'+a.id:''}`,a.id?'PUT':'POST',{...Object.fromEntries(f),unlocked:f.has('unlocked'),...(!a.id && g.version_group && form.querySelector('[name=versions]')?{game_ids:f.getAll('versions').map(Number)}:{}),image:await image(f,'image',a.image)}));
  const unlocked = form.elements.namedItem('unlocked');
  const date = form.elements.namedItem('unlocked_date');
  unlocked.onchange = () => {
    if (unlocked.checked && !date.value) date.value = today();
  };
}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el)return;const [action,id,aid]=el.dataset.action.split(':'),g=games.find(x=>x.id===Number(id)),a=g?.achievements.find(x=>x.id===Number(aid));try{switch(action){case 'close':dialog.close();break;case 'logout':await api('/logout','POST');location.href='/';break;case 'profile':editProfile();break;case 'share':await navigator.clipboard.writeText(location.origin+'/u/'+current.username);toast('Link copiado');break;case 'add':editGame();break;case 'edit':editGame(g);break;case 'steam':importSteam();break;case 'overview':editOverview(g);break;case 'duplicate':duplicateGame(g);break;case 'screenshot':addScreenshot(g);break;case 'delshot':if(confirm('Excluir esta captura?')){await api('/games/'+id+'/screenshots/'+aid,'DELETE');await load()}break;case 'ach':editAchievement(g,a);break;case 'delete':if(confirm('Excluir esta versão, suas conquistas e capturas?')){await api('/games/'+id,'DELETE');location.href='/u/'+encodeURIComponent(current.username)}break;case 'toggle':await api(`/games/${id}/achievements/${aid}`,'PUT',{...a,unlocked:!a.unlocked,unlocked_date:a.unlocked?'':today()});await load();break;case 'delach':if(confirm('Excluir conquista?')){await api(`/games/${id}/achievements/${aid}`,'DELETE');await load()}break}}catch(err){toast(err.message)}});


function versionLabel(game) {
  return game.version_name || 'Versão original';
}

function gamePath(game, tab = 'geral') {
  return '/u/' + encodeURIComponent(current.username) + '/jogos/' + game.id + '/' + tab;
}

function renderGamePage(username, id, tab) {
  const game = games.find(item => item.id === id);
  const own = me?.id === current.id;
  document.documentElement.style.setProperty('--accent', current.color);
  app.innerHTML = `<p><a class="btn secondary" href="/u/${encodeURIComponent(username)}">Voltar ao perfil</a></p>`;
  if (!game) {
    app.insertAdjacentHTML('beforeend','<p class="empty">Jogo não encontrado.</p>');
    return;
  }
  document.title = game.name + ' | PlayerVault';
  const versions = games.filter(item => item.id === id || (game.version_group && game.version_group === item.version_group));
  const tabs = [['geral','Visão geral'],['conquistas','Conquistas'],['capturas','Capturas']];
  app.insertAdjacentHTML('beforeend', `
    <h1>${esc(game.name)}</h1>
    <p class="muted">${esc(versionLabel(game))}</p>
    ${versions.length > 1 ? `<label for="game-version">Versão</label><select id="game-version">${versions.map(item => `<option value="${item.id}" ${item.id === id ? 'selected' : ''}>${esc(versionLabel(item))}</option>`).join('')}</select>` : ''}
    <nav class="game-tabs" aria-label="Detalhes do jogo">${tabs.map(([key,label]) =>
      `<a href="${gamePath(game,key)}" ${key === tab ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <div id="details"></div>`);
  const switcher = $('#game-version');
  if (switcher) switcher.onchange = () => {
    const selected = versions.find(item => item.id === Number(switcher.value));
    if (selected) location.href = gamePath(selected,tab);
  };
  if (tab === 'conquistas') return details(game);
  if (tab === 'capturas') return renderScreenshots(game,own);
  $('#details').innerHTML = `<section class="panel">
    <h2>Descrição</h2><p class="user-text">${esc(game.game_description || 'Nenhuma descrição adicionada.')}</p>
    <h2>Análise</h2>
    ${game.rating === null ? '' : `<p><strong>${esc(game.rating)}/10</strong></p>`}
    <p class="user-text">${esc(game.review || 'Nenhuma análise adicionada.')}</p>
    ${own ? `<div class="actions">${button('Editar visão geral','overview:'+id)}${button('Duplicar versão','duplicate:'+id)}${button('Excluir jogo','delete:'+id,'danger')}</div>` : ''}
  </section>`;
}

async function renderScreenshots(game, own) {
  const panel = $('#details');
  panel.innerHTML = `<section class="panel"><div class="section"><h2>Capturas de tela</h2>
    ${own ? button('Adicionar captura','screenshot:'+game.id,'primary') : ''}</div>
    <div id="screenshots" aria-live="polite">Carregando capturas…</div></section>`;
  const list = panel.querySelector('#screenshots');
  try {
    const shots = await api('/games/'+game.id+'/screenshots');
    list.className = 'screenshots';
    list.innerHTML = shots.map(shot => `<figure>
      <img src="${esc(shot.image)}" loading="lazy" alt="${esc(shot.caption || 'Captura de '+game.name)}">
      ${shot.caption ? `<figcaption>${esc(shot.caption)}</figcaption>` : ''}
      ${own ? button('Excluir captura',`delshot:${game.id}:${shot.id}`,'danger') : ''}
    </figure>`).join('') || '<p class="muted">Nenhuma captura adicionada.</p>';
  } catch (error) {
    list.textContent = error.message;
  }
}

function editOverview(game) {
  modal('Editar visão geral',
    field('Nome da versão','version_name',game.version_name,'text','maxlength="60" placeholder="Versão original"') +
    `<label for="game_description">Descrição</label><textarea id="game_description" name="game_description" maxlength="2000">${esc(game.game_description)}</textarea>
     <label for="review">Análise</label><textarea id="review" name="review" maxlength="4000">${esc(game.review)}</textarea>` +
    field('Nota de 0 a 10','rating',game.rating??'','number','min="0" max="10" step="any"'),
    async data => api('/games/'+game.id+'/details','PUT',{
      ...Object.fromEntries(data),rating:data.get('rating') === '' ? null : Number(data.get('rating'))
    }));
}

function duplicateGame(game) {
  modal('Duplicar versão',
    field('Nome da nova versão','version_name','','text','required maxlength="60" placeholder="Ex.: Desafio sem dano"') +
    '<label><input type="checkbox" name="copy_achievements"> Copiar a lista de conquistas para começar bloqueada</label>',
    async data => {
      const version = await api('/games/'+game.id+'/duplicate','POST',{
        version_name:data.get('version_name'),copy_achievements:data.has('copy_achievements')
      });
      history.replaceState(null,'',gamePath(version));
    });
}

function addScreenshot(game) {
  modal('Adicionar captura',
    field('Legenda (opcional)','caption','','text','maxlength="150"') + file('screenshot','Captura de tela'),
    async data => api('/games/'+game.id+'/screenshots','POST',{
      caption:data.get('caption'),image:await image(data,'screenshot')
    }));
}

function achievementVersions(game) {
  if (!game.version_group) return '';
  const versions = games.filter(item => item.version_group === game.version_group);
  if (versions.length < 2) return '';
  return `<fieldset><legend>Adicionar a quais versões</legend>
    ${versions.map(item => `<label><input type="checkbox" name="versions" value="${item.id}" ${item.id === game.id ? 'checked' : ''}> ${esc(versionLabel(item))}</label>`).join('')}
  </fieldset>`;
}

function today() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth()+1, now.getDate()].map(part => String(part).padStart(2,'0')).join('-');
}

function importSteam() {
  let importView;
  let busy = false;
  function updateProgress(message) {
    form.querySelector('#steam-progress').textContent = message;
  }

  modal('Importar da Steam', `
    ${field('SteamID64 ou link de perfil','steam_profile','','text','required maxlength="110"')}
    <p>Jogos, tempo e conquistas disponíveis serão gravados no banco desta instalação e aparecerão conforme a visibilidade do seu perfil PlayerVault. Dados fornecidos pela Steam são disponibilizados como estão, sem garantia. PlayerVault é independente da Valve.</p>
    <label><input type="checkbox" name="steam_consent" required> Sou titular do perfil Steam informado e solicito a consulta dos dados.</label>
    <button type="submit">Consultar biblioteca</button>
    <p id="steam-progress" role="status"></p>
    <div id="steam-results"></div>
  `, async () => {});
  const query = form.querySelector('[type=submit]');
  const save = form.querySelectorAll('[type=submit]')[1];
  save.remove();
  dialog.oncancel = event => {
    if (busy) event.preventDefault();
  };
  const close = form.querySelector('[data-action=close]');
  dialog.addEventListener('close', () => { dialog.oncancel = null; }, {once:true});

  function setBusy(value) {
    busy = value;
    for (const control of form.elements) control.disabled = value;
  }

  async function add(ids) {
    const error = form.querySelector('.error');
    error.textContent = '';
    if (!ids.length) {
      error.textContent = 'Selecione ao menos um jogo.';
      return;
    }
    setBusy(true);
    const completed = new Map();
    try {
      for (let offset = 0; offset < ids.length; offset += 12) {
        updateProgress('Importando jogos. ' + offset + ' de ' + ids.length + ' processados.');
        const {results} = await api('/steam/import', 'POST', {
          appids: ids.slice(offset, offset + 12), preview: importView.preview
        });
        for (const item of results) completed.set(item.appid, item);
      }
    } catch (failure) {
      error.textContent = failure.message + ' Os lotes concluídos foram mantidos.';
    } finally {
      setBusy(false);
      importView.games = importView.games.map(game => {
        const result = completed.get(game.appid);
        return result ? {...game, imported: true, pending: result.unavailable, refresh: result.refresh} : game;
      });
      const added = [...completed.values()].filter(item => item.added).length;
      const unavailable = [...completed.values()].filter(item => item.unavailable).length;
      updateProgress(added + ' jogo(s) adicionado(s). ' + unavailable + ' jogo(s) com conquistas indisponíveis. Você pode tentar novamente.');
      showGames();
      await load();
    }
  }

  function showGames() {
    const results = form.querySelector('#steam-results');
    const available = importView.games.filter(game => !game.imported || game.pending || game.refresh);
    results.innerHTML = `
      <p>${importView.games.length} jogo(s) retornado(s) pela Steam.</p>
      ${available.length ? '<div class="actions"><button type="button" id="steam-all">Adicionar todos</button><button type="button" id="steam-selected">Adicionar somente os que eu escolher</button></div>' : '<p>Nenhum jogo pendente de importação.</p>'}
      <div class="steam-games">${importView.games.map(game => `<label><input type="checkbox" name="steam_game" value="${game.appid}" ${game.imported && !game.pending && !game.refresh ? 'disabled' : ''}> ${remotePicture(game.cover,'steam-cover','🎮')}<span>${esc(game.name)} · ${hours(game.minutes)}${game.pending ? ' · Conquistas indisponíveis' : game.refresh ? ' · Atualizar imagens e datas' : game.imported ? ' · Adicionado' : ''}</span></label>`).join('')}</div>`;
    if (!available.length) return;
    results.querySelector('#steam-all').onclick = () => add(available.map(game => game.appid));
    results.querySelector('#steam-selected').onclick = () => add([...results.querySelectorAll(':checked')].map(box => Number(box.value)));
  }

  form.onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(form);
    const error = form.querySelector('.error');
    error.textContent = '';
    form.querySelector('#steam-results').replaceChildren();
    updateProgress('Consultando a biblioteca Steam…');
    setBusy(true);
    try {
      importView = await api('/steam/preview', 'POST', {
        profile: data.get('steam_profile'), confirm: data.has('steam_consent')
      });
      updateProgress('');
    } catch (failure) {
      importView = null;
      updateProgress('');
      error.textContent = failure.message;
    } finally {
      setBusy(false);
    }
    if (importView) showGames();
  };
}

async function load(){try{me=await api('/me');$('#nav').innerHTML=me?`<a href="/">Meu perfil</a>${button('Sair','logout')}`:'<a href="/login">Entrar</a><a class="btn" href="/register">Criar conta</a>';const path=location.pathname;if(path.startsWith('/u/')){const page=path.match(/^\/u\/([^/]+)\/jogos\/(\d+)\/(geral|conquistas|capturas)\/?$/);const username=decodeURIComponent(page?.[1]??path.slice(3));const r=await api('/profile/'+encodeURIComponent(username));current=r.profile;games=r.games;if(page)renderGamePage(username,Number(page[2]),page[3]);else render()}else if(me){current=me;games=await api('/games');render()}else if(path==='/login'||path==='/register')auth(path==='/register');else app.innerHTML='<section class="landing"><small>SEU UNIVERSO GAMER EM UM LUGAR</small><h1>Todo jogo conta.<br><em>Conte sua história.</em></h1><p>Crie seu perfil gamer, organize os jogos de todas as plataformas e acompanhe suas conquistas. Do primeiro jogo à próxima aventura.</p><div class="actions"><a class="btn" href="/register">Criar meu perfil</a><a class="btn secondary" href="/login">Entrar</a></div></section>'}catch(e){app.textContent=e.message}}load();

import http from 'node:http';
import {installGameDetails} from './game-details.mjs';
import {installSteam, steamClient, steamCover} from './steam.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
if (!process.env.DB_PATH) mkdirSync(root+'data',{recursive:true});
const db=new DatabaseSync(process.env.DB_PATH || root+'data/gamefolio.sqlite');
db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE, password TEXT, display TEXT, bio TEXT DEFAULT '', avatar TEXT DEFAULT '', banner TEXT DEFAULT '', color TEXT DEFAULT '#a78bfa', private INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER); CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,name TEXT,platform TEXT,service TEXT,minutes INTEGER,status TEXT,cover TEXT, favorite INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS achievements(id INTEGER PRIMARY KEY,game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,name TEXT,description TEXT,icon TEXT,image TEXT,unlocked INTEGER);`);
// Migração aditiva: preserva os jogos existentes.
for(const col of ['platform_icon','service_icon']){if(!db.prepare('PRAGMA table_info(games)').all().some(c=>c.name===col))db.exec(`ALTER TABLE games ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`)}
const steamRoute = installSteam(db, steamClient(process.env.STEAM_API_KEY));
const q=(sql,...args)=>db.prepare(sql).all(...args), one=(sql,...args)=>db.prepare(sql).get(...args), run=(sql,...args)=>db.prepare(sql).run(...args);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const str=(v,max=200)=>String(v??'').trim().slice(0,max);
const img=v=>{v=String(v??''); if(v && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v))fail(400,'Imagem inválida');if(v.length>1400000)fail(400,'Imagem muito grande (máximo 1 MB)');return v};
const gameDetails = installGameDetails(db,{fail,str,img});
const hash=t=>createHash('sha256').update(t).digest('hex');
const platforms=['Computador','Mobile','PlayStation','Xbox','Nintendo','Emulador','Outra'];
const statuses=['Jogando','Concluído','Completado 100%','Pausado','Abandonado','Pretendo jogar'];
function achievementDate(value) {
  if (value === undefined) return null;
  if (value === '' || value === null) return '';
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) fail(400,'Data de aquisição inválida');
  const parsed = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) fail(400,'Data de aquisição inválida');
  return value;
}
function profile(u){return {id:u.id,username:u.username,display:u.display,bio:u.bio,avatar:u.avatar,banner:u.banner,color:u.color,private:!!u.private}}
function library(id){return q('SELECT * FROM games WHERE user_id=? ORDER BY favorite DESC,id DESC',id).map(({steam_profile, steam_achievements_pending, steam_artwork_ready, ...g})=>({...g,steam_cover:steamCover(g.steam_appid ?? g.artwork_appid),achievements:q("SELECT id,game_id,name,description,icon,image,steam_image,unlocked,unlocked_date,steam_key IS NOT NULL AS imported_from_steam FROM achievements WHERE game_id=? ORDER BY unlocked DESC, CASE WHEN unlocked=1 THEN NULLIF(unlocked_date,'') END ASC NULLS LAST,id",g.id)}))}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>4500000)fail(413,'Dados muito grandes')}try{return JSON.parse(s||'{}')}catch{fail(400,'JSON inválido')}}
function session(res,id){const token=randomBytes(32).toString('hex');run('INSERT INTO sessions VALUES(?,?,?)',hash(token),id,Date.now()+7*86400000);res.setHeader('Set-Cookie',`gf=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.SECURE_COOKIE==='1'?'; Secure':''}`)}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob: https://shared.fastly.steamstatic.com https://shared.akamai.steamstatic.com https://steamcdn-a.akamaihd.net https://cdn.cloudflare.steamstatic.com https://cdn.akamai.steamstatic.com; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'");const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};try{
const path=new URL(req.url,'http://localhost').pathname,m=req.method; if(!path.startsWith('/api/')){const file=path==='/app.js'?'app.js':path==='/style.css'?'style.css':'index.html';res.writeHead(200,{'Content-Type':{'app.js':'text/javascript','style.css':'text/css','index.html':'text/html'}[file]+'; charset=utf-8'});return res.end(readFileSync(root+'public/'+file))}
if(!['GET','HEAD'].includes(m)&&req.headers['sec-fetch-site']==='cross-site')fail(403,'Origem não permitida');
const token=(req.headers.cookie||'').match(/(?:^|;\s*)gf=([a-f0-9]{64})(?:;|$)/)?.[1];const u=token?one('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE token=? AND expires>?',hash(token),Date.now()):null;
if(path==='/api/register'&&m==='POST'){const b=await body(req),name=str(b.username,32),pw=String(b.password??'');if(!/^[a-zA-Z0-9_]{3,24}$/.test(name)||pw.length<8||pw.length>128)fail(400,'Usuário: 3–24 letras, números ou _. Senha: 8–128 caracteres.');if(one('SELECT id FROM users WHERE username=?',name))fail(409,'Usuário já existe');const salt=randomBytes(16).toString('hex');const id=run('INSERT INTO users(username,password,display) VALUES(?,?,?)',name,salt+':'+scryptSync(pw,salt,64).toString('hex'),name).lastInsertRowid;session(res,id);return send({ok:true},201)}
if(path==='/api/login'&&m==='POST'){const b=await body(req),a=one('SELECT * FROM users WHERE username=?',str(b.username,32)),pw=String(b.password??'');if(!a||pw.length>128)fail(401,'Credenciais inválidas');const [salt,key]=a.password.split(':');if(!timingSafeEqual(Buffer.from(key,'hex'),scryptSync(pw,salt,64)))fail(401,'Credenciais inválidas');session(res,a.id);return send({ok:true})}
if(path==='/api/me'&&m==='GET')return send(u?profile(u):null);
if(path.startsWith('/api/profile/')&&m==='GET'){const a=one('SELECT * FROM users WHERE username=?',decodeURIComponent(path.slice(13)));if(!a||(a.private&&a.id!==u?.id))fail(404,'Perfil indisponível');return send({profile:profile(a),games:library(a.id)})}
const gameAction = /^\/api\/games\/(\d+)\/(details|duplicate|screenshots)(?:\/(\d+))?$/.exec(path);
if(gameAction?.[2]==='screenshots' && !gameAction[3] && m==='GET') return send(gameDetails.screenshots(gameAction[1],u?.id));
if(!u)fail(401,'Entre na sua conta');
if(gameAction){
  const [,id,action,shot]=gameAction;
  if((!shot && ((action==='details' && m==='PUT') || (action!=='details' && m==='POST'))) ||
    (shot && action==='screenshots' && m==='DELETE')) {
    return send(gameDetails.mutate(u.id,id,action,m,m==='DELETE'?{}:await body(req),shot));
  }
}
if(m==='POST'&&['/api/steam/preview','/api/steam/import'].includes(path))return send(await steamRoute(u.id,path,await body(req)));
if(path==='/api/logout'&&m==='POST'){run('DELETE FROM sessions WHERE token=?',hash(token));res.setHeader('Set-Cookie','gf=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');return send({ok:true})}
if(path==='/api/profile'&&m==='PUT'){const b=await body(req);run('UPDATE users SET display=?,bio=?,avatar=?,banner=?,color=?,private=? WHERE id=?',str(b.display,60)||u.username,str(b.bio,500),img(b.avatar),img(b.banner),/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'#a78bfa',b.private?1:0,u.id);return send({ok:true})}
if(path==='/api/games'&&m==='GET')return send(library(u.id));
const gm=path.match(/^\/api\/games(?:\/(\d+))?$/);if(gm){const id=gm[1];if(id&&!one('SELECT id FROM games WHERE id=? AND user_id=?',id,u.id))fail(404,'Jogo não encontrado');if(m==='DELETE'&&id){run('DELETE FROM games WHERE id=? AND user_id=?',id,u.id);return send({ok:true})}if((m==='POST'&&!id)||(m==='PUT'&&id)){const b=await body(req);const name=str(b.name,120),minutes=Number(b.minutes);if(!name||!platforms.includes(b.platform)||!statuses.includes(b.status)||!Number.isSafeInteger(minutes)||minutes<0||minutes>100000000)fail(400,'Preencha os dados do jogo corretamente');const args=[name,b.platform,str(b.service,80),minutes,b.status,img(b.cover),b.favorite?1:0,img(b.platform_icon),img(b.service_icon)];if(id)run('UPDATE games SET name=?,platform=?,service=?,minutes=?,status=?,cover=?,favorite=?,platform_icon=?,service_icon=? WHERE id=?',...args,id);else run('INSERT INTO games(name,platform,service,minutes,status,cover,favorite,platform_icon,service_icon,user_id) VALUES(?,?,?,?,?,?,?,?,?,?)',...args,u.id);return send({ok:true})}}
const am=path.match(/^\/api\/games\/(\d+)\/achievements(?:\/(\d+))?$/);if(am){const [,gid,id]=am;if(!one('SELECT id FROM games WHERE id=? AND user_id=?',gid,u.id))fail(404,'Jogo não encontrado');if(id&&!one('SELECT id FROM achievements WHERE id=? AND game_id=?',id,gid))fail(404,'Conquista não encontrada');if(m==='DELETE'&&id){run('DELETE FROM achievements WHERE id=?',id);return send({ok:true})}if((m==='POST'&&!id)||(m==='PUT'&&id)){const b=await body(req),name=str(b.name,100);if(!name)fail(400,'Informe o nome');const args=[name,str(b.description,300),['🏆','🏅','⭐','💎','👑'].includes(b.icon)?b.icon:'🏆',img(b.image),b.unlocked?1:0];
const date = b.unlocked ? achievementDate(b.unlocked_date) : '';
if(id)run('UPDATE achievements SET name=?,description=?,icon=?,image=?,unlocked=?,unlocked_date=COALESCE(?,unlocked_date) WHERE id=?',...args,date,id);else {
  const source = gameDetails.owned(gid,u.id);
  const versions = gameDetails.targets(source,b.game_ids);
  gameDetails.atomic(() => {
    for(const version of versions) run('INSERT INTO achievements(name,description,icon,image,unlocked,unlocked_date,game_id) VALUES(?,?,?,?,?,?,?)',...args,date,version);
  });
}return send({ok:true})}}
fail(404,'Rota não encontrada');}catch(e){if(!e.status)console.error(e);send({error:e.status?e.message:'Erro interno'},e.status||500)}});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('PlayerVault disponível em http://localhost:'+server.address().port));

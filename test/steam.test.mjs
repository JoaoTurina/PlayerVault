import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {installSteam, steamClient} from '../steam.mjs';

test('Steam: consulta oficial, seleção por conta, novas tentativas e preservação de edições', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE games(id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, platform TEXT,
      service TEXT, minutes INTEGER, status TEXT, cover TEXT);
    CREATE TABLE achievements(id INTEGER PRIMARY KEY, game_id INTEGER, name TEXT,
      description TEXT, icon TEXT, image TEXT, unlocked INTEGER);
    INSERT INTO games VALUES (1,1,'Primeiro','Computador','Steam',9,'Pausado','');
    INSERT INTO achievements VALUES (1,1,'Manual','','🏆','',1);
  `);
  const profile = '76561198000000000';
  const requests = [];
  let available = false;
  const client = steamClient('chave-de-teste', async url => {
    requests.push(url);
    assert.equal(url.origin, 'https://api.steampowered.com');
    assert.equal(url.searchParams.get('key'), 'chave-de-teste');
    if (url.pathname.includes('ResolveVanityURL')) return Response.json({response:{steamid:profile}});
    if (url.pathname.includes('GetSchemaForGame')) {
      return Response.json({game:{availableGameStats:{achievements:[
        {name:'FIRST', icon:'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/11/abc123.jpg'},
        {name:'SECOND', icon:'https://example.com/steamcommunity/public/images/apps/11/abc123.jpg'}
      ]}}});
    }
    assert.equal(url.searchParams.get('steamid'), profile);
    if (url.pathname.includes('GetOwnedGames')) {
      assert.equal(url.searchParams.get('include_played_free_games'), '1');
      return Response.json({response:{games:[
        {appid:11, name:'Primeiro', playtime_forever:60},
        {appid:22, name:'Segundo', playtime_forever:0}
      ]}});
    }
    if (!available && url.searchParams.get('appid') === '11') return new Response(null,{status:503});
    return Response.json({playerstats:{success:true, achievements:[
      {apiname:'FIRST', name:'Primeira conquista', achieved:1, unlocktime:1704153600},
      {apiname:'SECOND', name:'Segunda conquista', achieved:0, unlocktime:1704153600}
    ]}});
  });
  try {
    installSteam(db, client);
    const route = installSteam(db, client);
    await assert.rejects(route(1, '/api/steam/preview', {profile}), {status:400});
    const first = await route(1, '/api/steam/preview', {
      profile:'https://steamcommunity.com/id/meu-perfil/', confirm:true
    });
    const load = (user, ids, preview = first.preview) => route(user, '/api/steam/import', {preview, appids:ids});
    assert.deepEqual(first.games.map(game => game.appid), [11,22]);
    assert.match(first.games[0].cover, /\/11\/library_600x900\.jpg$/);
    await assert.rejects(load(2, [11]), {status:409});
    await assert.rejects(load(1, [11,99]), {status:400});
    assert.deepEqual((await load(1, [11])).results, [{appid:11, added:true, unavailable:true, refresh:false}]);
    assert.equal(db.prepare('SELECT count(*) AS n FROM games').get().n, 2);
    const gameId = db.prepare('SELECT id FROM games WHERE steam_appid=11').get().id;
    db.prepare("UPDATE games SET name='Meu nome', cover='minha capa' WHERE id=?").run(gameId);
    available = true;
    assert.deepEqual((await load(1, [11,22])).results, [
      {appid:11, added:false, unavailable:false, refresh:false}, {appid:22, added:true, unavailable:false, refresh:false}
    ]);
    const achievements = db.prepare('SELECT steam_key, unlocked FROM achievements WHERE game_id=? ORDER BY id').all(gameId);
    assert.deepEqual(achievements.map(item => [item.steam_key,item.unlocked]), [['FIRST',1],['SECOND',0]]);
    const imported = db.prepare('SELECT unlocked_date, steam_image FROM achievements WHERE game_id=? ORDER BY id').all(gameId);
    assert.equal(imported[0].unlocked_date, '2024-01-02');
    assert.match(imported[0].steam_image, /abc123\.jpg$/);
    assert.equal(imported[1].unlocked_date, null);
    assert.equal(imported[1].steam_image, '');
    db.prepare("UPDATE achievements SET name='Editada', image='minha imagem', unlocked=0 WHERE game_id=? AND steam_key='FIRST'").run(gameId);
    db.prepare("DELETE FROM achievements WHERE game_id=? AND steam_key='SECOND'").run(gameId);
    db.prepare('UPDATE games SET steam_artwork_ready=0 WHERE id=?').run(gameId);
    await load(1, [11]);
    assert.equal(db.prepare('SELECT count(*) AS n FROM achievements WHERE game_id=?').get(gameId).n, 1);
    const requestCount = requests.length;
    await load(1, [11,22]);
    assert.equal(requests.length, requestCount);
    assert.deepEqual(Object.values(db.prepare('SELECT name,cover FROM games WHERE id=?').get(gameId)), ['Meu nome','minha capa']);
    assert.deepEqual(Object.values(db.prepare('SELECT name,image,unlocked,steam_key FROM achievements WHERE game_id=?').get(gameId)), ['Editada','minha imagem',0,'FIRST']);
    assert.equal(db.prepare('SELECT steam_key FROM achievements WHERE id=1').get().steam_key, null);
    const second = await route(2, '/api/steam/preview', {profile, confirm:true});
    await assert.rejects(load(2, [11]), {status:409});
    await load(2, [11], second.preview);
    assert.equal(db.prepare('SELECT count(*) AS n FROM games WHERE steam_appid=11').get().n, 2);
  } finally {
    db.close();
  }
});

test('Steam: chave ausente e biblioteca indisponível são tratadas', async () => {
  const profile = '76561198000000000';
  await assert.rejects(steamClient('').library(profile), {status:503});
  await assert.rejects(steamClient('teste', async () => Response.json({response:{}})).library(profile), {status:422});
  await assert.rejects(steamClient('teste').library('https://example.com/id/abc'), {status:400});
});

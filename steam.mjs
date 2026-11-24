import {randomUUID} from 'node:crypto';

export function steamCover(appid) {
  return isAppId(appid) ? 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/' + appid + '/library_600x900.jpg' : '';
}

const imageHosts = new Set(['steamcdn-a.akamaihd.net', 'cdn.cloudflare.steamstatic.com',
  'cdn.akamai.steamstatic.com', 'shared.fastly.steamstatic.com', 'shared.akamai.steamstatic.com']);

function steamIcon(value) {
  try {
    const url = new URL(value);
    if (imageHosts.has(url.host) && /^\/(?:steamcommunity\/public\/images\/apps|images\/apps)\/\d+\/[a-f0-9]+\.(?:jpg|png)$/i.test(url.pathname)) {
      return 'https://' + url.host + url.pathname;
    }
  } catch {}
  return '';
}

const apiRoot = 'https://api.steampowered.com/';
const isSteamId = value => typeof value === 'string' && /^\d{17}$/.test(value);
const isAppId = value => Number.isInteger(value) && value > 0 && value <= 4294967295;

function problem(status, message) {
  return Object.assign(new Error(message), {status});
}

export function steamClient(key, request = fetch) {
  async function get(path, params) {
    if (!key) throw problem(503, 'Configure STEAM_API_KEY no servidor para importar da Steam.');
    const url = new URL(path, apiRoot);
    url.search = new URLSearchParams({key, ...params});
    try {
      const response = await request(url, {redirect: 'error', signal: AbortSignal.timeout(8000)});
      if ([400, 403, 404].includes(response.status)) return null;
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      throw problem(502, 'A Steam está indisponível no momento. Tente novamente.');
    }
  }

  async function identify(input) {
    const profile = typeof input === 'string' ? input.trim() : '';
    if (isSteamId(profile)) return profile;
    const link = /^https:\/\/steamcommunity\.com\/(profiles|id)\/([\w-]{1,64})\/?$/i.exec(profile);
    if (!link) throw problem(400, 'Informe um SteamID64 ou um link de perfil da Comunidade Steam.');
    if (link[1].toLowerCase() === 'profiles') {
      if (isSteamId(link[2])) return link[2];
      throw problem(400, 'O link precisa conter um SteamID64 válido.');
    }
    const result = await get('ISteamUser/ResolveVanityURL/v1/', {vanityurl: link[2]});
    const id = result?.response?.steamid;
    if (!isSteamId(id)) throw problem(404, 'Perfil Steam não encontrado.');
    return id;
  }

  return {
    async library(input) {
      const steamid = await identify(input);
      const result = await get('IPlayerService/GetOwnedGames/v1/', {
        steamid, include_appinfo: 1, include_played_free_games: 1
      });
      const library = result?.response;
      if (!Array.isArray(library?.games) && library?.game_count !== 0) {
        throw problem(422, 'Biblioteca Steam indisponível. Confira se os detalhes de jogos estão públicos e se a chave está válida.');
      }
      const games = (library.games ?? []).filter(game => isAppId(game.appid)).map(game => ({
        appid: game.appid,
        cover: steamCover(game.appid),
        name: String(game.name || 'Steam App ' + game.appid).trim().slice(0, 120),
        minutes: Number.isSafeInteger(game.playtime_forever)
          ? Math.min(100000000, Math.max(0, game.playtime_forever)) : 0
      }));
      return {steamid, games};
    },
    async achievements(steamid, appid) {
      const result = await get('ISteamUserStats/GetPlayerAchievements/v1/', {steamid, appid, l: 'brazilian'});
      const stats = result?.playerstats;
      if (!stats?.success || !Array.isArray(stats.achievements)) return null;
      let schema;
      try {
        schema = await get('ISteamUserStats/GetSchemaForGame/v2/', {appid, l: 'brazilian'});
      } catch (error) {
        if (error.status !== 502) throw error;
      }
      const definitions = schema?.game?.availableGameStats?.achievements;
      const icons = new Map((Array.isArray(definitions) ? definitions : []).map(item => [
        item.name, steamIcon(item.icon) || steamIcon(item.icongray)
      ]));
      const items = stats.achievements.filter(item => typeof item.apiname === 'string' && item.apiname).map(item => ({
        id: item.apiname,
        name: String(item.name || item.apiname).trim().slice(0, 100),
        description: String(item.description ?? '').trim().slice(0, 300),
        unlocked: Number(item.achieved) === 1 ? 1 : 0,
        date: Number(item.achieved) === 1 && Number.isInteger(item.unlocktime) &&
          item.unlocktime > 0 && item.unlocktime <= 4294967295
          ? new Date(item.unlocktime * 1000).toISOString().slice(0, 10) : null,
        image: icons.get(item.apiname) || ''
      }));
      return {items, artworkReady: Boolean(schema?.game)};
    }
  };
}

export function installSteam(db, client) {
  for (const [table, column, type] of [
    ['games', 'steam_appid', 'INTEGER'],
    ['games', 'steam_profile', 'TEXT'],
    ['games', 'steam_achievements_pending', 'INTEGER NOT NULL DEFAULT 0'],
    ['achievements', 'steam_key', 'TEXT'],
    ['achievements', 'steam_image', "TEXT NOT NULL DEFAULT ''"],
    ['achievements', 'unlocked_date', 'TEXT'],
    ['games', 'steam_artwork_ready', 'INTEGER NOT NULL DEFAULT 0']
  ]) {
    if (!db.prepare('PRAGMA table_info(' + table + ')').all().some(field => field.name === column)) {
      db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + type);
    }
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS games_steam_app ON games(user_id, steam_appid);
    CREATE UNIQUE INDEX IF NOT EXISTS achievements_steam_key ON achievements(game_id, steam_key);
  `);
  const active = new Set();
  const previews = new Map();
  const find = db.prepare('SELECT id, steam_achievements_pending AS pending, steam_artwork_ready AS artwork_ready, steam_profile FROM games WHERE user_id=? AND steam_appid=?');
  const addGame = db.prepare(`
    INSERT INTO games(user_id,name,platform,service,minutes,status,cover,steam_appid,steam_achievements_pending,steam_profile)
    VALUES (?,?,'Computador','Steam',?,?, '',?,1,?)
    ON CONFLICT(user_id,steam_appid) DO NOTHING
  `);
  const addAchievement = db.prepare(`
    INSERT INTO achievements(game_id,name,description,icon,image,unlocked,steam_key,unlocked_date,steam_image)
    VALUES (?,?,?,'🏆','',?,?,?,?)
    ON CONFLICT(game_id,steam_key) DO NOTHING
  `);
  const complete = db.prepare('UPDATE games SET steam_achievements_pending=0 WHERE id=? AND user_id=?');

  const addArtwork = db.prepare(`
    UPDATE achievements SET steam_image=?, unlocked_date=CASE
      WHEN unlocked=1 THEN COALESCE(unlocked_date,?) ELSE unlocked_date END
    WHERE game_id=? AND steam_key=?
  `);
  const finishArtwork = db.prepare('UPDATE games SET steam_artwork_ready=1 WHERE id=? AND user_id=?');

  function save(user, steamid, game, achievements) {
    db.exec('BEGIN');
    try {
      const inserted = addGame.run(user, game.name, game.minutes, game.minutes ? 'Jogando' : 'Pretendo jogar', game.appid, steamid);
      const row = find.get(user, game.appid);
      if (row.steam_profile === steamid && achievements !== null) {
        for (const item of achievements.items) {
          if (row.pending) {
            addAchievement.run(row.id, item.name, item.description, item.unlocked, item.id, item.date, item.image);
          } else {
            addArtwork.run(item.image, item.date, row.id, item.id);
          }
        }
        complete.run(row.id, user);
        if (achievements.artworkReady || achievements.items.length === 0) finishArtwork.run(row.id, user);
      }
      db.exec('COMMIT');
      const unavailable = row.pending === 1 && achievements === null;
      const refresh = !unavailable && !row.artwork_ready && !(achievements?.artworkReady || achievements?.items.length === 0);
      return {added: inserted.changes > 0, unavailable, refresh};
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  return async function steamRoute(user, path, input) {
    if (active.has(user)) throw problem(409, 'Uma consulta à Steam já está em andamento.');
    active.add(user);
    try {
      if (path === '/api/steam/preview') {
        if (input?.confirm !== true) throw problem(400, 'Confirme a autorização para consultar o perfil Steam.');
        const preview = await client.library(input.profile);
        const now = Date.now();
        for (const [owner, entry] of previews) {
          if (entry.expires <= now) previews.delete(owner);
        }
        const token = randomUUID();
        previews.set(user, {...preview, token, expires: now + 30 * 60 * 1000});
        return {preview: token, games: preview.games.map(game => {
          const existing = find.get(user, game.appid);
          return {...game, imported: Boolean(existing), pending: Boolean(existing?.pending && existing.steam_profile === preview.steamid), refresh: Boolean(existing && !existing.pending && !existing.artwork_ready && existing.steam_profile === preview.steamid)};
        })};
      }

      const preview = previews.get(user);
      if (!preview || preview.expires <= Date.now() || input?.preview !== preview.token) throw problem(409, 'Consulte a biblioteca Steam novamente.');
      const ids = input?.appids;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 12 || !ids.every(isAppId)) {
        throw problem(400, 'Selecione de 1 a 12 jogos por lote.');
      }
      const available = new Map(preview.games.map(game => [game.appid, game]));
      const selected = [...new Set(ids)].map(id => available.get(id));
      if (selected.some(game => !game)) throw problem(400, 'Um jogo selecionado não pertence à biblioteca consultada.');
      const results = [];
      for (let offset = 0; offset < selected.length; offset += 3) {
        const batch = selected.slice(offset, offset + 3);
        const items = await Promise.all(batch.map(async game => {
          const existing = find.get(user, game.appid);
          if (existing && ((!existing.pending && existing.artwork_ready) || existing.steam_profile !== preview.steamid)) return {appid: game.appid, added: false, unavailable: false, refresh: false};
          let achievements = null;
          try {
            achievements = await client.achievements(preview.steamid, game.appid);
          } catch (error) {
            if (error.status !== 502) throw error;
          }
          return {appid: game.appid, ...save(user, preview.steamid, game, achievements)};
        }));
        results.push(...items);
      }
      return {results};
    } finally {
      active.delete(user);
    }
  };
}

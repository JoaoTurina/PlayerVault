import {randomUUID} from 'node:crypto';

export function installGameDetails(db, {fail, str, img}) {
  const columns = db.prepare('PRAGMA table_info(games)').all();
  for (const [name, type] of Object.entries({
    version_group: 'TEXT',
    version_name: "TEXT NOT NULL DEFAULT ''",
    game_description: "TEXT NOT NULL DEFAULT ''",
    review: "TEXT NOT NULL DEFAULT ''",
    rating: 'REAL',
    artwork_appid: 'INTEGER'
  })) {
    if (!columns.some(column => column.name === name)) db.exec('ALTER TABLE games ADD COLUMN ' + name + ' ' + type);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS games_version_group ON games(user_id,version_group);
    CREATE TABLE IF NOT EXISTS screenshots(
      id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      caption TEXT NOT NULL, image TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS screenshots_game ON screenshots(game_id);
  `);
  const gameByOwner = db.prepare('SELECT * FROM games WHERE id=? AND user_id=?');
  const findGroup = db.prepare('SELECT id FROM games WHERE user_id=? AND version_group=?');

  function atomic(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function owned(id, user) {
    const game = gameByOwner.get(id, user);
    if (!game) fail(404, 'Jogo não encontrado');
    return game;
  }

  function targets(game, selected) {
    if (selected === undefined) return [game.id];
    const allowed = new Set(game.version_group
      ? findGroup.all(game.user_id, game.version_group).map(row => row.id) : [game.id]);
    if (!Array.isArray(selected) || !selected.length || selected.some(id => !allowed.has(id))) {
      fail(400, 'Selecione apenas versões deste jogo.');
    }
    return [...new Set(selected)];
  }

  const listScreenshots = db.prepare('SELECT id,caption,image FROM screenshots WHERE game_id=? ORDER BY id DESC');
  const visibleGame = db.prepare(`
    SELECT games.id FROM games JOIN users ON users.id=games.user_id
    WHERE games.id=? AND (users.private=0 OR users.id=?)
  `);

  function screenshots(id, user) {
    if (!visibleGame.get(id, user ?? null)) fail(404, 'Jogo indisponível');
    return listScreenshots.all(id);
  }

  function mutate(user, id, action, method, input, screenshotId) {
    const game = owned(id, user);
    if (action === 'details') {
      const raw = input.rating;
      const rating = raw === '' || raw == null ? null : raw;
      if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 10)) {
        fail(400, 'A nota deve estar entre 0 e 10.');
      }
      db.prepare('UPDATE games SET version_name=?,game_description=?,review=?,rating=? WHERE id=? AND user_id=?')
        .run(str(input.version_name,60),str(input.game_description,2000),str(input.review,4000),rating,id,user);
      return {ok:true};
    }
    if (action === 'duplicate') {
      const label = str(input.version_name,60);
      if (!label) fail(400, 'Informe um nome para a nova versão.');
      return atomic(() => {
        const group = game.version_group || randomUUID();
        if (!game.version_group) db.prepare('UPDATE games SET version_group=? WHERE id=? AND user_id=?').run(group,id,user);
        const result = db.prepare(`
          INSERT INTO games(user_id,name,platform,service,minutes,status,cover,platform_icon,service_icon,
                            version_group,version_name,artwork_appid)
          VALUES (?,?,?,?,0,'Pretendo jogar',?,?,?,?,?,?)
        `).run(user,game.name,game.platform,game.service,game.cover,game.platform_icon,game.service_icon,
          group,label,game.artwork_appid ?? game.steam_appid);
        if (input.copy_achievements === true) {
          db.prepare(`
            INSERT INTO achievements(game_id,name,description,icon,image,unlocked,steam_key,steam_image)
            SELECT ?,name,description,icon,image,0,steam_key,steam_image FROM achievements WHERE game_id=?
          `).run(result.lastInsertRowid,id);
        }
        return {id:Number(result.lastInsertRowid)};
      });
    }
    if (method === 'DELETE') {
      const result = db.prepare('DELETE FROM screenshots WHERE id=? AND game_id=?').run(screenshotId,id);
      if (!result.changes) fail(404, 'Captura não encontrada.');
      return {ok:true};
    }
    const image = img(input.image);
    if (!image) fail(400, 'Selecione uma imagem para a captura.');
    db.prepare('INSERT INTO screenshots(game_id,caption,image) VALUES (?,?,?)').run(id,str(input.caption,150),image);
    return {ok:true};
  }

  return {owned, targets, atomic, screenshots, mutate};
}

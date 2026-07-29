/**
 * Tantan Life Board 同步后端
 * 轻量级 Node.js + SQLite 数据同步服务
 * 支持多设备通过同步密钥实时同步工作台数据
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3456;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 数据库初始化
const db = new Database(path.join(__dirname, 'tantan-sync.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sync_data (
    sync_key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT,
    device_name TEXT
  );
  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_key TEXT NOT NULL,
    action TEXT NOT NULL,
    device_id TEXT,
    device_name TEXT,
    timestamp TEXT NOT NULL
  );
`);

// ============ 接口 ============

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'tantan-sync', version: '1.0.0', time: new Date().toISOString() });
});

/**
 * 获取数据
 * GET /api/sync/:syncKey
 */
app.get('/api/sync/:syncKey', (req, res) => {
  const { syncKey } = req.params;
  const row = db.prepare('SELECT data, updated_at, device_id, device_name FROM sync_data WHERE sync_key = ?').get(syncKey);
  if (!row) {
    return res.json({ ok: true, data: null, updatedAt: null, message: '暂无云端数据' });
  }
  res.json({ ok: true, data: JSON.parse(row.data), updatedAt: row.updated_at, deviceId: row.device_id, deviceName: row.device_name });
});

/**
 * 推送/更新数据
 * POST /api/sync/:syncKey
 * body: { data, deviceId, deviceName, clientUpdatedAt }
 */
app.post('/api/sync/:syncKey', (req, res) => {
  const { syncKey } = req.params;
  const { data, deviceId, deviceName, clientUpdatedAt } = req.body;

  if (!data) {
    return res.status(400).json({ ok: false, error: '缺少 data 字段' });
  }

  const now = new Date().toISOString();
  const clientTime = clientUpdatedAt || now;
  const dataStr = JSON.stringify(data);

  // 检查云端是否已有更新的数据
  const existing = db.prepare('SELECT updated_at FROM sync_data WHERE sync_key = ?').get(syncKey);
  if (existing && existing.updated_at > clientTime) {
    // 云端数据更新，返回冲突提示
    return res.status(409).json({
      ok: false,
      error: 'conflict',
      message: '云端有更新的数据，请先拉取',
      serverUpdatedAt: existing.updated_at,
      clientUpdatedAt: clientTime
    });
  }

  // 写入数据
  db.prepare(`
    INSERT INTO sync_data (sync_key, data, updated_at, device_id, device_name)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(sync_key) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at,
      device_id = excluded.device_id,
      device_name = excluded.device_name
  `).run(syncKey, dataStr, clientTime, deviceId || 'unknown', deviceName || 'unknown');

  // 记录日志
  db.prepare('INSERT INTO sync_log (sync_key, action, device_id, device_name, timestamp) VALUES (?, ?, ?, ?, ?)')
    .run(syncKey, 'push', deviceId || 'unknown', deviceName || 'unknown', now);

  res.json({ ok: true, updatedAt: clientTime, message: '同步成功' });
});

/**
 * 强制覆盖（忽略冲突检查）
 * PUT /api/sync/:syncKey
 */
app.put('/api/sync/:syncKey', (req, res) => {
  const { syncKey } = req.params;
  const { data, deviceId, deviceName } = req.body;
  if (!data) return res.status(400).json({ ok: false, error: '缺少 data 字段' });

  const now = new Date().toISOString();
  const dataStr = JSON.stringify(data);

  db.prepare(`
    INSERT INTO sync_data (sync_key, data, updated_at, device_id, device_name)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(sync_key) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at,
      device_id = excluded.device_id,
      device_name = excluded.device_name
  `).run(syncKey, dataStr, now, deviceId || 'unknown', deviceName || 'unknown');

  db.prepare('INSERT INTO sync_log (sync_key, action, device_id, device_name, timestamp) VALUES (?, ?, ?, ?, ?)')
    .run(syncKey, 'force_push', deviceId || 'unknown', deviceName || 'unknown', now);

  res.json({ ok: true, updatedAt: now, message: '强制覆盖成功' });
});

/**
 * 删除云端数据
 * DELETE /api/sync/:syncKey
 */
app.delete('/api/sync/:syncKey', (req, res) => {
  const { syncKey } = req.params;
  db.prepare('DELETE FROM sync_data WHERE sync_key = ?').run(syncKey);
  db.prepare('INSERT INTO sync_log (sync_key, action, device_id, device_name, timestamp) VALUES (?, ?, ?, ?, ?)')
    .run(syncKey, 'delete', req.body?.deviceId || 'unknown', req.body?.deviceName || 'unknown', new Date().toISOString());
  res.json({ ok: true, message: '已删除云端数据' });
});

/**
 * 获取同步日志
 * GET /api/sync/:syncKey/log
 */
app.get('/api/sync/:syncKey/log', (req, res) => {
  const { syncKey } = req.params;
  const logs = db.prepare('SELECT * FROM sync_log WHERE sync_key = ? ORDER BY id DESC LIMIT 20').all(syncKey);
  res.json({ ok: true, logs });
});

/**
 * 检查是否有更新（轻量接口，只返回时间戳）
 * GET /api/sync/:syncKey/check
 */
app.get('/api/sync/:syncKey/check', (req, res) => {
  const { syncKey } = req.params;
  const row = db.prepare('SELECT updated_at FROM sync_data WHERE sync_key = ?').get(syncKey);
  res.json({ ok: true, hasData: !!row, updatedAt: row?.updated_at || null });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Tantan Sync Server 已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});

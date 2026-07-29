/**
 * Tantan Life Board 同步后端
 * 轻量级 Node.js 数据同步服务（纯 JS，无需编译）
 * 支持多设备通过同步密钥实时同步工作台数据
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ============ 数据存储（JSON 文件） ============

const DATA_FILE = path.join(__dirname, 'tantan-sync-data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('读取数据失败:', e.message);
  }
  return { syncData: {}, syncLogs: [] };
}

function saveData(store) {
  try {
    // 只保留最近 100 条日志
    if (store.syncLogs.length > 100) {
      store.syncLogs = store.syncLogs.slice(-100);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存数据失败:', e.message);
  }
}

let store = loadData();

// ============ 接口 ============

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'tantan-sync', version: '2.0.0', time: new Date().toISOString() });
});

/**
 * 获取数据
 * GET /api/sync/:syncKey
 */
app.get('/api/sync/:syncKey', (req, res) => {
  const { syncKey } = req.params;
  const entry = store.syncData[syncKey];
  if (!entry) {
    return res.json({ ok: true, data: null, updatedAt: null, message: '暂无云端数据' });
  }
  res.json({
    ok: true,
    data: entry.data,
    updatedAt: entry.updatedAt,
    deviceId: entry.deviceId,
    deviceName: entry.deviceName
  });
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

  // 检查云端是否已有更新的数据
  const existing = store.syncData[syncKey];
  if (existing && existing.updatedAt > clientTime) {
    return res.status(409).json({
      ok: false,
      error: 'conflict',
      message: '云端有更新的数据，请先拉取',
      serverUpdatedAt: existing.updatedAt,
      clientUpdatedAt: clientTime
    });
  }

  // 写入数据
  store.syncData[syncKey] = {
    data,
    updatedAt: clientTime,
    deviceId: deviceId || 'unknown',
    deviceName: deviceName || 'unknown'
  };

  // 记录日志
  store.syncLogs.push({
    syncKey,
    action: 'push',
    deviceId: deviceId || 'unknown',
    deviceName: deviceName || 'unknown',
    timestamp: now
  });

  saveData(store);

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

  store.syncData[syncKey] = {
    data,
    updatedAt: now,
    deviceId: deviceId || 'unknown',
    deviceName: deviceName || 'unknown'
  };

  store.syncLogs.push({
    syncKey,
    action: 'force_push',
    deviceId: deviceId || 'unknown',
    deviceName: deviceName || 'unknown',
    timestamp: now
  });

  saveData(store);

  res.json({ ok: true, updatedAt: now, message: '强制覆盖成功' });
});

/**
 * 删除云端数据
 * DELETE /api/sync/:syncKey
 */
app.delete('/api/sync/:syncKey', (req, res) => {
  const { syncKey } = req.params;
  delete store.syncData[syncKey];

  store.syncLogs.push({
    syncKey,
    action: 'delete',
    deviceId: req.body?.deviceId || 'unknown',
    deviceName: req.body?.deviceName || 'unknown',
    timestamp: new Date().toISOString()
  });

  saveData(store);

  res.json({ ok: true, message: '已删除云端数据' });
});

/**
 * 获取同步日志
 * GET /api/sync/:syncKey/log
 */
app.get('/api/sync/:syncKey/log', (req, res) => {
  const { syncKey } = req.params;
  const logs = store.syncLogs
    .filter(l => l.syncKey === syncKey)
    .slice(-20)
    .reverse();
  res.json({ ok: true, logs });
});

/**
 * 检查是否有更新（轻量接口，只返回时间戳）
 * GET /api/sync/:syncKey/check
 */
app.get('/api/sync/:syncKey/check', (req, res) => {
  const { syncKey } = req.params;
  const entry = store.syncData[syncKey];
  res.json({ ok: true, hasData: !!entry, updatedAt: entry?.updatedAt || null });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Tantan Sync Server 已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  健康检查: /api/health`);
  console.log(`========================================\n`);
});

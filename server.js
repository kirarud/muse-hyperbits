// server.js
// WebSocket-сервер для MVP "Музы" — обмен гипербитами сознания
const WebSocket = require('ws');
const Ajv = require('ajv');
const schema = require('./schema/message-v1.json');

const ajv = new Ajv({ strict: false, allErrors: true });
const validate = ajv.compile(schema);

const wss = new WebSocket.Server({ port: 8080 });

console.log('🌌 [Муза] Сервер запущен на ws://localhost:8080');

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`🔌 Новое подключение: ${ip}`);

  ws.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.warn('❌ Ошибка парсинга JSON от', ip);
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    if (!validate(parsed)) {
      console.warn('🚫 Невалидное сообщение от', ip, validate.errors);
      ws.send(JSON.stringify({
        error: 'OHTML validation failed',
        details: validate.errors.map(err => `${err.instancePath} ${err.message}`).filter(Boolean)
      }));
      return;
    }

    // Рассылаем всем подключённым клиентам
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(parsed));
      }
    });

    // Эхо для отправителя (опционально — можно убрать)
    ws.send(JSON.stringify({ echo: true, ...parsed }));

    console.log(`✅ Доставлено: [${parsed.hyperbits.base}] "${parsed.payload.content}"`);
  });

  ws.on('close', () => {
    console.log(`🔚 Соединение закрыто: ${ip}`);
  });

  ws.on('error', (err) => {
    console.error('💥 Ошибка WebSocket:', err);
  });
});

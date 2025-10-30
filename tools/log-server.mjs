import http from 'http';
import fs from 'fs';

const LOG_FILE = './browser.log';
const PORT = 4545;
const HOST = '127.0.0.1';

console.log(`Browser Log Server starting...`);

if (fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '');
  console.log(`Cleared existing ${LOG_FILE}`);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const logEntry = body.trim();
        if (logEntry) {
          const timestamp = new Date().toISOString();
          const formattedLog = `[${timestamp}] ${logEntry}\n`;
          fs.appendFileSync(LOG_FILE, formattedLog);
          console.log(`[FORWARDED] ${logEntry}`);
        }
      } catch (err) {
        console.error('Error writing log:', err);
      }
      res.writeHead(204);
      res.end();
    });
  } else {
    res.writeHead(200);
    res.end('Log server OK');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Log server running at http://${HOST}:${PORT}`);
  console.log(`Logs will be written to: ${LOG_FILE}`);
  console.log(`Tail logs: tail -f ${LOG_FILE}`);
});

process.on('SIGINT', () => {
  console.log('\nLog server shutting down...');
  server.close();
  process.exit(0);
});
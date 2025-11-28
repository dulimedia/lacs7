const safariDebug: string[] = [];
const MAX_LOG_LINES = 50;

export function logSafari(msg: string, extra?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const line = extra 
    ? `[${timestamp}] ${msg} :: ${JSON.stringify(extra, null, 0)}` 
    : `[${timestamp}] ${msg}`;
  
  safariDebug.push(line);
  
  if (safariDebug.length > MAX_LOG_LINES) {
    safariDebug.shift();
  }
  
  console.log('[SAFARI]', line);
}

export function getSafariDebugLines(): string[] {
  return safariDebug.slice();
}

export function clearSafariDebugLines() {
  safariDebug.length = 0;
}

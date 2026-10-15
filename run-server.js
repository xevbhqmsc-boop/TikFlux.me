const { spawn } = require('child_process');
const fs = require('fs');
const logPath = process.env.TIK_LOG || 'server.log';
fs.writeFileSync(logPath, ''); // truncate
const log = fs.createWriteStream(logPath, { flags: 'a' });
const p = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), stdio: ['ignore','pipe','pipe'] });
p.stdout.pipe(log);
p.stderr.pipe(log);
p.on('exit', (c) => log.write('\n[server exited code=' + c + ']\n'));
console.log('wrapper pid=' + p.pid);
fs.writeFileSync('.server.pid', String(p.pid));

import { spawn } from 'node:child_process'

const configuredHost = process.env.ADMIN_HOST
const host = configuredHost === undefined ? '127.0.0.1' : configuredHost.trim()
const portValue = process.env.PORT?.trim() || '3000'

if (!host || !/^[A-Za-z0-9.:-]+$/.test(host)) {
  throw new Error('ADMIN_HOST 必须是纯主机名或 IP 地址')
}

if (!/^\d+$/.test(portValue) || Number(portValue) < 1 || Number(portValue) > 65_535) {
  throw new Error('PORT 必须是 1 到 65535 之间的有效端口')
}

const child = spawn('next', ['start', '--hostname', host, '--port', portValue], {
  env: process.env,
  stdio: 'inherit'
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => child.kill(signal))
}

child.once('error', (error) => {
  throw error
})

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exitCode = code ?? 1
})

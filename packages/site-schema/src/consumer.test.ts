import { execFileSync } from 'node:child_process'
import { existsSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, it } from 'vitest'

it('可以被 Node 作为原生 ESM 包直接导入', () => {
  const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      "const schema = await import('@jiahim/site-schema'); process.stdout.write(String(schema.CURRENT_SCHEMA_VERSION))"
    ],
    { cwd: packageDirectory, encoding: 'utf8' }
  )

  expect(output).toBe('2')
})

it('clean checkout 下的管理端类型检查会先构建共享包', () => {
  const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
  const repositoryRoot = path.resolve(packageDirectory, '../..')
  const distribution = path.join(packageDirectory, 'dist')
  const backup = path.join(packageDirectory, `.dist-consumer-test-${process.pid}`)

  renameSync(distribution, backup)
  try {
    execFileSync(
      'pnpm',
      ['--filter', '@jiahim/admin', 'typecheck'],
      { cwd: repositoryRoot, stdio: 'pipe' }
    )
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        "const schema = await import('@jiahim/site-schema'); process.stdout.write(String(schema.CURRENT_SCHEMA_VERSION))"
      ],
      { cwd: packageDirectory, encoding: 'utf8' }
    )
    expect(output).toBe('2')
  } finally {
    if (existsSync(distribution)) rmSync(distribution, { recursive: true })
    renameSync(backup, distribution)
  }
})

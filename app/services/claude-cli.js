const { exec } = require('child_process')
const { writeFile, unlink, appendFile, mkdir } = require('fs/promises')
const { existsSync } = require('fs')
const { app } = global.electron
const { join } = require('path')

// 日志文件
let _logPath = null
async function getLogPath() {
  if (_logPath) return _logPath
  const logDir = join(app.getPath('userData'), 'logs')
  if (!existsSync(logDir)) await mkdir(logDir, { recursive: true })
  _logPath = join(logDir, 'claude-cli.log')
  return _logPath
}

async function log(msg) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${msg}\n`
  try { await appendFile(await getLogPath(), line) } catch {}
  console.log(msg)
}

const KNOWN_CLI_PATHS = [
  join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
  join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
  'claude',
  join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
  join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'claude.cmd')
]

let _cliPath = null
let _failedPaths = new Set()

function resolveCliPath() {
  if (_cliPath) return _cliPath
  for (const p of KNOWN_CLI_PATHS) {
    if (_failedPaths.has(p)) continue
    if (p === 'claude' || existsSync(p)) {
      return p
    }
  }
  return 'claude'
}

function markCliPathGood(path) {
  _cliPath = path
  _failedPaths.clear()
  log(`CLI path resolved: ${path}`)
}

function markCliPathBad(path) {
  _failedPaths.add(path)
  _cliPath = null
}

class ClaudeCliService {
  async analyze(systemPrompt, userInput) {
    const tempDir = app.getPath('temp')
    const promptPath = join(tempDir, `claude-prompt-${Date.now()}.txt`)
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userInput}`

    await log(`analyze() called — prompt size: ${fullPrompt.length} chars, userInput size: ${userInput.length} chars`)

    try {
      await writeFile(promptPath, fullPrompt, 'utf-8')

      return new Promise((resolve, reject) => {
        const unixPath = promptPath.replace(/\\/g, '/')
        const cliPath = resolveCliPath().replace(/\\/g, '/')

        const cmd = `"${cliPath}" --print --output-format text < '${unixPath}'`

        log(`exec: ${cmd.substring(0, 200)}...`)

        const child = exec(cmd, {
          shell: 'bash',
          maxBuffer: 10 * 1024 * 1024,
          timeout: 600000,
          cwd: app.getPath('home')
        }, (error, stdout, stderr) => {
          unlink(promptPath).catch(() => {})
          if (error) {
            log(`CLI ERROR: ${error.message}\nstderr: ${stderr ? stderr.substring(0, 500) : 'none'}`)
            reject(new Error(`Claude CLI failed: ${error.message}\n${stderr}`))
          } else {
            log(`CLI OK — output size: ${stdout.length} chars, preview: ${stdout.substring(0, 300)}`)
            resolve(stdout.trim())
          }
        })

        child.stderr.on('data', (data) => {
          log(`CLI stderr: ${data.toString().substring(0, 200)}`)
        })
      })
    } catch (err) {
      await log(`analyze() exception: ${err.message}`)
      await unlink(promptPath).catch(() => {})
      throw err
    }
  }

  async analyzeStructured(systemPrompt, userInput) {
    const raw = await this.analyze(systemPrompt, userInput)
    log(`analyzeStructured raw length: ${raw.length}`)
    const result = this.extractJson(raw)
    log(`extractJson result: type=${typeof result}, isArray=${Array.isArray(result)}, len=${Array.isArray(result) ? result.length : Object.keys(result || {}).length}`)
    return result
  }

  extractJson(raw) {
    // 1. Direct parse
    try { const r = JSON.parse(raw); log('extractJson: direct parse OK'); return r } catch (e) { log(`extractJson: direct parse failed: ${e.message.substring(0,100)}`) }

    // 2. Extract from ```json ... ``` — find the LAST closing ```
    const jsonStart = raw.indexOf('```json')
    if (jsonStart >= 0) {
      const contentStart = raw.indexOf('\n', jsonStart) + 1
      const closeMarker = raw.lastIndexOf('```')
      if (closeMarker > contentStart) {
        const json = raw.substring(contentStart, closeMarker).trim()
        log(`extractJson: json block found, length=${json.length}`)
        try { const r = JSON.parse(json); log('extractJson: json block parse OK'); return r } catch (e) {
          log(`extractJson: json block parse failed: ${e.message.substring(0,100)}`)
        }
        const fixed = json.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/[\x00-\x1f]/g, ' ')
        try { const r = JSON.parse(fixed); log('extractJson: fixed json parse OK'); return r } catch {}
      }
    }

    // 3. Extract from ``` ... ```
    const codeStart = raw.indexOf('```')
    if (codeStart >= 0 && codeStart !== raw.lastIndexOf('```')) {
      const contentStart = raw.indexOf('\n', codeStart) + 1
      const closeMarker = raw.lastIndexOf('```')
      if (closeMarker > contentStart) {
        const json = raw.substring(contentStart, closeMarker).trim()
        try { const r = JSON.parse(json); log('extractJson: code block parse OK'); return r } catch {}
      }
    }

    // 4. Bracket matching for { ... }
    let depth = 0, start = -1
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '{') { if (depth === 0) start = i; depth++ }
      else if (raw[i] === '}') {
        depth--
        if (depth === 0 && start >= 0) {
          const json = raw.substring(start, i + 1)
          try { const r = JSON.parse(json); log('extractJson: bracket match OK'); return r } catch {}
          start = -1
        }
      }
    }

    // 5. Bracket matching for [ ... ]
    depth = 0; start = -1
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '[') { if (depth === 0) start = i; depth++ }
      else if (raw[i] === ']') {
        depth--
        if (depth === 0 && start >= 0) {
          const json = raw.substring(start, i + 1)
          try { const r = JSON.parse(json); log('extractJson: array match OK, length=' + r.length); return r } catch (e) {
            log(`extractJson: array parse failed: ${e.message.substring(0,100)}`)
          }
          start = -1
        }
      }
    }

    log(`extractJson: ALL METHODS FAILED. Raw preview: ${raw.substring(0, 300)}`)
    throw new Error(`Cannot extract JSON. Output preview:\n${raw.substring(0, 500)}`)
  }

  async isAvailable() {
    return new Promise((resolve) => {
      const tryNext = (idx) => {
        if (idx >= KNOWN_CLI_PATHS.length) { log('isAvailable: all paths failed'); resolve(false); return }
        const p = KNOWN_CLI_PATHS[idx]
        if (!(p === 'claude' || existsSync(p))) { tryNext(idx + 1); return }
        const cmd = `"${p.replace(/\\/g, '/')}" --version`
        exec(cmd, { shell: 'bash', timeout: 10000 }, (error) => {
          if (!error) {
            log(`isAvailable: OK via ${p}`)
            markCliPathGood(p)
            resolve(true)
          } else {
            log(`isAvailable: FAIL via ${p}: ${error.message.substring(0,100)}`)
            markCliPathBad(p)
            tryNext(idx + 1)
          }
        })
      }
      tryNext(0)
    })
  }

  getResolvedPath() { return resolveCliPath() }
}

module.exports = { claudeCliService: new ClaudeCliService() }

import * as vscode from 'vscode'
import * as path from 'path'
import { ChildProcess, spawn } from 'child_process'

interface ScriptEnv {
  file: string
  shell: string
  options: string[]
}

const imageErrors: Record<string, string> = {
  'no image': 'Image of clipboard is empty',
  'no xclip': 'You need to install xclip command first.',
  'no pngpaste': 'You need to install pngpaste command first.',
}

export async function saveImage(
  saveFile: vscode.Uri,
  base64: string
): Promise<void> {
  try {
    const buff: Uint8Array = Buffer.from(base64, 'base64')
    await vscode.workspace.fs.writeFile(saveFile, buff)
  } catch (err) {
    throw new Error('failed to save image')
  }
}

function getClipboardImageCommand(platform: NodeJS.Platform): ScriptEnv {
  const script: Record<string, ScriptEnv> = {
    win32: {
      file: 'pc.ps1',
      shell: 'powershell',
      options: [
        '-noprofile',
        '-noninteractive',
        '-nologo',
        '-sta',
        '-executionpolicy',
        'unrestricted',
        '-windowstyle',
        'hidden',
        '-file',
      ],
    },
    darwin: {
      file: 'mac.sh',
      shell: 'sh',
      options: [],
    },
    linux: {
      file: 'linux.sh',

      shell: 'sh',
      options: [],
    },
  }
  return script[platform] || script.linux
}

function executeCommand(shell: string, options: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const process: ChildProcess = spawn(shell, options)
    if (null !== process.stdout) {
      process.stdout.on('data', (contents) => {
        stdout += contents
      })
    }
    if (null !== process.stderr) {
      process.stderr.on('data', (contents) => {
        stderr += contents
      })
    }
    process.on('error', reject).on('close', (code: number) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr))
      }
    })
  })
}

export async function getBase64ImageByClipboard(): Promise<string> {
  const cmd = getClipboardImageCommand(process.platform)

  let stdout = ''
  try {
    const scriptPath = path.join(__dirname, '../res/' + cmd.file)
    stdout = await executeCommand(cmd.shell, [...cmd.options, scriptPath])
  } catch (err) {
    throw new Error('Failed to run script')
  }

  const data = stdout.trim()
  if (data === '') {
    throw new Error('Failed to genrate image from clipboard')
  }

  const error = imageErrors[data]
  if (error != null) {
    throw new Error(error)
  }

  return data
}

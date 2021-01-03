'use strict'
import * as vscode from 'vscode'
import { getBase64ImageByClipboard } from './image'
import { Imgur } from './imgur'

export function activate(context: vscode.ExtensionContext): void {
  console.log('active!')

  const disposable = vscode.commands.registerCommand(
    'clipboard-to-imgur.pasteUpload',
    () => {
      paste(context)
    }
  )

  context.subscriptions.push(disposable)
}

async function paste(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  // get image from clipboard
  let base64Image: string
  try {
    base64Image = await getBase64ImageByClipboard()
  } catch (err: unknown) {
    vscode.window.showErrorMessage((err as Error).message)
    return
  }

  const config = vscode.workspace.getConfiguration('clipboard-to-imgur')

  // create imgur client
  const imgur = new Imgur(context, config)

  let client
  try {
    client = await imgur.createClient()
  } catch (err: unknown) {
    vscode.window.showErrorMessage((err as Error).message)
    return
  }

  const placeholderText = config.get<string>('placeholderText')
  if (!placeholderText) {
    vscode.window.showErrorMessage('Placeholder is empty.')
    return
  }
  const isSave = config.get<boolean>('saveDocument') || false

  // add placeholder text
  const placeholderRange = new vscode.Range(
    editor.selection.start,
    editor.selection.start.translate(0, placeholderText.length)
  )

  editor.edit((edit) => {
    edit.insert(editor.selection.start, placeholderText)
  })
  if (isSave) editor.document.save()

  try {
    const res = await client.Image.upload(base64Image)
    const link = res.data.link

    // replace placeholder with imgurLink
    editor.edit((edit) => {
      edit.replace(placeholderRange, link)
    })
    if (isSave) editor.document.save()
  } catch (err: unknown) {
    vscode.window.showErrorMessage((err as Error).message)
  }
}

// this method is called when your extension is deactivated
// export function deactivate() {}

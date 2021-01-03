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

const placeHolderText = '![uploading...](https://i.imgur.com/LEOtF90.gif)'

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

  // create imgur client
  const imgur = new Imgur(
    context,
    vscode.workspace.getConfiguration('imgur-paste')
  )

  let client
  try {
    client = await imgur.createClient()
  } catch (err: unknown) {
    vscode.window.showErrorMessage((err as Error).message)
    return
  }

  // add placeholder text
  const placeHolderRange = new vscode.Range(
    editor.selection.start,
    editor.selection.start.translate(0, placeHolderText.length)
  )

  editor.edit((edit) => {
    edit.insert(editor.selection.start, placeHolderText)
  })

  try {
    const res = await client.Image.upload(base64Image)
    const link = res.data.link

    // replace placeholder with imgurLink
    editor.edit((edit) => {
      edit.replace(placeHolderRange, link)
    })
  } catch (err: unknown) {
    vscode.window.showErrorMessage((err as Error).message)
  }
}

// this method is called when your extension is deactivated
// export function deactivate() {}

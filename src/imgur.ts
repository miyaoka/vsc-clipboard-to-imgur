import * as vscode from 'vscode'
import { Client } from '@maxfield/imgur'

export class Imgur {
  context: vscode.ExtensionContext
  config: vscode.WorkspaceConfiguration
  constructor(
    context: vscode.ExtensionContext,
    config: vscode.WorkspaceConfiguration
  ) {
    this.context = context
    this.config = config
  }

  async createClient(): Promise<Client> {
    const client_id = this.config.get<string>('client_id')
    const isAnonymous = this.config.get<boolean>('isAnonymous')

    if (client_id === '') {
      throw new Error('client_id is required to upload a image to imgur.')
    }

    if (isAnonymous) {
      return new Client({ client_id })
    }

    // have accessToken
    const access_token = this.context.globalState.get('access_token', '')
    if (access_token) {
      return new Client({
        client_id,
        access_token,
      })
    }

    // no accessToken
    const refresh_token = this.context.globalState.get('refresh_token', '')
    if (refresh_token) {
      return await this.initByRefreshToken(refresh_token)
    }
    return await this.initByPIN()
  }

  async initByRefreshToken(refresh_token: string): Promise<Client> {
    const client_id = this.config.get<string>('client_id')
    const client_secret = this.config.get<string>('client_secret')

    const client = new Client({
      client_id,
      client_secret,
    })
    try {
      await client.Authorize.regenerateFromRefreshToken(refresh_token)
      return client
    } catch (error) {
      // remove refreshToken
      this.context.globalState.update('refresh_token', undefined)
      throw new Error('Failed to generate a access_token by refresh_token.')
    }
  }

  async initByPIN(): Promise<Client> {
    const client_id = this.config.get<string>('client_id')
    const client_secret = this.config.get<string>('client_secret')

    if (!(client_id && client_secret)) {
      throw new Error('client_id is required to upload a image to imgur.')
    }

    const client = new Client({
      client_id,
      client_secret,
    })
    const auth = client.Authorize.byPIN()

    // open browser to show pincode
    await vscode.commands.executeCommand(
      'vscode.open',
      vscode.Uri.parse(auth.url)
    )

    // enter pin code into vscode inputbox
    const pin = await vscode.window.showInputBox({
      placeHolder: 'PIN code here',
      ignoreFocusOut: true,
    })
    if (pin == null) {
      throw new Error('PIN code is not entered.')
    }
    try {
      const credential = await auth.authorize(pin)
      this.context.globalState.update('access_token', credential.access_token)
      this.context.globalState.update('refresh_token', credential.refresh_token)
    } catch (error) {
      throw new Error('Failed to authorize. Please try again.')
    }
    return client
  }
}

import * as vscode from 'vscode';
import { ShellGridViewProvider } from './providers/shellgrid-view-provider';

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

  if (!workspaceRoot) {
    return;
  }

  // Register Webview Provider
  const provider = new ShellGridViewProvider(context.extensionUri, workspaceRoot);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ShellGridViewProvider.viewType, provider)
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('chicola.openGrid', () => {
      vscode.commands.executeCommand('workbench.view.extension.chicola-sidebar');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('chicola.refresh', () => {
      provider.refresh();
      vscode.window.showInformationMessage('Chicola: ShellGrid atualizado.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('chicola.applyNextTask', () => {
      const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('DevFlow / OpenSpec');
      terminal.show();
      terminal.sendText('npm run devflow -- worker --once');
    })
  );

  // Live File Watcher for openspec and .devflow
  const openspecWatcher = vscode.workspace.createFileSystemWatcher('**/openspec/**');
  const devflowWatcher = vscode.workspace.createFileSystemWatcher('**/.devflow/**');

  const onFileChange = () => {
    provider.refresh();
  };

  openspecWatcher.onDidChange(onFileChange);
  openspecWatcher.onDidCreate(onFileChange);
  openspecWatcher.onDidDelete(onFileChange);

  devflowWatcher.onDidChange(onFileChange);
  devflowWatcher.onDidCreate(onFileChange);
  devflowWatcher.onDidDelete(onFileChange);

  context.subscriptions.push(openspecWatcher, devflowWatcher);
}

export function deactivate() {}

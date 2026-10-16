import * as vscode from 'vscode';
import { OpenSpecScanner } from '../parser/openspec-scanner';
import { ShellGridState } from '../types/openspec';

export class ShellGridViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'chicola.shellgrid';
  private _view?: vscode.WebviewView;
  private scanner: OpenSpecScanner;
  private selectedChange?: string;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly workspaceRoot: string) {
    this.scanner = new OpenSpecScanner(workspaceRoot);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'openTask': {
          const doc = await vscode.workspace.openTextDocument(data.filePath);
          const editor = await vscode.window.showTextDocument(doc);
          const line = Math.max(0, (data.line || 1) - 1);
          const range = new vscode.Range(line, 0, line, 0);
          editor.selection = new vscode.Selection(range.start, range.end);
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
          break;
        }
        case 'applyNextTask': {
          vscode.commands.executeCommand('chicola.applyNextTask');
          break;
        }
        case 'selectChange': {
          this.selectedChange = data.changeName;
          this.refresh();
          break;
        }
        case 'refresh': {
          this.refresh();
          break;
        }
      }
    });

    this.refresh();
  }

  public refresh() {
    if (!this._view) return;
    const state = this.scanner.getState(this.selectedChange);
    this._view.webview.postMessage({ type: 'stateUpdate', state });
  }

  private _getHtmlForWebview(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chicola — ShellGrid</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #121316);
      --card-bg: rgba(255, 255, 255, 0.04);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: var(--vscode-focusBorder, #8b5cf6);
      --accent-glow: rgba(139, 92, 246, 0.25);
      --success: #10b981;
      --warning: #f59e0b;
      --text: var(--vscode-foreground, #f3f4f6);
      --text-muted: var(--vscode-descriptionForeground, #9ca3af);
      --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      --code-font: var(--vscode-editor-font-family, monospace);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.4;
      padding: 12px;
      user-select: none;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-icon {
      width: 18px;
      height: 18px;
      color: var(--accent);
    }
    .brand-title {
      font-weight: 700;
      letter-spacing: 0.5px;
      font-size: 13px;
      text-transform: uppercase;
      background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-badge {
      font-size: 10px;
      padding: 2px 6px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 9999px;
      color: var(--text-muted);
    }

    /* Change Selector */
    .selector-container {
      margin-bottom: 14px;
    }
    .select-dropdown {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-family: var(--code-font);
      outline: none;
      cursor: pointer;
    }
    .select-dropdown:focus {
      border-color: var(--accent);
    }

    /* Progress Card */
    .progress-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .progress-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
    .progress-value {
      font-weight: 700;
      color: var(--accent);
      font-family: var(--code-font);
    }
    .progress-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #10b981);
      width: 0%;
      transition: width 0.3s ease;
    }

    /* ShellGrid Tasks Matrix */
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .tasks-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .task-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .task-card:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateX(2px);
    }
    .task-status-indicator {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }
    .task-status-completed {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      color: #10b981;
    }
    .task-status-pending {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-muted);
    }
    .task-status-in_progress {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid #f59e0b;
      color: #f59e0b;
      animation: pulse 1.5s infinite;
    }
    .task-info {
      flex: 1;
      min-width: 0;
    }
    .task-title {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .task-meta {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Actions */
    .action-btn {
      width: 100%;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: filter 0.15s ease;
      box-shadow: 0 2px 8px var(--accent-glow);
    }
    .action-btn:hover {
      filter: brightness(1.15);
    }

    /* Specs & Capabilities */
    .specs-list {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .spec-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 8px;
    }
    .spec-cap {
      font-family: var(--code-font);
      font-size: 11px;
      color: #a78bfa;
      font-weight: 600;
    }
    .spec-scenarios {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .empty-state {
      text-align: center;
      padding: 30px 10px;
      color: var(--text-muted);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <svg class="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
      </svg>
      <span class="brand-title">Chicola</span>
    </div>
    <span class="brand-badge" id="updatedBadge">--:--</span>
  </div>

  <div class="selector-container" id="changeSelectorContainer">
    <select class="select-dropdown" id="changeSelect"></select>
  </div>

  <div class="progress-card">
    <div class="progress-header">
      <span class="progress-label">Progresso das Tarefas</span>
      <span class="progress-value" id="progressText">0%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill"></div>
    </div>
  </div>

  <button class="action-btn" id="applyTaskBtn">
    <span>▶</span> Aplicar Próxima Tarefa
  </button>

  <div style="margin-top: 16px;">
    <div class="section-title">
      <span>Matriz de Tarefas</span>
      <span id="tasksCounter" style="font-family: var(--code-font);">0/0</span>
    </div>
    <div class="tasks-grid" id="tasksList"></div>
  </div>

  <div style="margin-top: 16px;">
    <div class="section-title">
      <span>Delta Specs & Capabilities</span>
    </div>
    <div class="specs-list" id="specsList"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentState = null;

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'stateUpdate') {
        currentState = message.state;
        renderState(currentState);
      }
    });

    function renderState(state) {
      document.getElementById('updatedBadge').textContent = state.lastUpdated;

      const select = document.getElementById('changeSelect');
      select.innerHTML = '';

      if (!state.allChanges || state.allChanges.length === 0) {
        document.getElementById('changeSelectorContainer').style.display = 'none';
        document.getElementById('tasksList').innerHTML = '<div class="empty-state">Nenhuma change ativa em openspec/changes/</div>';
        return;
      }

      document.getElementById('changeSelectorContainer').style.display = 'block';
      state.allChanges.forEach(changeName => {
        const opt = document.createElement('option');
        opt.value = changeName;
        opt.textContent = changeName;
        if (state.activeChange && state.activeChange.name === changeName) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      select.onchange = () => {
        vscode.postMessage({ type: 'selectChange', changeName: select.value });
      };

      const change = state.activeChange;
      if (!change) return;

      // Progress
      const percent = change.progressPercent || 0;
      document.getElementById('progressText').textContent = `${percent}%`;
      document.getElementById('progressFill').style.width = `${percent}%`;
      document.getElementById('tasksCounter').textContent = `${change.completedTasks}/${change.totalTasks}`;

      // Tasks
      const tasksContainer = document.getElementById('tasksList');
      tasksContainer.innerHTML = '';

      if (change.tasks.length === 0) {
        tasksContainer.innerHTML = '<div class="empty-state">Nenhuma task encontrada em tasks.md</div>';
      } else {
        change.tasks.forEach(task => {
          const card = document.createElement('div');
          card.className = 'task-card';

          const icon = document.createElement('div');
          icon.className = `task-status-indicator task-status-${task.status}`;
          icon.textContent = task.status === 'completed' ? '✓' : (task.status === 'in_progress' ? '●' : '');

          const info = document.createElement('div');
          info.className = 'task-info';

          const title = document.createElement('div');
          title.className = 'task-title';
          title.textContent = task.title;

          const meta = document.createElement('div');
          meta.className = 'task-meta';
          meta.textContent = `#${task.index} ${task.capability ? '• ' + task.capability : ''}`;

          info.appendChild(title);
          info.appendChild(meta);

          card.appendChild(icon);
          card.appendChild(info);

          card.onclick = () => {
            vscode.postMessage({
              type: 'openTask',
              filePath: task.filePath,
              line: task.lineNumber
            });
          };

          tasksContainer.appendChild(card);
        });
      }

      // Specs
      const specsContainer = document.getElementById('specsList');
      specsContainer.innerHTML = '';
      if (!change.specs || change.specs.length === 0) {
        specsContainer.innerHTML = '<div class="empty-state" style="padding: 10px;">Sem specs delta declaradas</div>';
      } else {
        change.specs.forEach(spec => {
          const item = document.createElement('div');
          item.className = 'spec-item';

          const cap = document.createElement('div');
          cap.className = 'spec-cap';
          cap.textContent = spec.capability;

          const scenariosCount = spec.requirements.reduce((acc, req) => acc + (req.scenarios ? req.scenarios.length : 0), 0);
          const meta = document.createElement('div');
          meta.className = 'spec-scenarios';
          meta.textContent = `${spec.requirements.length} requisitos • ${scenariosCount} cenários WHEN/THEN`;

          item.appendChild(cap);
          item.appendChild(meta);
          specsContainer.appendChild(item);
        });
      }
    }

    document.getElementById('applyTaskBtn').onclick = () => {
      vscode.postMessage({ type: 'applyNextTask' });
    };
  </script>
</body>
</html>`;
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { OpenSpecChange, OpenSpecTask, DeltaSpec, ShellGridState, TaskStatus } from '../types/openspec';

export class OpenSpecScanner {
  constructor(private workspaceRoot: string) {}

  public get openspecRoot(): string {
    return path.join(this.workspaceRoot, 'openspec');
  }

  public get devflowStatePath(): string {
    return path.join(this.workspaceRoot, '.devflow', 'state.json');
  }

  public hasOpenSpec(): boolean {
    return fs.existsSync(this.openspecRoot);
  }

  public listChanges(): string[] {
    const changesDir = path.join(this.openspecRoot, 'changes');
    if (!fs.existsSync(changesDir)) {
      return [];
    }

    return fs.readdirSync(changesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name !== 'archive')
      .map(dirent => dirent.name);
  }

  public parseChange(changeName: string): OpenSpecChange | null {
    const changeDir = path.join(this.openspecRoot, 'changes', changeName);
    if (!fs.existsSync(changeDir)) {
      return null;
    }

    const tasksPath = path.join(changeDir, 'tasks.md');
    const proposalPath = path.join(changeDir, 'proposal.md');
    const specsDir = path.join(changeDir, 'specs');

    const tasks = fs.existsSync(tasksPath) ? this.parseTasks(tasksPath) : [];
    const proposal = fs.existsSync(proposalPath) ? this.parseProposal(proposalPath) : { title: changeName, motivation: '' };
    const specs = fs.existsSync(specsDir) ? this.parseSpecs(specsDir) : [];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      name: changeName,
      title: proposal.title,
      motivation: proposal.motivation,
      tasksPath,
      proposalPath,
      tasks,
      specs,
      totalTasks,
      completedTasks,
      progressPercent
    };
  }

  public parseTasks(tasksFilePath: string): OpenSpecTask[] {
    const content = fs.readFileSync(tasksFilePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const tasks: OpenSpecTask[] = [];

    let currentCapability = 'General';
    let index = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect header as capability context
      if (trimmed.startsWith('#')) {
        const headerMatch = trimmed.match(/^#+\s*(?:Capability:\s*)?(.*)$/i);
        if (headerMatch && headerMatch[1]) {
          currentCapability = headerMatch[1].trim();
        }
        continue;
      }

      // Detect task checkbox: - [ ], - [x], - [/]
      const taskMatch = line.match(/^(\s*[-*]\s*\[([ xX/~])\])\s*(.*)$/);
      if (taskMatch) {
        const checkChar = taskMatch[2];
        const title = taskMatch[3].trim();
        let status: TaskStatus = 'pending';

        if (checkChar === 'x' || checkChar === 'X') {
          status = 'completed';
        } else if (checkChar === '/' || checkChar === '~') {
          status = 'in_progress';
        }

        tasks.push({
          id: `task-${index}`,
          index,
          title,
          capability: currentCapability,
          status,
          lineNumber: i + 1,
          filePath: tasksFilePath
        });

        index++;
      }
    }

    return tasks;
  }

  public parseProposal(proposalFilePath: string): { title: string; motivation: string } {
    const content = fs.readFileSync(proposalFilePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    let title = path.basename(path.dirname(proposalFilePath));
    let motivation = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('# ') && title === path.basename(path.dirname(proposalFilePath))) {
        title = line.replace(/^#\s*/, '').trim();
      } else if (line.toLowerCase().includes('motivation') || line.toLowerCase().includes('contexto') || line.toLowerCase().includes('motivação')) {
        // Collect following lines until next header
        const motLines: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith('#')) break;
          if (lines[j].trim().length > 0) motLines.push(lines[j].trim());
        }
        motivation = motLines.join(' ').slice(0, 300);
      }
    }

    return { title, motivation };
  }

  public parseSpecs(specsDir: string): DeltaSpec[] {
    const specs: DeltaSpec[] = [];
    if (!fs.existsSync(specsDir)) return specs;

    const findSpecFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          results = results.concat(findSpecFiles(full));
        } else if (item.isFile() && item.name.endsWith('.md')) {
          results.push(full);
        }
      }
      return results;
    };

    const specFiles = findSpecFiles(specsDir);
    for (const file of specFiles) {
      const capability = path.basename(path.dirname(file));
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split(/\r?\n/);
      const requirements: { title: string; scenarios: { when: string; then: string }[] }[] = [];

      let currentReq: { title: string; scenarios: { when: string; then: string }[] } | null = null;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ') || trimmed.startsWith('## Requirement:')) {
          if (currentReq) requirements.push(currentReq);
          currentReq = { title: trimmed.replace(/^#+\s*(?:Requirement:\s*)?/, ''), scenarios: [] };
        } else if (currentReq && trimmed.toUpperCase().includes('WHEN') && trimmed.toUpperCase().includes('THEN')) {
          const match = trimmed.match(/WHEN\s+(.*?)\s+THEN\s+(.*)/i);
          if (match) {
            currentReq.scenarios.push({ when: match[1].trim(), then: match[2].trim() });
          }
        }
      }
      if (currentReq) requirements.push(currentReq);

      specs.push({
        capability,
        filePath: file,
        requirements
      });
    }

    return specs;
  }

  public parseDevflowState(): any {
    if (!fs.existsSync(this.devflowStatePath)) return null;
    try {
      const raw = fs.readFileSync(this.devflowStatePath, 'utf-8');
      const data = JSON.parse(raw);
      const activeLocks = Object.keys(data.locks || {});
      return {
        activeStoryId: activeLocks.length > 0 ? activeLocks[0] : undefined,
        lockActive: activeLocks.length > 0,
        lastExecutionId: Object.keys(data.executions || {}).pop()
      };
    } catch {
      return null;
    }
  }

  public getState(selectedChange?: string): ShellGridState {
    const hasOpenSpec = this.hasOpenSpec();
    const allChanges = this.listChanges();
    const activeChangeName = selectedChange || allChanges[0];
    const activeChange = activeChangeName ? this.parseChange(activeChangeName) || undefined : undefined;
    const devflow = this.parseDevflowState();

    return {
      hasOpenSpec,
      activeChange,
      allChanges,
      devflow,
      lastUpdated: new Date().toLocaleTimeString()
    };
  }
}

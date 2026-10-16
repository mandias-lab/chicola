export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface OpenSpecTask {
  id: string;
  index: number;
  title: string;
  capability?: string;
  status: TaskStatus;
  lineNumber: number;
  filePath: string;
}

export interface Scenario {
  when: string;
  then: string;
}

export interface Requirement {
  title: string;
  scenarios: Scenario[];
}

export interface DeltaSpec {
  capability: string;
  filePath: string;
  requirements: Requirement[];
}

export interface OpenSpecChange {
  name: string;
  title: string;
  motivation: string;
  tasksPath: string;
  proposalPath: string;
  tasks: OpenSpecTask[];
  specs: DeltaSpec[];
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

export interface DevFlowStateSummary {
  activeStoryId?: string;
  status?: string;
  lastExecutionId?: string;
  lockActive?: boolean;
}

export interface ShellGridState {
  hasOpenSpec: boolean;
  activeChange?: OpenSpecChange;
  allChanges: string[];
  devflow?: DevFlowStateSummary;
  lastUpdated: string;
}

import 'dotenv/config'
import { gatedFetch } from './feat-gate';
const API_URL = process.env.BACKEND_URL

export interface GetDeployRunsRequest {
  projectId?: string;
  workflowRunId?: string;
  dateRange?: { startDate?: string; endDate?: string };
  limit?: number;
}

export interface DeployEvent {
  id: number;
  projectId: string;
  namespace: string;
  stage: string;
  workflow: string | null;
  isError: number;
  eventData: string;
  eventDate: string;
  steps: string[];
  commitMessage: string | null;
}

export type DeployStage = 'MASTER_START' | 'MASTER_END' | 'MASTER_ERROR' | 'SLAVE_START' | 'SLAVE_END' | 'SLAVE_ERROR'

// one execution attempt of a run — a retriggered run re-runs the whole workflow
// under the SAME workflowRunId; attempts are ordered oldest → newest
export interface DeployAttempt {
  startDate: string;
  endDate: string;
  hasError: boolean;
  stages: Partial<Record<DeployStage, DeployEvent>>;
  events: DeployEvent[];
}

export interface DeployRun {
  workflowRunId: string;
  projectId: string;
  namespace: string;
  commitMessage: string | null;
  tag: string;
  startDate: string;
  endDate: string;
  hasError: boolean;
  retriggered: boolean;
  retriggeredAt: string | null;
  stages: Partial<Record<DeployStage, DeployEvent>>;
  events: DeployEvent[];
  attempts: DeployAttempt[];
}

export const getDeployRuns = async (payload?: GetDeployRunsRequest): Promise<DeployRun[]> => {
  try {
    const response = await gatedFetch(`${API_URL}/get-deploy-runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : null,
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const { data } = await response.json();
    return data as DeployRun[];
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

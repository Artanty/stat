import 'dotenv/config'
import { ResponseDataItem } from './models';
import { formatDateByTimezone } from './helpers';
const API_URL = process.env.BACKEND_URL

export interface GetEventsRequest { 
  id?: number, 
  projectId?: string, 
  namespace?: string, 
  state?: string,
  isError?: number, 
  date?: string
}
export interface GetLastEventsRequest {
  dateRange: {
    "startDate": string
    "endDate": string
  }
  projectId: string,
  limit: number
}

export interface GetProjectsResponseItem {
  projectId: string, 
  namespace: string
}
export type GetProjectsResponse = GetProjectsResponseItem[]

export const getLastEvents = async (payload: GetLastEventsRequest) => {
  try {
    const response = await fetch(`${API_URL}/get-last-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : null,
    });
    if (!response.ok) {
      throw new Error('Network response was not ok'); 
    }
    const {data} = await response.json();
    
    const updData = formatDateByTimezone<ResponseDataItem>(data, 'eventDate', 'Europe/Moscow');
    
    return updData
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

export const getProjectsApi = async (payload?: any): Promise<GetProjectsResponse> => {
  try {
    console.log(API_URL)
    const response = await fetch(`${API_URL}/get-projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : null,
    });
    if (!response.ok) {
      throw new Error('Network response was not ok'); 
    }
    const body = await response.json();
    return Array.isArray(body) ? body : body.data
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

export interface GetProjectEntriesRequest {
 "projectName": string
}

export const getProjectEntries = async (payload: GetProjectEntriesRequest) => {
  console.log(payload)
  try {
    const response = await fetch(`${API_URL}/get-project-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok'); 
    }
    const {data} = await response.json();
    
    return data
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

export interface GetEventsListRequest {
  projectId?: string,
  namespace?: string,
  stage?: string,
  isError?: number,
  dateRange?: {
    startDate: string,
    endDate: string
  },
  limit?: number
}

export const getEventsList = async (payload: GetEventsListRequest) => {
  const response = await fetch(`${API_URL}/get-events-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }
  const body = await response.json();
  return body.data
};

export interface GetProjectsStatusRequest {
  limit?: number;
}

export interface ProjectStatusItem {
  projectId: string;
  namespace: string;
  totalEvents: number;
  errorCount: number;
  lastEventDate: string | null;
  recentEvents: {
    id: number;
    projectId: string;
    namespace: string;
    stage: string;
    isError: number;
    eventData: string;
    eventDate: string;
  }[];
}

export const getProjectsStatus = async (payload?: GetProjectsStatusRequest): Promise<ProjectStatusItem[]> => {
  const response = await fetch(`${API_URL}/get-projects-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }
  const body = await response.json();
  return body.data;
};

export const RENDER_LOGS_URL = '/v1/logs'

export interface RenderLogEntry {
  id: string,
  message: string,
  timestamp: string,
  labels: { name: string, value: string }[]
}
export interface RenderLogsResponse {
  hasMore: boolean,
  nextStartTime: string,
  nextEndTime: string,
  logs: RenderLogEntry[]
}
export interface GetRenderLogsRequest {
  apiKey: string,
  ownerId: string,
  resource: string,
  startTime?: string,
  endTime?: string,
  direction?: 'forward' | 'backward',
  type?: string,
  limit?: number
}

export const getRenderLogs = async (payload: GetRenderLogsRequest): Promise<RenderLogsResponse> => {
  const params = new URLSearchParams();
  params.set('ownerId', payload.ownerId);
  params.set('resource', payload.resource);
  if (payload.startTime) params.set('startTime', payload.startTime);
  if (payload.endTime) params.set('endTime', payload.endTime);
  if (payload.direction) params.set('direction', payload.direction);
  if (payload.type) params.set('type', payload.type);
  if (payload.limit) params.set('limit', String(payload.limit));

  const response = await fetch(`${RENDER_LOGS_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${payload.apiKey}`,
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Render API error ${response.status}: ${await response.text()}`);
  }
  return response.json();
};



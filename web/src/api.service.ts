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
    const {data} = await response.json();
    
    return data
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



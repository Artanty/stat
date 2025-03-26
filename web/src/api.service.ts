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

export const fetchData = async (payload?: GetEventsRequest) => {
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
    const data = await response.json();
    
    const updData = formatDateByTimezone<ResponseDataItem>(data, 'eventDate', 'Europe/Moscow');
    
    return updData
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

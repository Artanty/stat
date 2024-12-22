import 'dotenv/config'
const API_URL = process.env.BACKEND_URL

export interface GetEvents { 
  id?: number, 
  projectId?: string, 
  namespace?: string, 
  state?: string,
  isError?: number, 
  date?: string
}

export const fetchData = async (payload?: GetEvents) => {
  
  try {
    const response = await fetch(`${API_URL}/get-events`, {
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
    // console.log(data)
    return data;
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};
// data: [
//   { year: '1991', value: 3 },
//   { year: '1992', value: 4 },
//   { year: '1993', value: 3.5 },
//   { year: '1994', value: 5 },
//   { year: '1995', value: 4.9 },
//   { year: '1996', value: 6 },
//   { year: '1997', value: 7 },
//   { year: '1998', value: 9 },
//   { year: '1999', value: 11 },
// ],
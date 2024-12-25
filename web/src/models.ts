
export const stat_stages = { //stat_stages
    RUNTIME: 2000,
    PUSH_SLAVE: 1500,
    GET_SAFE: 1000,
    PUSH_MASTER: 500,
    UNKNOWN: 0,
  }
  
export interface ResponseDataItem {
    "id": number
    "projectId": string
    "namespace": string
    "stage": keyof typeof stat_stages
    "isError": number
    "eventData": string
    "eventDate": string
  }


export const stat_stages = { //stat_stages
    RUNTIME: 2000,
    SLAVE_END: 1800,
    PUSH_SLAVE: 1500,
    SLAVE_START: 1600,
    MASTER_END: 1400,
    MASTER_START: 1200,
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

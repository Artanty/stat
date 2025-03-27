export function formatDate(
  dateString: string, 
  formatConfig: { 
    day?: boolean, 
    month?: boolean, 
    year?: boolean, 
    hours?: boolean, 
    minutes?: boolean 
  } = { 
    day: true, 
    month: true, 
    year: true, 
    hours: true, 
    minutes: true 
  }
) {
  // Create a Date object from the input string
  const date = new Date(dateString);

  // Extract UTC components (ignoring the local timezone)
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = String(date.getUTCFullYear()).slice(-2); // Get the last two digits of the year
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  // Initialize an array to build the formatted string
  const parts = [];

  // Add components to the array based on the formatConfig
  if (formatConfig.day) parts.push(day);
  if (formatConfig.month) parts.push(month);
  if (formatConfig.year) parts.push(year);
  if (formatConfig.hours || formatConfig.minutes) {
      const timePart = [];
      if (formatConfig.hours) timePart.push(hours);
      if (formatConfig.minutes) timePart.push(minutes);
      parts.push(timePart.join(':'));
  }
  let formattedDate = ''
  // Join the parts with dots and spaces as needed
  if (formatConfig.day && formatConfig.month && formatConfig.year && (formatConfig.hours || formatConfig.minutes)) {
    formattedDate = parts.slice(0,2).join('.') + ' ' + parts[3];
  } else {
    formattedDate = parts.join('.');
  }  

  return formattedDate;
}


export const swapObject = (obj) => {
  const swappedObj = {};
  for (const [key, value] of Object.entries(obj)) {
    swappedObj[value] = key;
  }
  return swappedObj;
};

// {
//   "flow@github-back": [ event1...],
//   "flow2@github-back": [ event1...]
// }
// Group events by projectId and namespace
export const groupEventsByIdAndNamespace = (events) => {
  const groupedEvents = events.reduce((acc, event) => {
    const key = `${event.projectId}-${event.namespace}`; // Create a unique key
    if (!acc[key]) {
      acc[key] = []; // Initialize an array for this key if it doesn't exist
    }
    acc[key].push(event); // Push the event into the corresponding array
    return acc;
  }, {});
  
  return groupedEvents;
}


export function formatDateByTimezone<T extends Record<string, any>>(
  arr: T[],
  prop: keyof T,
  timezone: string
): T[] {
  // Validate the timezone
  try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch (error) {
      throw new Error(`Invalid time zone specified: ${timezone}`);
  }

  return arr.map(obj => {
      // Create a deep copy of the object to avoid mutating the original
      const newObj: T = { ...obj };

      // Get the date string from the specified property
      const dateString = newObj[prop];

      // Ensure the property value is a string (or Date) that can be parsed
      if (typeof dateString !== 'string' && !(dateString instanceof Date)) {
          throw new Error(`Property ${String(prop)} must be a string or Date`);
      }

      // Create a Date object from the date string
      const date = new Date(dateString);

      // Get the timezone-adjusted date parts
      const adjustedDate = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3, // Include milliseconds
          hour12: false
      }).formatToParts(date);

      // Extract the parts and construct the ISO string
      const year = adjustedDate.find(part => part.type === 'year')!.value;
      const month = adjustedDate.find(part => part.type === 'month')!.value;
      const day = adjustedDate.find(part => part.type === 'day')!.value;
      const hour = adjustedDate.find(part => part.type === 'hour')!.value;
      const minute = adjustedDate.find(part => part.type === 'minute')!.value;
      const second = adjustedDate.find(part => part.type === 'second')!.value;
      const fractionalSecond = adjustedDate.find(part => part.type === 'fractionalSecond')!.value;

      // Construct the ISO string in the same format
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}.${fractionalSecond}Z`;

      // Update the property with the adjusted ISO string
      newObj[prop] = isoString as T[keyof T];

      return newObj;
  });
}

// // Example usage:
// interface ExampleObject {
//   id: number;
//   timestamp: string;
// }

// const data: ExampleObject[] = [
//   { id: 1, timestamp: '2024-12-22T23:17:03.007Z' },
//   { id: 2, timestamp: '2024-12-23T10:45:00.123Z' }
// ];

// try {
//   const formattedData = formatDateByTimezone(data, 'timestamp', 'America/New_York'); // Valid timezone
//   console.log(formattedData);
// } catch (error) {
//   console.error(error.message);
// }
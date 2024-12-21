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

  // Join the parts with dots and spaces as needed
  const formattedDate = parts.join('.');

  return formattedDate;
}
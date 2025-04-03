import dayjs from 'dayjs';
import { createContext, useContext, useState } from 'react';
import { DEFAULT_DATE_RANGE } from '../components/FilterPanel';
import { convertRelativeTimeToISO } from '../helpers';

export const INITIAL_DATE_RANGE2 = []

const DataContext = createContext();

const loadDateRangeSelectedState = () => {
  try {
    const ls = localStorage.getItem('dateRangeSelected')
    if (ls && typeof ls === 'string') {
      const result = JSON.parse(ls)
      return result
    }
    return DEFAULT_DATE_RANGE
  } catch (e) {
    console.log(e)
    return DEFAULT_DATE_RANGE
  }
}

const eventsDateRangeTriggerState = () => {
  const selectedDateRadio = loadDateRangeSelectedState()
  if (selectedDateRadio !== 'CUSTOM') {
    return convertRelativeTimeToISO(selectedDateRadio)
  }
  return INITIAL_DATE_RANGE2
}

export function DataProvider({ children }) {
  const [sharedData, setSharedData] = useState(null);
  const [sharedFilter, setSharedFilter] = useState(loadDateRangeSelectedState);
  const [noDataWidgets, setNoDataWidgets] = useState(null);
  const [layoutType, setLayoutType] = useState('list');
  const [eventsLimit, setEventsLimit] = useState('10');
  const [eventsDateRange, setEventsDateRange] = useState(() => {
    const maxDate = dayjs().endOf('day');
    return [
      maxDate.subtract(30, 'days'),
      maxDate
    ];
  });
  const [eventsDateRangeTrigger, setEventsDateRangeTrigger] = useState(eventsDateRangeTriggerState);

  return (
    <DataContext.Provider value={{ 
      sharedData, setSharedData,
      sharedFilter, setSharedFilter,
      noDataWidgets, setNoDataWidgets,
      layoutType, setLayoutType,
      eventsLimit, setEventsLimit,
      eventsDateRange, setEventsDateRange,
      eventsDateRangeTrigger, setEventsDateRangeTrigger
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
    return useContext(DataContext);
}
import { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [sharedData, setSharedData] = useState(null);
  const [sharedFilter, setSharedFilter] = useState(null);
  const [noDataWidgets, setNoDataWidgets] = useState(null);
  const [layoutType, setLayoutType] = useState('list');
  const [eventsLimit, setEventsLimit] = useState(10);

  return (
    <DataContext.Provider value={{ 
      sharedData, setSharedData,
      sharedFilter, setSharedFilter,
      noDataWidgets, setNoDataWidgets,
      layoutType, setLayoutType,
      eventsLimit, setEventsLimit
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
    return useContext(DataContext);
}
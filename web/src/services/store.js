import { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [sharedData, setSharedData] = useState(null);
  const [sharedFilter, setSharedFilter] = useState(null);

  return (
    <DataContext.Provider value={{ 
      sharedData, setSharedData,
      sharedFilter, setSharedFilter
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
    return useContext(DataContext);
}
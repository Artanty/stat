import React from 'react';
import MyGridLayout3 from './MyGridLayout3';
import FilterPanel from './components/FilterPanel';
import { DataProvider, useData } from './services/store'

export function App() {
    return (
    <div>
        <DataProvider>
            <FilterPanel></FilterPanel>
            <Content />
            <MyGridLayout3
                isDraggable={false}
                isResizable={false} />
        </DataProvider>
    </div> 
    );
}

function Content() {
    const { sharedData, sharedFilter } = useData();
    const pStyle = {
        color: '#fff'
    }
    return (
        <div>
            <p style={pStyle}>Data from child: {JSON.stringify(sharedData)}</p>
            <p style={pStyle}>Filter from child: {JSON.stringify(sharedFilter)}</p>
        </div>
    );
}
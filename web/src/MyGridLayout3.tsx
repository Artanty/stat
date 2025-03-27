import React, { useState, useEffect, useCallback } from "react";
import { useData } from './services/store';
import { getLastEvents } from "./api.service";
import { Badge, Card, Col, Row, Space } from 'antd';
import Card1 from "./components/Card1";
import { DARK_BACK_COLOR } from "./App";

export interface StatWidget {
  id: string,
  events: any[]
}

const App: React.FC = () => {
  const mainStyle = {
    background: '#fff'
  }
  
  const { sharedData, sharedFilter, setNoDataWidgets, layoutType } = useData();
    const [widgets, setWidgets] = useState<StatWidget[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWidgetData = async (widgetId: string) => {
        try {
          const events = await getLastEvents({
            dateRange: sharedFilter,
            projectId: widgetId
          });
          return { id: widgetId, events };
        } catch (error) {
          console.error("Error fetching widget data:", error);
          return { id: widgetId, events: [] };
        }
      };
    useEffect(() => {
        const initializeWidgets = async () => {
          if (Array.isArray(sharedData) && sharedData.length) {
            const widgetPromises = sharedData.map(widgetId => fetchWidgetData(widgetId));
            const widgetData = await Promise.all(widgetPromises);

            setWidgets(filterNoDataWidgets(widgetData));
            setLoading(false);
          }
        };
    
        initializeWidgets();
      }, [sharedData, sharedFilter]);

    const filterNoDataWidgets = (data: StatWidget[]): StatWidget[] => {
      const emptyWidgets: StatWidget[] = []
      const filteredWidgets: StatWidget[] = []
      data.forEach((el: StatWidget) => {
        if (el.events.length) {
          filteredWidgets.push(el)
        } else {
          emptyWidgets.push(el)
        }
      })
      setNoDataWidgets(emptyWidgets)
      return filteredWidgets
    }

  return (
      <div style={{ display: layoutType === 'list' ? 'block' : 'flex' }}>
        {widgets.map((widget, index) => {
          const key = `col-${index}`;
          return (
            <Card key={widget.id + key} title={widget.id} 
              style={{ 
                width: layoutType === 'list' ? '100%' : '25%',
                height: '600px'
               }}
              styles={{
                header: {
                  color: '#a7a7a7',
                  backgroundColor: '#000',
                  borderBottom: '1px solid #d9d9d9',
                },
                body: {
                  background: DARK_BACK_COLOR},
              }}
            >
              <Card1 events={widget.events} name={widget.id} />
            </Card>    
          );
        })}
      </div>
  )
};

export default App;
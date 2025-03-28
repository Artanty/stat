import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useData } from './services/store';
import { getLastEvents } from "./api.service";
import { Badge, Card, Col, Row, Space, Spin } from 'antd';
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
  
  const { sharedData, sharedFilter, setNoDataWidgets, layoutType, 
    eventsLimit, eventsDateRangeTrigger } = useData();
    const [widgets, setWidgets] = useState<StatWidget[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWidgetData = async (widgetId: string) => {
        try {
          const events = await getLastEvents({
            dateRange: {
              startDate: eventsDateRangeTrigger[0],
              endDate: eventsDateRangeTrigger[1]
            },
            projectId: widgetId,
            limit: Number(eventsLimit)
          });
          return { id: widgetId, events };
        } catch (error) {
          console.error("Error fetching widget data:", error);
          return { id: widgetId, events: [] };
        }
    };

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

    useEffect(() => {
      if (!Array.isArray(sharedData) || !sharedData.length || !Array.isArray(eventsDateRangeTrigger) || !eventsDateRangeTrigger.length) {
        return;
      }
      // setLoading(true)
      const loadWidgets = async () => {
        console.log(eventsDateRangeTrigger)
        try {
          const widgetPromises = sharedData.map(fetchWidgetData);
          const widgetResults = await Promise.all(widgetPromises);
          const validWidgets = filterNoDataWidgets(widgetResults);
          
          setWidgets(validWidgets);
        } catch (error) {
          console.error('Failed to load widgets:', error);
        } finally {
          setLoading(false);
        }
      };
      loadWidgets();
    }, [sharedData,  eventsLimit, eventsDateRangeTrigger]); // sharedFilter,

    useEffect(() => {
      console.log(eventsDateRangeTrigger)
    }, [eventsDateRangeTrigger])

  const WidgetCard = React.memo(({ widget, layoutType }: { widget: StatWidget; layoutType: 'list' | 'grid' }) => {
    return (
      <Card 
        title={widget.id}
        style={{ 
          width: layoutType === 'list' ? '100%' : '25%',
          height: '600px',
          margin: '0 10px 20px 0'
        }}
        styles={{
          header: {
            color: '#a7a7a7',
            backgroundColor: '#000',
            borderBottom: '1px solid #d9d9d9',
          },
          body: {
            background: DARK_BACK_COLOR,
          },
        }}
      >
        <Card1 events={widget.events} name={widget.id} />
      </Card>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.widget.id === nextProps.widget.id &&
      prevProps.widget.events === nextProps.widget.events &&
      prevProps.layoutType === nextProps.layoutType
    );
  });

  // Memoize the entire widgets list
  const widgetCards = useMemo(() => (
    widgets.map(widget => (
      <WidgetCard 
        key={widget.id} 
        widget={widget} 
        layoutType={layoutType} 
      />
    ))
  ), [widgets, layoutType]);

  if (loading) {
    return (
      <div style={{ 
        position: 'absolute',
        top: '50%',
        left: '50%'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!loading && (widgets.length === 0)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        color: '#a7a7a7'
      }}>
        Нет данных
      </div>
    );
  }

  return (
    <div style={{ display: layoutType === 'list' ? 'block' : 'flex', flexWrap: 'wrap' }}>
      {widgetCards}
    </div>
  );
};

export default App;
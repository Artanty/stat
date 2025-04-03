import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useData } from './services/store';
import { getLastEvents, getProjectEntries } from "./api.service";
import { Badge, Card, Col, Flex, Row, Space, Spin } from 'antd';
import Card1 from "./components/LineChart";
import { DARK_BACK_COLOR } from "./App";
import { AimOutlined, DoubleRightOutlined, FileSearchOutlined, GithubOutlined, MailOutlined } from "@ant-design/icons";
import CopyButton from "./components/CopyButton";

export interface StatWidget {
  id: string,
  events: any[],
  projectEntries?: Record<string, string>
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

  const fetchProjectEntries = async (widgetId: string): Promise<Record<string, string> | null> => {
    try {
      const data = await getProjectEntries({
        projectName: widgetId
      });
      return data
    } catch (error) {
      console.error("Error fetching project entries:", error);
      return null
    }
  };
  const enrichWidgets = async (widgetId: string) => {
    const res = await fetchProjectEntries(widgetId)
    if (!res) { console.log('no data received for widget: ' + widgetId); return;}
    const currentWidgets = JSON.parse(JSON.stringify(widgets))
    const currentWidget = currentWidgets.find((el: StatWidget) => el.id === widgetId)
    if (!currentWidget) { throw new Error('no widget with id ' + widgetId)}
    currentWidget.projectEntries = res
    console.log(currentWidgets)
    setWidgets(currentWidgets)
  }
  const buildMasterGithubUrl = (projectId: string) => {
    const project = projectId.split('@')[0]
    const namespace = projectId.split('-')[1] || ''
    return `https://github.com/Artanty/${project}/tree/master/${namespace}`
  }
  const buildSlaveGithubUrl = (gitLogin: string) => {
    return `https://github.com/${gitLogin}/`
  }
  const buildTargetServiceUrl = (widget: StatWidget): string => {
    switch (String(widget?.projectEntries?.SERVICE_DOMAIN)) {
      case 'render':
        return 'https://dashboard.render.com/login'
      case 'vercel':
        return 'https://vercel.com/login'
      default:
        return ''
    }
  }

  /**
   * Скопировать в буфер обмена почту для входа в аккаунт
   * Открыть в новой вкладке аккаунт на гитхабе
   */
  const goToGit = (widget: StatWidget) => {
    navigator.clipboard.writeText(String(widget?.projectEntries?.GIT_EMAIL))
    const url = buildSlaveGithubUrl(String(widget?.projectEntries?.GIT_LOGIN))
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  const renderProjectEntries = (widgetId: string) => {
    const widget = widgets.find(el => el.id === widgetId)
    if (!widget) return;
    return (
      <Flex gap="middle" style={{color: '#f5b073a6'}}>
        <span onClick={() => goToGit(widget)} style={{cursor: 'pointer'}}>
          <GithubOutlined style={{marginRight:'8px'}}/>
          <span>{widget?.projectEntries?.GIT_REPO} | </span>
          {widget?.projectEntries?.GIT_EMAIL}
        </span>
       
        <a href={buildTargetServiceUrl(widget)} target="_blank" style={{color: '#f5b073a6'}}>
          <AimOutlined style={{marginRight:'8px'}}/>
          <span>{widget?.projectEntries?.SERVICE_DOMAIN}</span>
        </a>
      </Flex>
    )
  }

  const WidgetCard = React.memo(({ widget, layoutType }: { widget: StatWidget; layoutType: 'list' | 'grid' }) => {
    return (
      <Card 
        title={<a href={buildMasterGithubUrl(widget.id)} target="_blank">{widget.id}</a>}
        extra={
          widget.projectEntries 
          ? renderProjectEntries(widget.id)
          : (<a onClick={() => enrichWidgets(widget.id)}><FileSearchOutlined /></a>)
        }
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
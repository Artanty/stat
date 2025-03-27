import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { getLastEvents } from "./api.service";
import { useData } from './services/store';

const components = {
  // Card5: React.lazy(() => import("./Card5")),
  Card1: React.lazy(() => import("./components/Card1")),
};

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const BootstrapStyleLayout = (props) => {
  const { sharedData, sharedFilter } = useData();
  const defaultProps = {
    className: "layout",
    isDraggable: false,
    isResizable: false,
    items: 10, // Ensure this matches the number of components
    rowHeight: 120,
    onLayoutChange: () => {},
    cols: { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 },
  };

  const generateLayouts = () => {

    const items = [...Array(props.items || defaultProps.items)];
    const widths = { 
      lg: 3, // 12 \ 3 = 4 виджета
      md: 4, // 12 \ 4 = 3 виджета
      sm: 6, 
      xs: 12, 
      xxs: 12 
    };
    // const widths = { 
    //   lg: 12,// 12 \ 12 = 1 виджет
    //   md: 12,
    //   sm: 12, 
    //   xs: 12, 
    //   xxs: 12 
    // };
    return Object.keys(widths).reduce((acc, curr) => {
      const width = widths[curr];
      const cols = (props.cols || defaultProps.cols)[curr];
      acc[curr] = [
        ...items.map((_, i) => ({
          x: (i * width) % cols,
          y: 0,
          w: width,
          h: 4,
          i: String(i),
          minH: 4,
        })),
      ];
      return acc;
    }, {});
  };
  
  const [layouts, setLayouts] = useState(generateLayouts());
  const [groupedEvents, setGroupedEvents] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchAndGroupEvents = async (payload) => {
    const projectId = payload.projectId
    try {
      const events = await getLastEvents(payload);

      setGroupedEvents({...groupedEvents, ...{[projectId]: events }})
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Array.isArray(sharedData) && sharedData.length) {
      sharedData
      .filter((el) => !Object.keys(groupedEvents).includes(el)) // not to load what already loaded
      .forEach(projectId => {
        const payload = {
          dateRange: sharedFilter,
          projectId: projectId
        }
        fetchAndGroupEvents(payload);
      })
      
    }
  }, [sharedData, sharedFilter]);

  useEffect(() => {
    console.log(groupedEvents)
  }, [groupedEvents])

  const generateDOM = () => {
    return Object.entries(groupedEvents).map(([key, events], index) => {
      const Component = components.Card1;
      return (
        <div key={index}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <span className="text">
              <Component events={events} name={key} />
            </span>
          </React.Suspense>
        </div>
      );
    });
  };

  const onLayoutChange = (layout) => {
    if (props.onLayoutChange) {
      props.onLayoutChange(layout);
    }
  };

  if (loading) {
    return <div>Loading...</div>; // Show a loading spinner or message
  }
  
  return (
    <ResponsiveReactGridLayout
      onLayoutChange={onLayoutChange}
      {...defaultProps}
      layouts={layouts}
    >
      {generateDOM()}
    </ResponsiveReactGridLayout>
  );
};

export default BootstrapStyleLayout;

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then((fn) => fn.default(BootstrapStyleLayout));
}
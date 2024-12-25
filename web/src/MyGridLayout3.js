import React, { useState, useEffect } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { groupEventsByIdAndNamespace } from "./helpers";
import { fetchData } from "./api.service";

// Dynamically import components
const components = {
  Card5: React.lazy(() => import("./Card5")),
};

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const BootstrapStyleLayout = (props) => {
  const defaultProps = {
    isDraggable: false,
    isResizable: false,
    items: 2, // Ensure this matches the number of components
    rowHeight: 40,
    onLayoutChange: () => {},
    cols: { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 },
  };

  const [layouts, setLayouts] = useState(generateLayouts());
  const [groupedEvents, setGroupedEvents] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch data and group events on component mount
  useEffect(() => {
    const fetchAndGroupEvents = async () => {
      try {
        const events = await fetchData();
        const groupedEvents = groupEventsByIdAndNamespace(events);
        setGroupedEvents(groupedEvents);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndGroupEvents();
  }, []);

  // Generate responsive layouts
  const generateLayouts = () => {
    const items = [...Array(props.items || defaultProps.items)];
    const widths = { lg: 3, md: 4, sm: 6, xs: 12, xxs: 12 };
    return Object.keys(widths).reduce((acc, curr) => {
      const width = widths[curr];
      const cols = (props.cols || defaultProps.cols)[curr];
      acc[curr] = [
        ...items.map((_, i) => ({
          x: (i * width) % cols,
          y: 0,
          w: width,
          h: 9,
          i: String(i),
          minH: 8,
        })),
      ];
      return acc;
    }, {});
  };

  // Generate DOM elements for each group of events
  const generateDOM = () => {
    return Object.entries(groupedEvents).map(([key, events], index) => {
      const Component = components.Card5;
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

  // Handle layout changes
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
      {...props}
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
import React from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { groupEventsByIdAndNamespace } from "./helpers";
import { fetchData }  from './api.service';

// Dynamically import components
const components = {
  Card5: React.lazy(() => import('./Card5')),
};

const ResponsiveReactGridLayout = WidthProvider(Responsive);

/**
 * This example illustrates how to let grid items lay themselves out with a bootstrap-style specification.
 */
export default class BootstrapStyleLayout extends React.PureComponent {
  static defaultProps = {
    isDraggable: false,
    isResizable: false,
    items: 2, // Ensure this matches the number of components
    rowHeight: 40,
    onLayoutChange: function() {},
    cols: {lg: 12, md: 12, sm: 12, xs: 12, xxs: 12}
  };

  state = {
    layouts: this.generateLayouts(),
    groupedEvents: {}, // Initialize groupedEvents as an empty object
    loading: true, // Add a loading state to handle the fetch
  };

  async componentDidMount() {
    try {
      // Fetch data from the backend
      const events = await fetchData();

      // Group events by projectId and namespace
      const groupedEvents = groupEventsByIdAndNamespace(events);

      this.setState({ groupedEvents, loading: false }); // Update state with grouped events
    } catch (error) {
      console.error("Error fetching data:", error);
      this.setState({ loading: false }); // Handle errors and stop loading
    }
  }

  onLayoutChange(layout) {
    this.props.onLayoutChange(layout);
  }

  generateDOM() {
    const { groupedEvents } = this.state;

    // Generate one Card5 component for each group
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
  }

  // Create responsive layouts. Similar to bootstrap, increase the pseudo width as
  // the viewport shrinks
  generateLayouts() {
    const itmes = [...Array(this.props.items)];
    const widths = {lg: 3, md: 4, sm: 6, xs: 12, xxs: 12};
    return Object.keys(widths).reduce((acc, curr) => {
      const width = widths[curr];
      const cols = this.props.cols[curr];
      acc[curr] = [
        // You can set y to 0, the collision algo will figure it out.
        ...itmes.map((_, i) => ({
          x: (i * width) % cols, 
          y: 0, 
          w: width, 
          h: 9, 
          i: String(i),
          minH: 8
        }))
      ];
      return acc;
    }, {});
  }

  render() {
    if (this.state.loading) {
      return <div>Loading...</div>; // Show a loading spinner or message
    }

    return (
      <ResponsiveReactGridLayout
        onLayoutChange={this.onLayoutChange}
        {...this.props}
        layouts={this.state.layouts}
      >
        {this.generateDOM()}
      </ResponsiveReactGridLayout>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(BootstrapStyleLayout));
}
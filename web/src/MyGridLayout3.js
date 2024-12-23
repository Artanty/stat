import React from "react";
import { WidthProvider, Responsive } from "react-grid-layout";

// Dynamically import components
const components = {
  // Card: React.lazy(() => import('./Card')),
  // Card2: React.lazy(() => import('./Card2')),
  // Card3: React.lazy(() => import('./Card3')),
  // Card4: React.lazy(() => import('./Card4')),
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
    items: 1, // Ensure this matches the number of components
    rowHeight: 35,
    onLayoutChange: function() {},
    cols: {lg: 1, md: 12, sm: 12, xs: 12, xxs: 12}
  };

  state = {
    layouts: this.generateLayouts()
  };

  onLayoutChange(layout) {
    this.props.onLayoutChange(layout);
  }

  generateDOM() {
    const componentKeys = Object.keys(components);

    return componentKeys.map((key, i) => {
      const Component = components[key];
      return (
        <div key={i}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <span className="text"><Component /></span>
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
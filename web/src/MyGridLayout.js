import React from 'react';
import GridLayout from 'react-grid-layout';
import Card from './Card'

function MyGridLayout() {
  const layout = [
    { i: 'a', x: 0, y: 0, w: 10, h:9, minH: 1 },
    // { i: 'b', x: 1, y: 0, w: 3, h: 2 },
    // { i: 'c', x: 4, y: 0, w: 1, h: 2 },
    // { i: 'e', x: 4, y: 0, w: 1, h: 2 },
  ];

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={20}
      rowHeight={35}
      width={1000}
    >
      <div key="a"><Card/></div>
      {/* <div key="b">Item B</div>
      <div key="c">Item C</div>
      <div key="e">Item C</div> */}
      
    </GridLayout>
  );
}

export default MyGridLayout;

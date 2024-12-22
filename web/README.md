"npm run start": "parcel src/index.html --open"
This tells parcel to bundle all the scripts together, then run it on a built-in server and open the default browser to the page.

used:
https://github.com/react-grid-layout
https://g2plot.opd.cool/guide
https://g2plot.antv.antgroup.com/en/examples
https://g2plot.antv.antgroup.com/en/examples/more-plots/radial-bar#background
https://g2plot.antv.antgroup.com/en/examples/more-plots/radial-bar#line


[
    {
        "id": 1,
        "projectId": "test@github",
        "namespace": "back",
        "state": "DEPLOY",
        "isError": 0,
        "eventData": "commit",
        "eventDate": "2024-09-27T12:00:47.538Z"
    },
    {
        "id": 2,
        "projectId": "test@github",
        "namespace": "back",
        "state": "DEPLOY",
        "isError": 0,
        "eventData": "commit",
        "eventDate": "2024-09-27T12:30:14.266Z"
    }
]

import { RadialBar } from '@antv/g2plot';

fetch('https://gw.alipayobjects.com/os/antfincdn/8elHX%26irfq/stack-column-data.json')
  .then((data) => data.json())
  .then((data) => {
    const plot = new RadialBar('container', {
      data,
      xField: 'year',
      yField: 'value',
      colorField: 'type',
      isStack: true,
      maxAngle: 270,
    });

    plot.render();
  });

  RadialBarChart


  all
  https://g2plot.antv.antgroup.com/en/examples/line/multiple/#line-color

  https://g2plot.antv.antgroup.com/en/examples/bar/percent/#basic

  https://g2plot.antv.antgroup.com/en/examples/case/customize/#desire-heatmap


  Label from:
  https://g2plot-v1.antv.vision/en/examples/advanced/connection

  stopped at:
  https://g2plot.antv.antgroup.com/en/examples/component/annotation/#line-annotation-position
"npm run start": "parcel src/index.html --open"
This tells parcel to bundle all the scripts together, then run it on a built-in server and open the default browser to the page.

2 v odnom
https://ant-design-charts.antgroup.com/en/examples/statistics/dual-axes#dual-step-line

used:
https://ant-design-charts.antgroup.com/en/manual/getting-started

```
type TooltipItem =
  | string
  | false
  | {
      name?: string;
      color?: string;
      channel?: string;
      field?: string;
      value?: string;
      // 格式化 tooltip item 的值（支持 d3-format 对应的字符串）
      valueFormatter?: string | ((d: any) => string);
    };
```

```
{
        "id": 27,
        "projectId": "stat@github",
        "namespace": "back",
        "stage": "GET_SAFE",
        "isError": 0,
        "eventData": "trig;",
        "eventDate": "2024-12-23T20:53:54.384Z"
    },
```
    to
```
{
  "date": "2011-12-01T00:00:00.000Z",
     "value": 60.4
 },
```


tried:
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
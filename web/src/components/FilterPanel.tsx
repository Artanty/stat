import { Button, Checkbox, ConfigProvider, Flex, InputNumber, InputNumberProps, Radio, RadioChangeEvent, Segmented, Slider, SliderSingleProps, Tag, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { StatWidget } from '~/MyGridLayout3';
import DateSelect from './../components/DateSelect'
import {
  AppstoreOutlined,
  BarsOutlined
} from '@ant-design/icons';
import { getProjectsApi, GetProjectsResponse, GetProjectsResponseItem } from "../api.service";
import { useData } from '../services/store';
import { convertRelativeTimeToISO, getRandomColor } from '../helpers';
import { SizeType } from 'antd/es/config-provider/SizeContext';
export const DEFAULT_DATE_RANGE = '1 HOUR'
export interface IFilterRow {
  label: string, 
  value: string
  color: string | any
}
const FilterPanel: React.FC = () => {
  const { 
    setSharedData, 
    sharedFilter,
    setSharedFilter, 
    noDataWidgets, 
    layoutType, 
    setLayoutType,
    eventsLimit, 
    setEventsLimit,
    setEventsDateRangeTrigger
  } = useData();

  const loadMasterProjectsCheckedState = () => {
    try {
      const ls = localStorage.getItem('masterProjectsChecked')
      if (ls && typeof ls === 'string') {
        const result = JSON.parse(ls)
        if (Array.isArray(result)) {
          return result
        }
      }
      return []
    } catch (e) {
      console.log(e)
      return []
    }
  }
  

  const [masterProjects, setMasterProjects] = useState<IFilterRow[]>([]);
  const [masterProjectsChecked, setMasterProjectsChecked] = useState<string[]>(loadMasterProjectsCheckedState);

  
  const [loading, setLoading] = useState<boolean>(true);

  const isSelected = (project: string): boolean => {
    return masterProjectsChecked.indexOf(project) > -1
  }
  const isNoDataWidget = (projectId: string): boolean => {
    return noDataWidgets?.map((el: StatWidget) => el.id).includes(projectId)
  }

  const buildFirstRow = () => {
    const data: IFilterRow[] = [
      // { value: '5 MINUTE', label: '5 min', color: 'default' },
      // { value: '30 MINUTE', label: '30 min', color: 'default' },
      { value: '1 HOUR', label: 'Last 1 hour', color: 'default' },
      // { value: '2 HOUR', label: 'Last 2 hours', color: 'default' },
      // { value: '4 HOUR', label: 'Last 4 hours', color: 'default' },
      // { value: '8 HOUR', label: 'Last 8 hours', color: 'default' },
      // { value: '12 HOUR', label: 'Last 12 hours', color: 'default' },
      // { value: '18 HOUR', label: 'Last 18 hours', color: 'default' },
      { value: '1 DAY', label: 'Last day', color: 'default' },
      { value: '7 DAY', label: 'Last week', color: 'default' },
      { value: '1 MONTH', label: 'Last month', color: 'default' },
      { value: '3 MONTH', label: 'Last three months', color: 'default' },
      { value: '6 MONTH', label: 'Last six months', color: 'default' },
      { value: '12 MONTH', label: 'Last year', color: 'default' },
      { value: 'CUSTOM', label: 'CUSTOM', color: 'default' },
    ]
    return data.map((item: IFilterRow, i: number) => {
      if (item.value === 'CUSTOM') {
        return (
          <Radio.Button value={item.value} key={item.value + i} style={{paddingInline: '0px'}}>
            <DateSelect></DateSelect>
          </Radio.Button>
          
        )
      } else {
        return (
          <Radio.Button value={item.value} key={item.value + i}>{item.label}</Radio.Button>
        )
      }
    })
  }
  
  const onMasterProjectsCheckedChange = (checkedValues: string[]) => {
    setMasterProjectsChecked(checkedValues as string[])
    localStorage.setItem('masterProjectsChecked', JSON.stringify(checkedValues))
  };
  

  const buildSecondRow = () => {
    return (
      <Checkbox.Group value={masterProjectsChecked} onChange={onMasterProjectsCheckedChange}>
        <Flex wrap gap="small">
          {masterProjects.map((item: IFilterRow, i: number) => (
            <Button color={isSelected(item.value) ? item.color : "default"} variant="outlined" key={item.value + i}>
              <Checkbox style={{color: 'inherit'}} value={item.value}>{item.label}</Checkbox>
              {!isNoDataWidget(item.value) || <Tag color="red">!</Tag>}
            </Button>
          ))}
        </Flex>
      </Checkbox.Group>
    )
  }

  const buildLimitSteps = () => {
    const data: IFilterRow[] = [
      { value: '10', label: '10', color: 'default' },
      // { value: '30', label: '30', color: 'default' },
      { value: '50', label: '50', color: 'default' },
      // { value: '80', label: '80', color: 'default' },
      { value: '100', label: '100', color: 'default' },
      { value: '300', label: '300', color: 'default' },
      { value: '500', label: '500', color: 'default' },
      // { value: '100', label: '100', color: 'default' },
    ]
    return data.map((item: IFilterRow, i: number) => (
      <Radio.Button value={item.value} key={item.value + i}>{item.label}</Radio.Button>
    ))
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const masters: IFilterRow[] = []
        const slaves: IFilterRow[] = []
        const res: GetProjectsResponse = await getProjectsApi();
        res.forEach((el: GetProjectsResponseItem) => {
          const namespacedProjectName = el.projectId.concat((el.namespace ? ('-' +  el.namespace) : ''))
          const item = { 
            value: namespacedProjectName, 
            label: namespacedProjectName,
            color: getRandomColor() 
          }
          if (el.projectId.endsWith('@github')) {
            masters.push(item)
          } else {
            slaves.push(item)
          }
        })
        masters.sort((a,b) => {
          if (a.label < b.label) return -1;
          if (a.label > b.label) return 1;
          return 0;
        })
        setMasterProjects(masters)
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        //
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    validateAndSendProjectsToStore()
  }, [masterProjects, masterProjectsChecked]);

  const validateAndSendProjectsToStore = () => {
    const selected = masterProjects.map((el => el.value)).filter((el: string) => {
      return masterProjectsChecked.includes(el)
    })
    setSharedData(selected);
  }
  
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        // algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
      }}
    > 
      <Flex gap="middle">
        <Flex vertical gap="middle">
          <Radio.Group value={sharedFilter} onChange={(e) => {
            const checkedValues = e.target.value
            setSharedFilter(checkedValues)
            localStorage.setItem('dateRangeSelected', JSON.stringify(checkedValues))
            if (checkedValues !== 'CUSTOM') {
              const [from, to] = convertRelativeTimeToISO(checkedValues)
              setEventsDateRangeTrigger([from, to])
            }
          }}> 
            {buildFirstRow()}
          </Radio.Group>
          <Radio.Group defaultValue="a">
            {buildSecondRow()}
          </Radio.Group>
        </Flex>
        <div>
          
        </div>   
        <Flex vertical gap="small" align="flex-end" style={{
          background: '#141414',
          width: '560px',
          minWidth: '400px',
          padding: '4px',
          borderRadius: '14px'
        }}>
          <Segmented
            value={layoutType}
            size="middle"
            shape="round"
            options={[
              { value: 'grid', icon: <AppstoreOutlined /> },
              { value: 'list', icon: <BarsOutlined /> },
            ]}
            onChange={(value) => setLayoutType(value as LayoutType)}
          />
          <Radio.Group value={eventsLimit} onChange={(e) => setEventsLimit(e.target.value)}> 
            {buildLimitSteps()}
          </Radio.Group>
        </Flex>
      </Flex> 
    </ConfigProvider>
  )
}
export type LayoutType = 'list' | 'grid'
export default FilterPanel;

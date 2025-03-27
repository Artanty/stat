import React, { useState, useEffect} from 'react';
import { Button, ConfigProvider,Flex, GetProp, Radio, RadioChangeEvent, Space, theme } from 'antd';
import { getProjectsApi, GetProjectsResponse, GetProjectsResponseItem } from "../api.service";
import { Checkbox } from 'antd';
import { createStyles } from 'antd-style';
import { DataProvider, useData } from '../services/store'
export const DEFAULT_DATE_RANGE = '1 HOUR'
export interface IFilterRow {
  label: string, value: string
}
const FilterPanel: React.FC = () => {
  const { setSharedData, setSharedFilter } = useData();
  const useStyle = createStyles(({ prefixCls, css }) => ({
    linearGradientButton: css`
      &.${prefixCls}-btn-primary:not([disabled]):not(.${prefixCls}-btn-dangerous) {
        > span {
          position: relative;
        }
  
        &::before {
          content: '';
          background: linear-gradient(135deg, #6253e1, #04befe);
          position: absolute;
          inset: -1px;
          opacity: 1;
          transition: all 0.3s;
          border-radius: inherit;
        }
  
        &:hover::before {
          opacity: 0;
        }
      }
    `,
    checkboxLabel: css`
      .ant-checkbox + span {
        z-index: 1;
        position: relative;
      }
    `
  }));
  const { styles } = useStyle();

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
  
  const loadDateRangeSelectedState = () => {
    try {
      const ls = localStorage.getItem('dateRangeSelected')
      if (ls && typeof ls === 'string') {
        const result = JSON.parse(ls)
        return result
      }
      return DEFAULT_DATE_RANGE
    } catch (e) {
      console.log(e)
      return DEFAULT_DATE_RANGE
    }
  }
  const [masterProjects, setMasterProjects] = useState<IFilterRow[]>([]);
  const [masterProjectsChecked, setMasterProjectsChecked] = useState<string[]>(loadMasterProjectsCheckedState);
  const [dateRangeSelected, setDateRangeSelected] = useState<string>(loadDateRangeSelectedState)
  const [loading, setLoading] = useState<boolean>(true);
  const isSelected = (project: string): boolean => {
    return masterProjectsChecked.indexOf(project) > -1
  }
  const buildFirstRow = () => {
    const data: IFilterRow[] = [
      { value: '5 MINUTE', label: '5 min' },
      { value: '30 MINUTE', label: '30 min' },
      { value: '1 HOUR', label: 'Last 1 hour' },
      { value: '2 HOUR', label: 'Last 2 hours' },
      { value: '4 HOUR', label: 'Last 4 hours' },
      { value: '8 HOUR', label: 'Last 8 hours' },
      { value: '12 HOUR', label: 'Last 12 hours' },
      { value: '18 HOUR', label: 'Last 12 hours' },
      { value: '1 DAY', label: 'Last day' },
      { value: '7 DAY', label: 'Last week' },
      { value: '1 MONTH', label: 'Last month' },
      { value: '3 MONTH', label: 'Last three months' },
      { value: '6 MONTH', label: 'Last six months' },
      { value: '12 MONTH', label: 'Last year' },
    ]
    return data.map((item: IFilterRow, i: number) => (
      <Radio.Button value={item.value} key={item.value + i}>{item.label}</Radio.Button>
    ))
  }
  
  const onMasterProjectsCheckedChange = (checkedValues: string[]) => {
    setMasterProjectsChecked(checkedValues as string[])
    localStorage.setItem('masterProjectsChecked', JSON.stringify(checkedValues))
  };
  const dateRangeSelectedChange = (e: RadioChangeEvent) => {
    const checkedValues = e.target.value
    setDateRangeSelected(checkedValues as string)
    localStorage.setItem('dateRangeSelected', JSON.stringify(checkedValues))
  }

  const buildSecondRow = () => {
    return (
      <ConfigProvider
        button={{
          className: styles.linearGradientButton,
        }}
      >
        <Checkbox.Group value={masterProjectsChecked} onChange={onMasterProjectsCheckedChange}>
          <Flex wrap gap="small">
            {masterProjects.map((item: IFilterRow, i: number) => (
              <Button type={isSelected(item.value) ? "primary" : "default"} key={item.value + i}>
                <Checkbox className={styles.checkboxLabel} value={item.value}>{item.label}</Checkbox>
              </Button>
            ))}
          </Flex>
        </Checkbox.Group>
      </ConfigProvider>

    //   <ConfigProvider
    //   button={{
    //     className: styles.linearGradientButton,
    //   }}
    // >
    //   <Space>
    //     <Button type="primary" size="large">
    //       Gradient Button
    //     </Button>
    //     <Button size="large">Button</Button>
    //   </Space>
    // </ConfigProvider>
    )
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
            label: namespacedProjectName 
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
  useEffect(() => {
    setSharedFilter(dateRangeSelected)
  }, [dateRangeSelected]);

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
      <Flex vertical gap="middle">
      {/* size="small" */}
        <Radio.Group value={dateRangeSelected} onChange={dateRangeSelectedChange}> 
          {buildFirstRow()}
        </Radio.Group>
        <Radio.Group defaultValue="a">
          {buildSecondRow()}
        </Radio.Group>
      </Flex>
    </ConfigProvider>
  )
}

export default FilterPanel;
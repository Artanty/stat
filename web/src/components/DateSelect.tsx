import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DatePicker, Slider } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { INITIAL_DATE_RANGE2, useData } from '../services/store';

const { RangePicker } = DatePicker;
const DateRangePickerWithSlider: React.FC = () => {
  const { 
    eventsDateRange, 
    setEventsDateRange,
    eventsDateRangeTrigger,
    setEventsDateRangeTrigger,
    setSharedFilter
  } = useData()
  const [okCount, setOkCount] = useState(0);

  // 1-year range boundaries
  const { minDate, maxDate } = useMemo(() => ({
    minDate: dayjs().subtract(1, 'year').startOf('day'),
    maxDate: dayjs().endOf('day')
  }), []);

  // Load saved range from localStorage on initial render
  useEffect(() => {
    const savedRange = localStorage.getItem('dateRange2Selected');
    if (savedRange) {
      try {
        const [savedFrom, savedTo] = JSON.parse(savedRange);
        const fromDate = dayjs(savedFrom);
        const toDate = dayjs(savedTo);
        
        // Only use saved values if they're within our valid range
        if (fromDate.isValid() && toDate.isValid() &&
            fromDate >= minDate && toDate <= maxDate) {
          setEventsDateRange([fromDate, toDate]);

            if (eventsDateRangeTrigger === INITIAL_DATE_RANGE2) {
                setEventsDateRangeTrigger([fromDate, toDate])
            }
        }
      } catch (e) {
        console.error('Failed to parse saved date range', e);
      }
    }
  }, []);

  // Calculate slider marks and day count
  const { marks, dayCount } = useMemo(() => {
    const totalDays = maxDate.diff(minDate, 'days');
    const marks: Record<number, { label: string; style?: React.CSSProperties }> = {};
    
    // Add month marks
    let current = minDate.clone();
    while (current.isBefore(maxDate)) {
      const dayDiff = current.diff(minDate, 'days');
      marks[dayDiff] = {
        label: current.format('MMM'),
        style: current.isSame(dayjs(), 'month') ? { fontWeight: 'bold' } : {}
      };
      current = current.add(1, 'month');
    }

    // Add boundary labels
    marks[0] = { label: minDate.format('MMM YYYY'), style: { fontSize: 12 } };
    marks[totalDays] = { label: maxDate.format('MMM YYYY'), style: { fontSize: 12 } };

    return { marks, dayCount: totalDays };
  }, [minDate, maxDate]);

  // Convert dates to slider values
  const sliderValues = useMemo(() => [
    eventsDateRange[0].diff(minDate, 'days'),
    eventsDateRange[1].diff(minDate, 'days')
  ], [eventsDateRange, minDate]);

  // Stable event handlers
  const handleSliderChange = useCallback((values: [number, number]) => {
    setEventsDateRange([
      minDate.add(values[0], 'days'),
      minDate.add(values[1], 'days')
    ]);
  }, [minDate, setEventsDateRange]);

  const handlePickerChange = useCallback((newDates: [Dayjs | null, Dayjs | null] | null) => {
    if (!newDates || !newDates[0] || !newDates[1]) return;
    
    // Enforce 1-year max range
    if (newDates[1].diff(newDates[0], 'days') > 365) {
      setEventsDateRange([newDates[0], newDates[0].add(1, 'year')]);
    } else {
      setEventsDateRange([newDates[0], newDates[1]]);
    }
  }, [setEventsDateRange]);

  const onOkHandle = () => {
    setOkCount(prev => prev + 1)
  }

  useEffect(() => {
    if (okCount === 2) {
      const from = dayjs(eventsDateRange[0]).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const to = dayjs(eventsDateRange[1]).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      setEventsDateRangeTrigger([from, to])
      setOkCount(0)
      localStorage.setItem('dateRange2Selected', JSON.stringify([from, to]))
      localStorage.setItem('dateRangeSelected', JSON.stringify('CUSTOM'))
    }
  }, [okCount, eventsDateRange, setEventsDateRangeTrigger])

  const onOpenChangeHandle = (data: any) => {
    if (data === true) {
      setOkCount(0)
      setSharedFilter('CUSTOM')
    }
  }

  return (
    <RangePicker
      onOk={onOkHandle}
      onOpenChange={onOpenChangeHandle}
      needConfirm={true}
      value={eventsDateRange}
      onChange={handlePickerChange}
      style={{ width: 250 }}
      disabledDate={(current) => current < minDate || current > maxDate}
      renderExtraFooter={() => (
        <div style={{ padding: '10px 0', width: '100%' }}>
          <Slider
            range
            min={0}
            max={dayCount}
            value={sliderValues}
            marks={marks}
            onChange={handleSliderChange}
            tooltip={{
              formatter: (value) => 
                minDate.add(value || 0, 'days').format('MMM D, YYYY')
            }}
          />
        </div>
      )}
    />
  );
};

export default DateRangePickerWithSlider;
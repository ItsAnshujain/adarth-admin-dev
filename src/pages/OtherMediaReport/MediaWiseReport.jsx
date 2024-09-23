import { useMemo, useState } from 'react';
import { useBookingsNew } from '../../apis/queries/booking.queries';
import { useSearchParams } from 'react-router-dom';
import { Menu, Button } from '@mantine/core';
import classNames from 'classnames';
import DateRangeSelector from '../../components/DateRangeSelector';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  LogarithmicScale,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Table from '../../components/Table/Table';
import { useFetchMasters } from '../../apis/queries/masters.queries';
import { serialize } from '../../utils';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  LogarithmicScale,
);

const viewBy1 = {
  reset: '',
  past10Years: 'Past 10 Years',
  past5Years: 'Past 5 Years',
  previousYear: 'Previous Year',
  currentYear: 'Current Year',
  quarter: 'Quarterly',
  currentMonth: 'Current Month',
  past7: 'Past 7 Days',
  customDate: 'Custom Date Range',
};

const list1 = [
  { label: 'Past 10 Years', value: 'past10Years' },
  { label: 'Past 5 Years', value: 'past5Years' },
  { label: 'Previous Year', value: 'previousYear' },
  { label: 'Current Year', value: 'currentYear' },
  { label: 'Quarterly', value: 'quarter' },
  { label: 'Current Month', value: 'currentMonth' },
  { label: 'Past 7 Days', value: 'past7' },
  { label: 'Custom Date Range', value: 'customDate' },
];

const viewBy2 = {
  reset: '',
  mediaType: 'Media Type',
  category: 'Category',
};

const list2 = [
  { label: 'Media Type', value: 'mediaType' },
  { label: 'Category', value: 'category' },
];

const MediaWiseReport = () => {
  const [searchParams] = useSearchParams({
    page: 1,
    limit: 1000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data: bookingData } = useBookingsNew(searchParams.toString());

  const [filter, setFilter] = useState('');
  const [activeView, setActiveView] = useState('');
  const [secondFilter, setSecondFilter] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const today = new Date();
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(today.getMonth() - 3);

  const generateYearRange = (startYear, endYear) => {
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  const generatePast7Days = () => {
    const past7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      past7Days.push(`${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`);
    }
    return past7Days;
  };
  const currentYear = new Date().getFullYear();

  const transformedData = useMemo(() => {
    if (!bookingData || !secondFilter) return {};

    const past7DaysRange = generatePast7Days();
    const currentYear = new Date().getFullYear();

    const groupedData = bookingData.reduce((acc, booking) => {
      booking.details.forEach(detail => {
        const campaign = detail.campaign;
        if (!campaign || !campaign.spaces || !Array.isArray(campaign.spaces)) return;

        campaign.spaces.forEach(space => {
          const mediaType = space.basicInformation?.mediaType?.name;
          const category = space.basicInformation?.category?.[0]?.name;
          const date = new Date(detail.createdAt);
          const year = date.getFullYear();
          const month = date.toLocaleString('default', { month: 'short' });
          const day = date.getDate();
          const formattedDay = `${month} ${day}`; // Use formatted day for specific filters
          const revenue = booking.totalAmount;

          let timeUnit;
          // Filter-based time unit logic
          if (filter === 'past10Years' && year >= currentYear - 10 && year < currentYear) {
            timeUnit = year;
          } else if (filter === 'past5Years' && year >= currentYear - 5 && year < currentYear) {
            timeUnit = year;
          } else if (filter === 'previousYear' && year === currentYear - 1) {
            timeUnit = month;
          } else if (filter === 'currentYear' && year === currentYear) {
            timeUnit = month;
          } else if (
            filter === 'currentMonth' &&
            date.getMonth() === new Date().getMonth() &&
            year === currentYear
          ) {
            timeUnit = day;
          } else if (filter === 'past7' && past7DaysRange.includes(formattedDay)) {
            timeUnit = formattedDay; // Use day and month for past 7 days
          } else if (
            filter === 'customDate' &&
            date.getTime() >= new Date(startDate).getTime() &&
            date.getTime() <= new Date(endDate).getTime()
          ) {
            timeUnit = formattedDay; // Use day and month for custom date range
          } else if (filter === 'quarter') {
            // Assign quarter based on month
            const quarterly = Math.ceil((date.getMonth() + 1) / 3);
            timeUnit = `Q${quarterly}`;
          }

          if (!timeUnit) return;

          const groupKey = secondFilter === 'mediaType' ? mediaType : category;
          if (!groupKey) return;

          // Ensure structure for mediaType/category and timeUnit
          if (!acc[groupKey]) acc[groupKey] = {};
          if (!acc[groupKey][timeUnit]) acc[groupKey][timeUnit] = 0;

          acc[groupKey][timeUnit] += revenue; // Aggregate revenue
        });
      });
      return acc;
    }, {});

    return groupedData;
  }, [bookingData, filter, secondFilter, startDate, endDate]);
  const chartData = useMemo(() => {
    if (!transformedData || Object.keys(transformedData).length === 0) {
      return { labels: [], datasets: [] };
    }
  
    const labels = Object.keys(transformedData);
    const data = labels.map(key => {
      const revenueData = transformedData[key];
      let totalRevenue = 0;
  
      Object.keys(revenueData).forEach(timeUnit => {
        totalRevenue += revenueData[timeUnit] || 0;
      });
  
      return totalRevenue / 100000; // Convert to lakhs
    });
  
    // Check if all data points are zero
    if (data.every(value => value === 0)) {
      return { labels: [], datasets: [] }; // Return empty data if all are zero
    }
  
    const colors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
    ];
  
    const datasetColors = labels.map((_, index) => colors[index % colors.length]);
  
    return {
      labels,
      datasets: [
        {
          label: `Revenue by ${secondFilter === 'category' ? 'Category' : 'Media Type'}`,
          data,
          backgroundColor: datasetColors,
          borderColor: datasetColors.map(color => color.replace('1)', '0.8)')),
          borderWidth: 1,
        },
      ],
    };
  }, [transformedData, secondFilter, filter]);
 
  const chartOptions = useMemo(
    () => ({
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value + ' L';
            },
          },
          title: {
            display: true,
            text: 'Revenue (lac)',
          },
        },
      },
    }),
    [filter, transformedData, secondFilter],
  );

  const tableData = useMemo(() => {
    if (!transformedData || Object.keys(transformedData).length === 0) {
      return [{ [secondFilter === 'category' ? 'category' : 'mediaType']: 'No Data Available' }];
    }
  
    let timeUnits = [];
  
    if (filter === 'past10Years' || filter === 'past5Years') {
      timeUnits =
        filter === 'past10Years'
          ? generateYearRange(currentYear - 10, currentYear - 1)
          : generateYearRange(currentYear - 5, currentYear - 1);
    } else if (filter === 'previousYear' || filter === 'currentYear') {
      timeUnits = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
    } else if (filter === 'currentMonth') {
      const daysInMonth = new Date(currentYear, new Date().getMonth() + 1, 0).getDate();
      timeUnits = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    } else if (filter === 'past7') {
      const past7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleString('default', { month: 'short', day: 'numeric' });
      }).reverse();
      timeUnits = past7Days;
    } else if (filter === 'customDate' && startDate && endDate) {
      const customRangeDates = [];
      let currentDate = new Date(startDate);
      while (currentDate <= new Date(endDate)) {
        customRangeDates.push(
          currentDate.toLocaleString('default', { month: 'short', day: 'numeric' }),
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }
      timeUnits = customRangeDates;
    } else if (filter === 'quarter') {
      timeUnits = ['Q1', 'Q2', 'Q3', 'Q4'];
    }
  
    const tableRows = Object.keys(transformedData).map(key => {
      const row = { [secondFilter === 'category' ? 'category' : 'mediaType']: key };
      let totalForRow = 0;
  
      timeUnits.forEach(timeUnit => {
        const revenue = transformedData[key][timeUnit] || 0;
        row[timeUnit] = revenue > 0 ? (revenue / 100000).toFixed(2) : '-';
        totalForRow += revenue;
      });
  
      row['Grand Total'] = totalForRow > 0 ? (totalForRow / 100000).toFixed(2) : '-';
      return row;
    });
  
    if (tableRows.length === 0) {
      return [{ [secondFilter === 'category' ? 'category' : 'mediaType']: 'No Data Available' }];
    }
  
    const grandTotalRow = {
      [secondFilter === 'category' ? 'category' : 'mediaType']: 'Grand Total',
    };
    let overallTotal = 0;
  
    timeUnits.forEach(timeUnit => {
      const total = Object.keys(transformedData).reduce((sum, key) => {
        return sum + (transformedData[key][timeUnit] || 0);
      }, 0);
      grandTotalRow[timeUnit] = total > 0 ? (total / 100000).toFixed(2) : '-';
      overallTotal += total;
    });
  
    grandTotalRow['Grand Total'] = overallTotal > 0 ? (overallTotal / 100000).toFixed(2) : '-';
  
    return [...tableRows, grandTotalRow];
  }, [transformedData, secondFilter, filter, startDate, endDate]);
  

  const tableColumns = useMemo(() => {
    // Dynamic columns based on the current filter
    const dynamicColumns = [];

    if (filter === 'past10Years' || filter === 'past5Years') {
      const yearRange =
        filter === 'past10Years'
          ? generateYearRange(currentYear - 10, currentYear - 1)
          : generateYearRange(currentYear - 5, currentYear - 1);
      yearRange.forEach(year => {
        dynamicColumns.push({
          Header: year.toString(),
          accessor: year.toString(),
          disableSortBy: true,
        });
      });
    } else if (filter === 'previousYear' || filter === 'currentYear') {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      months.forEach(month => {
        dynamicColumns.push({
          Header: month,
          accessor: month,
          disableSortBy: true,
        });
      });
    } else if (filter === 'currentMonth') {
      const daysInMonth = new Date(currentYear, new Date().getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dynamicColumns.push({
          Header: i.toString(),
          accessor: i.toString(),
          disableSortBy: true,
        });
      }
    } else if (filter === 'past7') {
      const past7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleString('default', { month: 'short', day: 'numeric' });
      }).reverse();

      past7Days.forEach(day => {
        dynamicColumns.push({
          Header: day,
          accessor: day,
          disableSortBy: true,
        });
      });
    } else if (filter === 'customDate' && startDate && endDate) {
      const customRangeDates = [];
      let currentDate = new Date(startDate);
      while (currentDate <= new Date(endDate)) {
        customRangeDates.push(
          currentDate.toLocaleString('default', { month: 'short', day: 'numeric' }),
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }
      customRangeDates.forEach(date => {
        dynamicColumns.push({
          Header: date,
          accessor: date,
          disableSortBy: true,
        });
      });
    } else if (filter === 'quarter') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      quarters.forEach(quarter => {
        dynamicColumns.push({
          Header: quarter,
          accessor: quarter,
          disableSortBy: true,
        });
      });
    }

    return [
      {
        Header: secondFilter === 'mediaType' ? 'Media Type' : 'Category',
        accessor: secondFilter,
        disableSortBy: true,
      },
      ...dynamicColumns,
      {
        Header: 'Grand Total',
        accessor: 'Grand Total',
        disableSortBy: true,
      },
    ];
  }, [filter, currentYear, startDate, endDate, secondFilter]);

  
  const onDateChange = val => {
    setStartDate(val[0]);
    setEndDate(val[1]);
  };
  const handleReset = () => {
    setFilter('');
    setActiveView('');
    setSecondFilter('');
    setStartDate(null);
    setEndDate(null);
  };

  const handleMenuItemClick = value => {
    setFilter(value);
    setActiveView(value);
  };
  return (
    <div className="flex flex-col col-span-10 overflow-x-hidden">
      <div className="pt-6 w-[50rem] mx-10">
        <p className="font-bold ">Filtered Revenue Report</p>
        <p className="text-sm text-gray-600 italic py-4">
          This chart shows the filtered revenue data over different time periods.
        </p>
        <div className="flex">
          <div>
            <Menu shadow="md" width={130}>
              <Menu.Target>
                <Button className="secondary-button">
                  View By: {viewBy1[activeView] || 'Select'}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {list1.map(({ label, value }) => (
                  <Menu.Item
                    key={value}
                    onClick={() => handleMenuItemClick(value)}
                    className={classNames(activeView === value && 'text-purple-450 font-medium')}
                  >
                    {label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </div>
          <div className="mx-2">
            <Menu shadow="md" width={130}>
              <Menu.Target>
                <Button className="secondary-button">
                  View By: {viewBy2[secondFilter] || 'Select'}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {list2.map(({ label, value }) => (
                  <Menu.Item
                    key={value}
                    onClick={() => setSecondFilter(value)}
                    className={classNames(secondFilter === value && 'text-purple-450 font-medium')}
                  >
                    {label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </div>
          <div>
            {filter && (
              <Button onClick={handleReset} className="mx-2 secondary-button">
                Reset
              </Button>
            )}
          </div>
        </div>
        {filter === 'customDate' && (
          <div className="flex flex-col items-start space-y-4 py-2 ">
            <DateRangeSelector dateValue={[startDate, endDate]} onChange={onDateChange}  minDate={threeMonthsAgo}  // Set minimum date to 3 months ago
      maxDate={today} />
          </div>
        )}
      </div>

      <div className=" m-4 w-[42rem]">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="col-span-12 md:col-span-12 lg:col-span-10 border-gray-450 mx-10">
        <Table COLUMNS={tableColumns} data={tableData} />
      </div>
    </div>
  );
};

export default MediaWiseReport;

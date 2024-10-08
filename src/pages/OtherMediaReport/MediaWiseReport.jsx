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

const viewBy = {
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

const list = [
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

  const { data: bookingData2 } = useBookingsNew(searchParams.toString());

  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  
  const [startDate1, setStartDate1] = useState(null);
  const [endDate1, setEndDate1] = useState(null);
  const [filter4, setFilter4] = useState('');
  const [activeView4, setActiveView4] = useState('');
  const [secondFilter, setSecondFilter] = useState('');
  const generatePast7Days = () => {
    const past7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      past7Days.push(`${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`);
    }
    return past7Days;
  };
  const transformedData4 = useMemo(() => {
    if (!bookingData2 || !secondFilter) return {};

    const past7DaysRange = generatePast7Days(); // Ensure it returns dates in 'MM/DD/YYYY' format
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const fiscalStartMonth = 3; // Fiscal year starts in April (0-indexed)

    const groupedData = bookingData2.reduce((acc, booking) => {
      booking.details.forEach(detail => {
        const campaign = detail.campaign;
        if (!campaign || !campaign.spaces || !Array.isArray(campaign.spaces)) return;

        campaign.spaces.forEach(space => {
          const mediaType = space.basicInformation?.mediaType?.name;
          const category = space.basicInformation?.category?.[0]?.name;
          const date = new Date(detail.createdAt);
          const year = date.getFullYear();
          const month = date.getMonth(); // 0-indexed
          const day = date.getDate();
          const formattedDay = `${month + 1}/${day}`; // e.g., '4/5' for April 5
          const revenue = booking.totalAmount;

          let timeUnit;

          // Handle fiscal year and quarter logic
          const fiscalYear = month >= fiscalStartMonth ? year : year - 1; // Fiscal year starts in April
          const fiscalMonth = (month + 12 - fiscalStartMonth) % 12;
          const fiscalQuarter = Math.ceil((fiscalMonth + 1) / 3); // Quarterly calculation based on fiscal month

          if (
            filter4 === 'past10Years' &&
            fiscalYear >= currentYear - 10 &&
            fiscalYear < currentYear
          ) {
            timeUnit = fiscalYear;
          } else if (
            filter4 === 'past5Years' &&
            fiscalYear >= currentYear - 5 &&
            fiscalYear < currentYear
          ) {
            timeUnit = fiscalYear;
          } else if (filter4 === 'previousYear' && fiscalYear === currentYear - 1) {
            timeUnit = new Date(0, month).toLocaleString('default', { month: 'short' });
          } else if (filter4 === 'currentYear' && fiscalYear === currentYear) {
            timeUnit = new Date(0, month).toLocaleString('default', { month: 'short' });
          } else if (filter4 === 'currentMonth' && year === currentYear && month === currentMonth) {
            // Filter for current month
            timeUnit = day;
          } else if (filter4 === 'past7' && past7DaysRange.includes(date.toLocaleDateString())) {
            // Match bookings in the past 7 days
            timeUnit = formattedDay;
          } else if (
            filter4 === 'customDate' &&
            startDate1 &&
            endDate1 &&
            date.getTime() >= new Date(startDate1).setHours(0, 0, 0, 0) && // Start of the day for startDate1
            date.getTime() <= new Date(endDate1).setHours(23, 59, 59, 999) // End of the day for endDate1
          ) {
            // Match bookings in the custom date range
            timeUnit = formattedDay;
          } else if (filter4 === 'quarter' && fiscalYear === currentYear) {
            // Match bookings in the current fiscal year and group by quarter
            const quarterly = Math.ceil((date.getMonth() + 1) / 3);
            timeUnit = `Q${quarterly}`;
          }

          if (!timeUnit) return;

          const groupKey = secondFilter === 'mediaType' ? mediaType : category;
          if (!groupKey) return;

          if (!acc[groupKey]) acc[groupKey] = {};
          if (!acc[groupKey][timeUnit]) acc[groupKey][timeUnit] = 0;

          acc[groupKey][timeUnit] += revenue;
        });
      });
      return acc;
    }, {});

    return groupedData;
  }, [bookingData2, filter4, secondFilter, startDate1, endDate1]);

  const chartData4 = useMemo(() => {
    if (!transformedData4 || Object.keys(transformedData4).length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = Object.keys(transformedData4);
    const data = labels.map(key => {
      const revenueData = transformedData4[key];
      let totalRevenue = 0;

      Object.keys(revenueData).forEach(timeUnit => {
        totalRevenue += revenueData[timeUnit] || 0;
      });

      return totalRevenue / 100000; // Convert to lac
    });

    if (data.every(value => value === 0)) {
      return { labels: [], datasets: [] };
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
  }, [transformedData4, secondFilter, filter4]);

  const chartOptions4 = useMemo(
    () => ({
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value + ' L'; // Display as lac
            },
          },
          title: {
            display: true,
            text: 'Revenue (lac)',
          },
        },
      },
    }),
    [filter4, transformedData4, secondFilter],
  );

  const onDateChange4 = val => {
    setStartDate1(val[0]);
    setEndDate1(val[1]);
  };
  const handleReset4 = () => {
    setFilter4('');
    setActiveView4('');
    setSecondFilter('');
    setStartDate1(null);
    setEndDate1(null);
  };

  const handleMenuItemClick4 = value => {
    setFilter4(value);
    setActiveView4(value);
  };

  return (
      <div className="flex flex-col md:flex-row  w-[60rem] px-4">
        <div className="pt-6 w-[40rem]">
          <p className="font-bold ">Media Type / Category Wise Filtered Revenue Report</p>
          <p className="text-sm text-gray-600 italic py-4">
            This chart shows the filtered revenue data over different time periods.
          </p>
          <div className="flex">
            <div>
              <Menu shadow="md" width={130}>
                <Menu.Target>
                  <Button className="secondary-button">
                    View By: {viewBy[activeView4] || 'Select'}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {list.map(({ label, value }) => (
                    <Menu.Item
                      key={value}
                      onClick={() => handleMenuItemClick4(value)}
                      className={classNames(activeView4 === value && 'text-purple-450 font-medium')}
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
                      className={classNames(
                        secondFilter === value && 'text-purple-450 font-medium',
                      )}
                    >
                      {label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </div>
            <div>
              {filter4 && (
                <Button onClick={handleReset4} className="mx-2 secondary-button">
                  Reset
                </Button>
              )}
            </div>
          </div>
          {filter4 === 'customDate' && (
            <div className="flex flex-col items-start space-y-4 py-2 ">
              <DateRangeSelector
                dateValue={[startDate1, endDate1]}
                onChange={onDateChange4}
                minDate={threeMonthsAgo}
                maxDate={today}
              />
            </div>
          )}

          <div className=" my-4">
            <Bar data={chartData4} options={chartOptions4} />
          </div>
        </div>
        
      </div>
  );
};

export default MediaWiseReport;

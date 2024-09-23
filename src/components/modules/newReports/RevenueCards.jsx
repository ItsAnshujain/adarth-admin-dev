import { useEffect } from 'react';
import { Text, Image } from '@mantine/core';
import OngoingOrdersIcon from '../../../assets/ongoing-orders.svg';
import InitiateDiscussionIcon from '../../../assets/message-share.svg';
import { useSearchParams } from 'react-router-dom';
import { useBookings } from '../../../apis/queries/booking.queries';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween'; // Import the isBetween plugin
import advancedFormat from 'dayjs/plugin/advancedFormat'; // Optional: for better date formatting

dayjs.extend(isBetween); // Extend dayjs with the isBetween plugin
dayjs.extend(advancedFormat); // Optional: For advanced date formatting

const RevenueCards = () => {

  const [searchParams] = useSearchParams({
    page: 1,
    limit: 1000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const {
    data: bookingData,
    isLoading: isLoadingBookingData,
    error,
  } = useBookings(searchParams.toString());

  // Helper function to calculate MTD revenue and range
  const getMonthToDateRevenue = (bookings) => {
    const startOfMonth = dayjs().startOf('month');
    const endOfToday = dayjs().endOf('day');

    const filteredBookings = bookings.filter((booking) =>
      dayjs(booking.createdAt).isBetween(startOfMonth, endOfToday, null, '[]')
    );

    const totalRevenue = filteredBookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);

    return {
      totalRevenue,
      dateRange: `${startOfMonth.format('D MMM, YYYY')} - ${endOfToday.format('D MMM, YYYY')}`, // Date range
    };
  };

  // Helper function to calculate YTD revenue (from April 1st to today's date) and range
  const getYearToDateRevenue = (bookings) => {
    const startOfFinancialYear = dayjs().month(3).startOf('month'); // April (month 3 in dayjs)
    const endOfToday = dayjs().endOf('day');

    const filteredBookings = bookings.filter((booking) =>
      dayjs(booking.createdAt).isBetween(startOfFinancialYear, endOfToday, null, '[]')
    );

    const totalRevenue = filteredBookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);

    return {
      totalRevenue,
      dateRange: `${startOfFinancialYear.format('D MMM, YYYY')} - ${endOfToday.format('D MMM, YYYY')}`, // Date range
    };
  };

  const monthToDateData = bookingData ? getMonthToDateRevenue(bookingData.docs) : { totalRevenue: 0, dateRange: '' };
  const yearToDateData = bookingData ? getYearToDateRevenue(bookingData.docs) : { totalRevenue: 0, dateRange: '' };

  const cardData = [
    {
      title: 'Month to Date',
      data: {
        name: monthToDateData.dateRange || 'N/A', // Display the MTD date range
        value: (monthToDateData.totalRevenue/100000).toFixed(2) || 0,
        label: 'Revenue (lac)',
        icon: OngoingOrdersIcon,
        color: '#4C3BCF',
      },
    },
    {
      title: 'Year to Date',
      data: {
        name: yearToDateData.dateRange || 'N/A', // Display the YTD date range
        value: (yearToDateData.totalRevenue/100000).toFixed(2)  || 0,
        label: 'Revenue (lac)',
        icon: InitiateDiscussionIcon,
        color: '#FF7F3E',
      },
    },
  ];

  return (
    <div className="overflow-y-auto px-5 col-span-10 w-[65rem]">
      <p className="font-bold"> Revenue Cards</p>
      <p className="text-sm text-gray-600 italic py-4">
        This report shows total revenue Cards.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {cardData.map(({ title, data }) => (
          <div className="border rounded p-8 flex-1" key={title}>
            <Image src={data.icon} alt="icon" height={24} width={24} fit="contain" />
            <Text className="my-2 text-sm font-semibold ">{title}</Text>
            <Text size="xs" weight="400">
              ({data.name}) {/* Date range displayed here */}
            </Text>
            <Text size="sm" weight="200">
              {data.label}:{' '}
              <span className="font-bold" style={{ color: data.color }}>
                {' '}
                {data.value}
              </span>
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevenueCards;

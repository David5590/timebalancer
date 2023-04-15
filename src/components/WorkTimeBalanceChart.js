import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';
import PropTypes from 'prop-types';
import { useDarkMode } from '../hooks/useDarkMode';
import { format } from 'date-fns';

export const WorkTimeBalanceChart = ({ timeRange, dataPoints }) => {
  const chartRef = useRef(null);
  const darkmode = useDarkMode();
  console.log('dataPoints', dataPoints)

  const colors = {
    text: darkmode ? '#ffffff' : '#000000',
    grid: darkmode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    lineColor: darkmode ? '#ffffff' : '#000000',
    fillColor: darkmode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  useEffect(() => {
    if (chartRef && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Work Time Balance',
              data: dataPoints,
              borderColor: colors.lineColor,
              backgroundColor: colors.fillColor,
              pointBackgroundColor: colors.lineColor,
              pointBorderColor: colors.lineColor,
              pointStyle: false,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              adapters: {
                date: {
                  locale: enUS,
                },
              },
              time: {
                min: timeRange.start,
                max: timeRange.end,
                unit: 'hour',
                displayFormats: {
                  // hour: 'MMM d, h a', // Display format for hours
                  day: 'MMM', // Display format for days
                },
              },
              grid: {
                color: colors.grid,
              },
              ticks: {
                color: colors.text,
                callback: function (value, index, values) {
                  const dayFormat = 'MMM d';
                  const previousValue = index > 0 ? values[index - 1].value : null;
                  const currentValue = values[index].value;

                  const isNextDay = !previousValue || format(currentValue, dayFormat, { locale: enUS }) !== format(previousValue, dayFormat, { locale: enUS })

                  return format(currentValue, isNextDay ? 'MMM d, h a' : 'h a', { locale: enUS });

                },
              },
            },
            y: {
              grid: {
                color: colors.grid,
              },
              ticks: {
                color: colors.text,
              },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: colors.text,
              },
            },
            tooltip: {
              backgroundColor: darkmode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
              titleColor: colors.lineColor,
              bodyColor: colors.lineColor,
            },
          },
        }
      });

      return () => chart.destroy();
    }
  }, [chartRef, dataPoints, timeRange, darkmode]);

  return <canvas ref={chartRef}></canvas>;
};

WorkTimeBalanceChart.propTypes = {
  timeRange: PropTypes.shape({
    start: PropTypes.instanceOf(Date).isRequired,
    end: PropTypes.instanceOf(Date).isRequired,
  }).isRequired,
  dataPoints: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.instanceOf(Date).isRequired,
      y: PropTypes.number.isRequired,
    })
  ).isRequired,
};

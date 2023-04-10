import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale'; // Import the desired locale
import PropTypes from 'prop-types';
import useDarkMode from '../hooks/useDarkMode';

export const WorkTimeBalanceChart = ({ timeRange, dataPoints }) => {
  const chartRef = useRef(null);
  const darkMode = useDarkMode();

  const colors = {
    text: darkMode.value ? '#ffffff' : '#000000',
    grid: darkMode.value ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    lineColor: darkMode.value ? '#ffffff' : '#000000',
    fillColor: darkMode.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
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
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true, // Disable built-in responsiveness
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              adapters: {
                date: {
                  locale: enUS, // Use the imported locale here                },
                }
              },
              time: {
                min: timeRange.start,
                max: timeRange.end,
                unit: 'day',
                displayFormats: {
                  day: 'MMM d',
                },
              },
              grid: {
                color: colors.grid,
              },
              ticks: {
                color: colors.text,
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
              backgroundColor: darkMode.value ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
              titleColor: colors.lineColor,
              bodyColor: colors.lineColor,
            },
          },
        }
      });

      return () => chart.destroy();
    }
  }, [chartRef, dataPoints, timeRange]);

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


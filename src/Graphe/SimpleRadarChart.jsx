import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend , ResponsiveContainer } from 'recharts';

const SimpleRadarChart = ({ data }) => {
    return (
        <RadarChart cx="50%" cy="50%" outerRadius={90} width={700} height={300} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Tooltip />
            {/* <Legend /> */}
            <Radar name="Region Count" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
        </RadarChart>
    );
};

const SimpleRadarChart2 = ({ data }) => {
    return (
        <RadarChart cx="50%" cy="50%" outerRadius={180} width={700} height={600} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Tooltip />
            {/* <Legend /> */}
            <Radar name="Region Count" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
        </RadarChart>
    );
};


const SimpleRadarChart3 = ({ data = {} }) => {
    const chartData = Object.keys(data).map(year => ({
        year: year,
        count: data[year]
    }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius={100}>
        <PolarGrid  />
        <PolarAngleAxis dataKey="year" />
        {/* <Legend /> */}
        <Tooltip />
        <Radar name= "count" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export { SimpleRadarChart, SimpleRadarChart2, SimpleRadarChart3};
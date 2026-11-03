import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f0e', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

const PieChartWithCustomizedLabel = ({ data }) => {
    // Trier les données par valeur décroissante pour que la plus grande valeur soit en premier
    const sortedData = data.sort((a, b) => b.count - a.count);

    return (
        <PieChart width={500} height={300}>
            <Pie data={sortedData} cx="50%"  cy="50%"  startAngle={90} endAngle={-270} labelLine={false} outerRadius={90}  fill="#8884d8"  dataKey="count" label={({ name, count }) => `${name}: ${count}`}>
                {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Tooltip />
            {/* <Legend /> */}
        </PieChart>
    );
};

const PieChartWithCustomizedLabel2 = ({ data }) => {
    const sortedData = data.sort((a, b) => b.count - a.count);

    return (
        <PieChart width={700} height={700}>
            <Pie data={sortedData} cx="50%" cy="50%"  startAngle={90}  endAngle={-270} labelLine={false} outerRadius={180} fill="#8884d8" dataKey="count"  label={({ name, count }) => `${name}: ${count}`}>
                {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Tooltip />
        </PieChart>
    );
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
  const RADIAN = Math.PI / 180;
  
  // Position pour le pourcentage à l'intérieur du cercle
  const innerRadiusMid = innerRadius + (outerRadius - innerRadius) * 0.5;
  const xInner = cx + innerRadiusMid * Math.cos(-midAngle * RADIAN);
  const yInner = cy + innerRadiusMid * Math.sin(-midAngle * RADIAN);

  // Position pour le nom à l'extérieur du cercle
  const outerRadiusExtended = outerRadius + 20; // Ajustez cette valeur pour positionner le nom
  const xOuter = cx + outerRadiusExtended * Math.cos(-midAngle * RADIAN);
  const yOuter = cy + outerRadiusExtended * Math.sin(-midAngle * RADIAN);

  return (
    <g>
      {/* Étiquette pour le pourcentage à l'intérieur */}
      <text
        x={xInner}
        y={yInner}
        fill="white"
        textAnchor={xInner > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      {/* Étiquette pour le nom à l'extérieur */}
      <text
        x={xOuter}
        y={yOuter}
        fill="black"
        textAnchor={xOuter > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {name}
      </text>
    </g>
  );
};

const PieChartWithCustomizedLabel3 = ({ data = {} }) => {
  const chartData = Object.keys(data).map(key => ({
    name: key,
    value: data[key]
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          startAngle={90}
          endAngle={-270}
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={110}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
  };
  

export { PieChartWithCustomizedLabel, PieChartWithCustomizedLabel2, PieChartWithCustomizedLabel3 };

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SimpleBarChart = ({ data }) => (
    <BarChart width={1020} height={260} data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#8884d8" />
    </BarChart>
);

const SimpleBarChart2 = ({ data }) => (
    <BarChart width={1020} height={450} data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#8884d8" />
    </BarChart>
);

const SimpleBarChart3 = ({ data = {} }) => {
    const chartData = Object.keys(data).map(year => ({
        year: year,
        count: data[year]
    }));

    return (
        <ResponsiveContainer width="100%" height={270}>
            <BarChart width={1020} height={260}  data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                {/* <Legend /> */}
                <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export { SimpleBarChart, SimpleBarChart2, SimpleBarChart3 };

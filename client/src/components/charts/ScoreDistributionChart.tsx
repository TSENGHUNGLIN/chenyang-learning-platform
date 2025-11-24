import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreDistributionData {
  range: string;
  count: number;
  percentage: number;
}

interface ScoreDistributionChartProps {
  data: ScoreDistributionData[];
  title?: string;
  description?: string;
}

const COLORS = [
  'hsl(0, 70%, 50%)',    // 0-59: 紅色
  'hsl(30, 70%, 50%)',   // 60-69: 橙色
  'hsl(45, 70%, 50%)',   // 70-79: 黃色
  'hsl(120, 50%, 50%)',  // 80-89: 綠色
  'hsl(210, 70%, 50%)',  // 90-100: 藍色
];

export default function ScoreDistributionChart({ 
  data, 
  title = "分數分布圖",
  description = "各分數區間的人數統計" 
}: ScoreDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="range" 
              className="text-xs"
              label={{ value: '分數區間', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              className="text-xs"
              label={{ value: '人數', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string, props: any) => {
                const percentage = props.payload.percentage;
                return [`${value} 人 (${percentage.toFixed(1)}%)`, '人數'];
              }}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              name="人數"
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

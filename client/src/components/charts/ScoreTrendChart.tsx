import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreTrendData {
  examTitle: string;
  score: number;
  date: string;
}

interface ScoreTrendChartProps {
  data: ScoreTrendData[];
  title?: string;
  description?: string;
}

export default function ScoreTrendChart({ 
  data, 
  title = "成績趨勢分析",
  description = "考生歷次考試成績變化" 
}: ScoreTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="examTitle" 
              className="text-xs"
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              domain={[0, 100]} 
              className="text-xs"
              label={{ value: '分數 (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`${value}%`, '分數']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              name="考試分數"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

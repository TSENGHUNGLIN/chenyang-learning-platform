import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AbilityData {
  category: string;
  score: number;
  fullMark: number;
}

interface AbilityRadarChartProps {
  data: AbilityData[];
  title?: string;
  description?: string;
}

export default function AbilityRadarChart({ 
  data, 
  title = "能力維度分析",
  description = "各知識領域的掌握程度" 
}: AbilityRadarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320} className="sm:h-[400px]">
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="category" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Radar 
              name="得分率" 
              dataKey="score" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))" 
              fillOpacity={0.6}
              strokeWidth={2}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`${value}%`, '得分率']}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

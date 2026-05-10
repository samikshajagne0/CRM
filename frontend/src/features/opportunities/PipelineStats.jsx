import React from 'react';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/formatters';

export default function PipelineStats({ opportunities = [] }) {
  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value || 0), 0);
  const weightedValue = opportunities.reduce((sum, opp) => {
    const prob = Number(opp.probability || 0) / 100;
    return sum + (Number(opp.value || 0) * prob);
  }, 0);
  
  const count = opportunities.length;
  const avgProbability = count > 0 
    ? Math.round(opportunities.reduce((sum, opp) => sum + Number(opp.probability || 0), 0) / count) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none">
        <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1">Gross Pipeline</p>
        <p className="text-white text-2xl font-semibold">{formatCurrency(totalValue)}</p>
      </Card>
      
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-none">
        <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1">Weighted Forecast</p>
        <p className="text-white text-2xl font-semibold">{formatCurrency(weightedValue)}</p>
      </Card>
      
      <Card className="bg-white border-[var(--color-border)]">
        <p className="text-[var(--color-text-muted)] text-[11px] font-medium uppercase tracking-wider mb-1">Total Deals</p>
        <p className="text-[var(--color-text-primary)] text-2xl font-semibold">{count}</p>
      </Card>
      
      <Card className="bg-white border-[var(--color-border)]">
        <p className="text-[var(--color-text-muted)] text-[11px] font-medium uppercase tracking-wider mb-1">Avg. Probability</p>
        <p className="text-[var(--color-text-primary)] text-2xl font-semibold">{avgProbability}%</p>
      </Card>
    </div>
  );
}

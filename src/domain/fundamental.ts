import type { DataStamp } from './quote';

export interface FundamentalSnapshot extends DataStamp {
  symbol: string;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  eps: number | null;
  marketCap?: number | null;
  monthlyRevenue?: number | null;
  revenueYoY?: number | null;
  revenueMoM?: number | null;
}

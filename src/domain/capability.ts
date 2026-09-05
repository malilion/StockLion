export type Capability =
  | 'symbol:list'
  | 'quote:eod'
  | 'quote:realtime'
  | 'chart:daily'
  | 'chart:intraday'
  | 'fundamental:valuation'
  | 'fundamental:revenue'
  | 'institutional:daily'
  | 'market:attention'
  | 'market:disposition'
  | 'radar:eod'
  | 'ai:summary';

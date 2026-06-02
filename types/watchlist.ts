// types/watchlist.ts
export interface AlertLog {
  id:      string
  type:    'low' | 'high'
  current: number
  low:     number
  high:    number
  time:    string
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(value: number | null | undefined, decimals = 3): string {
  if (value == null) return '—'
  return value.toLocaleString('fr-TN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatMarketCap(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Md`
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)} M`
  if (value >= 1_000)         return `${(value / 1_000).toFixed(0)} K`
  return value.toString()
}

export function calcGain(entry: number, target: number): number {
  return ((target - entry) / entry) * 100
}

export function calcLoss(entry: number, stop: number): number {
  return ((entry - stop) / entry) * 100
}

export function calcRiskReward(entry: number, target: number, stop: number): number | null {
  if (stop >= entry || target <= entry) return null
  return (target - entry) / (entry - stop)
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let timeout: ReturnType<typeof setTimeout>
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), ms)
  }
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

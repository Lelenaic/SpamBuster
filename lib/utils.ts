import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function formatCostShort(cost: number): string {
  if (cost === 0) return '0'
  
  // Round to 4 decimal places and remove trailing zeros
  return (Math.round(cost * 10000) / 10000).toFixed(4).replace(/\.?0+$/, '')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DateFormat = 'american' | 'european' | 'iso' | 'short' | 'verbose' | 'custom'

export function formatDate(date: Date | string, format: DateFormat = 'american', customFormat?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  switch (format) {
    case 'american':
      // MM/DD/YYYY
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
    case 'european':
      // DD/MM/YYYY
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    case 'iso':
      // YYYY-MM-DD
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    case 'short':
      // MM/DD/YY
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${String(year).slice(-2)}`
    case 'verbose':
      // Month DD, YYYY
      return `${monthNames[month - 1]} ${day}, ${year}`
    case 'custom':
      // Custom format using placeholders
      if (!customFormat) {
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
      }
      const hours = d.getHours()
      const minutes = d.getMinutes()
      const seconds = d.getSeconds()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return customFormat
        .replace(/\{YYYY\}/g, String(year))
        .replace(/\{YY\}/g, String(year).slice(-2))
        .replace(/\{MMMM\}/g, monthNames[month - 1])
        .replace(/\{MM\}/g, String(month).padStart(2, '0'))
        .replace(/\{M\}/g, String(month))
        .replace(/\{DD\}/g, String(day).padStart(2, '0'))
        .replace(/\{D\}/g, String(day))
        .replace(/\{HH\}/g, String(hours).padStart(2, '0'))
        .replace(/\{H\}/g, String(hours))
        .replace(/\{hh\}/g, String(displayHours).padStart(2, '0'))
        .replace(/\{h\}/g, String(displayHours))
        .replace(/\{mm\}/g, String(minutes).padStart(2, '0'))
        .replace(/\{m\}/g, String(minutes))
        .replace(/\{ss\}/g, String(seconds).padStart(2, '0'))
        .replace(/\{s\}/g, String(seconds))
        .replace(/\{A\}/g, ampm)
    default:
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
  }
}

export function formatDateTime(date: Date | string, format: DateFormat = 'iso', customFormat?: string, timeFormat: '12h' | '24h' = '12h'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateStr = formatDate(d, format, customFormat)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = d.getSeconds()
  
  let timeStr: string
  if (timeFormat === '24h') {
    timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } else {
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    timeStr = `${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`
  }
  
  return `${dateStr} ${timeStr}`
}

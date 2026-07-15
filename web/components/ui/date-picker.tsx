'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  className?: string
  placeholder?: string
  dateFormat?: string
  customDateFormat?: string
  fromDate?: Date
}

export function DatePicker({
  date,
  onDateChange,
  className,
  placeholder = 'Select date',
  dateFormat = 'iso',
  customDateFormat = '{YYYY}-{MM}-{DD}',
  fromDate
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Format date for display
  const formatDateForDisplay = (d: Date | undefined) => {
    if (!d) return ''
    const dateObj = d instanceof Date ? d : new Date(d)
    
    switch (dateFormat) {
      case 'american':
        return format(dateObj, 'MM/dd/yyyy')
      case 'european':
        return format(dateObj, 'dd/MM/yyyy')
      case 'iso':
        return format(dateObj, 'yyyy-MM-dd')
      case 'short':
        return format(dateObj, 'MMM d, yyyy')
      case 'verbose':
        return format(dateObj, 'EEEE, MMMM d, yyyy')
      case 'custom':
        // Parse custom format placeholders
        const formatted = customDateFormat
          .replace('{YYYY}', String(dateObj.getFullYear()))
          .replace('{MM}', String(dateObj.getMonth() + 1).padStart(2, '0'))
          .replace('{DD}', String(dateObj.getDate()).padStart(2, '0'))
          .replace('{Month}', dateObj.toLocaleString('default', { month: 'long' }))
          .replace('{Day}', dateObj.toLocaleString('default', { weekday: 'long' }))
        return formatted
      default:
        return format(dateObj, 'yyyy-MM-dd')
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-[180px] justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateForDisplay(date) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange(selectedDate)
            setIsOpen(false)
          }}
          initialFocus
          disabled={fromDate ? [{ before: fromDate }] : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}

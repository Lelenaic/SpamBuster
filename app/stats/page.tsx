'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { formatCostShort, formatDate, formatDateTime } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, DollarSign, Mail, AlertTriangle, CheckCircle, ArrowUpDown, Filter } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
)

interface AnalyzedEmail {
  id: string
  emailId: string
  subject: string
  sender: string
  score: number
  reasoning: string
  analyzedAt: string
  accountId: string
  isSpam: boolean
  manualOverride?: boolean
  manualIsSpam?: boolean
  cost?: number
  aiProvider?: 'openrouter' | 'ollama'
}

type DateRange = 'today' | '7days' | '30days' | 'custom'
type Grouping = 'day' | 'week' | 'month'
type SortColumn = 'score' | 'cost' | 'analyzedAt' | 'subject' | 'sender'
type SortDirection = 'asc' | 'desc'

type FilterType = 'ALL' | 'SPAM' | 'HAM'

interface GroupData {
  cost: number
  spam: number
  ham: number
  total: number
}

interface GroupedData {
  [key: string]: GroupData
}

const ITEMS_PER_PAGE = 20

function TruncatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const checkTruncated = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }

    checkTruncated()
    window.addEventListener('resize', checkTruncated)
    return () => window.removeEventListener('resize', checkTruncated)
  }, [text])

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span ref={ref} className={`block truncate ${className || ''}`}>
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return <span ref={ref} className={`block truncate ${className || ''}`}>{text}</span>
}

export default function StatsPage() {
  const [analyzedEmails, setAnalyzedEmails] = useState<AnalyzedEmail[]>([])
  const [dateRange, setDateRange] = useState<DateRange>('7days')
  const [grouping, setGrouping] = useState<Grouping>('day')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<SortColumn>('analyzedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [dateFormat, setDateFormat] = useState<string>('iso')
  const [customDateFormat, setCustomDateFormat] = useState<string>('')
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h')
  const [emailFilter, setEmailFilter] = useState<FilterType>('ALL')

  // Load analyzed emails and date format
  useEffect(() => {
    if (typeof window !== 'undefined' && window.analyzedEmailsAPI) {
      window.analyzedEmailsAPI.getAll().then((emails) => setAnalyzedEmails(emails as AnalyzedEmail[]))
    }
    if (typeof window !== 'undefined' && window.generalAPI) {
      window.generalAPI.getDateFormat().then(setDateFormat)
      window.generalAPI.getCustomDateFormat().then(setCustomDateFormat)
      window.generalAPI.getTimeFormat().then(setTimeFormat)
    }
  }, [])

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    setCurrentPage(1)
    if (range === 'custom') return

    const now = new Date()
    const end = new Date(now)
    const start = new Date(now)

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case '7days':
        start.setDate(now.getDate() - 7)
        break
      case '30days':
        start.setDate(now.getDate() - 30)
        break
    }

    // Use Date objects
    setStartDate(start)
    setEndDate(end)
  }

  // Handle sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Helper to get effective spam status (considering manual overrides)
  const getEffectiveIsSpam = (email: AnalyzedEmail): boolean => {
    if (email.manualOverride) {
      return email.manualIsSpam ?? email.isSpam
    }
    return email.isSpam
  }

  // Filter emails by date range and classification filter
  const filteredEmails = useMemo(() => {
    let emails = analyzedEmails

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      emails = emails.filter(email => {
        const emailDate = new Date(email.analyzedAt)
        return emailDate >= start && emailDate <= end
      })
    }

    // Filter by classification
    if (emailFilter !== 'ALL') {
      emails = emails.filter(email => {
        const effectiveIsSpam = getEffectiveIsSpam(email)
        if (emailFilter === 'SPAM') return effectiveIsSpam
        if (emailFilter === 'HAM') return !effectiveIsSpam
        return true
      })
    }

    return emails
  }, [analyzedEmails, startDate, endDate, emailFilter])

  // Sort emails
  const sortedEmails = useMemo(() => {
    return [...filteredEmails].sort((a, b) => {
      let aVal: string | number, bVal: string | number

      switch (sortColumn) {
        case 'score':
          aVal = a.score
          bVal = b.score
          break
        case 'cost':
          aVal = a.cost || 0
          bVal = b.cost || 0
          break
        case 'analyzedAt':
          aVal = new Date(a.analyzedAt).getTime()
          bVal = new Date(b.analyzedAt).getTime()
          break
        case 'subject':
          aVal = a.subject.toLowerCase()
          bVal = b.subject.toLowerCase()
          break
        case 'sender':
          aVal = a.sender.toLowerCase()
          bVal = b.sender.toLowerCase()
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredEmails, sortColumn, sortDirection])

  // Paginate emails
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedEmails.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedEmails, currentPage])

  const totalPages = Math.ceil(sortedEmails.length / ITEMS_PER_PAGE)

  // Group data by time period
  const groupedData = useMemo<GroupedData>(() => {
    const groups: GroupedData = {}

    filteredEmails.forEach(email => {
      const date = new Date(email.analyzedAt)
      let key: string

      switch (grouping) {
        case 'week':
          // Get start of week (local timezone)
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          // Format as local date string YYYY-MM-DD
          key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default: // day - use local timezone date
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      }

      if (!groups[key]) {
        groups[key] = { cost: 0, spam: 0, ham: 0, total: 0 }
      }

      groups[key].cost += email.cost || 0
      groups[key].total++
      if (email.isSpam) {
        groups[key].spam++
      } else {
        groups[key].ham++
      }
    })

    // Sort by date
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
    const sortedGroups: GroupedData = {}
    sortedEntries.forEach(([key, value]) => {
      sortedGroups[key] = value
    })
    return sortedGroups
  }, [filteredEmails, grouping])

  // Calculate totals
  const totals = useMemo(() => {
    return filteredEmails.reduce((acc, email) => ({
      cost: acc.cost + (email.cost || 0),
      spam: acc.spam + (email.isSpam ? 1 : 0),
      ham: acc.ham + (email.isSpam ? 0 : 1),
      total: acc.total + 1
    }), { cost: 0, spam: 0, ham: 0, total: 0 })
  }, [filteredEmails])

  // Chart data for spending
  const spendingChartData = useMemo(() => ({
    labels: Object.keys(groupedData).map(key => {
      // Parse the key back to a date and format it
      const date = new Date(key)
      return formatDate(date, dateFormat as 'american' | 'european' | 'iso' | 'short' | 'verbose' | 'custom', customDateFormat)
    }),
    datasets: [
      {
        label: 'Spending (USD)',
        data: Object.values(groupedData).map((g: GroupData) => g.cost),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
      }
    ]
  }), [groupedData, dateFormat, customDateFormat])

  // Chart data for SPAM/HAM
  const spamHamChartData = useMemo(() => ({
    labels: Object.keys(groupedData).map(key => {
      // Parse the key back to a date and format it
      const date = new Date(key)
      return formatDate(date, dateFormat as 'american' | 'european' | 'iso' | 'short' | 'verbose' | 'custom', customDateFormat)
    }),
    datasets: [
      {
        label: 'SPAM',
        data: Object.values(groupedData).map((g: GroupData) => g.spam),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: 'HAM',
        data: Object.values(groupedData).map((g: GroupData) => g.ham),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      }
    ]
  }), [groupedData, dateFormat, customDateFormat])

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Statistics</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-2xl font-bold cursor-help">${formatCostShort(totals.cost)}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unrounded amount: ${totals.cost.toFixed(10)}</p>
                </TooltipContent>
              </Tooltip>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" /> Total Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" /> SPAM Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{totals.spam}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 text-green-500">
              <CheckCircle className="h-4 w-4" /> HAM (Legitimate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{totals.ham}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 items-end">
            {/* Date Filter - Left side */}
            <div className="flex flex-col gap-2 min-w-[200px]">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <CalendarIcon className="h-4 w-4" /> Date Filter
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Group By</Label>
                  <Select value={grouping} onValueChange={(v) => setGrouping(v as Grouping)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select grouping" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dateRange === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <DatePicker
                        date={startDate}
                        onDateChange={setStartDate}
                        dateFormat={dateFormat as 'american' | 'european' | 'iso' | 'short' | 'verbose' | 'custom'}
                        customDateFormat={customDateFormat}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <DatePicker
                        date={endDate}
                        onDateChange={setEndDate}
                        dateFormat={dateFormat as 'american' | 'european' | 'iso' | 'short' | 'verbose' | 'custom'}
                        customDateFormat={customDateFormat}
                        fromDate={startDate}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Separator */}
            <div className="hidden lg:block w-px h-12 bg-border" />
            
            {/* Mail Filter - Right side */}
            <div className="flex flex-col gap-2 min-w-[200px]">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Mail className="h-4 w-4" /> Mail Filter
              </div>
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                <Button
                  size="sm"
                  variant={emailFilter === 'ALL' ? 'default' : 'ghost'}
                  onClick={() => setEmailFilter('ALL')}
                >
                  All ({analyzedEmails.length})
                </Button>
                <Button
                  size="sm"
                  variant={emailFilter === 'SPAM' ? 'destructive' : 'ghost'}
                  className={emailFilter === 'SPAM' ? '' : 'text-red-500 hover:text-red-600 hover:bg-red-50/50'}
                  onClick={() => setEmailFilter('SPAM')}
                >
                  Spam ({analyzedEmails.filter(e => getEffectiveIsSpam(e)).length})
                </Button>
                <Button
                  size="sm"
                  variant={emailFilter === 'HAM' ? 'default' : 'ghost'}
                  className={cn(
                    emailFilter === 'HAM' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/50'
                  )}
                  onClick={() => setEmailFilter('HAM')}
                >
                  Ham ({analyzedEmails.filter(e => !getEffectiveIsSpam(e)).length})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={spendingChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SPAM vs HAM Quantities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={spamHamChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analyzed Emails ({sortedEmails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEmails.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No emails found in the selected date range.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('analyzedAt')}>
                        <div className="flex items-center gap-1">Date <ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('subject')}>
                        <div className="flex items-center gap-1">Subject <ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('sender')}>
                        <div className="flex items-center gap-1">Sender <ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('score')}>
                        <div className="flex items-center justify-center gap-1">Score <ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      <TableHead className="text-center">Classification</TableHead>
                      <TableHead className="text-center">Provider</TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('cost')}>
                        <div className="flex items-center justify-end gap-1">Cost <ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell className="whitespace-nowrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                {formatDate(email.analyzedAt, dateFormat as 'american' | 'european' | 'iso' | 'short' | 'verbose' | 'custom', customDateFormat)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{formatDateTime(email.analyzedAt, dateFormat as 'american' | 'european' | 'iso' | 'short' | 'verbose' | 'custom', customDateFormat, timeFormat)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          <TruncatedText text={email.subject} className="block" />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <TruncatedText text={email.sender} className="block" />
                        </TableCell>
                        <TableCell className="text-center">{email.score}/10</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={email.isSpam ? "destructive" : "default"} className={email.isSpam ? "bg-red-500" : "bg-green-500"}>
                            {email.isSpam ? "SPAM" : "HAM"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={email.aiProvider === 'ollama' ? "secondary" : "outline"}>
                            {email.aiProvider === 'ollama' ? 'Ollama' : 'OpenRouter'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${(email.cost || 0).toFixed(10)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Page {currentPage} of {totalPages} ({sortedEmails.length} total emails)
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import './DateRangePicker.css'

interface DateRangePickerProps {
  start: string
  end: string
  onChange: (range: { start: string; end: string }) => void
}

function DateRangePicker({ start, end, onChange }: DateRangePickerProps) {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ start: e.target.value, end })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ start, end: e.target.value })
  }

  return (
    <div className="date-range-picker">
      <label>期間:</label>
      <input
        type="date"
        value={start}
        onChange={handleStartChange}
        className="date-input"
      />
      <span className="date-separator">〜</span>
      <input
        type="date"
        value={end}
        onChange={handleEndChange}
        className="date-input"
      />
    </div>
  )
}

export default DateRangePicker


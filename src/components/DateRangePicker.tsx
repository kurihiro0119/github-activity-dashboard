import { useState, useEffect } from "react";
import "./DateRangePicker.css";

interface DateRangePickerProps {
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
}

function DateRangePicker({ start, end, onChange }: DateRangePickerProps) {
  const [tempStart, setTempStart] = useState(start);
  const [tempEnd, setTempEnd] = useState(end);

  useEffect(() => {
    setTempStart(start);
    setTempEnd(end);
  }, [start, end]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempStart(e.target.value);
  };

  const handleStartBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value !== start) {
      onChange({ start: e.target.value, end });
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempEnd(e.target.value);
  };

  const handleEndBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value !== end) {
      onChange({ start, end: e.target.value });
    }
  };

  return (
    <div className="date-range-picker">
      <label>期間:</label>
      <input
        type="date"
        value={tempStart}
        onChange={handleStartChange}
        onBlur={handleStartBlur}
        className="date-input"
      />
      <span className="date-separator">〜</span>
      <input
        type="date"
        value={tempEnd}
        onChange={handleEndChange}
        onBlur={handleEndBlur}
        className="date-input"
      />
    </div>
  );
}

export default DateRangePicker;

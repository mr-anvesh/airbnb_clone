'use client';

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  isSameDay,
  isWithinInterval,
  isToday,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  checkIn: string;   // YYYY-MM-DD or ''
  checkOut: string;  // YYYY-MM-DD or ''
  onChange: (checkIn: string, checkOut: string) => void;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  try { return parseISO(s); } catch { return null; }
}

function formatISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export default function DateRangePicker({ checkIn, checkOut, onChange }: Props) {
  const today = new Date();
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(today));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const ciDate = parseDate(checkIn);
  const coDate = parseDate(checkOut);
  const rightMonth = addMonths(leftMonth, 1);

  const prevMonth = () => setLeftMonth(m => subMonths(m, 1));
  const nextMonth = () => setLeftMonth(m => addMonths(m, 1));

  // Selection phase: if checkIn set but no checkOut, we're picking checkOut
  const selecting = !!ciDate && !coDate;

  const handleDayClick = (day: Date) => {
    if (isBefore(day, today) && !isToday(day)) return;

    if (!ciDate || (ciDate && coDate)) {
      // Start fresh: set checkIn, clear checkOut
      onChange(formatISO(day), '');
    } else {
      // ciDate is set, no coDate — pick checkOut
      if (isBefore(day, ciDate) || isSameDay(day, ciDate)) {
        // Clicked before or on checkIn: start over
        onChange(formatISO(day), '');
      } else {
        onChange(checkIn, formatISO(day));
      }
    }
  };

  const isInRange = (day: Date): boolean => {
    if (ciDate && coDate) {
      return isWithinInterval(day, { start: ciDate, end: coDate }) &&
        !isSameDay(day, ciDate) && !isSameDay(day, coDate);
    }
    if (ciDate && selecting && hoverDate && isAfter(hoverDate, ciDate)) {
      return isWithinInterval(day, { start: ciDate, end: hoverDate }) &&
        !isSameDay(day, ciDate) && !isSameDay(day, hoverDate);
    }
    return false;
  };

  const isRangeEnd = (day: Date): boolean => {
    if (coDate && isSameDay(day, coDate)) return true;
    if (selecting && hoverDate && isSameDay(day, hoverDate) && isAfter(hoverDate, ciDate!)) return true;
    return false;
  };

  const isRangeStart = (day: Date): boolean => !!ciDate && isSameDay(day, ciDate);

  const isPast = (day: Date): boolean => isBefore(day, today) && !isToday(day);

  const clearDates = () => onChange('', '');

  return (
    <div className="select-none">
      {/* Instruction */}
      <p className="text-xs text-center text-[#6a6a6a] dark:text-[#a8a8a8] mb-3 font-medium">
        {!ciDate
          ? 'Select check-in date'
          : !coDate
          ? 'Select check-out date'
          : `${format(ciDate, 'MMM d')} – ${format(coDate!, 'MMM d, yyyy')}`}
      </p>

      {/* Two-month grid — one month on mobile, two on sm+ */}
      <div className="flex flex-col sm:flex-row gap-6">
        {[leftMonth, rightMonth].map((monthStart, idx) => {
          const monthEnd = endOfMonth(monthStart);
          const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
          const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
          const days = eachDayOfInterval({ start: calStart, end: calEnd });

          return (
            <div key={idx} className={`flex-1 min-w-0 ${idx === 1 ? 'hidden sm:block' : ''}`}>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                {idx === 0 ? (
                  <button
                    onClick={prevMonth}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#2c2c2c] transition-colors text-[#222222] dark:text-[#f2f2f2]"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : <div className="w-7" />}


                <span className="text-sm font-semibold text-[#222222] dark:text-[#f2f2f2]">
                  {format(monthStart, 'MMMM yyyy')}
                </span>

                {/* Always show next on left month (mobile has no right month) */}
                {(idx === 1 || idx === 0) ? (
                  <button
                    onClick={nextMonth}
                    className={`w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#2c2c2c] transition-colors text-[#222222] dark:text-[#f2f2f2] ${idx === 0 ? 'sm:hidden' : ''}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                ) : <div className="w-7" />}
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-[10px] font-semibold text-[#6a6a6a] dark:text-[#a8a8a8] text-center py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {days.map((day, di) => {
                  const inMonth = day >= startOfMonth(monthStart) && day <= monthEnd;
                  const past = isPast(day);
                  const start = isRangeStart(day);
                  const end = isRangeEnd(day);
                  const inRange = isInRange(day);
                  const todayMark = isToday(day);

                  // Range bar bg: extends across the full cell width
                  const rangeBarLeft = (start && (coDate || (selecting && hoverDate && isAfter(hoverDate, ciDate!))));
                  const rangeBarRight = end && ciDate;

                  return (
                    <div
                      key={di}
                      className={`relative flex items-center justify-center ${inRange ? 'bg-[#f7f7f7] dark:bg-[#2c2c2c]' : ''} ${rangeBarLeft ? 'bg-[#f7f7f7] dark:bg-[#2c2c2c] rounded-r-none' : ''} ${rangeBarRight ? 'bg-[#f7f7f7] dark:bg-[#2c2c2c] rounded-l-none' : ''}`}
                    >
                      <button
                        disabled={past || !inMonth}
                        onClick={() => inMonth && !past && handleDayClick(day)}
                        onMouseEnter={() => selecting && !past && inMonth && setHoverDate(day)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={`
                          relative w-9 h-9 flex items-center justify-center text-sm rounded-full transition-colors z-10
                          ${!inMonth ? 'opacity-0 pointer-events-none' : ''}
                          ${past && inMonth ? 'text-[#b0b0b0] dark:text-[#5a5a5a] cursor-not-allowed line-through' : ''}
                          ${start || end
                            ? 'bg-[#222222] dark:bg-[#f2f2f2] text-white dark:text-[#222222] font-semibold'
                            : !past && inMonth
                            ? 'text-[#222222] dark:text-[#f2f2f2] hover:bg-[#e8e8e8] dark:hover:bg-[#3a3a3a]'
                            : ''}
                          ${todayMark && !start && !end ? 'font-semibold underline decoration-[#ff385c] underline-offset-2' : ''}
                        `}
                      >
                        {inMonth ? format(day, 'd') : ''}
                      </button>
                      {/* Range connector bar (half-width behind the selected dot) */}
                      {(start && rangeBarLeft) && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-9 bg-[#f7f7f7] dark:bg-[#2c2c2c] -z-0" />
                      )}
                      {end && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-9 bg-[#f7f7f7] dark:bg-[#2c2c2c] -z-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {(ciDate || coDate) && (
        <div className="flex justify-end mt-3 pt-3 border-t border-[#ebebeb] dark:border-[#2d2d2d]">
          <button
            onClick={clearDates}
            className="text-xs font-semibold text-[#222222] dark:text-[#f2f2f2] underline hover:no-underline transition-all"
          >
            Clear dates
          </button>
        </div>
      )}
    </div>
  );
}

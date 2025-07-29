import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DatePickerProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  showYearDropdown?: boolean;
  dropdownMode?: 'scroll' | 'select';
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
}

export function DatePicker({
  selected,
  onSelect,
  className,
  showYearDropdown = false,
  dropdownMode = 'scroll',
  minDate,
  maxDate,
  placeholderText = 'Pick a date',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, 'PPP') : <span>{placeholderText}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onSelect(date);
            setOpen(false);
          }}
          initialFocus
          captionLayout="dropdown-buttons"
          fromYear={1900}
          toYear={new Date().getFullYear()}
          className="rounded-md border"
          classNames={{
            dropdown: 'flex gap-1',
            caption_dropdowns: 'flex gap-2',
            vhidden: 'hidden',
            dropdown_month: 'flex-1',
            dropdown_year: 'flex-1',
          }}
          components={{
            Dropdown: (props) => (
              <select
                className="bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                {...props}
              />
            ),
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

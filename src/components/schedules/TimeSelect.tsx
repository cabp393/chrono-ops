import { useMemo } from 'react';
import { buildTimeOptions } from '../../lib/timeOptions';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  stepMinutes?: number;
  allowEmpty?: boolean;
};

export const TimeSelect = ({ value, onChange, disabled, stepMinutes = 60, allowEmpty = true }: Props) => {
  const options = useMemo(() => buildTimeOptions(stepMinutes), [stepMinutes]);

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      {allowEmpty ? <option value="">--:--</option> : null}
      {options.map((time) => (
        <option key={time} value={time}>{time}</option>
      ))}
    </select>
  );
};

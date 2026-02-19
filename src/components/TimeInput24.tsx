type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  step?: number;
};

export const TimeInput24 = ({ value, onChange, disabled, step = 60 }: Props) => (
  <input
    type="time"
    lang="en-GB"
    inputMode="numeric"
    step={step}
    disabled={disabled}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

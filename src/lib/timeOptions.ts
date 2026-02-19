export const buildTimeOptions = (stepMinutes: number) => {
  const options: string[] = [];
  const totalMinutes = 24 * 60;
  for (let minutes = 0; minutes < totalMinutes; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(`${`${hours}`.padStart(2, '0')}:${`${mins}`.padStart(2, '0')}`);
  }
  return options;
};

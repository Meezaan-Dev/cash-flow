import { useEffect, useState } from 'react';

const getMillisecondsUntilNextDay = (date: Date): number => {
	const nextDay = new Date(date);
	nextDay.setHours(24, 0, 1, 0);
	return Math.max(1000, nextDay.getTime() - date.getTime());
};

export const useCurrentDate = (): Date => {
	const [currentDate, setCurrentDate] = useState(() => new Date());

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>;

		const scheduleNextDay = () => {
			timeoutId = setTimeout(() => {
				setCurrentDate(new Date());
				scheduleNextDay();
			}, getMillisecondsUntilNextDay(new Date()));
		};

		scheduleNextDay();
		return () => clearTimeout(timeoutId);
	}, []);

	return currentDate;
};

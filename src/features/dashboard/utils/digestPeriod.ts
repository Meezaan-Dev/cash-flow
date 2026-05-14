export type DashboardDigestPeriod =
	| {
			mode: 'monthToDate';
	  }
	| DashboardDigestCustomPeriod;

export interface DashboardDigestCustomPeriod {
	mode: 'customCycle';
	startDay: number;
	endDay: number;
}

export interface DashboardDigestDateRange {
	startDate: string;
	endDate: string;
}

export const DASHBOARD_DIGEST_PERIOD_STORAGE_KEY = 'cashflow.dashboardDigestPeriod';

export const DEFAULT_DASHBOARD_DIGEST_PERIOD: DashboardDigestPeriod = {
	mode: 'monthToDate',
};

export const DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD: DashboardDigestCustomPeriod = {
	mode: 'customCycle',
	startDay: 25,
	endDay: 25,
};

export const clampDigestDay = (day: number): number => {
	if (!Number.isFinite(day)) return 1;
	return Math.min(31, Math.max(1, Math.round(day)));
};

const formatDateInput = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const getDaysInMonth = (year: number, month: number): number =>
	new Date(year, month + 1, 0).getDate();

const createClampedDate = (year: number, month: number, day: number): Date =>
	new Date(year, month, Math.min(clampDigestDay(day), getDaysInMonth(year, month)));

const shiftMonth = (date: Date, offset: number): Date =>
	new Date(date.getFullYear(), date.getMonth() + offset, 1);

export const getDashboardDigestDateRange = (
	period: DashboardDigestPeriod = DEFAULT_DASHBOARD_DIGEST_PERIOD,
	today = new Date()
): DashboardDigestDateRange => {
	if (period.mode === 'monthToDate') {
		return {
			startDate: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
			endDate: formatDateInput(today),
		};
	}

	const startDay = clampDigestDay(period.startDay);
	const endDay = clampDigestDay(period.endDay);
	const candidateEnd = createClampedDate(today.getFullYear(), today.getMonth(), endDay);
	const startOffset = startDay < endDay ? 0 : -1;
	const candidateStartMonth = shiftMonth(candidateEnd, startOffset);
	const candidateStart = createClampedDate(
		candidateStartMonth.getFullYear(),
		candidateStartMonth.getMonth(),
		startDay
	);

	let start = candidateStart;
	let end = candidateEnd;

	if (today < candidateStart) {
		const previousEndMonth = shiftMonth(candidateEnd, -1);
		end = createClampedDate(
			previousEndMonth.getFullYear(),
			previousEndMonth.getMonth(),
			endDay
		);
		const previousStartMonth = shiftMonth(end, startOffset);
		start = createClampedDate(
			previousStartMonth.getFullYear(),
			previousStartMonth.getMonth(),
			startDay
		);
	} else if (today > candidateEnd) {
		const nextEndMonth = shiftMonth(candidateEnd, 1);
		end = createClampedDate(nextEndMonth.getFullYear(), nextEndMonth.getMonth(), endDay);
		const nextStartMonth = shiftMonth(end, startOffset);
		start = createClampedDate(
			nextStartMonth.getFullYear(),
			nextStartMonth.getMonth(),
			startDay
		);
	}

	return {
		startDate: formatDateInput(start),
		endDate: formatDateInput(end),
	};
};

export const normalizeDashboardDigestPeriod = (
	period: unknown
): DashboardDigestPeriod => {
	if (!period || typeof period !== 'object') return DEFAULT_DASHBOARD_DIGEST_PERIOD;

	const candidate = period as Partial<DashboardDigestPeriod>;
	if (candidate.mode === 'customCycle') {
		return {
			mode: 'customCycle',
			startDay: clampDigestDay(Number(candidate.startDay)),
			endDay: clampDigestDay(Number(candidate.endDay)),
		};
	}

	return DEFAULT_DASHBOARD_DIGEST_PERIOD;
};

export const loadDashboardDigestPeriod = (): DashboardDigestPeriod => {
	if (typeof window === 'undefined') return DEFAULT_DASHBOARD_DIGEST_PERIOD;

	try {
		const raw = window.localStorage.getItem(DASHBOARD_DIGEST_PERIOD_STORAGE_KEY);
		return raw
			? normalizeDashboardDigestPeriod(JSON.parse(raw))
			: DEFAULT_DASHBOARD_DIGEST_PERIOD;
	} catch {
		return DEFAULT_DASHBOARD_DIGEST_PERIOD;
	}
};

export const saveDashboardDigestPeriod = (period: DashboardDigestPeriod): void => {
	if (typeof window === 'undefined') return;

	window.localStorage.setItem(
		DASHBOARD_DIGEST_PERIOD_STORAGE_KEY,
		JSON.stringify(normalizeDashboardDigestPeriod(period))
	);
};

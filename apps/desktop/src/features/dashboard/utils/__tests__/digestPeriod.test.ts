import {
	DEFAULT_DASHBOARD_DIGEST_PERIOD,
	DASHBOARD_DIGEST_PERIOD_STORAGE_KEY,
	getDashboardDigestDateRange,
	loadDashboardDigestPeriod,
	saveDashboardDigestPeriod,
} from '@/features/dashboard/utils/digestPeriod';

describe('dashboard digest period', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('uses month-to-date by default', () => {
		expect(
			getDashboardDigestDateRange(
				DEFAULT_DASHBOARD_DIGEST_PERIOD,
				new Date('2026-05-14T12:00:00')
			)
		).toEqual({
			startDate: '2026-05-01',
			endDate: '2026-05-14',
		});
	});

	it('builds a 25th-to-25th cycle around today', () => {
		expect(
			getDashboardDigestDateRange(
				{ mode: 'customCycle', startDay: 25, endDay: 25 },
				new Date('2026-05-14T12:00:00')
			)
		).toEqual({
			startDate: '2026-04-25',
			endDate: '2026-05-25',
		});
	});

	it('moves the custom cycle forward after the end day', () => {
		expect(
			getDashboardDigestDateRange(
				{ mode: 'customCycle', startDay: 25, endDay: 25 },
				new Date('2026-05-26T12:00:00')
			)
		).toEqual({
			startDate: '2026-05-25',
			endDate: '2026-06-25',
		});
	});

	it('saves and loads the digest period from localStorage', () => {
		saveDashboardDigestPeriod({ mode: 'customCycle', startDay: 25, endDay: 25 });

		expect(window.localStorage.setItem).toHaveBeenCalledWith(
			DASHBOARD_DIGEST_PERIOD_STORAGE_KEY,
			JSON.stringify({ mode: 'customCycle', startDay: 25, endDay: 25 })
		);

		(window.localStorage.getItem as jest.Mock).mockReturnValue(
			JSON.stringify({ mode: 'customCycle', startDay: 25, endDay: 25 })
		);

		expect(loadDashboardDigestPeriod()).toEqual({
			mode: 'customCycle',
			startDay: 25,
			endDay: 25,
		});
	});
});

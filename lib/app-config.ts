// Central feature flags and environment-driven config

export const appConfig = {
	// Toggle test mode to return mock data instead of hitting paid APIs
	testMode: process.env.NEXT_PUBLIC_TEST_MODE === 'true' || process.env.TEST_MODE === 'true',
	// Optional per-source toggles (inherit from testMode if undefined)
	mock: {
		restaurants: undefined as boolean | undefined,
		activities: undefined as boolean | undefined,
		events: undefined as boolean | undefined,
	},
}

export function isTestMode(): boolean {
	return appConfig.testMode === true
}



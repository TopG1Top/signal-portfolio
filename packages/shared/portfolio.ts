// Public build flag only. Never place credentials in NEXT_PUBLIC_* variables.
export const isPortfolio = process.env.NEXT_PUBLIC_SIGNAL_PORTFOLIO === 'true';

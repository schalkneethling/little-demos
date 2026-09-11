export interface DiagnosticsThrottle {
  shouldReport(now: number): boolean;
}

export function createDiagnosticsThrottle(intervalMilliseconds: number): DiagnosticsThrottle {
  let lastReportAt = Number.NEGATIVE_INFINITY;

  return {
    shouldReport(now) {
      if (now - lastReportAt < intervalMilliseconds) {
        return false;
      }

      lastReportAt = now;
      return true;
    },
  };
}

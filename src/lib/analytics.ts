type AnalyticsPayload = Record<string, unknown>;

export type AnalyticsEventName =
  | 'finance.asset.created'
  | 'finance.asset.updated'
  | 'finance.asset.deleted'
  | 'finance.liability.created'
  | 'finance.liability.updated'
  | 'finance.liability.deleted'
  | 'finance.cashflow.created'
  | 'finance.cashflow.updated'
  | 'finance.cashflow.deleted'
  | 'finance.budget.created'
  | 'finance.budget.updated'
  | 'finance.budget.deleted'
  | 'finance.template.created'
  | 'finance.template.updated'
  | 'finance.template.deleted';

const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? process.env.ANALYTICS_ENDPOINT;
const ANALYTICS_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS ?? process.env.ENABLE_ANALYTICS) === 'true';

const serializePayload = (eventName: string, payload?: AnalyticsPayload) => ({
  event: eventName,
  payload: payload ?? {},
  timestamp: new Date().toISOString()
});

const sendViaBeacon = (body: string) => {
  if (typeof window !== 'undefined' && navigator.sendBeacon && ANALYTICS_ENDPOINT) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
    return true;
  }
  return false;
};

const postEvent = async (body: string) => {
  if (!ANALYTICS_ENDPOINT) return;
  try {
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] failed to send event', error);
    }
  }
};

export const trackEvent = (eventName: AnalyticsEventName, payload?: AnalyticsPayload) => {
  const body = JSON.stringify(serializePayload(eventName, payload));

  if (!ANALYTICS_ENABLED || !ANALYTICS_ENDPOINT) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics]', eventName, payload ?? {});
    }
    return;
  }

  if (!sendViaBeacon(body)) {
    void postEvent(body);
  }
};

export type { AnalyticsPayload };

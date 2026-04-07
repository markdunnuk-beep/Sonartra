export const SONARTRA_ANALYTICS_EVENT = 'sonartra:analytics';

export type ClientAnalyticsPayloadValue = string | boolean | null;
export type ClientAnalyticsPayload = Readonly<Record<string, ClientAnalyticsPayloadValue>>;

export type ClientAnalyticsEventDetail = {
  event: string;
  payload: ClientAnalyticsPayload;
};

declare global {
  interface Window {
    sonartraAnalytics?: {
      track?: (event: string, payload: ClientAnalyticsPayload) => void;
    };
  }
}

type BrowserAnalyticsTarget = {
  dispatchEvent: (event: Event) => boolean;
  sonartraAnalytics?: Window['sonartraAnalytics'];
};

export function trackClientEvent(
  event: string,
  payload: ClientAnalyticsPayload,
  target: BrowserAnalyticsTarget | null = typeof window === 'undefined'
    ? null
    : ({
        dispatchEvent: window.dispatchEvent.bind(window),
        sonartraAnalytics: window.sonartraAnalytics,
      } satisfies BrowserAnalyticsTarget),
): void {
  if (!target) {
    return;
  }

  target.sonartraAnalytics?.track?.(event, payload);
  target.dispatchEvent(
    new CustomEvent<ClientAnalyticsEventDetail>(SONARTRA_ANALYTICS_EVENT, {
      detail: {
        event,
        payload,
      },
    }),
  );
}

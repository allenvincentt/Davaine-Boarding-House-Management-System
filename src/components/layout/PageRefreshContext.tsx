import { createContext, useContext } from 'react';

export type PageRefreshValue = {
  enabled: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

const PageRefreshContext = createContext<PageRefreshValue>({
  enabled: false,
  refreshing: false,
  onRefresh: () => undefined,
});

export const PageRefreshProvider = PageRefreshContext.Provider;

export function usePageRefresh(): PageRefreshValue {
  return useContext(PageRefreshContext);
}

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { track } from "../../utils/analytics";

/**
 * Ticket 04: fire a `page_view` event on every route change.
 * Rendered inside the router so it can read the location.
 */
export default function RouteTracker() {
  const { pathname } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    track("page_view", { path: pathname });
  }, [pathname]);

  return null;
}

import { useEffect } from "react";

const EVENT_NAME = "nav-reset";

export const dispatchNavReset = () => {
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const useNavReset = (callback: () => void) => {
  useEffect(() => {
    window.addEventListener(EVENT_NAME, callback);
    return () => window.removeEventListener(EVENT_NAME, callback);
  }, [callback]);
};

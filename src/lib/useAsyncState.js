// https://dev.to/adelchms96/react-hook-for-waiting-state-update-useasyncstate-147g
import { useState, useRef, useCallback, useEffect } from "react";

function useAsyncState(initialState) {
  const [state, setState] = useState(initialState);
  const resolveState = useRef();
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (resolveState.current) {
      resolveState.current(state);
    }
  }, [state]);

  const setAsyncState = useCallback(
    newState =>
      new Promise(resolve => {
        if (isMounted.current) {
          resolveState.current = resolve;
          setState(newState);
        }
      }),
    []
  );

  return [state, setAsyncState];
}

export default useAsyncState;

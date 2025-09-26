import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export function useTauriEvent<T = unknown>(
    eventName: string,
    handler: (event: { event: string; payload: T }) => void
) {
    useEffect(() => {
        console.log(eventName)
        let cleanup: (() => void) | undefined;

        (async () => {
            cleanup = await listen<T>(eventName, handler);
        })();

        return () => {
            if (cleanup) cleanup();
        };
    }, [eventName, handler]);
}
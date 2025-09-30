import { useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

export function useTauriEvent<T = unknown>(
    eventName: string,
    handler: (event: { event: string; payload: T }) => void
) {
    // 使用 ref 保存最新的 handler，避免因 handler 变化导致重新绑定
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    // 创建稳定的 wrapper 函数
    const stableHandler = useCallback((event: { event: string; payload: T }) => {
        handlerRef.current(event);
    }, []);

    useEffect(() => {
        console.log('绑定事件监听器:', eventName);
        let cleanup: (() => void) | undefined;

        (async () => {
            cleanup = await listen<T>(eventName, stableHandler);
        })();

        return () => {
            if (cleanup) {
                console.log('清理事件监听器:', eventName);
                cleanup();
            }
        };
    }, [eventName, stableHandler]); // 只依赖 eventName 和稳定的 handler
}
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TauriEventName, TauriEventPayloadMap } from "../types/tauri";

export const tauriClient = {
    async call<T>(cmd: string, payload?: any): Promise<T> {
        return invoke<T>(cmd, payload);
    },

    async subscribe<K extends TauriEventName>(
        event: K,
        handler: (payload: TauriEventPayloadMap[K]) => void
    ) {
        return listen(event, (evt) => handler(evt.payload as TauriEventPayloadMap[K]));
    },
};

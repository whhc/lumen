import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { TauriEventName, TauriEventPayloadMap } from "../types/tauri";
import { MEDIA_PREVIEW } from '@/constants/windows';

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

    // 窗口管理功能
    async createPreviewWindow(mediaData: any) {
        const webview = new WebviewWindow(MEDIA_PREVIEW, {
            url: `http://localhost:1420/preview?mediaId=${mediaData.media.id}`,
            title: '照片预览',
            width: 1200,
            height: 800,
            fullscreen: true,
            resizable: true,
            decorations: false,
            alwaysOnTop: false,
            skipTaskbar: false,
            backgroundColor: '#000000'
        });

        return webview;
    },
};

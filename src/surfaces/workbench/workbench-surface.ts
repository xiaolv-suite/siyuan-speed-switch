import {loadChunkWithRetry} from "../../core/chunk-loader";
import {logger} from "../../logger";

export async function openSecondPanelSurface(host: any, context?: any): Promise<void> {
    try {
        if (typeof host?.ensureTier2Loaded === "function" && !host?.tier2Ready) {
            await host.ensureTier2Loaded().catch((err: unknown) => {
                logger.warn("workbench tier2 load fail", err);
            });
        }
        const { openSecondPanel } = await loadChunkWithRetry(
            () => import(/* webpackChunkName: "workbench" */ "../../second-panel-ui"),
        );
        return openSecondPanel.call(host, context);
    } catch (err) {
        logger.warn("workbench chunk import failed", err);
        if (typeof document !== "undefined") {
            host?.showNotice?.(host?.i18n?.homeLoadFailed || "工作台加载失败，请重试", 5000, "error");
        }
    }
}

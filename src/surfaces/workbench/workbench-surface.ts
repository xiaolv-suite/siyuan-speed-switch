import {loadChunkWithRetry} from "../../core/chunk-loader";
import {logger} from "../../logger";

export async function openSecondPanelSurface(host: any, context?: any): Promise<void> {
    try {
        const { openSecondPanel } = await loadChunkWithRetry(
            () => import(/* webpackChunkName: "workbench" */ "../../second-panel-ui"),
        );
        return openSecondPanel.call(host, context);
    } catch (err) {
        logger.warn("workbench chunk import failed", err);
        host?.showNotice?.(host?.i18n?.homeLoadFailed || "工作台加载失败，请重试", 5000, "error");
    }
}

import {LifecycleCommandsRuntime} from "./lifecycle-commands";
import {StorageSyncRuntime} from "./storage-sync";
import {KernelHostRuntime} from "./kernel-host";
import {AgentHostRuntime} from "./agent-host";
import {SettingsHostRuntime} from "./settings-host";
import {CaptureJournalRuntime} from "./capture-journal-host";
import {PlatformSurfaceRuntime} from "./platform-surface-host";
import {SwitcherDialogRuntime} from "./switcher-dialog";
import {SwitcherCardsRuntime} from "./switcher-cards";
import {SwitcherKeyboardNavRuntime} from "./switcher-keyboard-nav";
import {DocSearchHostRuntime} from "./doc-search-host";
import {PaletteHostRuntime} from "./palette-host";
import {QuickActionsHostRuntime} from "./quick-actions-host";
import {SnippetStackRuntime} from "./snippet-stack-host";
import {WorkbenchAdaptersRuntime} from "./workbench-adapters";
import {WorkbenchHostRuntime} from "./workbench-host";
import {FavoritesHostRuntime} from "./favorites-host";
import {HistoryHostRuntime} from "./history-host";
import {MobileSwitcherRuntime} from "./mobile-switcher-host";
import {FloatingBallHostRuntime} from "./floating-ball-host";
import {ProtyleSidebarRuntime} from "./protyle-sidebar-host";
import type {RuntimeDomainConstructor} from "./runtime-binder";

export const RUNTIME_DOMAINS: readonly RuntimeDomainConstructor[] = [
    LifecycleCommandsRuntime, StorageSyncRuntime, KernelHostRuntime, AgentHostRuntime,
    SettingsHostRuntime, CaptureJournalRuntime, PlatformSurfaceRuntime, SwitcherDialogRuntime,
    SwitcherCardsRuntime, SwitcherKeyboardNavRuntime, DocSearchHostRuntime, PaletteHostRuntime,
    QuickActionsHostRuntime, SnippetStackRuntime, WorkbenchAdaptersRuntime, WorkbenchHostRuntime,
    FavoritesHostRuntime, HistoryHostRuntime, MobileSwitcherRuntime, FloatingBallHostRuntime,
    ProtyleSidebarRuntime,
];

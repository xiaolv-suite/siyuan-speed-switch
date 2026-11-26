import type { IDisposable, IDisposableRegistry } from "../types/disposer";
import { toDisposable } from "./disposable";

export class DisposerRegistry implements IDisposableRegistry {
    private _isDisposed = false;
    private readonly disposables = new Set<IDisposable>();
    private readonly disposablesList: IDisposable[] = [];
    private readonly children = new Set<DisposerRegistry>();
    private parent?: DisposerRegistry;

    constructor(parent?: DisposerRegistry) {
        this.parent = parent;
        if (parent) {
            parent.addChild(this);
        }
    }

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    public register<T extends IDisposable>(disposable: T): T {
        if (!disposable || typeof disposable.dispose !== "function") {
            return disposable;
        }

        if (this._isDisposed) {
            try {
                disposable.dispose();
            } catch (_) {}
            return disposable;
        }

        // Set 去重契约
        if (this.disposables.has(disposable)) {
            return disposable;
        }

        this.disposables.add(disposable);
        this.disposablesList.push(disposable);
        return disposable;
    }

    public registerFn(cleanup: () => void): () => void {
        if (typeof cleanup !== "function") {
            return () => {};
        }

        const d = toDisposable(cleanup);
        this.register(d);

        return () => {
            this.unregister(d);
            try {
                d.dispose();
            } catch (_) {}
        };
    }

    public trackListener(
        target: EventTarget,
        event: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): () => void {
        if (!target || typeof target.addEventListener !== "function") {
            return () => {};
        }

        target.addEventListener(event, handler, options);

        const cleanup = () => {
            try {
                target.removeEventListener(event, handler, options);
            } catch (_) {}
        };

        return this.registerFn(cleanup);
    }

    public trackTimer(timerId: any): () => void {
        if (timerId === null || timerId === undefined) {
            return () => {};
        }

        const cleanup = () => {
            clearTimeout(timerId);
            clearInterval(timerId);
        };

        return this.registerFn(cleanup);
    }

    public createChild(): IDisposableRegistry {
        if (this._isDisposed) {
            const deadChild = new DisposerRegistry();
            deadChild.dispose();
            return deadChild;
        }

        return new DisposerRegistry(this);
    }

    private addChild(child: DisposerRegistry): void {
        this.children.add(child);
    }

    private removeChild(child: DisposerRegistry): void {
        this.children.delete(child);
    }

    public unregister(disposable: IDisposable): void {
        if (!this.disposables.has(disposable)) return;
        this.disposables.delete(disposable);
        const idx = this.disposablesList.indexOf(disposable);
        if (idx >= 0) {
            this.disposablesList.splice(idx, 1);
        }
    }

    public dispose(): void {
        // 重复 dispose 幂等保护
        if (this._isDisposed) return;
        this._isDisposed = true;

        if (this.parent) {
            this.parent.removeChild(this);
            this.parent = undefined;
        }

        // 1. 树状级联 LIFO 逆序释放所有子生命周期中枢
        const childArray = Array.from(this.children);
        for (let i = childArray.length - 1; i >= 0; i--) {
            try {
                childArray[i].dispose();
            } catch (err) {
                // 异常隔离
                console.warn?.("DisposerRegistry child dispose error:", err);
            }
        }
        this.children.clear();

        // 2. 本中枢注册对象 LIFO 逆序释放
        while (this.disposablesList.length > 0) {
            const item = this.disposablesList.pop()!;
            this.disposables.delete(item);
            try {
                item.dispose();
            } catch (err) {
                // 异常隔离：单个注销异常不阻塞后续注销
                console.warn?.("DisposerRegistry item dispose error:", err);
            }
        }
        this.disposables.clear();
    }
}

export function createDisposerRegistry(parent?: DisposerRegistry): DisposerRegistry {
    return new DisposerRegistry(parent);
}

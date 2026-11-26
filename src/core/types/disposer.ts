export interface IDisposable {
    dispose(): void;
}

export interface IDisposableRegistry extends IDisposable {
    readonly isDisposed: boolean;
    register<T extends IDisposable>(disposable: T): T;
    registerFn(cleanup: () => void): () => void;
    trackListener(
        target: EventTarget,
        event: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): () => void;
    trackTimer(timerId: any): () => void;
    createChild(): IDisposableRegistry;
}

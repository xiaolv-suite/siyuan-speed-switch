export interface IDisposable {
    dispose(): void;
}

export function toDisposable(cleanup: () => void): IDisposable {
    let disposed = false;
    return {
        dispose: () => {
            if (!disposed) {
                disposed = true;
                cleanup();
            }
        },
    };
}

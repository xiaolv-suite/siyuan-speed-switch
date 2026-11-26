export async function loadChunkWithRetry<T>(loader: () => Promise<T>, retries = 2, delayMs = 150): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        try {
            return await loader();
        } catch (err) {
            lastError = err;
            if (i < retries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

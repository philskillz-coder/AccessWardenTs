class TemporaryValueService {
    private data: Map<string, { value: any; expirationTime: number | null }> = new Map();

    storeValue(key: string, value: any, ttl?: number): void {
        const expirationTime = ttl ? Date.now() + ttl * 1000 : null;
        this.data.set(key, { value, expirationTime });
    }

    retrieveValue(key: string, keep: boolean = false): any | undefined {
        const entry = this.data.get(key);
        console.log(entry);
        if (!entry) {
            return undefined;
        }

        const { value, expirationTime } = entry;

        // Check if the entry is expired
        if (expirationTime && Date.now() > expirationTime) {
            this.data.delete(key);
            return undefined;
        }

        if (!keep) {
            this.data.delete(key);
        }
        return value;
    }

    contains(key: string): boolean {
        return this.data.has(key);
    }
}

const temporaryValueService = new TemporaryValueService();
export default temporaryValueService;

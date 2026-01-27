/**
 * Network Detector
 * 
 * Monitors network connectivity and notifies listeners.
 * Critical for triggering sync when connection is restored.
 */

type NetworkListener = (isOnline: boolean) => void;

const BACKEND_URL = 'http://localhost:3000';
const HEALTH_CHECK_INTERVAL = 5000; // Check every 5 seconds

class NetworkDetector {
    private static instance: NetworkDetector;
    private listeners: Set<NetworkListener> = new Set();
    private _isOnline: boolean = false;
    private healthCheckTimer: number | null = null;

    private constructor() {
        this.setupListeners();
        this.startHealthCheck();
    }

    static getInstance(): NetworkDetector {
        if (!NetworkDetector.instance) {
            NetworkDetector.instance = new NetworkDetector();
        }
        return NetworkDetector.instance;
    }

    private setupListeners() {
        window.addEventListener('online', () => {
            console.log('[Network] Browser online');
            this.checkBackendHealth();
        });

        window.addEventListener('offline', () => {
            console.log('[Network] Browser offline');
            this.setOnlineStatus(false);
        });
    }

    private startHealthCheck() {
        // Initial check
        this.checkBackendHealth();

        // Periodic health checks
        this.healthCheckTimer = window.setInterval(() => {
            this.checkBackendHealth();
        }, HEALTH_CHECK_INTERVAL);
    }

    /**
     * Check if backend is reachable
     */
    private async checkBackendHealth() {
        // First check browser network status
        if (!navigator.onLine) {
            this.setOnlineStatus(false);
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${BACKEND_URL}/api/sync/health`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                this.setOnlineStatus(true);
            } else {
                this.setOnlineStatus(false);
            }
        } catch (error) {
            console.log('[Network] Backend unreachable:', error instanceof Error ? error.message : 'Unknown error');
            this.setOnlineStatus(false);
        }
    }

    private setOnlineStatus(status: boolean) {
        if (this._isOnline !== status) {
            console.log(`[Network] Status changed: ${status ? 'ONLINE' : 'OFFLINE'}`);
            this._isOnline = status;
            this.notifyListeners(status);
        }
    }

    get isOnline(): boolean {
        return this._isOnline;
    }

    /**
     * Register a listener for network changes
     */
    addListener(listener: NetworkListener): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(isOnline: boolean) {
        this.listeners.forEach((listener) => {
            try {
                listener(isOnline);
            } catch (error) {
                console.error('[Network] Error in listener:', error);
            }
        });
    }

    /**
     * Force check network status
     */
    async checkConnection(): Promise<boolean> {
        await this.checkBackendHealth();
        return this._isOnline;
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
}

export const networkDetector = NetworkDetector.getInstance();

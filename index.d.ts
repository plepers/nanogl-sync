export default class Sync {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    readonly promise: Promise<unknown>;
    private _sync;
    private _invalidated;
    private _pooled;
    private _defer;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext);
    static resolve: typeof _resolve;
    static auto: typeof _auto;
    static stop: typeof _stop;
    insert(): void;
    dispose(): void;
    isSignaled(): boolean;
    then(onFulfilled: (value: unknown) => unknown, onRejected: (reason: any) => unknown): void;
    clientWaitSync(timeout?: number): number;
    _release(): void;
    _complete(): void;
    _pool(): void;
    _unpool(): void;
}
declare function _auto(interval: number): void;
declare function _stop(): void;
declare function _resolve(): void;
export {};

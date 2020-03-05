function isWebgl2(gl) {
    return gl.fenceSync !== undefined;
}
export default class Sync {
    constructor(gl) {
        this.gl = gl;
        this._sync = null;
        this._invalidated = false;
        this._pooled = false;
        this.promise = new Promise((resolve, reject) => {
            this._defer = { resolve, reject };
        });
    }
    insert() {
        if (this._sync === null && !this._invalidated) {
            this._sync = _factory(this.gl);
            this._pool();
        }
    }
    dispose() {
        this._release();
    }
    isSignaled() {
        if (this._sync === null) {
            return false;
        }
        return this._sync.isSignaled();
    }
    then(onFulfilled, onRejected) {
        this.promise.then(onFulfilled, onRejected);
    }
    clientWaitSync(timeout = 1e6) {
        if (this._sync === null) {
            return 0x911D;
        }
        return this._sync.clientWaitSync(timeout);
    }
    _release() {
        this._defer.reject(null);
        this._unpool();
        this._invalidated = true;
        if (this._sync !== null) {
            this._sync.dispose();
            this._sync = null;
        }
    }
    _complete() {
        this._defer.resolve();
        this._release();
    }
    _pool() {
        if (!this._pooled) {
            __pool.push(this);
            this._pooled = true;
        }
    }
    _unpool() {
        if (this._pooled) {
            __pool.splice(__pool.indexOf(this), 1);
            this._pooled = false;
        }
    }
}
Sync.resolve = _resolve;
Sync.auto = _auto;
Sync.stop = _stop;
;
class NativeImpl {
    constructor(gl) {
        this.gl = gl;
        this.sync = gl.fenceSync(0x9117, 0);
        gl.flush();
    }
    isSignaled() {
        return this.gl.getSyncParameter(this.sync, 0x9114) === 0x9119;
    }
    dispose() {
        this.gl.deleteSync(this.sync);
    }
    clientWaitSync(timeout) {
        return this.gl.clientWaitSync(this.sync, this.gl.SYNC_FLUSH_COMMANDS_BIT, timeout);
    }
}
class ShimImpl {
    isSignaled() {
        return true;
    }
    dispose() { }
    clientWaitSync(timeout) {
        return 0x911A;
    }
}
const __pool = [];
let _autoi;
function _auto(interval) {
    if (interval === undefined) {
        interval = 32;
    }
    _stop();
    _autoi = setInterval(_resolve, interval);
}
function _stop() {
    clearInterval(_autoi);
}
function _resolve() {
    for (var i = __pool.length - 1; i >= 0; i--) {
        if (__pool[i].isSignaled()) {
            __pool[i]._complete();
        }
    }
}
function _factory(gl) {
    if (isWebgl2(gl)) {
        return new NativeImpl(gl);
    }
    else {
        return new ShimImpl();
    }
}

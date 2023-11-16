


function isWebgl2(gl: WebGLRenderingContext | WebGL2RenderingContext): gl is WebGL2RenderingContext {
  return (gl as WebGL2RenderingContext).fenceSync !== undefined;
}


/**
 * This class can be used as a wrapper around a WebGLSync object, and provides a promise based completion.
 *
 * It is used to synchronize activities between the GPU and the application, and is only available for WebGL2.
 */
export default class Sync {
  /** The webgl context this Sync belongs to */
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** The underlying promise */
  readonly promise: Promise<unknown>;

  /** The implementation of the WebGLSync object */
  private _sync: ISyncImplementation | null;
  /** Whether the Sync is invalidated or not. The Sync is invalidated on release. */
  private _invalidated: boolean;
  /** Whether the Sync is pooled or not. */
  private _pooled: boolean;
  /** The object providing the promise's resolve & reject functions */
  private _defer : any;


  /**
   * @param {WebGLRenderingContext | WebGL2RenderingContext} gl  The webgl context this Sync belongs to
   */
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {

    this.gl = gl;
    this._sync = null;
    this._invalidated = false;
    this._pooled = false;

    this.promise = new Promise<void>((resolve, reject)=>{
        this._defer = {resolve,reject};
    });

  }

  /**
   * Call {@link Sync#_complete} for every signaled Sync in the pool.
   */
  static resolve = _resolve;
  /**
   * Start the pool auto resolve loop.
   */
  static auto = _auto;
  /**
   * Stop the pool auto resolve loop.
   */
  static stop = _stop;






  /**
   * Create a WebGLSync object and insert it in the GL command stream. Then pool this Sync.
   *
   * The promise will be resolved when the Sync is signaled.
   */
  insert() {
    if (this._sync === null && !this._invalidated) {
      this._sync = _factory(this.gl);
      this._pool();
    }
  }

  /**
   * Dispose of everything related related to this Sync.
   */
  dispose() {
    this._release();
  }

  /**
   * Know whether the `GL_SYNC_STATUS` is `GL_SIGNALED` or not.
   */
  isSignaled() {
    if (this._sync === null) {
      return false;
    }
    return this._sync.isSignaled();
  }

  /**
   * Shortcut to `this.promise.then`.
   * @param {Function} onFulfilled The callback to be called when the promise is fulfilled
   * @param {Function} onRejected The callback to be called when the promise is rejected
   */
  then(onFulfilled: (value: unknown) => unknown, onRejected: (reason: any) => unknown) {
    this.promise.then(onFulfilled, onRejected);
  }

  /**
   * Shortcut to `gl.clientWaitSync`.
   *
   * **Important :** The {@link Sync#insert} method must have been called before calling this method.
   *
   * @param {number} [timeout=1e6] The time to wait for the sync object to become signaled (in nanosec), defaults to 100ms
   */
  clientWaitSync(timeout:number = 1e6) {
    if (this._sync === null) {
      return 0x911D;// GL_WAIT_FAILED;
    }

    return this._sync.clientWaitSync(timeout);
  }

  /**
   * Release everything related to this Sync.
   *
   * Used by {@link Sync#dispose} and {@link Sync#complete}.
   */
  _release() {
    this._defer.reject(null);
    this._unpool();
    this._invalidated = true;
    if (this._sync !== null) {
      this._sync.dispose();
      this._sync = null;
    }
  }

  /**
   * Resolve the promise and release everything related to this Sync.
   */
  _complete() {
    this._defer.resolve();
    this._release();
  }

  /**
   * Pool this Sync.
   */
  _pool() {
    if (!this._pooled) {
      __pool.push(this);
      this._pooled = true;
    }
  }

  /**
   * Remove this Sync from the pool.
   */
  _unpool() {
    if (this._pooled) {
      __pool.splice(__pool.indexOf(this), 1);
      this._pooled = false;
    }
  }



};



export interface ISyncImplementation {
  /**
   * Know whether the `GL_SYNC_STATUS` is `GL_SIGNALED` or not.
   */
  isSignaled(): boolean;
  /**
   * Dispose of everything related to this SyncImplementation.
   */
  dispose(): void;
  /**
   * Shortcut to `gl.clientWaitSync`.
   */
  clientWaitSync(timeout: number): GLenum;
}


//    _  _      _   _           ___            _
//   | \| |__ _| |_(_)_ _____  |_ _|_ __  _ __| |
//   | .` / _` |  _| \ V / -_)  | || '  \| '_ \ |
//   |_|\_\__,_|\__|_|\_/\___| |___|_|_|_| .__/_|
//                                       |_|

class NativeImpl implements ISyncImplementation {

  gl: WebGL2RenderingContext;
  sync: WebGLSync;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.sync = <WebGLSync>gl.fenceSync(0x9117, 0);// gl.SYNC_GPU_COMMANDS_COMPLETE
    gl.flush();
  }



  isSignaled() {
    //gl.SYNC_STATUS = gl.SIGNALED
    return this.gl.getSyncParameter(this.sync, 0x9114) === 0x9119;
  }

  dispose() {
    this.gl.deleteSync(this.sync);
  }


  clientWaitSync(timeout: number) {
    return this.gl.clientWaitSync(this.sync, this.gl.SYNC_FLUSH_COMMANDS_BIT, timeout);
  }

}


//    ___ _    _         ___            _
//   / __| |_ (_)_ __   |_ _|_ __  _ __| |
//   \__ \ ' \| | '  \   | || '  \| '_ \ |
//   |___/_||_|_|_|_|_| |___|_|_|_| .__/_|
//                                |_|


class ShimImpl implements ISyncImplementation {


  isSignaled() {
    return true;
  }

  dispose() { }

  clientWaitSync(timeout: number) {
    return 0x911A; //GL_ALREADY_SIGNALED
  }

}


//                   _                 _      _
//    _ __  ___  ___| |  _  _ _ __  __| |__ _| |_ ___
//   | '_ \/ _ \/ _ \ | | || | '_ \/ _` / _` |  _/ -_)
//   | .__/\___/\___/_|  \_,_| .__/\__,_\__,_|\__\___|
//   |_|                     |_|

const __pool : Sync[] = [];

let _autoi : number;

function _auto(interval:number) {
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


function _factory(gl: WebGLRenderingContext | WebGL2RenderingContext): ISyncImplementation {
  if (isWebgl2(gl)) {
    return new NativeImpl(gl);
  } else {
    return new ShimImpl();
  }
}

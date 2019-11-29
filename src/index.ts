import when = require( 'when' );




function isWebgl2(gl: WebGLRenderingContext | WebGL2RenderingContext): gl is WebGL2RenderingContext {
  return (gl as WebGL2RenderingContext).fenceSync !== undefined;
}


/**
 * @class
 * @classdesc Wrapper around WebGLSync object. With a promise based completion
 *
 *  @param {WebGLRenderingContext} gl webgl context the sync belongs to
 */

class Sync {

  gl: WebGLRenderingContext | WebGL2RenderingContext;
  promise: when.Promise<unknown>;

  private _sync: ISyncImplementation | null;
  private _invalidated: boolean;
  private _pooled: boolean;
  private _defer: when.Deferred<unknown>;



  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {

    this.gl = gl;
    this._sync = null;
    this._invalidated = false;
    this._pooled = false;

    this._defer = when.defer();
    this.promise = this._defer.promise;

  }


  static resolve = _resolve;
  static auto = _auto;
  static stop = _stop;






  /**
   * actually create a the WebGLSync and insert fence command in the GL command stream
   */
  insert() {
    if (this._sync === null && !this._invalidated) {
      this._sync = _factory(this.gl);
      this._pool();
    }
  }


  dispose() {
    this._release();
  }

  /**
   * return true if the GL_SYNC_STATUS is GL_SIGNALED
   */
  isSignaled() {
    if (this._sync === null) {
      return false;
    }
    return this._sync.isSignaled();
  }

  /**
    * shortcut to this.promise.then
    */
  then(onFulfilled: (value: unknown) => unknown, onRejected: (reason: any) => unknown) {
    this.promise.then(onFulfilled, onRejected);
  }

  /**
    * equivalent to gl.clientWaitSync. Sync must be "insert" before calling this, otherwise return GL_WAIT_FAILED.
    * @param {Number} [timeout  =1e6] in nanosec, default 100ms
    */
  clientWaitSync(timeout:number = 1e6) {
    if (this._sync === null) {
      return 0x911D;// GL_WAIT_FAILED;
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



};



interface ISyncImplementation {
  isSignaled(): boolean;
  dispose(): void;
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






export = Sync;
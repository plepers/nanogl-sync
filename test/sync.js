var GLArrayBuffer = require( 'nanogl/arraybuffer' );
var Program     = require( 'nanogl/program' );
var Sync         = require( '../index' );

var expect  = require( 'expect.js' );

var testContext = require( './utils/TestContext' );
var gl = testContext.getContext();

Program.debug = false
// console.log( gl.getParameter( gl.MAX_CLIENT_WAIT_TIMEOUT_WEBGL ))

var bigBuff = new ArrayBuffer(0xFFff)

function workload(){
  gl.clear( gl.COLOR_BUFFER_BIT )

  var a = new GLArrayBuffer( gl, bigBuff )
  a.dispose();
}



var si;
function stopSyncTimeout(){
  clearInterval( si );
}
function startSyncTimeout(){
  si = setInterval( function(){
    Sync.resolve()
  }, 40 )
}



describe( "Sync", function(){

  it( "Sync.resolve", function(){

    expect( Sync.resolve ).to.not.throwException();

  });

 


  it( "ctor should leave clean state", function(){
    var sync = new Sync(gl);
    testContext.assertNoError();
  });


  it( "ctor n dispose should leave clean state", function(){
    var sync = new Sync(gl);
    sync.dispose();
    testContext.assertNoError();
  });


  it( "ctor insert n dispose should leave clean state", function(){
    var sync = new Sync(gl);
    sync.insert();
    sync.dispose();
    testContext.assertNoError();
  });


  it( "dispose should resolve", function( done ){
    var sync = new Sync( gl );
    sync.promise.ensure( function(){
      done()
    })

    sync.dispose();
   
  });

  it( "insert should resolve", function( done ){
    var sync = new Sync(gl);
    workload()
    sync.insert();
    sync.promise.then( function(){
      stopSyncTimeout()
      done()
    })

    startSyncTimeout()
   
  });


  // it( "@WEBGL2 clientWaitSync", function(){
  //   var sync = new Sync(gl);
  //   workload()
  //   sync.insert();
  //   expect( sync.isSync() ).to.be( false )
  //   var res = sync.clientWaitSync(1e3);

    // expect( res ).to.be( gl.CONDITION_SATISFIED )
    // expect( sync.isSync() ).to.be( true )   
  
  // });

  it( "@WEBGL2 sync impl should be native in webgl2", function(){
    var sync = new Sync(gl);
    sync.insert();
    
    expect( sync._sync.sync ).to.be.ok();
   
  });


  
  it( "resolve after programs compilations", function( done ){
    var sync = new Sync(gl);
    sync.promise.then( function(){
      stopSyncTimeout()
      done()
    })


    var vert = require( './glsl/big_shader.vert');
    var frag = require( './glsl/big_shader.frag');

    var prgs = []

    var t = Date.now()
    for (var i = 0; i < 10; i++) {
      var prg = new Program( gl, vert, frag )
      // prg.use()
      prgs.push( prg )
    };

    console.log( 'took '+(Date.now()-t) +'ms to compile' )

    sync.insert();

    startSyncTimeout()

   
  });








});
precision highp float;


// #pragma Input vec3 normal
// #pragma Enum ibl_type { NONE, SH7, SH9 }

#if __VERSION__ == 300
  #define IN in
  out vec4 FragColor;
  #define texture2D(a,b) texture( a, b )
#else
  #define IN varying
  #define FragColor gl_FragColor
#endif


uniform vec3 uCameraPosition;

IN vec2 vTexCoord;
IN vec2 vTexCoord1;
IN vec3 vWorldPosition;



IN mediump vec3 vWorldNormal;

uniform sampler2D tAlbedo;

#define HAS_albedo 1

#define albedo(k) VAL_tAlbedovTexCoord.rgb
uniform vec3 uAlbdoTint;

#define HAS_albedoTint 1

#define albedoTint(k) uAlbdoTint.rgb
#define albedoTintLinearLight 1

#define HAS_albedoMul 0

#define HAS_alpha 0

#define HAS_fuzz 0

uniform sampler2D tSpecular;

#define HAS_specular 1

#define specular(k) VAL_tSpecularvTexCoord.rgb
#define HAS_fresnel 0

#define HAS_glossMult 0

#define VAR_CONST_362f9333 float(0)

#define HAS_basegloss 1

#define basegloss(k) VAR_CONST_362f9333
#define HAS_normal 0

#define HAS_normal2 0

#define HAS_occlusion 0

#define HAS_cavity 0

#define HAS_cavityStrength 0

#define HAS_emissive 0

#define HAS_emissiveScale 0

#define HAS_secondaryUVScale 0

#define conserveEnergy 0

#define perVertexIrrad 1

#define glossNearest 0

#define tonemap 1

#define pureGloss 0

#define needSecondaryUVS 0

#define VAR_CONST_27eac855 vec2(2.6000000,1.0000000)

#define HAS_iblExpo 1

#define iblExpo(k) VAR_CONST_27eac855.rg
#define D_RGB 1
#define D_DEPTH 2
#define VAL_depthFormat D_RGB
#define depthFormat(k) VAL_depthFormat == k

#define iblShadowing 1

#define PCFNONE 1
#define PCF4x1 2
#define PCF4x4 3
#define PCF2x2 4
#define VAL_shadowFilter PCF4x4
#define shadowFilter(k) VAL_shadowFilter == k

#define NUM_D_LIGHTS 0




#define NUM_S_LIGHTS 0




#define NUM_P_LIGHTS 0









#if HAS_secondaryUVScale
  IN vec2 vTexCoordScaled;
#endif


#if HAS_normal
  IN mediump vec3 vWorldTangent;
  IN mediump vec3 vWorldBitangent;
#endif





float blendLinearLight( float base, float blend ) {
  return clamp( base+ 2.0*blend -1.0, 0.0, 1.0 );
}


vec3 blendLinearLight( vec3 base, vec3 blend ) {
  return vec3(
    blendLinearLight( base.r, blend.r ),
    blendLinearLight( base.g, blend.g ),
    blendLinearLight( base.b, blend.b )
  );
}

vec3 blendLinearLight( vec3 base, vec3 blend, float opacity ) {
  return (blendLinearLight(base, blend) * opacity + base * (1.0 - opacity));
}




float blendOverlay(float base, float blend) {
  return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return vec3(
    blendOverlay(base.r,blend.r),
    blendOverlay(base.g,blend.g),
    blendOverlay(base.b,blend.b)
  );
}

vec3 blendOverlay(vec3 base, vec3 blend, float opacity) {
  return (blendOverlay(base, blend) * opacity + base * (1.0 - opacity));
}

// IBL
// ========
uniform sampler2D tEnv;

#if pureGloss
  uniform sampler2D tEnvHi;
  


#ifndef _H_OCTWRAP_DECODE_
#define _H_OCTWRAP_DECODE_

vec2 octwrapDecode( vec3 v ) {
  // Project the sphere onto the octahedron, and then onto the xy plan
  vec2 p = v.xy / dot(  abs( v ) , vec3(1.0) );
  p = vec2( p.x+p.y-1.0, p.x-p.y );

  if( v.z < 0.0 )
    p.x *= -1.0;

  // p.x *= sign( v.z );
  return p;
}

#endif

#ifndef _H_DECODE_RGBE_
#define _H_DECODE_RGBE_

vec3 decodeRGBE( vec4 hdr ){
  return hdr.rgb * exp2( (hdr.a*255.0)-128.0 );
  // return hdr.rgb * pow( 2.0, (hdr.a*255.0)-128.0 );
}

#endif

vec3 SampleEnvHi( sampler2D tEnv, vec3 skyDir )
{

  vec2 uvA = octwrapDecode( skyDir );

  uvA = vec2(
    0.25*(254.0/256.0),
    0.5 *(254.0/256.0)
    ) * uvA + vec2(0.5,0.5);

  return decodeRGBE( texture2D(tEnv,uvA) );
}



#endif


#if perVertexIrrad
  IN vec3 vIrradiance;
#else
  uniform vec4 uSHCoeffs[7];
  
#ifndef _H_SAMPLE_SH_
#define _H_SAMPLE_SH_
// ================================
// compute Spherical Harmonics
// ================================
//
// "Stupid Spherical Harmonics (SH) Tricks"
// http://www.ppsloan.org/publications/StupidSH36.pdf
//
//
vec3 SampleSH( vec3 Normal, vec4 shCoefs[7] )
{
  Normal.xz = Normal.zx;
  vec4 NormalVector = vec4(Normal, 1.0);

  // todo transpose coeffs directly
  // NormalVector.xyz = NormalVector.zyx;

  vec3 X0, X1, X2;
  X0.x = dot( shCoefs[0].xyz, Normal) + shCoefs[0].w;
  X0.y = dot( shCoefs[1].xyz, Normal) + shCoefs[1].w;
  X0.z = dot( shCoefs[2].xyz, Normal) + shCoefs[2].w;

  vec4 vB = NormalVector.zyxx * NormalVector.yxxz;
  X1.x = dot( shCoefs[3].xyz, vB.xyz) + (shCoefs[3].w * vB.w);
  X1.y = dot( shCoefs[4].xyz, vB.xyz) + (shCoefs[4].w * vB.w);
  X1.z = dot( shCoefs[5].xyz, vB.xyz) + (shCoefs[5].w * vB.w);

  float vC = NormalVector.z * NormalVector.z - NormalVector.y * NormalVector.y;
  X2 =  shCoefs[6].xyz * vC;

  return ( X0 + X1 + X2 );
//  return max( vec3(0.0) , X0 + X1 + X2 );
}

#endif

#endif



// MATH
// =========
#define saturate(x) clamp( x, 0.0, 1.0 )
#define sdot( a, b ) saturate( dot(a,b) )


#if HAS_glossMult
  #define gloss(k) basegloss()*glossMult()
#else
  #define gloss(k) basegloss()
#endif

// INCLUDES
// =========


#ifndef _H_SPECULAR_IBL_
#define _H_SPECULAR_IBL_


#ifndef _H_OCTWRAP_DECODE_
#define _H_OCTWRAP_DECODE_

vec2 octwrapDecode( vec3 v ) {
  // Project the sphere onto the octahedron, and then onto the xy plan
  vec2 p = v.xy / dot(  abs( v ) , vec3(1.0) );
  p = vec2( p.x+p.y-1.0, p.x-p.y );

  if( v.z < 0.0 )
    p.x *= -1.0;

  // p.x *= sign( v.z );
  return p;
}

#endif

#ifndef _H_DECODE_RGBE_
#define _H_DECODE_RGBE_

vec3 decodeRGBE( vec4 hdr ){
  return hdr.rgb * exp2( (hdr.a*255.0)-128.0 );
  // return hdr.rgb * pow( 2.0, (hdr.a*255.0)-128.0 );
}

#endif

const vec2 _IBL_UVM = vec2(
  0.25*(254.0/256.0),
  0.125*0.5*(254.0/256.0)
);

vec3 SpecularIBL( sampler2D tEnv, vec3 skyDir, float roughness)
{

  vec2 uvA = octwrapDecode( skyDir );

  float r7   = 7.0*roughness;
  float frac = fract(r7);

  uvA = uvA * _IBL_UVM + vec2(
      0.5,
      0.125*0.5 + 0.125 * ( r7 - frac )
    );

  #if glossNearest

    return decodeRGBE( texture2D(tEnv,uvA) );

  #else

    vec2 uvB=uvA+vec2(0.0,0.125);
    return  mix(
      decodeRGBE( texture2D(tEnv,uvA) ),
      decodeRGBE( texture2D(tEnv,uvB) ),
      frac
    );

  #endif

}

#endif



// Schlick approx
// [Schlick 1994, "An Inexpensive BRDF Model for Physically-Based Rendering"]
// https://github.com/EpicGames/UnrealEngine/blob/dff3c48be101bb9f84633a733ef79c91c38d9542/Engine/Shaders/BRDF.usf#L168
vec3 F_Schlick( float VoH,vec3 spec,float glo )
{
  float dot = glo*glo * pow( 1.0-VoH, 5.0 );
  #if HAS_fresnel
    return( 1.0 - dot )*spec + dot*fresnel();
  #else
    return( 1.0 - dot )*spec + dot;
  #endif
}


// ------------------------------
//

#if HAS_normal
vec3 perturbWorldNormal(vec3 n){
  n = 2.0*n - 1.0;
  vec3 nrm = gl_FrontFacing ? vWorldNormal : -vWorldNormal;
  return vWorldTangent * n.x + vWorldBitangent*n.y + nrm * n.z;
}
#endif


// ------------------------------
//
vec3 toneMap(vec3 c){
  vec3 sqrtc = sqrt( c );
  return(sqrtc-sqrtc*c) + c*(0.4672*c+vec3(0.5328));
}

//                MAIN
// ===================

void main( void ){

  vec4 VAL_tAlbedovTexCoord = texture2D( tAlbedo, vTexCoord);

vec4 VAL_tSpecularvTexCoord = texture2D( tSpecular, vTexCoord);




  // -----------
  vec3 worldNormal =
    #if HAS_normal
      perturbWorldNormal( normal() );
    #else
      gl_FrontFacing ? vWorldNormal : -vWorldNormal;
    #endif

  #if HAS_normal2
    vec3 nrm2 = normal2();

    nrm2 = 2.0*nrm2 - 1.0;
    worldNormal = vWorldTangent * nrm2.x + vWorldBitangent*nrm2.y + worldNormal * nrm2.z;
  #endif
  worldNormal = normalize( worldNormal );


  // SH Irradiance diffuse coeff
  // -------------
  #if perVertexIrrad
    vec3 diffuseCoef = vIrradiance;
  #else
    vec3 diffuseCoef=SampleSH(worldNormal, uSHCoeffs );
    // #if HAS_iblExpo
    //   diffuseCoef = iblExpo().x * pow( diffuseCoef, vec3( iblExpo().y ) );
    // #endif
  #endif



  // IBL reflexion
  // --------------

  vec3 viewDir = normalize( uCameraPosition - vWorldPosition );
  vec3 worldReflect = reflect( -viewDir, worldNormal );


  #if pureGloss
    vec3 specularColor = SampleEnvHi( tEnvHi, worldReflect );
  #else
    vec3 specularColor = SpecularIBL( tEnv, worldReflect, 1.0-gloss() );
  #endif


  // #if HAS_iblExpo
  //   specularColor = iblExpo().x * pow( specularColor, vec3( iblExpo().y ) );
  // #endif


  
highp float roughness = -10.0 / log2( gloss()*0.968+0.03 );
roughness *= roughness;
float specularMul = roughness * (0.125/3.141592) + 0.5/3.141592;


vec3 lSpecularColor = vec3(0.0);
#define LS_SPECULAR lSpecularColor




// post light setup

specularColor += lSpecularColor * specular()*specular();



  float NoV = sdot( viewDir, worldNormal );
  vec3 specularSq = specular()*specular();
  specularColor *= F_Schlick( NoV, specularSq, gloss() );


  vec3 alb = albedo();

  #if HAS_albedoTint
    #if albedoTintLinearLight
      alb = blendLinearLight( albedoTint(), alb, .5 );
    #else
      alb = blendOverlay( alb, albedoTint() );
    #endif
      
  #endif


  #if HAS_albedoMul
    alb *= albedoMul();
  #endif
  

  #if conserveEnergy
    alb = alb - alb * specular();
  #endif
  vec3 albedoSq = alb*alb;


  #if HAS_fuzz
    diffuseCoef += pow( 1.0-NoV, 4.0 ) * fuzz();
  #endif

  #if HAS_occlusion
    diffuseCoef *= occlusion();
  #endif




  #if HAS_cavity
    diffuseCoef   *= cavity() * cavityStrength().r + (1.0-cavityStrength().r);
    specularColor *= cavity() * cavityStrength().g + (1.0-cavityStrength().g);
  #endif


  #if HAS_emissive
    float e = emissive();
    #if HAS_emissiveScale
      e = e * emissiveScale();
    #endif
    diffuseCoef += vec3( e ) * albedo();
  #endif




  FragColor.xyz = diffuseCoef*albedoSq + specularColor;

  #if tonemap
    FragColor.xyz = toneMap( FragColor.xyz );
  #endif

  #if HAS_iblExpo
    FragColor.xyz = iblExpo().x * pow( FragColor.xyz, vec3( iblExpo().y ) );
  #endif


  #if HAS_alpha
    FragColor.a = alpha();
  #else
    FragColor.a = 1.0;
  #endif

}
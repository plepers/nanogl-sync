precision highp float;

#define HAS_albedo 1

#define HAS_albedoTint 1

#define albedoTintLinearLight 1

#define HAS_albedoMul 0

#define HAS_alpha 0

#define HAS_fuzz 0

#define HAS_specular 1

#define HAS_fresnel 0

#define HAS_glossMult 0

#define HAS_basegloss 1

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

#define VAR_CONST_6df31a21 vec2(2.6000000,1.0000000)

#define HAS_iblExpo 1

#define iblExpo(k) VAR_CONST_6df31a21.rg
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



#if __VERSION__ == 300
  #define IN in
  #define OUT out
#else
  #define IN attribute
  #define OUT varying
#endif


IN vec3 aPosition;
IN vec2 aTexCoord;
IN vec2 aTexCoord1;
IN vec3 aNormal;
IN vec3 aTangent;
IN vec3 aBitangent;


#if HAS_secondaryUVScale
  OUT vec2 vTexCoordScaled;
#endif

uniform mat4 uMVP;
uniform mat4 uWorldMatrix;

OUT vec2 vTexCoord;
OUT vec2 vTexCoord1;
OUT vec3 vWorldPosition;

OUT mediump vec3 vWorldNormal;

#if HAS_normal
  OUT mediump vec3 vWorldTangent;
  OUT mediump vec3 vWorldBitangent;
#endif

#if perVertexIrrad
  OUT vec3 vIrradiance;
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


vec3 rotate( mat4 m, vec3 v )
{
  return m[0].xyz*v.x + m[1].xyz*v.y + m[2].xyz*v.z;
}

void main( void ){

  vec4 pos = vec4( aPosition, 1.0 );

  gl_Position    = uMVP         * pos;
  vWorldPosition = (uWorldMatrix * pos).xyz;


  vWorldNormal    = rotate( uWorldMatrix, aNormal );
  #if HAS_normal
    vWorldTangent   = rotate( uWorldMatrix, aTangent );
    vWorldBitangent = rotate( uWorldMatrix, aBitangent );
  #endif

  #if perVertexIrrad
    vIrradiance = SampleSH( normalize( vWorldNormal ), uSHCoeffs );
    // #if HAS_iblExpo
    //   vIrradiance = iblExpo().x * pow( vIrradiance, vec3( iblExpo().y ) );
    // #endif
  #endif


  vTexCoord  = aTexCoord;
  vTexCoord1 = aTexCoord1;
  
  #if HAS_secondaryUVScale
    vTexCoordScaled = aTexCoord * secondaryUVScale();
  #endif

}
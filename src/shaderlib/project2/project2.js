import getUniforms from './get-uniforms';
import fp32 from '../fp32/fp32';

const vs = `\
const float TILE_SIZE = 512.0;
const float PI = 3.1415926536;
const float WORLD_SCALE = TILE_SIZE / (PI * 2.0);

// ref: lib/constants.js
const float PROJECT_IDENTITY = 0.;
const float PROJECT_MERCATOR = 1.;
const float PROJECT_METER_OFFSETS = 2.;
const float PROJECT_MERCATOR_OFFSETS = 3.;

uniform float project_uMode;
uniform float project_uScale;
uniform vec4 project_uCenter;
uniform vec3 project_uPixelsPerUnit;

uniform vec2 project_uViewport;
uniform float project_uDevicePixelRatio;

uniform bool project_uHasModelMatrix;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 projectionMatrixUncentered;


//
// Private Methods
//

// non-linear projection: lnglats => unit tile [0-1, 0-1]
vec2 project_mercator_(vec2 lnglat) {
  return vec2(
    radians(lnglat.x) + PI,
    PI - log(tan_fp32(PI * 0.25 + radians(lnglat.y) * 0.5))
  );
}


//
// Scaling offsets
//

float project_scale(float meters) {
  return meters * project_uPixelsPerUnit.x;
}

vec2 project_scale(vec2 meters) {
  return vec2(
    meters.x * project_uPixelsPerUnit.x,
    meters.y * project_uPixelsPerUnit.x
  );
}

vec3 project_scale(vec3 meters) {
  return vec3(
    meters.x * project_uPixelsPerUnit.x,
    meters.y * project_uPixelsPerUnit.x,
    meters.z * project_uPixelsPerUnit.x
  );
}

vec4 project_scale(vec4 meters) {
  return vec4(
    meters.x * project_uPixelsPerUnit.x,
    meters.y * project_uPixelsPerUnit.x,
    meters.z * project_uPixelsPerUnit.x,
    meters.w
  );
}

//
// Projecting positions
//

vec4 project_position(vec4 position) {
  position = project_uHasModelMatrix ? modelMatrix * position : position;
  if (project_uMode == PROJECT_IDENTITY) {
    return position;
  }
  if (project_uMode == PROJECT_METER_OFFSETS) {
    return project_scale(position);
  }
  if (project_uMode == PROJECT_MERCATOR_OFFSETS) {
    return vec4(position.xy * project_uScale, position.zw);
  }
  // Covers project_uMode == PROJECT_MERCATOR
  return vec4(project_mercator_(position.xy) * WORLD_SCALE * project_uScale, position.zw);
}

vec3 project_position(vec3 position) {
  return project_position(vec4(position, 1.)).xyz;
}

vec2 project_position(vec2 position) {
  return project_position(vec4(position, 0., 1.)).xy;
}


//
// Projecting 64 bit positions (to 32 bit pixel world space)
//

vec2 project_position(vec2 position, vec2 position64) {
  if (project_uMode == PROJECT_IDENTITY) {
    // ignore 64 high precision, not needed
    return position;
  }
  if (project_uMode == PROJECT_METER_OFFSETS) {
    // ignore 64 high precision, not needed
    return project_scale(position);
  }
  if (project_uMode == PROJECT_MERCATOR_OFFSETS) {
    // ignore 64 high precision, not needed
    return position * project_uScale;
  }
  // Covers project_uMode == PROJECT_MERCATOR
  return project_mercator_(position) * WORLD_SCALE * project_uScale;
}


//

vec4 project_to_viewspace(vec4 position) {
  if (project_uMode == PROJECT_METER_OFFSETS) {
    position.w *= project_uPixelsPerUnit.x;
  }
  return modelViewMatrix * position;
}

vec4 project_to_clipspace(vec4 position) {
  if (project_uMode == PROJECT_METER_OFFSETS) {
    position.w *= project_uPixelsPerUnit.x;
  }
  return projectionMatrix * position + project_uCenter;
}
`;

export default {
  name: 'project',
  getUniforms,
  dependencies: [fp32],
  vs,
  fs: null
};

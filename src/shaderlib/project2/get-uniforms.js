// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* global window */
import {calculateDistanceScales} from '../../viewport-mercator-project/web-mercator-utils';
import {fp64ify} from '../fp64/fp64';

import {COORDINATE_SYSTEM} from '../../lib/constants';

import mat4_copy from 'gl-mat4/copy';
import mat4_invert from 'gl-mat4/invert';
import mat4_multiply from 'gl-mat4/multiply';
import vec4_transformMat4 from 'gl-vec4/transformMat4';

import assert from 'assert';

// To quickly set a vector to zero
const ZERO_VECTOR = [0, 0, 0, 0];
// 4x4 matrix that drops 4th component of vector
const VECTOR_TO_POINT_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];

export default function getUniforms(opts) {
  return Object.assign({},
    getViewportUniforms(opts),
    getScreenUniforms(opts),
    getDistanceScaleUniforms(opts)
  );
}

/**
 * Returns uniforms for shaders based on current projection
 * includes: projection matrix suitable for shaders
 *
 * TODO - Ensure this works with any viewport, not just WebMercatorViewports
 *
 * @param {WebMercatorViewport} viewport -
 * @return {Float32Array} - 4x4 projection matrix that can be used in shaders
 */
export function getViewportUniforms({
  viewport,
  modelMatrix = null,
  coordinateSystem = COORDINATE_SYSTEM.LNGLAT,
  coordinateOrigin = [0, 0]
} = {}) {
  assert(viewport.scale, 'Viewport scale missing');

  const {projectionCenter, modelViewMatrix, modelViewProjectionMatrix, cameraPos} =
    calculateMatrixAndOffset({viewport, coordinateSystem, coordinateOrigin, modelMatrix});

  assert(modelViewProjectionMatrix, 'Viewport missing modelViewProjectionMatrix');

  // Calculate projection pixels per unit
  const {pixelsPerMeter} = viewport.getDistanceScales();
  assert(pixelsPerMeter, 'Viewport missing pixelsPerMeter');

  // calculate WebGL matrices

  // Convert to Float32
  const glProjectionMatrix = new Float32Array(modelViewProjectionMatrix);

  // "Float64Array"
  // Transpose the projection matrix to column major for GLSL.
  const glProjectionMatrixFP64 = new Float32Array(32);
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      [
        glProjectionMatrixFP64[(i * 4 + j) * 2],
        glProjectionMatrixFP64[(i * 4 + j) * 2 + 1]
      ] = fp64ify(modelViewProjectionMatrix[j * 4 + i]);
    }
  }

  return {
    // Projection mode values
    project_uMode: coordinateSystem,
    project_uOrigin: projectionCenter,

    // For mercator projection in shader
    project_uScale: viewport.scale, // This is the mercator scale (2 ** zoom)
    project_uScaleFP64: fp64ify(viewport.scale), // Deprecated?
    project_uPixelsPerUnit: pixelsPerMeter,

    // This is for lighting calculations
    project_uCameraPosition: new Float32Array(cameraPos),

    // Projection matrices
    project_uHasModelMatrix: Boolean(modelMatrix),
    modelViewMatrix: new Float32Array(modelViewMatrix),
    projectionMatrix: glProjectionMatrix,
    projectionMatrixUncentered: glProjectionMatrix,
    projectionFP64: glProjectionMatrixFP64
  };
}

// The code that utilizes Matrix4 does the same calculation as their mat4 counterparts,
// has lower performance but provides error checking.
// Uncomment when debugging
function calculateMatrixAndOffset({
  viewport,
  coordinateSystem,
  coordinateOrigin,
  modelMatrix
}) {
  const {viewMatrixUncentered, viewMatrix, projectionMatrix, viewProjectionMatrix} = viewport;

  let projectionCenter;
  let modelViewMatrix;

  switch (coordinateSystem) {

  case COORDINATE_SYSTEM.IDENTITY:
  case COORDINATE_SYSTEM.LNGLAT:
    projectionCenter = ZERO_VECTOR;
    // modelViewMatrix = new Matrix4(viewMatrix);
    modelViewMatrix = mat4_copy([], viewMatrix);
    break;

  // TODO: make lighitng work for meter offset mode
  case COORDINATE_SYSTEM.METER_OFFSETS:
    // Calculate transformed projectionCenter (in 64 bit precision)
    // This is the key to offset mode precision (avoids doing this
    // addition in 32 bit precision)
    const posit_uPixels = viewport.projectFlat(coordinateOrigin);
    // projectionCenter = new Matrix4(viewProjectionMatrix)
    //   .transformVector([posit_uPixels[0], posit_uPixels[1], 0.0, 1.0]);
    projectionCenter = vec4_transformMat4([],
      [posit_uPixels[0], posit_uPixels[1], 0.0, 1.0],
      viewProjectionMatrix);

    // Always apply uncentered projection matrix if available (shader adds center)
    // Zero out 4th coordinate ("after" model matrix) - avoids further translations
    // modelViewMatrix = new Matrix4(viewMatrixUncentered || viewMatrix)
    //   .multiplyRight(VECTOR_TO_POINT_MATRIX);
    modelViewMatrix = mat4_multiply([], viewMatrixUncentered || viewMatrix, VECTOR_TO_POINT_MATRIX);
    break;

  default:
    throw new Error('Unknown projection mode');
  }

  const viewMatrixInv = mat4_invert([], modelViewMatrix) || modelViewMatrix;

  if (modelMatrix) {
    // Apply model matrix if supplied
    // modelViewMatrix.multiplyRight(modelMatrix);
    mat4_multiply(modelViewMatrix, modelViewMatrix, modelMatrix);
  }

  // const modelViewProjectionMatrix = new Matrix4(projectionMatrix).multiplyRight(modelViewMatrix);
  const modelViewProjectionMatrix = mat4_multiply([], projectionMatrix, modelViewMatrix);
  const cameraPos = [viewMatrixInv[12], viewMatrixInv[13], viewMatrixInv[14]];

  return {
    modelMatrix,
    modelViewMatrix,
    modelViewProjectionMatrix,
    projectionCenter,
    cameraPos
  };
}

function getScreenUniforms({
  width,
  height,
  useDevicePixelRatio = true
}) {
  const devicePixelRatio = useDevicePixelRatio && window ? window.devicePixelRatio : 1;
  return {
    project_uViewportSize: [width * devicePixelRatio, height * devicePixelRatio],
    project_uDevicePixelRatio: devicePixelRatio
  };
}

function getDistanceScaleUniforms({
  longitude,
  latitude,
  zoom
}) {
  const uniforms = {};
  if (!isNaN(longitude) || !isNaN(latitude) || !isNaN(zoom)) {
    const {pixelsPerMeter} = calculateDistanceScales({longitude, latitude, zoom});
    uniforms.project_uPixelsPerMeter = pixelsPerMeter;
  }
  return uniforms;
}

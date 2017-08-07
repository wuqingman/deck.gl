
# project (Vertex Shader Module)

The `project` module makes it easy to write vertex shaders that implement deck.gl's projection systems, enabling your layer to efficiently work in multiple coordinate systems, either [longitude,latitude,altitude] or [metersX,metersY,metersZ].

To support the basic features expected of a deck.gl layer, such as various viewport types and geospatial coordinate systems, your own shaders should always use `project` package functions.

## Usage

Project and scale
```glsl
// instanced geometry
attribute vec3 positions;
// instance attributes
attribute vec3 instanceCenter;
attribute float instanceSize;

void main(void) {
  vec3 center = project_position(instanceCenter);
  vec3 vertex = positions * project_scale(instanceSize);
  gl_Position = project_to_clipspace(center + vertex);
}
```

## Concepts

### Coordinate Systems

By choosing coordinate system, the application decides how positions are interpreted. The following values are defined in the `COORDINATE_SYSTEM` namespace:

| Coordinate System                  | Description |
| `COORDINATE_SYSTEM.LNGLAT`         | Positions are web mercator coordinates (lng, lats, meters) |
| `COORDINATE_SYSTEM.METER_OFFSETS`  | x,y,z positions are in meter offsets from center point |
| `COORDINATE_SYSTEM.IDENTITY`       | Positions are already in world units, no cartographic projection or scaling is applied. |
| `COORDINATE_SYSTEM.LNGLAT_OFFSETS` | (Under consideration, not yet available) x,y positions are lng, lats offsets from center point. |
| `COORDINATE_SYSTEM.TILE0`          | (Under consideration, not yet available) Positions are web mercator tile 0 coordinates: [lng,lat]s pre-projected to tile 0, x, y is linear [0, 512), z is meters. |
| `COORDINATE_SYSTEM.TILE0_OFFSETS`  | (Under consideration, not yet available) x,y positions are offsets of "pre-projected" web mercator world (tile 0) coordinates, z in meters. |

Notes
* The `..._OFFSET` modes provide better precision for data sets that are local on a map, often avoiding the need for 64 bit coordinates, even at very high zoom levels.
* When providing 64-bit coordinates in non-offset modes, the project module will automatically use a 64 bit subtraction operation on the 64 bit position to calculate offset against a center (either viewport center or coordinate origin). The resulting 32 bit offset will usually be numerically smaller and retain more precision than the high 32 bits of the position.


### Model Matrix

The model matrix is expected to generate coordinates in the coordinate system you are using.

The model matrix is very natural to apply in offset modes, less so in other modes.


### A "Pixel World"

The first thing that is normally done in the vertex shader is to call `project_position` on the supplied positions. The projected positions returned by `project_position` are in a 'pixel' world coordinate system making it straightforward to do screen space type calculations by adding desired number of pixels, taking `project_uDevicePixelRatio` into account as appropriate.

To work in meters, use the `project_scale` function - it converts a "distance" in meters to the corresponding "distance" in the 'pixel' world coordinate system, which makes it possible to simply add meter based offsets to positions inside the shader.

`project_position` and `project_scale` transparently check the current projection mode (`project_uMode`) and interpret the coordinates per the given mode.


## JavaScript Methods

### getUniforms

// Coordinate system
* `coordinateSystem` () - determines how positions will be interpreted
* `coordinateOrigin` () - supplying an origin is necessary for offset modes

// Screen/Viewport size
* `width`
* `height`
* `useDevicePixelRatio`=`true`

// Matrices
* `modelMatrix` () -
* `viewMatrix` () -
* `projectionMatrix` () -

// Local distance scales
* `distanceScales` -
* `longitude` () -
* `latitude` () -
* `zoom` () -


## GLSL Uniforms

The `project` module represents a camera system and sets up a lot of uniforms which are of interest for other modules (in particular lighting modules)

Projection matrices
* `modelMatrix` -
* `modelViewMatrix` -
* `modelViewProjectionMatrix` - new Float32Array(modelViewMatrix),
* `projectionMatrix` - glProjectionMatrix,
* `projectionMatrixUncentered` - glProjectionMatrix,
* `projectionFP64` - glProjectionMatrixFP64

As an optimization, an application can check
* `project_uHasModelMatrix` - whether model matrix needs to be applied

Screen size
* `project_uViewportSize` - [viewport.width * devicePixelRatio, viewport.height * devicePixelRatio],
* `project_uDevicePixelRatio` - devicePixelRatio,

Projection mode values
* `project_uMode` - projectionMode,
* `project_uCenter` - projectionCenter,

* `project_uPixelsPerUnit` - pixelsPerMeter,
* `project_uScale` - viewport.scale, // This is the mercator scale (2 ** zoom)
* `project_uScaleFP64` - fp64ify(viewport.scale), // Deprecated?

For lighting calculations and effects
* `project_uCameraPosition` - new Float32Array(cameraPos)


## GLSL Methods

### project_position

Projects positions to "pixel world space" coordinates. Applies `modelMatrix` if it was supplied. X and Y might be cartographically (non-linearly) projected.

Signatures:
* `vec2 project_position(vec2 position)`
* `vec3 project_position(vec3 position)`
* `vec4 project_position(vec4 position)`

Operation:
* `COORDINATE_SYSTEM.LNGLAT`: Positions are web mercator coordinates (lng, lats, meters)
* `COORDINATE_SYSTEM.LNGLAT_OFFSETS`: Distance scales are calculated from offset origin `lng`,`lat`,`zoom`
* `COORDINATE_SYSTEM.TILE0`: Positions are "pre-projected" web mercator world coordinates (tile 0, x, y range between [0, 511], z in meters).
* `COORDINATE_SYSTEM.TILE0_OFFSETS`: Positions are offsets of "pre-projected" web mercator world coordinates (tile 0, x, y range between [0, 511], z in meters).
* `COORDINATE_SYSTEM.METER_OFFSETS`: Distance scales are calculated from offset origin `lng`,`lat`,`zoom`
* `COORDINATE_SYSTEM.IDENTITY`: Distance scales are "disabled" (set to identity: `1`,`1`,`1`), i.e. distances are interpreted as if in the app's world coordinates, not meters.


### project_position64

Projects 64 bit positions to "pixel world space" coordinates. Applies `modelMatrix` if it was supplied.

* `vec2 project_position64(vec2 position, vec2 position64)`

Notes:
* The performance impact of `project_position64` is minimal as it will only use 64 bit math for initial delta calculations. It will not do 64-bit matrix multiplication or mercator projection. To achieve that, please use the `project64` shader package.
* `project_position64` effectively turns `COORDINATE_SYSTEM.LNGLAT` into `COORDINATE_SYSTEM.LNGLAT_OFFSETS` and `COORDINATE_SYSTEM.TILE0` into `COORDINATE_SYSTEM.TILE0_OFFSETS`.


### project_scale

Scales a distance in meters to a "pixel world space" distance. The resulting value can be added directly to positions projected through `project_position`.

Signatures:
* `float project_scale(float meters)`
* `vec2 project_scale(vec2 meters)`
* `vec3 project_scale(vec3 meters)`
* `vec4 project_scale(vec4 meters)`

Operation:
* `COORDINATE_SYSTEM.LNGLAT`: Distance scales are calculated from viewport center `lng`,`lat`,`zoom`
* `COORDINATE_SYSTEM.LNGLAT_OFFSETS`: Distance scales are calculated from offset origin `lng`,`lat`,`zoom`
* `COORDINATE_SYSTEM.METER_OFFSETS`: Distance scales are calculated from offset origin `lng`,`lat`,`zoom`
* `COORDINATE_SYSTEM.IDENTITY`: Distance scales are "disabled" (set to identity: `1`,`1`,`1`), i.e. distances are interpreted as if in the app's world coordinates, not meters.



### project_to_clipspace

`vec4 project_to_clipspace(vec4 position)`

Projects "pixel worldspace coordinates" to standard OpenGL clipspace coordinates. Applies `viewProjectionMatrix`. The resulting value can be assigned to `gl_Position` as the return value from the vertex shader.


### project_model_to_clipspace (Under Consideration, Not Yet Available)

`vec4 project_to_clipspace(vec4 position)`

Projects "pixel worldspace coordinates" to standard OpenGL clipspace coordinates. Applies `modelViewProjectionMatrix`. The resulting value can be assigned to `gl_Position` as the return value from the vertex shader.


### project_view_to_clipspace (Under Consideration, Not Yet Available)

`vec4 project_view_to_clipspace(vec4 position)`

Projects "pixel worldspace coordinates" to standard OpenGL clipspace coordinates. Applies `viewProjectionMatrix`. The resulting value can be assigned to `gl_Position` as the return value from the vertex shader.


### project_to_viewspace (Under Consideration, Not Yet Available)

`vec4 project_to_viewspace(vec4 position)`

Projects worldspace coordinates to viewspace coordinates. Applies `viewMatrix`. Allows application to work in view (camera) coordinates. Typically followed by a `project_view_to_clipspace`.


## TODOs

* Rename `project_position` to `project_model`, or `project_to_world`?
* Rename `project_scale` to `project_meters`?

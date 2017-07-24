/* global Uint16Array, Float32Array */

import {Layer} from 'deck.gl';
import {GL, Model, Geometry} from 'luma.gl';

import markerLayerVertex from './marker-layer-vertex.glsl';
import markerLayerFragment from './marker-layer-fragment.glsl';
import {Arrow} from './markers';

const DEFAULT_COLOR = [0, 0, 0, 255];

const defaultProps = {
  getAngle: x => x.angle || x.theta || 0,
  marker: Arrow
};

export default class MarkerLayer extends Layer {
  getShaders() {
    return {
      vs: markerLayerVertex,
      fs: markerLayerFragment,
      modules: ['project'],
      shaderCache: this.context.shaderCache
    };
  }

  initializeState() {
    this.setState({
      model: this._getModel(this.context.gl)
    });

    this.state.attributeManager.addInstanced({
      instancePositions: {
        size: 3,
        accessor: 'getPosition',
        update: this.calculateInstancePositions
      },
      instanceColors: {
        size: 4,
        type: GL.UNSIGNED_BYTE,
        accessor: 'getColor',
        update: this.calculateInstanceColors
      },
      instanceRadius: {
        size: 1,
        accessor: 'getRadius',
        defaultValue: 1,
        update: this.calculateInstanceRadius
      },
      instanceAngles: {
        size: 1,
        defaultValue: 0,
        accessor: 'getAngle',
        update: this.calculateInstanceAngles
      }
    });
  }

  _getModel(gl) {
    const {id, marker: {indices, vertices}} = this.props;
    return new Model(
      gl,
      Object.assign({}, this.getShaders(), {
        id,
        geometry: new Geometry({
          drawMode: GL.TRIANGLES,
          indices: new Uint16Array(indices),
          vertices: new Float32Array(vertices)
        }),
        isInstanced: true,
        shaderCache: this.context.shaderCache
      })
    );
  }

  calculateInstancePositions(attribute) {
    const {data, getPosition} = this.props;
    const {value} = attribute;
    let i = 0;
    data.forEach(datum => {
      const position = getPosition(datum);
      value[i++] = position[0];
      value[i++] = position[1];
      value[i++] = position[2] || 0;
    });
  }

  calculateInstanceRadius(attribute) {
    const {data, getRadius} = this.props;
    const {value} = attribute;
    let i = 0;
    data.forEach(datum => {
      const radius = getRadius(datum);
      value[i++] = isNaN(radius) ? 1 : radius;
    });
  }

  calculateInstanceColors(attribute) {
    const {data, getColor} = this.props;
    const {value} = attribute;
    let i = 0;
    data.forEach(datum => {
      const color = getColor(datum) || DEFAULT_COLOR;
      value[i++] = color[0];
      value[i++] = color[1];
      value[i++] = color[2];
      value[i++] = isNaN(color[3]) ? 255 : color[3];
    });
  }

  calculateInstanceAngles(attribute) {
    const {data, getAngle} = this.props;
    const {value} = attribute;
    let i = 0;
    data.forEach(datum => {
      const angle = getAngle(datum);
      value[i++] = isNaN(angle) ? 0 : angle;
    });
  }
}

MarkerLayer.layerName = 'MarkerLayer';
MarkerLayer.defaultProps = defaultProps;

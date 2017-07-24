import {COORDINATE_SYSTEM, CompositeLayer, LineLayer} from 'deck.gl';
import {MarkerLayer} from '../';

const DEFAULT_PADDING = 8;
const MAX_NUM_INSTANCE = 100;

export default class StyledLineLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      features: []
    };
  }

  updateState({oldProps, props, changeFlags}) {
    if (!changeFlags.propsOrDataChanged) {
      return;
    }

    const {
      data,
      marker,
      markerPadding,
      maxNumMakers,
      strokeWidth,
      getSourcePosition,
      getTargetPosition,
      getColor
    } = this.props;

    if (!marker) {
      this.state.features = data;
      return;
    }

    const [offX, offY] = marker.offset;

    this.state.features = data.reduce((features, line) => {
      const [x0, y0] = getSourcePosition(line);
      const [x1, y1] = getTargetPosition(line);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const padding = Math.max(
        Math.floor(distance / maxNumMakers || MAX_NUM_INSTANCE),
        markerPadding || DEFAULT_PADDING
      );

      const theta = dy === 0 ? 0 : Math.atan2(dy, dx);
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      for (let i = 0, n = distance / padding; i < n; i++) {
        features.push({
          position: [
            x0 + padding * i * cosTheta + offX * strokeWidth,
            y0 + padding * i * sinTheta + offY * strokeWidth
          ],
          color: getColor(line),
          theta: theta * 180 / Math.PI
        });
      }

      return features;
    }, []);
  }

  renderLayers() {
    const {id, marker, strokeWidth, projectionMode, updateTriggers} = this.props;
    const {features} = this.state;

    if (!features || features.length === 0) {
      return [];
    }

    if (!marker) {
      const {getSourcePosition, getTargetPosition, getColor} = this.props;
      return new LineLayer({
        id: `${id}-line-layer`,
        data: features,
        getSourcePosition,
        getTargetPosition,
        getColor,
        strokeWidth,
        projectionMode: COORDINATE_SYSTEM.IDENTITY
      });
    }

    return [
      new MarkerLayer({
        id: `${id}-marker-layer`,
        data: features,
        marker,
        projectionMode,
        getPosition: f => f.position,
        getColor: f => f.color,
        getRadius: f => strokeWidth / 2,
        updateTriggers: {
          getPosition: updateTriggers.getSourcePosition || updateTriggers.getTargetPosition,
          getColor: updateTriggers.getColor,
          getAngle: updateTriggers.getAngle
        }
      })
    ];
  }
}

StyledLineLayer.layerName = 'StyledLineLayer';

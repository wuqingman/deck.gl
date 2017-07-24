import {CompositeLayer} from 'deck.gl';
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

    const {data, getFeatureId, getSourcePosition, getTargetPosition, getColor} = this.props;

    this.state.features = data.reduce((features, line) => {
      const id = getFeatureId(line);
      const [x0, y0] = getSourcePosition(line);
      const [x1, y1] = getTargetPosition(line);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const padding = Math.max(Math.floor(distance / MAX_NUM_INSTANCE), DEFAULT_PADDING);

      const theta = dy === 0 ? 0 : Math.atan2(dy, dx);
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      for (let i = 0, n = distance / padding; i < n; i++) {
        features.push({
          id,
          position: [x0 + padding * i * cosTheta, y0 + padding * i * sinTheta],
          color: getColor(line),
          theta: theta * 180 / Math.PI
        });
      }

      return features;
    }, []);
  }

  renderLayers() {
    const {id, strokeWidth, projectionMode, updateTriggers} = this.props;
    const {features} = this.state;

    if (!features || features.length === 0) {
      return [];
    }

    return [
      new MarkerLayer({
        id: `${id}-marker-layer`,
        data: features,
        projectionMode,
        getPosition: f => f.position,
        getColor: f => f.color,
        getRadius: f => strokeWidth,
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

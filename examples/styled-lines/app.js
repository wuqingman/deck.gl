/* global document, window*/
/* eslint-disable no-console */
import React, {PureComponent} from 'react';
import {render} from 'react-dom';
import DeckGL, {OrthographicViewport, COORDINATE_SYSTEM} from 'deck.gl';

import {Quad, Rectangle, Arrow, getMarkerId, getMarkerById, StyledLineLayer} from './layers';

const LINES = [
  {source: [-1000, -30], target: [1000, -30]},
  {source: [-1000, -10], target: [1000, -10], marker: Rectangle},
  {source: [-1000, 10], target: [1000, 10], marker: Quad},
  {source: [-1000, 30], target: [1000, 30], marker: Arrow}
];

const MARKER_PADDING_MAP = {
  [Rectangle.id]: 32,
  [Quad.id]: 10,
  [Arrow.id]: 4
};

class Example extends PureComponent {
  constructor(props) {
    super(props);

    this._onResize = this._onResize.bind(this);
    this.state = {
      groupedLines: this._groupLinesByMarker(LINES)
    };
  }

  componentWillMount() {
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  _onResize() {
    const {innerWidth: width, innerHeight: height} = window;
    this.setState({width, height});
  }

  _groupLinesByMarker(lines) {
    return lines.reduce((result, line) => {
      const markerId = getMarkerId(line.marker);
      if (result[markerId]) {
        result[markerId].push(line);
      } else {
        result[markerId] = [line];
      }
      return result;
    }, {});
  }

  _renderStyledLines() {
    const {groupedLines} = this.state;

    return Object.keys(groupedLines).map(markerId => {
      return new StyledLineLayer({
        id: `styled-line-${markerId}-layer`,
        data: groupedLines[markerId],
        marker: getMarkerById(markerId),
        markerPadding: MARKER_PADDING_MAP[markerId],
        maxNumMakers: 200,
        getFeatureId: f => f.id,
        getSourcePosition: f => f.source,
        getTargetPosition: f => f.target,
        getColor: f => [Math.random() * 255, Math.random() * 255, Math.random() * 255, 255],
        strokeWidth: 12,
        projectionMode: COORDINATE_SYSTEM.IDENTITY
      });
    });
  }

  render() {
    const {width, height} = this.state;
    if (width <= 0 || height <= 0) {
      return null;
    }

    const glViewport = new OrthographicViewport({
      width,
      height,
      left: -width / 2,
      top: -height / 2
    });

    return (
      <DeckGL
        width={width}
        height={height}
        viewport={glViewport}
        layers={this._renderStyledLines()}
      />
    );
  }
}

const root = document.createElement('div');
document.body.appendChild(root);

render(<Example />, root);

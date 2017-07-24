/* global document, window*/
/* eslint-disable no-console */
import React, {PureComponent} from 'react';
import {render} from 'react-dom';
import DeckGL, {LineLayer, OrthographicViewport, COORDINATE_SYSTEM} from 'deck.gl';

import {Quad, Rectangle, Arrow, StyledLineLayer} from './layers';

class Example extends PureComponent {
  constructor(props) {
    super(props);

    this._onResize = this._onResize.bind(this);
    this.state = {
      lines: [
        {id: 0, source: [-300, -100], target: [300, -100], marker: Rectangle},
        {id: 1, source: [-300, -80], target: [300, -80], marker: Quad},
        {id: 2, source: [-300, -60], target: [300, -60], marker: Arrow},
        {id: 3, source: [-300, -40], target: [300, -40], marker: Rectangle},
        {id: 4, source: [-300, -20], target: [300, -20], marker: Rectangle},
        {id: 5, source: [-300, 0], target: [300, 0], marker: Rectangle},
        {id: 6, source: [-300, 20], target: [300, 20], marker: Rectangle},
        {id: 7, source: [-300, 40], target: [300, 40], marker: Rectangle},
        {id: 8, source: [-300, 60], target: [300, 60], marker: Rectangle},
        {id: 9, source: [-300, 80], target: [300, 80], marker: Rectangle},
        {id: 10, source: [-300, 100], target: [300, 100], marker: Rectangle}
      ]
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

  _renderStyledLines() {
    const {lines} = this.state;

    return [
      new StyledLineLayer({
        id: 'styled-line-layer',
        data: lines,
        getFeatureId: line => line.id,
        getSourcePosition: line => line.source,
        getTargetPosition: line => line.target,
        getColor: line => [64, 64, 64, 255],
        getMarker: line => line.marker,
        strokeWidth: 4,
        projectionMode: COORDINATE_SYSTEM.IDENTITY
      }),
      new LineLayer({
        id: 'line-layer',
        data: lines,
        getSourcePosition: line => line.source,
        getTargetPosition: line => line.target,
        getColor: e => [64, 64, 64, 255],
        strokeWidth: 1,
        projectionMode: COORDINATE_SYSTEM.IDENTITY
      })
    ];
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

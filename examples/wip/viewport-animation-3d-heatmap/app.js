/* global window,document, setInterval*/
import React, {Component} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGLOverlay from './deckgl-overlay.js';
import {experimental} from 'deck.gl';
import {csv as requestCsv} from 'd3-request';

const {AnimationMapController} = experimental;

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

// Source data CSV
const DATA_URL = 'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv';  // eslint-disable-line

class Root extends Component {

  constructor(props) {
    super(props);
    this.state = {
      viewport: {
        ...DeckGLOverlay.defaultViewport,
        width: 500,
        height: 500
      },
      data: null,
      viewportAnimationDuration: 0,
      viewportToggled: false
    };

    requestCsv(DATA_URL, (error, response) => {
      if (!error) {
        const data = response.map(d => ([Number(d.lng), Number(d.lat)]));
        this.setState({data});
      }
    });
  }

  componentDidMount() {
    window.addEventListener('resize', this._resize.bind(this));
    this._resize();

    // TODO: this is to just simulate viwport prop change and test animation.
    this._interval = setInterval(() => this._toggleViewport(), 7000);
  }

  _resize() {
    this._onViewportChange({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  _onViewportChange(viewport) {
    console.log(`App: onViewportChange: pitch: ${viewport.pitch}`);
    this.setState({
      viewport: {...this.state.viewport, ...viewport}
//      viewportAnimationDuration: 0
    });
  }

  // TODO: this is to just simulate viwport prop change and test animation.
  // Add proper UI to change viewport.
  _toggleViewport() {
    const newViewport = {};
    newViewport.pitch = this.state.viewportToggled ? 60.0 : 0.0;
    newViewport.bearing = this.state.viewportToggled ? -90.0 : 0.0;
    console.log(`App ----------------- App toggle viewport new pitch: ${newViewport.pitch}`);
    this.setState({
      viewport: {...this.state.viewport, ...newViewport},
      viewportAnimationDuration: 2000,
      viewportToggled: !this.state.viewportToggled
    });
  }

  // -here- _toggleViewport() calls with `viewportAnimationDuration` which
  // triggers _onViewportChange, which will re-set animationDuration to 0 causing animation to stop.

  render() {
    const {viewport, data, viewportAnimationDuration} = this.state;
    console.log(`App Render: viewportAnimationDuration: ${viewportAnimationDuration}`);
    return (
      <AnimationMapController
        {...viewport}
        onViewportChange={this._onViewportChange.bind(this)}
        viewportAnimationDuration={viewportAnimationDuration}>
        <StaticMap
          {...viewport}
          mapStyle="mapbox://styles/mapbox/dark-v9"
          onViewportChange={this._onViewportChange.bind(this)}
          mapboxApiAccessToken={MAPBOX_TOKEN}>
          <DeckGLOverlay
            viewport={viewport}
            data={data || []}
          />
        </StaticMap>
      </AnimationMapController>
    );
  }
}

render(<Root />, document.body.appendChild(document.createElement('div')));

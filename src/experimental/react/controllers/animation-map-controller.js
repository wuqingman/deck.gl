/* global setInterval, clearInterval */
import {PureComponent, createElement, cloneElement, Children, isValidElement} from 'react';
import PropTypes from 'prop-types';

import {EventManager} from 'mjolnir.js';
import MapControls from '../../../controllers/map-controls';
import {MAPBOX_LIMITS} from '../../../controllers/map-state';
import CURSOR from '../../../react/controllers/cursors';

import {viewportLinearAnimation} from './viewport-animation-utils.js';

const VIEWPORT_ANIMATE_PROPS = ['pitch', 'longitude', 'latitude', 'zoom', 'bearing'];
const VIEWPORT_ANIMATE_FREQUENCY = 0.01;
const VIEWPORT_ANIMATION_DURATION = 0;
const VIEWPORT_ANIMATION_EASING_FUNC = t => t;

const propTypes = {
  /** The width of the map. */
  width: PropTypes.number.isRequired,
  /** The height of the map. */
  height: PropTypes.number.isRequired,
  /** The longitude of the center of the map. */
  longitude: PropTypes.number.isRequired,
  /** The latitude of the center of the map. */
  latitude: PropTypes.number.isRequired,
  /** The tile zoom level of the map. */
  zoom: PropTypes.number.isRequired,
  /** Specify the bearing of the viewport */
  bearing: PropTypes.number,
  /** Specify the pitch of the viewport */
  pitch: PropTypes.number,
  /** Altitude of the viewport camera. Default 1.5 "screen heights" */
  // Note: Non-public API, see https://github.com/mapbox/mapbox-gl-js/issues/1137
  altitude: PropTypes.number,

  /** Viewport constraints */
  // Max zoom level
  maxZoom: PropTypes.number,
  // Min zoom level
  minZoom: PropTypes.number,
  // Max pitch in degrees
  maxPitch: PropTypes.number,
  // Min pitch in degrees
  minPitch: PropTypes.number,

  /**
   * `onViewportChange` callback is fired when the user interacted with the
   * map. The object passed to the callback contains viewport properties
   * such as `longitude`, `latitude`, `zoom` etc.
   */
  onViewportChange: PropTypes.func,

  /** Viewport animation **/
  // animation duration for viewport change
  viewportAnimationDuration: PropTypes.number,
  // function called for each animation step, can be used to perform custom animations.
  viewportAnimationFunc: PropTypes.func,
  // easing function
  viewportAnimationEasingFunc: PropTypes.func,

  /** Enables control event handling */
  // Scroll to zoom
  scrollZoom: PropTypes.bool,
  // Drag to pan
  dragPan: PropTypes.bool,
  // Drag to rotate
  dragRotate: PropTypes.bool,
  // Double click to zoom
  doubleClickZoom: PropTypes.bool,
  // Pinch to zoom / rotate
  touchZoomRotate: PropTypes.bool,

  /** Accessor that returns a cursor style to show interactive state */
  getCursor: PropTypes.func,

  // A map control instance to replace the default map controls
  // The object must expose one property: `events` as an array of subscribed
  // event names; and two methods: `setState(state)` and `handle(event)`
  controls: PropTypes.shape({
    events: PropTypes.arrayOf(PropTypes.string),
    handleEvent: PropTypes.func
  })
};

const getDefaultCursor = ({isDragging}) => isDragging ? CURSOR.GRABBING : CURSOR.GRAB;

const defaultProps = Object.assign({}, MAPBOX_LIMITS, {
  onViewportChange: null,
  viewportAnimationDuration: VIEWPORT_ANIMATION_DURATION,
  viewportAnimationFunc: viewportLinearAnimation,
  viewportAnimationEasingFunc: VIEWPORT_ANIMATION_EASING_FUNC,

  scrollZoom: true,
  dragPan: true,
  dragRotate: true,
  doubleClickZoom: true,
  touchZoomRotate: true,

  getCursor: getDefaultCursor
});

export default class AnimationMapController extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      isDragging: false      // Whether the cursor is down

    };
  }

  componentDidMount() {
    const {eventCanvas} = this.refs;

    const eventManager = new EventManager(eventCanvas);

    this._eventManager = eventManager;

    // If props.controls is not provided, fallback to default MapControls instance
    // Cannot use defaultProps here because it needs to be per map instance
    this._controls = this.props.controls || new MapControls();
    this._controls.setOptions(Object.assign({}, this.props, {
      onStateChange: this._onInteractiveStateChange.bind(this),
      eventManager
    }));
  }

  componentWillUpdate(nextProps) {
    this._controls.setOptions(nextProps);
    this._animateViewportProp(nextProps);
  }

  componentWillUnmount() {
    this._eventManager.destroy();
  }

  _onInteractiveStateChange(interactiveState) {
    const {isDragging = false} = interactiveState;
    if (isDragging !== this.state.isDragging) {
      this.setState({isDragging});
    }
  }

  // TODO: add viewport or viewportState prop to avoid this extraction.
  _extractViewportFromProps(props) {
    return {
      width: props.width,
      height: props.height,
      latitude: props.latitude,
      longitude: props.longitude,
      zoom: props.zoom,
      bearing: props.bearing,
      pitch: props.pitch,
      altitude: props.altitude
    };
  }

  _createAnimationInterval() {
    if (this.state.animationInterval) {
      console.log('### stop old animation');
      clearInterval(this.state.animationInterval);
    }
    console.log('### start new animation');
    const updateFrequency = this.props.viewportAnimationDuration * VIEWPORT_ANIMATE_FREQUENCY;
    return setInterval(() => this._updateViewport(), updateFrequency);
  }

  _animateViewportProp(nextProps) {
    console.log(`process new props pitch: ${nextProps.pitch}`);
    if (this._isViewportAnimationEnabled()) {
      const startViewport = this._extractViewportFromProps(this.props);
      const endViewport = this._extractViewportFromProps(nextProps);
      if (this._didViewportAnimatePropChanged(startViewport, endViewport)) {
        const animationInterval = this._createAnimationInterval();
        this.setState({
          animationT: 0.0,
          animationStartViewport: startViewport,
          animationEndViewport: endViewport,
          animationInterval,
          animatedViewport: startViewport
        });
      }
    }
  }

  _didViewportAnimatePropChanged(startViewport, endViewport) {
    console.log(`Controller detect viewportChange for pitch : start: ${startViewport.pitch} end ${endViewport.pitch} animated: ${this.state.animatedViewport ? this.state.animatedViewport.pitch : 'null'}`);
    for (const p of VIEWPORT_ANIMATE_PROPS) {
      if (startViewport[p] !== undefined &&
        endViewport[p] !== undefined &&
        (this.state.animatedViewport ? endViewport[p] !== this.state.animatedViewport[p] : true) &&
        startViewport[p] !== endViewport[p]) {
        console.log(` TRUE : Controller detected viewportChange for ${p}: start: ${startViewport[p]} end ${endViewport[p]} animated: ${this.state.animatedViewport ? this.state.animatedViewport[p] : 'null'}`);

        if (this.state.animatedViewport && endViewport[p] !== this.state.animatedViewport[p]) {
          console.log('Viewport update while in animation ###### ');
        }
        return true;
      }
    }
    console.log(' FALSE ');
    return false;
  }

  _updateViewport() {
    const t = this.props.viewportAnimationEasingFunc(this.state.animationT);
    const animatedViewport = this.props.viewportAnimationFunc(
      this.state.animationStartViewport,
      this.state.animationEndViewport,
      t
    );

    if (this.state.animationT <= 1.0) {
      // console.log(`Controller update pitch: ${animatedViewport.pitch} t: ${t}`);
      this.setState(prevState => ({
        animationT: (
          prevState.animationT + VIEWPORT_ANIMATE_FREQUENCY > 1.0 &&
          prevState.animationT + VIEWPORT_ANIMATE_FREQUENCY < 1.0 + VIEWPORT_ANIMATE_FREQUENCY
        ) ? 1.0 : prevState.animationT + VIEWPORT_ANIMATE_FREQUENCY,
        animatedViewport
      }));
      if (this.props.onViewportChange) {
        this.props.onViewportChange(animatedViewport);
      }
    } else {
      this._endAnimation();
    }
  }

  _endAnimation() {
    console.log('### animation ended');
    clearInterval(this.state.animationInterval);
    this.setState({
      animationT: 0,
      animationInterval: null,
      animationStartState: null,
      animationEndState: null,
      animatedViewport: null
    });
  }

  _recursiveUpdateChildren(children, viewport) {
    return Children.map(children, child => {
      if (!isValidElement(child)) {
        return child;
      }
      // TODO: we need to filter chidren and only update those that require
      // updated viewport prop.
      const childProps = Object.assign({}, viewport, {viewport});
      childProps.children = this._recursiveUpdateChildren(child.props.children, viewport);
      return cloneElement(child, childProps);
    });
  }

  _isViewportAnimationEnabled() {
    console.log(`_isViewportAnimationEnabled: ${this.props.viewportAnimationDuration !== 0}`);
    return this.props.viewportAnimationDuration !== 0;
  }

  render() {
    const {width, height, getCursor} = this.props;

    const eventCanvasStyle = {
      width,
      height,
      position: 'relative',
      cursor: getCursor(this.state)
    };

    const viewport = this.state.animatedViewport || this._extractViewportFromProps(this.props);
    console.log(`Controller Render: animatedViewport: ${this.state.animatedViewport} pitch: ${viewport.pitch} animation: ${this._isViewportAnimationEnabled()}`);
    const childrenWithProps = this._isViewportAnimationEnabled() ?
      this._recursiveUpdateChildren(this.props.children, viewport) : this.props.children;

    return (
      createElement('div', {
        key: 'map-controls',
        ref: 'eventCanvas',
        style: eventCanvasStyle
      },
        childrenWithProps
      )
    );
  }
}

AnimationMapController.displayName = 'AnimationMapController';
AnimationMapController.propTypes = propTypes;
AnimationMapController.defaultProps = defaultProps;

/* eslint max-len: ["error", 800] */
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

function prettyFloat(x, nbDec) {
  if (!nbDec) {
    nbDec = 100;
  }
  const a = Math.abs(x);
  let e = Math.floor(a);
  let d = Math.round((a - e) * nbDec); if (d === nbDec) {
    d = 0;
    e++;
  }
  const signStr = (x < 0) ? '-' : ' ';
  let decStr = d.toString();
  let tmp = 10;
  while (tmp < nbDec && d * tmp < nbDec) {
    decStr = `0${decStr}`;
    tmp *= 10;
  }
  const eStr = e.toString();
  return `${signStr}${eStr}.${decStr}`;
}

function logViewport(msg, viewport) {
  if (!viewport) {
    msg += 'viewport: null';
  } else {
    for (const p in viewport) {
      msg += ` ${p}: ${prettyFloat(viewport[p])}`;
    }
  }
  console.log(`${msg}`);
}
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

    // Private animation state
    this.animationContext = {
      animationT: 0,
      animationInterval: null,
      animationStartState: null,
      animationEndState: null,
      animatedViewport: null
    };
    this.someVar = 'init';

    this._updateViewport = this._updateViewport.bind(this);
//*
    this._createAnimationInterval = this._createAnimationInterval.bind(this);
    this._isTheUpdateDueToCurrentAnimation = this._isTheUpdateDueToCurrentAnimation.bind(this);
    this._animateViewportProp = this._animateViewportProp.bind(this);
    this._endAnimation = this._endAnimation.bind(this);
    this._recursiveUpdateChildren = this._recursiveUpdateChildren.bind(this);
    this._isViewportAnimationEnabled = this._isViewportAnimationEnabled.bind(this);
    this._isAnimationInProgress = this._isAnimationInProgress.bind(this);
    // this.render = this.render.bind(this);
//*/
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

    this.someVar = 'didMount';
    this.animationContext = {
      animationT: 0,
      animationInterval: null,
      animationStartState: null,
      animationEndState: null,
      animatedViewport: null
    };
    // console.log(`==== componentDidMount this.animationContext.animationT = ${this.animationContext.animationT}`);
  }

  componentWillUpdate(nextProps) {
    this.someVar = 'componentWillUpdate';
    this._controls.setOptions(nextProps);
    this._animateViewportProp(nextProps);
    // console.log(`=== componentWillUpdate t: ${this.animationContext.animationT} interval: ${this.animationContext.animationInterval} `);
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
      minZoom: props.minZoom,
      maxZoom: props.maxZoom
//      altitude: props.altitude
    };
  }

  _createAnimationInterval(nextProps) {
    if (this.animationContext.animationInterval) {
      console.log('### stop old animation');
      clearInterval(this.animationContext.animationInterval);
    }
    const updateFrequency = nextProps.viewportAnimationDuration * VIEWPORT_ANIMATE_FREQUENCY;
    console.log(`### start new animation freq: ${updateFrequency} duration: ${this.props.viewportAnimationDuration} freq: ${VIEWPORT_ANIMATE_FREQUENCY}`);
    return setInterval(() => this._updateViewport(), updateFrequency);
  }

  _isTheUpdateDueToCurrentAnimation(nextProps) {
    if (this.animationContext.animatedViewport) {
      const newViewport = this._extractViewportFromProps(nextProps);
      for (const p of VIEWPORT_ANIMATE_PROPS) {
        if (newViewport[p] !== this.animationContext.animatedViewport[p]) {
          console.log('Viewport updated while in animation ###### ');
          return false;
        }
      }
      console.log('Viewport updated due to animation ###### ');
      return true;
    }
    console.log('Viewport updated while not in animation ###### ');
    return false;
  }

  _animateViewportProp(nextProps) {
    this.someVar = '_animateViewportProp';

    // Ignore update if it is due to current active animation
    if (this._isTheUpdateDueToCurrentAnimation(nextProps)) {
      console.log('Controller : Ignore viewport update');
      return;
    }

    console.log(`process new props pitch: ${nextProps.pitch} viewportAnimationDuration: ${nextProps.viewportAnimationDuration}`);
    if (this._isViewportAnimationEnabled(nextProps)) {
      const startViewport = this._extractViewportFromProps(this.props);
      const endViewport = this._extractViewportFromProps(nextProps);
      if (this._didViewportAnimatePropChanged(startViewport, endViewport)) {
        const animationInterval = this._createAnimationInterval(nextProps);
        // console.log(`set animationInterval on state to : ${animationInterval} aniamtedViewport.pitch: ${startViewport.pitch}`);
        this.animationContext = {
          animationT: 0.0,
          animationStartViewport: startViewport,
          animationEndViewport: endViewport,
          animationInterval,
          animatedViewport: startViewport
        };
        this.forceUpdate();
        console.log(`START animation t: ${this.animationContext.animationT} interval: ${this.animationContext.animationInterval} p: ${this.animationContext.animationStartViewport.pitch} -> ${this.animationContext.animationEndViewport.pitch} `);
      }
    }
  }

  _didViewportAnimatePropChanged(startViewport, endViewport) {
    for (const p of VIEWPORT_ANIMATE_PROPS) {
      if (startViewport[p] !== undefined &&
        endViewport[p] !== undefined &&
        startViewport[p] !== endViewport[p]) {
        console.log(` TRUE : Controller detected viewportChange for ${p}: start: ${startViewport[p]} end ${endViewport[p]} animated: ${this.animationContext.animatedViewport ? this.animationContext.animatedViewport[p] : 'null'}`);
        return true;
      }
    }
    console.log(' FALSE : Controller detected no change');
    return false;
  }

  _updateViewport() {
    this.someVar = '_updateViewport';
    // if (!this.animationContext.animationT || !this.animationContext.animationStartViewport || !this.animationContext.animationEndViewport) {
    //   console.log('==== _updateViewport: Invalid animationContext, return early');
    //   return;
    // }
    const t = this.props.viewportAnimationEasingFunc(this.animationContext.animationT);
    const animatedViewport = this.props.viewportAnimationFunc(
      this.animationContext.animationStartViewport,
      this.animationContext.animationEndViewport,
      t
    );
    const currentTime = this.animationContext.animationT;
    if (currentTime < 1.0) {
      // console.log(`Controller update pitch: ${animatedViewport.pitch} t: ${t}`);
      this.animationContext.animationT = (
        currentTime + VIEWPORT_ANIMATE_FREQUENCY > 1.0 &&
        currentTime + VIEWPORT_ANIMATE_FREQUENCY < 1.0 + VIEWPORT_ANIMATE_FREQUENCY
        ) ? 1.0 : currentTime + VIEWPORT_ANIMATE_FREQUENCY;
      this.animationContext.animatedViewport = Object.assign(
        {},
        this.animationContext.animationEndViewport,
        animatedViewport);
      if (this.props.onViewportChange) {
        this.props.onViewportChange(animatedViewport);
      }
    } else {
      this._endAnimation();
    }
    console.log(`==== _updateViewport this.animationContext.animationT = ${this.animationContext.animationT} p : ${this.animationContext.animatedViewport ? this.animationContext.animatedViewport.pitch : 'null'}`);
    this.forceUpdate();
  }

  _endAnimation() {
    console.log('### animation ended');
    clearInterval(this.animationContext.animationInterval);
    this.animationContext = {
      animationT: 0,
      animationInterval: null,
      animationStartState: null,
      animationEndState: null,
      animatedViewport: null
    };
    console.log(`==== _endAnimation this.animationContext.animationT = ${this.animationContext.animationT}`);
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
      // console.log(`=== AnimationController Before clone update child: ${child.props._name_} pitch: ${child.props.pitch} -> ${viewport.pitch}`);
      const cloned = cloneElement(child, childProps);
      // console.log(`=== AnimationController After clone child: ${cloned.props._name_} got pitch: ${cloned.props.pitch}`);
      return cloned;
    });
  }

  _isViewportAnimationEnabled(props) {
    // console.log(`_isViewportAnimationEnabled: ${props.viewportAnimationDuration !== 0}`);
    return props.viewportAnimationDuration !== 0;
  }

  _isAnimationInProgress() {
    // console.log(`_isAnimationInProgress: ${this.animationContext.animationInterval ? true : false}`);
    return this.animationContext.animationInterval ? true : false;
  }

  render() {
    const {width, height, getCursor} = this.props;

    const eventCanvasStyle = {
      width,
      height,
      position: 'relative',
      cursor: getCursor(this.state)
    };

    let childrenWithProps;
    // console.log(`this.someVar = ${this.someVar}`);
    // const viewport = this.animationContext.animatedViewport || this._extractViewportFromProps(this.props);
    // console.log(`==== render this.animationContext.animationT = ${this.animationContext.animationT} interval: ${this.animationContext.animationInterval}`);
    // console.log(`Controller Render: animatedViewportPitch: ${this.animationContext.animatedViewport ? this.animationContext.animatedViewport.pitch : 'null'} update pitch: ${viewport.pitch} animationInterval: ${this.animationContext.animationInterval} props.viewportAnimationDuration: ${this.props.viewportAnimationDuration}`);
    if (this._isAnimationInProgress()) {
      // logViewport(`=== AnimationController Render using animatedViewport t: ${this.animationContext.animationT}`, this.animationContext.animatedViewport);
      console.log(`=== AnimationController Render using animatedViewport t: ${this.animationContext.animationT} pitch: ${this.animationContext.animatedViewport.pitch}`);
      childrenWithProps = this._recursiveUpdateChildren(this.props.children, this.animationContext.animatedViewport);
    } else {
      console.log('=== AnimationController Render using original props for children');
      childrenWithProps = this.props.children;
    }

    // const {children} = this.props.chi
    Children.forEach(childrenWithProps, element => {
      if (!isValidElement(element)) {
        return;
      }

      logViewport(`=== AnimationController FINAL child: ${element.props._name_} props:`, element.props);
      // console.log(`=== AnimationController FINAL child: ${element.props._name_} pitch: ${element.props.pitch}`);
      //do something with source..
    });

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

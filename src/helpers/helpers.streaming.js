import {callback as call, each, noop, requestAnimFrame, valueOrDefault} from 'chart.js/helpers';

export function clamp(value, lower, upper) {
  return Math.min(Math.max(value, lower), upper);
}

export function resolveOption(scale, key) {
  const realtimeOpts = scale.options.realtime;
  const streamingOpts = scale.chart.options.plugins.streaming;
  return valueOrDefault(realtimeOpts[key], streamingOpts[key]);
}

export function getAxisMap(element, {x, y}, {xAxisID, yAxisID}) {
  const axisMap = {};

  each(x, key => {
    axisMap[key] = {axisId: xAxisID};
  });
  each(y, key => {
    axisMap[key] = {axisId: yAxisID};
  });
  return axisMap;
}

/**
* Cancel animation polyfill
*/
const cancelAnimFrame = (function() {
  if (typeof window === 'undefined') {
    return noop;
  }
  return window.cancelAnimationFrame;
}());

export function startFrameRefreshTimer(context, func) {
  if (!context.frameRequestID) {
    const refresh = () => {
      const nextRefresh = context.nextRefresh || 0;
      const now = Date.now();

      if (nextRefresh <= now) {
        const newFrameRate = call(func);
        const frameDuration = 1000 / (Math.max(newFrameRate, 0) || 30);
        const newNextRefresh = context.nextRefresh + frameDuration || 0;

        context.nextRefresh = newNextRefresh > now ? newNextRefresh : now + frameDuration;
      }
      context.frameRequestID = requestAnimFrame.call(window, refresh);
    };
    context.frameRequestID = requestAnimFrame.call(window, refresh);
  }
}

export function stopFrameRefreshTimer(context) {
  const frameRequestID = context.frameRequestID;

  if (frameRequestID) {
    cancelAnimFrame.call(window, frameRequestID);
    delete context.frameRequestID;
  }
}

export function stopDataRefreshTimer(context) {
  const refreshTimerID = context.refreshTimerID;

  if (refreshTimerID) {
    clearInterval(refreshTimerID);
    delete context.refreshTimerID;
    delete context.refreshInterval;
  }
}

export function startDataRefreshTimer(context, func, interval) {
  if (!context.refreshTimerID) {
    context.refreshTimerID = setInterval(() => {
      const newInterval = call(func);

      if (context.refreshInterval !== newInterval && !isNaN(newInterval)) {
        stopDataRefreshTimer(context);
        startDataRefreshTimer(context, func, newInterval);
      }
    }, interval || 0);
    context.refreshInterval = interval || 0;
  }
}

export class SimulatedTime {
  constructor(startDate = Date.now(), speed = 1) {
    this.startDate = startDate; // Initial simulated start time
    this.speed = speed;         // Speed multiplier (e.g., 2x, 0.5x)
    this.offset = 0;            // Time offset in milliseconds
    this.lastRealTime = Date.now(); // Last time the real `Date.now()` was recorded
  }

  now() {
    // Calculate elapsed real time
    const realElapsed = Date.now() - this.lastRealTime;
    // Simulated elapsed time is real elapsed time * speed
    this.offset += realElapsed * this.speed;
    this.lastRealTime = Date.now(); // Update the last real-time check
    return this.startDate + this.offset;
  }

  setSpeed(newSpeed) {
    this.now(); // Update offset to current time
    this.speed = newSpeed; // Change speed
  }

  setStartTime(newStartDate) {
    this.startDate = newStartDate;
    this.offset = 0; // Reset offset
    this.lastRealTime = Date.now();
  }
}

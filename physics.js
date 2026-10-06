/* Solusi analitik gerak peluru tanpa hambatan udara, satuan SI. */
const Physics = (() => {
  function calculate({ speed, angle, height, gravity }) {
    if (![speed, angle, height, gravity].every(Number.isFinite) || speed <= 0 || gravity <= 0 || height < 0 || angle < 0 || angle > 90) {
      throw new RangeError('Parameter fisika tidak valid.');
    }
    const radians = angle * Math.PI / 180;
    const vx = speed * Math.cos(radians);
    const vy = speed * Math.sin(radians);
    const flightTime = (vy + Math.sqrt(vy * vy + 2 * gravity * height)) / gravity;
    const apexTime = vy / gravity;
    return { vx, vy, flightTime, apexTime, range: vx * flightTime, maxHeight: height + vy * vy / (2 * gravity) };
  }
  function position(parameters, time) {
    const { vx, vy, flightTime } = calculate(parameters);
    const t = Math.max(0, Math.min(time, flightTime));
    return { x: vx * t, y: Math.max(0, parameters.height + vy * t - parameters.gravity * t * t / 2), vx, vy: vy - parameters.gravity * t, time: t };
  }
  return { calculate, position };
})();
if (typeof module !== 'undefined') module.exports = Physics;

import { ticks } from 'd3-array';
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
  query,
  queryAll,
  svg,
  SVGTemplateResult,
  TemplateResult,
} from 'lit-element';
import { connect } from 'pwa-helpers';

import { airspaceCategory, Flags } from '../../../../common/airspaces';
import { RuntimeTrack } from '../../../../common/track';
import { setCenterMap, setChartAirspaces, setChartYAxis } from '../actions';
import { sampleAt } from '../logic/math';
import { trackColor } from '../logic/tracks';
import { formatUnit, UNITS } from '../logic/units';
import { ChartYAxis, Units } from '../reducers';
import * as sel from '../selectors';
import { dispatch, RootState, store } from '../store';

const MIN_SPEED_FACTOR = 16;
const MAX_SPEED_FACTOR = 4096;
const PLAY_INTERVAL = 50;

@customElement('chart-element')
export class ChartElement extends connect(store)(LitElement) {
  @internalProperty()
  private tracks: RuntimeTrack[] = [];

  @internalProperty()
  private chartYAxis: ChartYAxis = ChartYAxis.Altitude;

  @internalProperty()
  private timestamp = 0;

  @internalProperty()
  private width = 0;

  @internalProperty()
  private height = 0;

  @internalProperty()
  private units?: Units;

  @internalProperty()
  private showRestricted = false;

  @internalProperty()
  private currentTrackIndex = 0;

  @internalProperty()
  private centerMap = true;

  @internalProperty()
  private playSpeed = 64;

  @internalProperty()
  private playTimer: any;

  private lastPlayTimestamp = 0;

  @queryAll('path.asp')
  private aspPathElements?: NodeList;

  @query('svg#chart')
  private svgContainer?: SVGSVGElement;

  private minTs = 0;
  private maxTs = 1;
  private tsOffsets: number[] = [];
  // Do not refresh airspaces on every mouse move event.
  private throttleAspUpdates = false;

  stateChanged(state: RootState): void {
    const map = state.map;
    this.tracks = map.tracks;
    this.chartYAxis = map.chart.yAxis;
    this.timestamp = map.ts;
    this.minTs = sel.minTs(map);
    this.maxTs = sel.maxTs(map);
    this.units = map.units;
    this.tsOffsets = sel.tsOffsets(map);
    this.showRestricted = map.aspShowRestricted;
    this.currentTrackIndex = map.currentTrackIndex;
    this.centerMap = map.centerMap;
  }

  get minY(): number {
    const mapState = store.getState().map;
    switch (this.chartYAxis) {
      case ChartYAxis.Speed:
        return sel.minSpeed(mapState);
      case ChartYAxis.Vario:
        return sel.minVario(mapState);
      default:
        return sel.minAlt(mapState);
    }
  }

  get maxY(): number {
    const mapState = store.getState().map;
    switch (this.chartYAxis) {
      case ChartYAxis.Speed:
        return sel.maxSpeed(mapState);
      case ChartYAxis.Vario:
        return sel.maxVario(mapState);
      default:
        return sel.maxAlt(mapState);
    }
  }

  private getY(track: RuntimeTrack, ts: number): number {
    switch (this.chartYAxis) {
      case ChartYAxis.Speed:
        return sampleAt(track.fixes.ts, track.fixes.vx, ts);
      case ChartYAxis.Vario:
        return sampleAt(track.fixes.ts, track.fixes.vz, ts);
      default:
        return sampleAt(track.fixes.ts, track.fixes.alt, ts);
    }
  }

  private getYUnit(): UNITS {
    const units = this.units as Units;
    switch (this.chartYAxis) {
      case ChartYAxis.Speed:
        return units.speed;
      case ChartYAxis.Vario:
        return units.vario;
      default:
        return units.altitude;
    }
  }

  constructor() {
    super();
    window.addEventListener('resize', () => this.updateSize());
  }

  static get styles(): CSSResult[] {
    return [
      css`
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          font: 12px 'Nobile', verdana, sans-serif;
        }
        #chart {
          width: 100%;
          height: 100%;
          touch-action: none;
        }
        .paths {
          fill: none;
        }
        .gnd {
          stroke: #755445;
          fill: #755445;
          fill-opacity: 0.8;
        }
        .asp {
          stroke: #808080;
          fill: #808080;
          fill-opacity: 0.2;
          stroke-opacity: 0.3;
        }
        .asp.prohibited {
          stroke: #bf4040;
          fill: #bf4040;
        }
        .asp.restricted {
          stroke: #bfbf40;
          fill: #bfbf40;
        }
        .asp.danger {
          stroke: #bf8040;
          fill: #bf8040;
        }
        .axis {
          stroke: lightgray;
          fill: none;
          stroke-width: 0.5px;
        }
        .ticks {
          font: 10px sans-serif;
          stroke-width: 0.5px;
          fill: black;
          stroke: white;
          stroke-width: 0;
        }
        #ts {
          stroke: gray;
          fill: none;
          stroke-width: 1.5px;
        }
        path {
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-opacity: 0.6;
          stroke-width: 1;
        }
        path.active {
          stroke-width: 1.5;
          stroke-opacity: 1;
        }
        #ct {
          position: absolute;
          top: 3px;
          right: 3px;
          height: 1px;
        }
        select {
          font: inherit;
          clear: both;
          float: right;
        }
        .control {
          display: block;
          float: right;
          border: 1px inset #555;
          padding: 4px;
          margin: 2px 2px 0 0;
          text-align: right;
          border-radius: 4px;
          opacity: 0.5;
          user-select: none;
          background-color: white;
          clear: both;
          cursor: pointer;
        }
        .control:hover {
          background-color: #adff2f;
          opacity: 0.9;
        }
      `,
    ];
  }

  private paths(): TemplateResult[] {
    const paths: TemplateResult[] = [];

    if (this.tracks.length == 0) {
      return paths;
    }

    const spanTs = this.maxTs - this.minTs;
    const scaleY = -this.height / (this.maxY - this.minY);
    const offsetY = -this.maxY * scaleY;
    let activePath: SVGTemplateResult | undefined;

    // Display the gnd elevation only if there is a single track & mode is altitude
    const displayGndAlt = this.tracks.length == 1 && this.chartYAxis == ChartYAxis.Altitude;

    this.tracks.forEach((track, i) => {
      const fixes = track.fixes;
      if (fixes.ts.length < 5) {
        return;
      }
      // Span of the track on the X axis.
      const minX = Math.round(((fixes.ts[0] - this.tsOffsets[i] - this.minTs) / spanTs) * this.width);
      const maxX = Math.round(((fixes.ts[fixes.ts.length - 1] - this.tsOffsets[i] - this.minTs) / spanTs) * this.width);
      const spanX = maxX - minX;
      const spanTrackTs = track.maxTs - track.minTs;

      const trackCoords: string[] = [];
      const gndCoords = [`${minX},${(this.minY * scaleY + offsetY).toFixed(1)}`];

      if (displayGndAlt && fixes.gndAlt) {
        paths.push(...this.airspacePaths(track, minX, spanX, spanTrackTs, scaleY, offsetY));
      }
      for (let x = minX; x < maxX; x++) {
        const ts = ((x - minX) / spanX) * spanTrackTs + track.minTs;
        const y = this.getY(track, ts);
        trackCoords.push(`${x},${(y * scaleY + offsetY).toFixed(1)}`);
        if (displayGndAlt && fixes.gndAlt) {
          const gndAlt = sampleAt(fixes.ts, fixes.gndAlt, ts);
          gndCoords.push(`${x},${(gndAlt * scaleY + offsetY).toFixed(1)}`);
        }
      }
      gndCoords.push(`${maxX},${(this.minY * scaleY + offsetY).toFixed(1)}`);
      if (displayGndAlt) {
        paths.push(svg`<path class=gnd d=${`M${gndCoords.join('L')}`}></path>`);
      }
      if (i == this.currentTrackIndex) {
        activePath = svg`<path class='active' stroke=${trackColor(i)} filter=url(#shadow) 
          d=${`M${trackCoords.join('L')}`}></path>`;
      } else {
        paths.push(svg`<path stroke=${trackColor(i)} d=${`M${trackCoords.join('L')}`}></path>`);
      }
    });

    // The active path should be drawn last to be on top of others.
    if (activePath) {
      paths.push(activePath);
    }

    return paths;
  }

  // Compute the SVG paths for the airspaces.
  private airspacePaths(
    track: RuntimeTrack,
    minX: number,
    spanX: number,
    spanTrackTs: number,
    scaleY: number,
    offsetY: number,
  ): SVGTemplateResult[] {
    const asp = track.airspaces;
    if (asp == null) {
      return [];
    }
    const paths: SVGTemplateResult[] = [];

    for (let i = 0; i < asp.start_ts.length; i++) {
      const flags = asp.flags[i];
      if (!this.showRestricted && flags & Flags.AIRSPACE_RESTRICTED) {
        continue;
      }
      const start = asp.start_ts[i];
      const end = asp.end_ts[i];
      const top = asp.top[i];
      const bottom = asp.bottom[i];
      const topRefGnd = flags & Flags.TOP_REF_GND;
      const bottomRefGnd = flags & Flags.BOTTOM_REF_GND;
      const coords = [
        ...this.aspLine(track, start, end, minX, spanX, spanTrackTs, bottom, bottomRefGnd),
        ...this.aspLine(track, end, start, minX, spanX, spanTrackTs, top, topRefGnd),
      ];
      if (coords.length < 4) {
        continue;
      }
      coords.push(coords[0]);
      const path = coords
        .map(([time, alt]) => {
          const x = ((time - track.minTs) / spanTrackTs) * spanX + minX;
          const y = alt * scaleY + offsetY;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join('L');
      paths.push(
        svg`<path data-start=${start} data-end=${end} title=${`[${asp.category[i]}] ${asp.name[i]}`}  class=${`asp ${airspaceCategory(
          flags,
        )}`} d=${'M' + path}></path>`,
      );
    }

    return paths;
  }

  private aspLine(
    track: RuntimeTrack,
    start: number,
    end: number,
    minX: number,
    spanX: number,
    spanTrackTs: number,
    alt: number,
    refGnd: number,
  ): Array<[number, number]> {
    if (!refGnd || !track.fixes.gndAlt) {
      return [
        [start, alt],
        [end, alt],
      ];
    }
    let reverse = false;
    if (start > end) {
      [start, end] = [end, start];
      reverse = true;
    }
    const startX = Math.round(((start - track.minTs) / spanTrackTs) * spanX + minX);
    const endX = Math.round(((end - track.minTs) / spanTrackTs) * spanX + minX);
    const points: Array<[number, number]> = [];
    for (let x = startX; x < endX; x++) {
      const ts = ((x - minX) / spanX) * spanTrackTs + track.minTs;
      const gndAlt = sampleAt(track.fixes.ts, track.fixes.gndAlt, ts);
      points.push([ts, alt + gndAlt]);
    }
    return reverse ? points.reverse() : points;
  }

  private axis(): TemplateResult[] {
    const axis: TemplateResult[] = [];

    if (this.tracks) {
      const tks = ticks(this.minY, this.maxY, 4);
      const ySpan = this.maxY - this.minY;

      tks.forEach((tick) => {
        // Draw line
        const y = ((this.maxY - tick) / ySpan) * this.height;
        axis.push(svg`<line y1=${y.toFixed(1)} x2=${this.width} y2=${y}></line>`);
      });
    }

    return axis;
  }

  private yTexts(): TemplateResult[] {
    const texts: TemplateResult[] = [];

    if (this.tracks) {
      const tks = ticks(this.minY, this.maxY, 4);
      const ySpan = this.maxY - this.minY;

      tks.forEach((tick) => {
        const y = ((this.maxY - tick) / ySpan) * this.height;
        texts.push(
          svg`<text stroke-width=3 x=5 y=${y.toFixed(1)} dy=-2>${formatUnit(tick, this.getYUnit())}</text>
          <text x=5 y=${y.toFixed(1)} dy=-2>${formatUnit(tick, this.getYUnit())}</text>`,
        );
      });
    }

    return texts;
  }

  private xTexts(): TemplateResult[] {
    const texts: TemplateResult[] = [];

    if (this.tracks) {
      const minute = 60 * 1000;
      const hour = 60 * minute;

      // Push minTs 50px right to avoid writing over the alt scale
      const offset = 50;
      const minTs = this.minTs + ((this.maxTs - this.minTs) / this.width) * offset;

      const timeSpan = this.maxTs - minTs;

      const tickSpan = Math.ceil(timeSpan / hour / 6) * hour;
      const time = new Date(minTs);
      const startTs = new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours() + 1).getTime();

      for (let ts = startTs; ts < this.maxTs; ts += tickSpan) {
        const x = ((ts - this.minTs) / (this.maxTs - this.minTs)) * this.width;
        const time = new Date(ts).toLocaleTimeString();
        texts.push(
          svg`<text text-anchor=middle stroke-width=3 y=${this.height} x=${x} dy=-4>${time}</text>
          <text text-anchor=middle y=${this.height} x=${x} dy=-4>${time}</text>`,
        );
      }
    }

    return texts;
  }

  private updateSize(): void {
    const shadowRoot = this.shadowRoot as ShadowRoot;
    const host = shadowRoot.host;
    this.width = host.clientWidth;
    this.height = host.clientHeight;
  }

  protected render(): TemplateResult {
    if (!this.width) {
      // FF and Edge would report a size of 0x0 without setTimeout
      setTimeout(() => this.updateSize(), 0);
    }
    return html`
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/line-awesome@1/dist/line-awesome/css/line-awesome.min.css"
      />
      <svg
        id="chart"
        @pointermove=${this.handlePointerMove}
        @pointerdown=${this.handlePointerDown}
        @wheel=${this.handleMouseWheel}
      >
        <defs>
          <filter id="shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"></feGaussianBlur>
            <feMerge>
              <feMergeNode></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="white" />
        <g class="paths">${this.paths()}</g>
        <g class="axis">${this.axis()}</g>
        <g class="ticks">${this.yTexts()}</g>
        <g class="ticks">${this.xTexts()}</g>
        <line id="ts" x1="0" x2="0" y2="100%"></line>
      </svg>
      <div id="ct">
        <select @change=${this.handleYChange}>
          <option value=${ChartYAxis.Altitude} selected>Altitude</option>
          <option value=${ChartYAxis.Speed}>Speed</option>
          <option value=${ChartYAxis.Vario}>Vario</option>
        </select>
        <div class="control">
          <i
            class="la la-lg la-chevron-down"
            @click=${() => (this.playSpeed = Math.max(MIN_SPEED_FACTOR, this.playSpeed / 2))}
            style=${`visibility: ${this.playSpeed == MIN_SPEED_FACTOR ? 'hidden' : 'visible'}`}
          ></i>
          ${this.playSpeed}x
          <i
            class="la la-lg la-chevron-up"
            @click=${() => (this.playSpeed = Math.min(MAX_SPEED_FACTOR, this.playSpeed * 2))}
            style=${`visibility: ${this.playSpeed == MAX_SPEED_FACTOR ? 'hidden' : 'visible'}`}
          ></i>
          <i class=${`la la-lg ${this.playTimer ? 'la-pause' : 'la-play'}`} @click="${this.handlePlay}}"></i>
        </div>
        <div class="control">
          <i
            class=${`la la-lg ${this.centerMap ? `la-link` : `la-unlink`}`}
            @click=${() => dispatch(setCenterMap(!this.centerMap))}
          ></i>
        </div>
      </div>
    `;
  }

  private handlePlay() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = undefined;
    } else {
      // Restart from the beginning if play has not been used for 30s,
      if (this.lastPlayTimestamp < Date.now() - 30 * 1000 || this.timestamp == this.maxTs) {
        this.dispatchEvent(new CustomEvent('move', { detail: { ts: this.minTs } }));
      }
      this.playTick();
      this.playTimer = setInterval(() => this.playTick(), PLAY_INTERVAL);
    }
  }

  private playTick() {
    this.lastPlayTimestamp = Date.now();
    let timestamp = this.timestamp + PLAY_INTERVAL * this.playSpeed;
    if (timestamp >= this.maxTs) {
      timestamp = this.maxTs;
      clearInterval(this.playTimer);
      this.playTimer = undefined;
    }
    this.dispatchEvent(new CustomEvent('move', { detail: { ts: timestamp } }));
  }

  private handleYChange(e: Event): void {
    const y: ChartYAxis = Number((e.target as HTMLSelectElement).value);
    store.dispatch(setChartYAxis(y));
  }

  private tsX(): number {
    return ((this.timestamp - this.minTs) / (this.maxTs - this.minTs)) * this.width;
  }

  private handlePointerDown(e: MouseEvent): void {
    const { ts } = this.getCoordinatesFromEvent(e);
    this.dispatchEvent(new CustomEvent('pin', { detail: { ts } }));
    this.dispatchEvent(new CustomEvent('move', { detail: { ts } }));
  }

  private handleMouseWheel(e: WheelEvent): void {
    const { ts } = this.getCoordinatesFromEvent(e);
    this.dispatchEvent(new CustomEvent('zoom', { detail: { ts, deltaY: e.deltaY } }));
  }

  private handlePointerMove(e: MouseEvent): void {
    if (!this.playTimer) {
      const { x, y, ts } = this.getCoordinatesFromEvent(e);
      this.dispatchEvent(new CustomEvent('move', { detail: { ts } }));
      if (!this.throttleAspUpdates) {
        this.updateAirspaces(x, y, ts);
        this.throttleAspUpdates = true;
        setTimeout(() => (this.throttleAspUpdates = false), 100);
      }
    }
  }

  private getCoordinatesFromEvent(e: MouseEvent): { x: number; y: number; ts: number } {
    const target = e.currentTarget as HTMLElement;
    const { top, left } = target.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    const ts = (x / this.width) * (this.maxTs - this.minTs) + this.minTs;
    return { x, y, ts };
  }

  private updateAirspaces(x: number, y: number, ts: number): void {
    const airspaces: string[] = [];
    if (this.svgContainer && this.aspPathElements) {
      const point = this.svgContainer.createSVGPoint();
      point.x = x;
      point.y = y;
      this.aspPathElements?.forEach((node: Node) => {
        const geometry = node as SVGGeometryElement;
        const start = Number(geometry.getAttribute('data-start'));
        const end = Number(geometry.getAttribute('data-end'));
        if (ts >= start && ts <= end && geometry.isPointInFill(point)) {
          airspaces.push(geometry.getAttribute('title') as string);
        }
      });
    }
    store.dispatch(setChartAirspaces(ts, airspaces));
  }

  shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size == 1 && changedProps.has('timestamp')) {
      // Do not re-render if only the timestamp changes
      const shadowRoot = this.shadowRoot as ShadowRoot;
      const tsEl = (shadowRoot.getElementById('ts') as unknown) as SVGLineElement | null;
      if (tsEl) {
        tsEl.setAttribute('x1', `${this.tsX()}`);
        tsEl.setAttribute('x2', `${this.tsX()}`);
      }
      return false;
    }
    return super.shouldUpdate(changedProps);
  }
}

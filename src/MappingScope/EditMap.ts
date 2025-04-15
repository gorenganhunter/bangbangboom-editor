import { neverHappen, assert, entryList } from "../Common/utils"
import { observable } from "mobx"

export type WithId = {
  id: number
}

export type TimedPosition = {
  /**
   * id of timepoint to measure time in gamemap
   */
  timepoint: number

  /**
   * the count of 1/192 beats from that timepoint
   */
  offset: number

  /**
   * the lane that the note lays on (left most: 0, right most: 6)
   */
  lane: number

  /**
   * the cached real time
   * won't be update if timepoint changed
   */
  realtimecache: number

  tsgroup: number
} & WithId

export type SingleNote = {
  type: "single"
  alt: boolean
  direction: number
} & TimedPosition

export type FlickNote = {
  type: "flick"
  alt: boolean
  direction: number
} & TimedPosition

export type Slide = {
  /**
   * note id from first to last ordered
   */
  notes: number[]
  flickend: boolean
} & WithId

export type SlideNote = {
  type: "slide"
  /**
   * slide id
   */
  slide: number
  islaser?: boolean
  direction?: number
} & TimedPosition

export type NoteType = SingleNote | FlickNote | SlideNote

export type Timepoint = {
  /**
   * the start time of this timepoint in seconds
   */
  time: number

  /**
   * beats per minute
   */
  bpm: number

  /**
   * the cached time of 1/192 beat
   */
  ticktimecache: number

  /**
   * beats per bar (assumes one beat = 1/4)
   */
  bpb: number
} & WithId

export type TimeScaleGroup = {
  name: string
  timescales: number[]
} & WithId

export type TimeScale = {
  tsgroup: number
  timescale: number
  /**
   * id of timepoint to measure time in gamemap
   */
  timepoint: number

  /**
   * the count of 1/192 beats from that timepoint
   */
  offset: number
  /**
   * the cached real time
   * won't be update if timepoint changed
   */
  realtimecache: number

  disk: number
} & WithId

type EditMapForJson = {
  version?: number
  timepoints: Timepoint[]
  tsgroups: TimeScaleGroup[]
  timescales: TimeScale[]
  slides: Slide[]
  notes: NoteType[]
}


export class EditMap {
  /**
   * id => timepoint
   */
  @observable timepoints: Map<number, Timepoint>

  /**
   * id => slide
   */
  @observable slides: Map<number, Slide>

  /**
   * id => note
   */
  @observable notes: Map<number, NoteType>

  /**
   * id => tsgroup
   */
  @observable tsgroups: Map<number, TimeScaleGroup>

  /**
   * id => timescale
   */
  @observable timescales: Map<number, TimeScale>

  private constructor(map: EditMap) {
    this.timepoints = map.timepoints
    this.slides = map.slides
    this.notes = map.notes
    this.tsgroups = map.tsgroups
    this.timescales = map.timescales
  }

  static create(): EditMap {
    return new EditMap({
      timepoints: new Map(),
      tsgroups: new Map<number, TimeScaleGroup>().set(-1, { id: -1, name: "Default", timescales: [] }).set(-2, { id: -2, name: "Disk Note", timescales: [] }),
      timescales: new Map(),
      slides: new Map(),
      notes: new Map(),
    })
  }

  static toJsonString(map: DeepReadonly<EditMap>) {
    const { timepoints, tsgroups, timescales, slides, notes } = map as EditMap
    const forJson: EditMapForJson = {
      version: 3,
      timepoints: entryList(timepoints).map(x => ({ ...x[1] })),
      tsgroups: entryList(tsgroups).map(x => ({ ...x[1] })),
      timescales: entryList(timescales).map(x => ({ ...x[1] })),
      slides: entryList(slides).map(x => ({ ...x[1] })),
      notes: entryList(notes).map(x => ({ ...x[1] }))
    }
    forJson.timepoints.forEach(x => delete x.ticktimecache)
    forJson.notes.forEach(x => delete x.realtimecache)
    forJson.timescales.forEach(x => delete x.realtimecache)
    return JSON.stringify(forJson)
  }

  static fromJson(json: string): EditMap {
    let { version, timepoints, tsgroups, timescales, slides, notes } = JSON.parse(json) as EditMapForJson
    if (!version || version !== 3) {
      notes = notes.map(n => ({ ...n, offset: n.offset * 4 }))
      timescales = timescales.map(ts => ({ ...ts, offset: ts.offset * 4 }))
    }
    const map: EditMap = {
      timepoints: new Map(timepoints.map(x => [x.id, x])),
      tsgroups: new Map(tsgroups.map(x => [x.id, x])),
      timescales: new Map(timescales.map(x => [x.id, x])),
      slides: new Map(slides.map(x => [x.id, x])),
      notes: new Map(notes.map(x => [x.id, x])),
    }
    if (slides.some(x => x.notes.some(n => !map.notes.has(n)))) neverHappen()
    if (tsgroups.some(x => x.timescales.some(n => !map.timescales.has(n)))) neverHappen()
    if (notes.some(x => x.type === "slide" && !map.slides.has(x.slide))) neverHappen()
    if (notes.some(x => !map.timepoints.has(x.timepoint))) neverHappen()
    if (timescales.some(x => !map.tsgroups.has(x.tsgroup))) neverHappen()
    if (timescales.some(x => !map.timepoints.has(x.timepoint))) neverHappen()
    timepoints.forEach(x => FreshTimepointCache(x))
    timescales.forEach(x => FreshTimescaleCache(map, x))
    notes.forEach(x => FreshNoteCache(map, x))
    return new EditMap(map)
  }
}

export function FreshTimepointCache(tp: Timepoint) {
  tp.ticktimecache = 60 / tp.bpm / 192
}

export function FreshNoteCache(map: EditMap, n: TimedPosition) {
  const tp = assert(map.timepoints.get(n.timepoint))
  n.realtimecache = tp.time + tp.ticktimecache * n.offset
}

export function FreshTimescaleCache(map: EditMap, n: TimeScale) {
  const tp = assert(map.timepoints.get(n.timepoint))
  n.realtimecache = tp.time + tp.ticktimecache * n.offset
}

export function ResortSlide(map: EditMap, slide: Slide) {
  let hasEqual = false
  const sorted = slide.notes.slice().sort((a, b) => {
    const res = assert(map.notes.get(a)).realtimecache - assert(map.notes.get(b)).realtimecache
    if (res === 0) hasEqual = true
    return res
  })
  slide.notes = sorted
  return hasEqual
}

export function ResortTsGroup(map: EditMap, tsgroup: TimeScaleGroup) {
  let hasEqual = false
  const sorted = tsgroup.timescales.slice().sort((a, b) => {
    const res = assert(map.timescales.get(a)).realtimecache - assert(map.timescales.get(b)).realtimecache
    if (res === 0) hasEqual = true
    return res
  })
  tsgroup.timescales = sorted
  return hasEqual
}

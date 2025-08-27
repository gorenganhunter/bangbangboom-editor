import { NoteType, SingleNote, FlickNote, FreshNoteCache, FreshTimescaleCache, TimeScale, SlideNote, TimeScaleGroup } from "../EditMap"
import { SingleFlickActions } from "./AtomActions/SingleFlick"
import { randomId, assert, neverHappen, lerp } from "../../Common/utils"
import { SlideActions } from "./AtomActions/Slide"
import { SlideNoteActions } from "./AtomActions/SlideNote"
import { TimepointActions } from "./AtomActions/Timepoint"
import { MapActionsBase } from "./MapAtionsBase"
import { action } from "mobx"
import { TimescaleActions } from "./AtomActions/Timescale"
import { TsGroupActions } from "./AtomActions/TsGroup"


export class MapActions extends MapActionsBase {

  @action.bound
  addTimepoint(time: number, bpm: number, bpb: number, justifydivision: number) {
    return this.done(this.history.doParallel(() => {
      if (this.history.callAtom(TimepointActions.Add, randomId(), time, bpm, bpb)) {
        this.justifyFindNearest(this.notelist, this.timescalelist, justifydivision)
      }
    }))
  }

  @action.bound
  addTsGroup(name: string, id?: number) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(TsGroupActions.Add, id || randomId(), name)
    ))
  }

  @action.bound
  editTsGroup(id: number, name: string) {
    if (!name || id < 0) return false
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(TsGroupActions.Set, id, { name })
    ))
  }
  
    @action.bound
  removeTsGroup(id: number) {
    if (id < 0) return false
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(TsGroupActions.Remove, id)
    ))
  }
  
  @action.bound
  setNoteTsGroup(note: NoteType, tsgroup: number) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(note.type === "slide" ? SlideNoteActions.Set : SingleFlickActions.Set, note.id, {
        tsgroup
      })))
  }

  @action.bound
  moveTimepoint(timepoint: number, justifyFindNearest: boolean, justifydivision: number, time?: number, bpm?: number, bpb?: number) {
    const tp = assert(this.state.timepoints.get(timepoint))
    const timechanged =
      (time !== undefined && tp.time !== time) ||
      (bpm !== undefined && tp.bpm !== bpm)
    return this.done(this.history.doParallel(() => {
      if (this.history.callAtom(TimepointActions.Set, timepoint, { time, bpm, bpb })) {
        if (timechanged)
          if (justifyFindNearest) {
            this.justifyFindNearest(this.notelist, this.timescalelist, justifydivision)
          } else {
            this.justifyFollowChanged(this.notelist, this.timescalelist, justifydivision)
          }
      }
    }))
  }

  @action.bound
  removeTimepoint(timepoint: number, justifydivision: number) {
    if (this.state.timepoints.size > 1) {
      return this.done(this.history.doParallel(() => {
        this.justifyFindNearest(this.notelist, this.timescalelist, justifydivision, timepoint)
        this.history.callAtom(TimepointActions.Remove, timepoint)
      }))
    } else {
      return this.done(this.history.doParallel(() => {
        this.deleteMany(this.notelist)
        this.deleteManyTS(this.timescalelist)
        this.history.callAtom(TimepointActions.Remove, timepoint)
        if (this.state.slides.size ||
          this.state.notes.size ||
          this.state.timepoints.size) neverHappen()
      }))
    }
  }

  @action.bound
  addSingle(timepoint: number, offset: number, tsgroup: number, lane: number, alt: boolean) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(SingleFlickActions.Add, randomId(), "single", timepoint, offset, tsgroup, lane, alt)))
  }
  
  @action.bound
  addFlick(timepoint: number, offset: number, tsgroup: number, lane: number) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(SingleFlickActions.Add, randomId(), "flick", timepoint, offset, tsgroup, lane, false)))
  }

  // @action.bound
  // toggleFlick(note: SingleNote | FlickNote) {
  //   return this.done(this.history.doTransaction(() =>
  //     this.history.callAtom(SingleFlickActions.Set, note.id, {
  //       type: note.type === "single" ? "flick" : "single",
  //       alt: false
  //     })))
  // }

  @action.bound
  toggleTap(note: SingleNote) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(SingleFlickActions.Set, note.id, {
        alt: !note.alt,
      })))
  }
  
  @action.bound
  setFaderDir(note: SlideNote | FlickNote, dir: number) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(note.type === "slide" ? SlideNoteActions.Set : SingleFlickActions.Set, note.id, {
        direction: dir
      })))
  }
  
  @action.bound
  editTimescale(ts: TimeScale, timescale: number, disk: number) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(TimescaleActions.Set, ts.id, {
        timescale, disk
      })))
  }

  @action.bound
  addSlide(tp1: number, off1: number, tsg1: number, lane1: number, tp2: number, off2: number, tsg2: number, lane2: number, islaser?: boolean) {
    const sid = randomId()
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(SlideActions.Add, sid, false) &&
      this.history.callAtom(SlideNoteActions.Add, randomId(), sid, tp1, off1, tsg1, lane1, islaser) &&
      this.history.callAtom(SlideNoteActions.Add, randomId(), sid, tp2, off2, tsg2, lane2, islaser)))
  }

  @action.bound
  toggleFlickend(slide: number) {
    const s = assert(this.state.slides.get(slide))
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(SlideActions.Set, slide, { flickend: !s.flickend })))
  }

  @action.bound
  addSlideMid(slide: number, timepoint: number, offset: number, tsgroup: number, lane: number, islaser?: boolean) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(SlideNoteActions.Add, randomId(), slide, timepoint, offset, tsgroup, lane, islaser)))
  }

  @action.bound
  addTimescale(tsgroup: number, timepoint: number, offset: number, timescale: number, disk: number) {
    return this.done(this.history.doTransaction(() =>
      this.history.callAtom(TimescaleActions.Add, randomId(), tsgroup, timescale, timepoint, offset, disk)))
  }

  @action.bound
  moveMany(notes: NoteType[], timescales: TimeScale[], timeoffset: number, min: number, max: number, laneoffset: number, division: number) {
    return this.done(this.history.doTransaction(() => {
      for (const n of notes) {
        const targetTime = n.realtimecache + timeoffset
        const targetLane = n.lane + laneoffset
        if (targetTime > max || targetTime < min || targetLane < 0 || targetLane > 6) {
          for (const n of notes) FreshNoteCache(this.state, n)
          return false
        }
        this.patchNote(n, { lane: targetLane })
        n.realtimecache = targetTime
      }
      for (const t of timescales) {
        const targetTime = t.realtimecache + timeoffset
        if (targetTime > max || targetTime < min) {
          for (const t of timescales) FreshTimescaleCache(this.state, t)
          return false
        }
        t.realtimecache = targetTime
      }
      this.justifyFindNearest(notes, timescales, division)
      return true
    }))
  }

  @action.bound
  copyMany(notes: NoteType[], timeoffset: number, min: number, max: number, laneoffset: number, division: number) {
    return this.done(this.history.doTransaction(() => {
      const slideidmap: { [key: number]: number } = {}
      const slideNoteCount: { [key: number]: number } = {}
      for (const n of notes) {
        if (n.type === "slide")
          slideNoteCount[n.slide] = (slideNoteCount[n.slide] && slideNoteCount[n.slide] + 1) || 1
      }
      for (const slide in slideNoteCount) {
        const slideid = parseInt(slide)
        if (slideNoteCount[slideid] >= 2) {
          const id = randomId()
          this.history.callAtom(SlideActions.Add, id,
            assert(this.state.slides.get(slideid)).flickend)
          slideidmap[slideid] = id
        }
      }

      for (const n of notes) {
        const targetTime = n.realtimecache + timeoffset
        const targetLane = n.lane + laneoffset
        if (targetTime > max || targetTime < min || targetLane < 0 || targetLane > 6) {
          return false
        }
        const res = assert(this.calcNearestPosition(targetTime, division))
        if (n.type === "slide") {
          const slide = slideidmap[n.slide]
          if (!slide) continue
          const done = this.history.callAtom(SlideNoteActions.Add, randomId(), slide, res.timepoint.id, res.offset, n.tsgroup, targetLane, n.islaser, n.direction)
          if (!done) return false
        } else {
          const done = this.history.callAtom(SingleFlickActions.Add, randomId(), n.type, res.timepoint.id, res.offset, n.tsgroup, targetLane, n.alt)
          if (!done) return false
        }
      }
      return true
    }))
  }
  
  @action.bound
  copyManyTS(timescales: TimeScale[], timeoffset: number, min: number, max: number, division: number) {
    return this.done(this.history.doTransaction(() => {
      for (const ts of timescales) {
        const targetTime = ts.realtimecache + timeoffset
        if (targetTime > max || targetTime < min) {
          return false
        }
        const res = assert(this.calcNearestPosition(targetTime, division))
        const done = this.history.callAtom(TimescaleActions.Add, randomId(), ts.tsgroup, ts.timescale, res.timepoint.id, res.offset, ts.disk)
        if (!done) return false
      }
      return true
    }))
  }
  
  @action.bound
  interpolateTimescale(timescales: TimeScale[], division: number) {
    return this.done(this.history.doTransaction(() => {
      const tsSorted = timescales.sort((a, b) => a.realtimecache - b.realtimecache)
      for (let i = 0; i < tsSorted.length - 1; i++) {
        const tsA = tsSorted[i]
        const tsB = tsSorted[i + 1]

        if ((tsA.timepoint === tsB.timepoint) && (tsA.tsgroup === tsB.tsgroup) && (tsA.offset % (192/division) === 0) && (tsB.offset % (192/division) === 0)) {
          for (let ii = tsA.offset + 192/division; ii < tsB.offset; ii += 192/division) {
            const done = this.history.callAtom(TimescaleActions.Add, randomId(), tsA.tsgroup, Math.round(lerp(tsA.offset, tsB.offset, ii, tsA.timescale, tsB.timescale) * 100) / 100, tsA.timepoint, ii, tsA.disk)
            if (!done) return false
          }
        }
      }
      return true
    }))
  }
  
  @action.bound
  snapTimescale(timescales: TimeScale[], division: number) {
    return this.done(this.history.doTransaction(() => {
      for (const t of timescales) {
        const n = Math.round(t.offset / (192 / division)) * (192 / division)
        if (n !== t.offset) this.patchTimescale(t, { offset: n })
        FreshTimescaleCache(this.state, t)
      }
      return true
    }))
  }

  @action.bound
  copyTSG(tsgroup: TimeScaleGroup, tsgid: number) {
    return this.done(this.history.doTransaction(() => {
      const done = this.history.callAtom(TsGroupActions.Add, tsgid, tsgroup.name + " (copy)")
      if (!done) return false
      for (const id of tsgroup.timescales) {
        const ts = assert(this.timescales.get(id))
        const done = this.history.callAtom(TimescaleActions.Add, randomId(), tsgid, ts.timescale, ts.timepoint, ts.offset, ts.disk)
        if (!done) return false
      }
      return true
    }))
  }

  @action.bound
  removeNotes(notes: NoteType[]) {
    return this.done(this.history.doParallel(() => {
      this.deleteMany(notes)
    }))
  }

  @action.bound
  removeTimescales(timescales: TimeScale[]) {
    return this.done(this.history.doParallel(() => {
      this.deleteManyTS(timescales)
    }))
  }
}

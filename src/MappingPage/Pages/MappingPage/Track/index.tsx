import React, { useEffect } from "react"
import { autorun, action } from "mobx"
import { startAnimation, stopAnimation } from "../../../../Common/animation"
import { Music } from "../../../states"
import { MappingState } from "../sharedState"
import ActionPreview from "./ActionPreview"
import GridLayer from "./GridLayer"
import NotesLayer from "./NotesLayer"
import ProgressLine from "./ProgressLine"
import { state } from "./state"
import { useStyles } from "./styles"
import InfoWindow from "./InfoWindow"
import { scope } from "../../../../MappingScope/scope"
import BarLayer from "./BarLayer"
import WarningLayer from "./WarningLayer"
import { binarySearch } from "../../../../Common/binarySearch"
import { assert } from "../../../../Common/utils"
import { zoomin, zoomout } from "../Tools"

const transY = (viewTime: number) => `translateY(${MappingState.timeHeightFactor * viewTime}px)`

const handleScroll = action((e: React.WheelEvent<HTMLDivElement>) => {
  e.stopPropagation()
  const dt = e.deltaY / MappingState.timeHeightFactor
  const target = MappingState.getViewposition() - dt
  MappingState.setViewposition(target)
})

const flushPointerPos = action((e: MouseEvent | TouchEvent) => {
  if ("buttons" in e) {
    state.pointerClientX = e.clientX
    state.pointerClientY = e.clientY
  } else {
    const touches = Array.from(e.changedTouches)
    if (touches.length <= 0) return
    state.pointerClientX = touches.reduce((a, b) => a + b.clientX, 0) / touches.length
    state.pointerClientY = touches.reduce((a, b) => a + b.clientY, 0) / touches.length
  }
})

const flushPointerPos2 = action((e: React.TouchEvent<HTMLDivElement>) => {
    const touches = Array.from(e.changedTouches)
    if (touches.length <= 0) return
    state.pointerClientX = touches.reduce((a, b) => a + b.clientX, 0) / touches.length
    state.pointerClientY = touches.reduce((a, b) => a + b.clientY, 0) / touches.length
})

let lastTouchY: any = {}
let selectPointer = -1
const handleDown = action((e: MouseEvent | TouchEvent) => {
  e.stopPropagation()
  e.preventDefault()
  if ("touches" in e && e.touches.length === 2) {
    stopSelect()
    // twoFinger = true
    lastTouchY[e.touches[0].identifier] = e.touches[0].clientY
    lastTouchY[e.touches[1].identifier] = e.touches[1].clientY
    return
  }
  if (document.activeElement && "blur" in document.activeElement) {
    (document.activeElement as HTMLElement).blur()
  }
  if (selectPointer < 0) {
    if ("buttons" in e) {
      if (!(e.buttons & 3)) return
      selectPointer = e.button
    } else {
      selectPointer = e.changedTouches[0].identifier
    }
  }
  flushPointerPos(e)
  state.selectingStartLeft = state.pointerLeftPercent
  state.selectingStartTime = state.pointerTime
  if (!e.ctrlKey) {
    state.selectedNotes.clear()
  }
})
const stopSelect = action(() => {
  if (!state.selecting) return
  selectPointer = -1
  state.selecting = false
  for (const n of state.selectingNotes)
    state.selectedNotes.add(n)
  state.selectingNotes = []
  state.preventClick++
  setTimeout(() => state.preventClick--, 50)
})

window.addEventListener("mouseup", e => {
  if (e.button === selectPointer) stopSelect()
})
window.addEventListener("touchend", e => {
  if (e.changedTouches[0].identifier === selectPointer) stopSelect()
  if (state.zooming && !e.touches.length) {
    state.zooming = false
  }
  if (state.scrolling && !e.touches.length) {
    state.scrolling = false
  }
})

function getBaseLog(x: number, y: number) {
    return Math.log(y) / Math.log(x);
}

const handleMove = action((e: MouseEvent | TouchEvent) => {
  flushPointerPos(e)
  if ("touches" in e && e.touches.length === 2) {
    if (state.scrolling) {
      let delta = (lastTouchY[e.touches[0].identifier] - e.touches[0].clientY + lastTouchY[e.touches[1].identifier] - e.touches[1].clientY) / 2
      MappingState.setViewposition(MappingState.getViewposition() - delta / MappingState.timeHeightFactor)
    } else if (state.zooming) {
      let oldDistance = Math.abs(lastTouchY[e.touches[0].identifier] - lastTouchY[e.touches[1].identifier])
      let distance = Math.abs(e.touches[0].clientY - e.touches[1].clientY)
      const n = getBaseLog(1.414, distance / oldDistance)
      if (n >= 1) zoomin()
      else if (n <= -1) zoomout()
      else return
    } else {
      let delta = (lastTouchY[e.touches[0].identifier] - e.touches[0].clientY + lastTouchY[e.touches[1].identifier] - e.touches[1].clientY) / 2
      let oldDistance = Math.abs(lastTouchY[e.touches[0].identifier] - lastTouchY[e.touches[1].identifier])
      let distance = Math.abs(e.touches[0].clientY - e.touches[1].clientY)
      if (Math.abs(distance - oldDistance) > 15) {
        state.zooming = true
        const n = getBaseLog(1.414, distance / oldDistance)
        if (n >= 1) zoomin()
        else if (n <= -1) zoomout()
        else return
      } else if (Math.abs(delta) > 5) {
        state.scrolling = true
        MappingState.setViewposition(MappingState.getViewposition() - delta / MappingState.timeHeightFactor)
      } else return
    }
    
    lastTouchY[e.touches[0].identifier] = e.touches[0].clientY
    lastTouchY[e.touches[1].identifier] = e.touches[1].clientY
    
    return
  }
  if (state.zooming || state.scrolling) return
  if (!("buttons" in e) || e.buttons & 3) {
    if (state.draggingNote < 0 && !state.selecting)
      if (Math.abs(state.pointerTime - state.selectingStartTime) > 50 / MappingState.timeHeightFactor
        || Math.abs(state.pointerLeftPercent - state.selectingStartLeft) > 10) {
        state.selecting = true
        state.slideNote1Beat = undefined
      }
  } else {
    if (state.selecting) stopSelect()
  }
  if (state.selecting) {
    const list = MappingState.noteListOrdered
    const start = binarySearch(i => list[i].realtimecache, list.length, state.pointerTime)[0]
    const end = binarySearch(i => list[i].realtimecache, list.length, state.selectingStartTime)[0]
    state.selectingNotes = (list.slice(Math.min(start, end), Math.max(start, end)))
      .filter(x => {
        const left = x.lane * 10 + 20
        const min = Math.min(state.pointerLeftPercent, state.selectingStartLeft)
        const max = Math.max(state.pointerLeftPercent, state.selectingStartLeft)
        if (left >= min && left <= max) return true
        return false
      }).map(x => x.id)
  }
})

const handleClick = action((e: React.MouseEvent<HTMLDivElement>) => {
  flushPointerPos(e.nativeEvent)
  e.stopPropagation()
  e.preventDefault()
  if (state.preventClick) return
  let beat = state.pointerBeat
  let lane = state.pointerLane
  if (!beat || lane < 0) return
  switch (MappingState.tool) {
    case "single":
      scope.map.addSingle(beat.timepoint.id, beat.offset, MappingState.group === -10 ? -1 : MappingState.group, lane, false)
      break
    case "flick":
      scope.map.addFlick(beat.timepoint.id, beat.offset, MappingState.group === -10 ? lane === 0 || lane === 6 ? -2 : -1 : MappingState.group, lane)


      if (lane == 0 || lane == 6) {
        let lastTs: any = scope.map.timescalelist.filter(ts => ts.tsgroup === -1).filter(ts => ts.realtimecache < beat!.realtime).sort((a, b) => b.realtimecache - a.realtimecache)[0]
        if (!lastTs) lastTs = {timescale: 1}

        if (lastTs.timescale === 0) return
          const i = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == beat?.timepoint.id && offset == beat?.offset && tsgroup == -1 && timescale == -lastTs.timescale && disk == (lane == 0 ? 2 : 1)))
          if (i === -1) scope.map.addTimescale(-1, beat.timepoint.id, beat?.offset, -lastTs.timescale, lane == 0 ? 1 : 2)
          else {
            const tsc = scope.map.timescalelist[i]
            tsc.disk = 3
            scope.map.timescalelist[i] = tsc
          }
          
          const ii = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == beat?.timepoint.id && offset == beat?.offset + 24 && tsgroup == -1 && timescale == lastTs.timescale && disk == (lane == 0 ? 2 : 1)))
          if (ii === -1) scope.map.addTimescale(-1, beat.timepoint.id, beat?.offset + 24, lastTs.timescale, lane == 0 ? 1 : 2)
          else {
            const tsc = scope.map.timescalelist[ii]
            tsc.disk = 3
            scope.map.timescalelist[ii] = tsc
          }
      }
      break
    case "slide":
      if (state.slideNote1Beat) {
        scope.map.addSlide(state.slideNote1Beat.timepoint.id, state.slideNote1Beat.offset, state.slideNote1Tsg, state.slideNote1Lane,
          beat.timepoint.id, beat?.offset, MappingState.group === -10 ? lane === 0 || lane === 6 ? -2 : -1 : MappingState.group, lane)

        if (beat.realtime < state.slideNote1Beat.realtime) [beat, state.slideNote1Beat, lane, state.slideNote1Lane] = [state.slideNote1Beat, beat, state.slideNote1Lane, lane]


        if (state.slideNote1Lane == 0 || state.slideNote1Lane == 6) {
          let lastTs: any = scope.map.timescalelist.filter(ts => ts.tsgroup === -1).filter(ts => ts.realtimecache < state.slideNote1Beat!.realtime).filter(ts => ts.timescale).sort((a, b) => b.realtimecache - a.realtimecache)[0]
          if (!lastTs) lastTs = {timescale: 1}
          const i = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == state.slideNote1Beat?.timepoint.id && offset == state.slideNote1Beat?.offset && tsgroup == -1 && timescale == 0 && disk == (lane == 0 ? 2 : 1)))
          if (i === -1) scope.map.addTimescale(-1, state.slideNote1Beat.timepoint.id, state.slideNote1Beat.offset, 0, lane == 0 ? 1 : 2)
          else {
            const tsc = scope.map.timescalelist[i]
            tsc.disk = 3
            scope.map.timescalelist[i] = tsc
          }
          
          const ii = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == beat?.timepoint.id && offset == beat?.offset && tsgroup == -1 && timescale == lastTs.timescale && disk == (lane == 0 ? 2 : 1)))
          if (ii === -1) scope.map.addTimescale(-1, beat.timepoint.id, beat.offset, lastTs.timescale, lane == 0 ? 1 : 2)
          else {
            const tsc = scope.map.timescalelist[ii]
            tsc.disk = 3
            scope.map.timescalelist[ii] = tsc
          }
        }
        state.slideNote1Beat = undefined
      } else {
        state.slideNote1Beat = beat
        state.slideNote1Lane = lane
        state.slideNote1Tsg = MappingState.group === -10 ? lane === 0 || lane === 6 ? -2 : -1 : MappingState.group
      }
      break
    case "laser":
      if (state.slideNote1Beat) {
        scope.map.addSlide(state.slideNote1Beat.timepoint.id, state.slideNote1Beat.offset, state.slideNote1Tsg, state.slideNote1Lane,
          beat.timepoint.id, beat.offset, MappingState.group === -10 ? lane === 0 || lane === 6 ? -2 : -1 : MappingState.group, lane, true)
        state.slideNote1Beat = undefined
      } else {
        state.slideNote1Beat = beat
        state.slideNote1Lane = lane
        state.slideNote1Tsg = MappingState.group === -10 ? lane === 0 || lane === 6 ? -2 : -1 : MappingState.group
      }
      break
    default:
      return
  }
  state.preventClick++;
  setTimeout(() => state.preventClick--, 50);
})

const handleMoveTouch = (e: React.TouchEvent<HTMLDivElement>) => {
  flushPointerPos2(e)
}

const Track = () => {
  const cn = useStyles()

  useEffect(() => autorun(() => {
    if (state.panelRef.current) {
      state.panelRef.current.style.height = (MappingState.paddedDuration * MappingState.timeHeightFactor) + "px"
      if (Music.playing && MappingState.tracking) {
        startAnimation(state.panelRef.current, "transform", MappingState.getViewposition(),
          MappingState.viewduration, transY, Music.remaintime())
      } else {
        stopAnimation(state.panelRef.current, "transform", MappingState.getViewposition(), transY)
      }
    }
  }), [])

  useEffect(() => {
    window.addEventListener("mousedown", handleDown)
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("touchstart", handleDown)
    window.addEventListener("touchmove", handleMove)
    return () => {
      window.removeEventListener("mousedown", handleDown)
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("touchstart", handleDown)
      window.removeEventListener("touchmove", handleMove)
    }
  }, [])

  return (
    <div className={cn.track}>
      <div className={cn.panel} ref={state.panelRef} onWheel={handleScroll} onClick={handleClick} onTouchMove={handleMoveTouch}>
        <GridLayer />
        <BarLayer />
        <NotesLayer />
        {scope.settings.editor.warn_for_same_pos_notes && <WarningLayer />}
        <ActionPreview />
      </div>
      {scope.settings.editor.show_info_window && <InfoWindow />}
      <ProgressLine />
    </div>)
}

export default Track

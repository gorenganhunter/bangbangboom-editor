import React, { useEffect, useState } from "react"
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
import { Dialog, DialogTitle, DialogActions, DialogContent, Button, TextField, FormGroup, Checkbox, FormControlLabel } from "@material-ui/core"
import { useTranslation } from "react-i18next"
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

const handleMoveTouch = (e: React.TouchEvent<HTMLDivElement>) => {
  flushPointerPos2(e)
}

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
    state.selectedTimescales.clear()
  }
})
const stopSelect = action(() => {
  if (!state.selecting) return
  selectPointer = -1
  state.selecting = false
  for (const ts of state.selectingTimescales)
    state.selectedTimescales.add(ts)
  state.selectingTimescales = []
  if (MappingState.tool === "interpolate") {
    scope.map.interpolateTimescale(state.getSelectedTimescales(), MappingState.division)
    state.selectedTimescales.clear()
  }
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
    if (state.draggingTimescale < 0 && !state.selecting)
      if (Math.abs(state.pointerTime - state.selectingStartTime) > 50 / MappingState.timeHeightFactor
        || Math.abs(state.pointerLeftPercent - state.selectingStartLeft) > 10) {
        state.selecting = true
        state.slideNote1Beat = undefined
      }
  } else {
    if (state.selecting) stopSelect()
  }
  if (state.selecting) {
    const list = MappingState.timescaleListOrdered
    const start = binarySearch(i => list[i].realtimecache, list.length, state.pointerTime)[0]
    const end = binarySearch(i => list[i].realtimecache, list.length, state.selectingStartTime)[0]
    state.selectingTimescales = (list.slice(Math.min(start, end), Math.max(start, end))).filter(ts => ts.tsgroup === MappingState.group).map(x => x.id)
  }
})


// const AddDialog = () => {
//   return (
//   )
// }

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

  const [tsData, setTsData] = useState<{ ts?: number,timepoint: number, offset: number, timescale: string, disk: number }>({
    timepoint: 0,
    offset: 0,
    disk: 3,
    timescale: 1 + ""
  })

    const [disk, setDisk] = useState<{ left: boolean, right: boolean }>({
        left: true,
        right: true
    })

  const handleClick = action((e: React.MouseEvent<HTMLDivElement>) => {
    flushPointerPos(e.nativeEvent)
    e.stopPropagation()
    e.preventDefault()
    if (state.preventClick) return
    const beat = state.pointerBeat
    const group = MappingState.group
    if (!beat || group == -10) return
    switch (MappingState.tool) {
      case "add":
        const ts = scope.map.timescalelist.find(({ timepoint, offset, tsgroup }) => timepoint === beat.timepoint.id && offset === beat.offset && tsgroup === MappingState.group)
        if (ts) {
          setTsData({
            timepoint: ts.timepoint,
            offset: ts.offset,
            timescale: ts.timescale + "",
            disk: ts.disk,
            ts: ts.id
          })
                  setDisk({ left: ts.disk === 3 || ts.disk === 1, right: ts.disk === 3 || ts.disk === 2 })
          setShowEditDialog(true)
        } else {
          setTsData({
            timepoint: beat.timepoint.id,
            offset: beat.offset,
            timescale: 1 + "",
            disk: 3
          })
                  setDisk({ left: true, right: true })
          setShowAddDialog(true)
        }
        break
      // case "delete":
      //   const tsc = scope.map.timescalelist.find(({ timepoint, offset, tsgroup }) => timepoint === beat.timepoint.id && offset === beat.offset && tsgroup === MappingState.group)
      //   if (!tsc) return
      //   scope.map.removeTimescales([tsc])
      //   break
      default:
        return
    }
  state.preventClick++;
  setTimeout(() => state.preventClick--, 50);
  })

  const [showAddDialog, setShowAddDialog] = useState<boolean>(false)
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false)
  const { t } = useTranslation()

    const addTs = () => {
        scope.map.addTimescale(MappingState.group, tsData.timepoint, tsData.offset, parseFloat(tsData.timescale) || 0, disk.left ? disk.right ? 3 : 1 : disk.right ? 2 : 0)
        setShowAddDialog(false)
    }

    const editTs = () => {
        if (!tsData.ts) return
        const ts = scope.map.timescales.get(tsData.ts)
        if (!ts) return
        scope.map.editTimescale(ts, parseFloat(tsData.timescale) || 0, disk.left ? disk.right ? 3 : 1 : disk.right ? 2 : 0)
        setShowEditDialog(false)
    }
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
    <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} classes={{ paper: cn.paper }}>
      <DialogTitle>Add TimeScale</DialogTitle>
      <DialogContent>
          <TextField inputProps={{ inputMode: "numeric" }} required autoFocus label="Timescale" value={tsData.timescale} onChange={e => setTsData({ ...tsData, timescale: e.target.value })} fullWidth />
            <FormGroup>
                        <h2>Select Disk</h2>
                        <FormControlLabel control={(<Checkbox checked={disk.left} onChange={e => setDisk({ ...disk, left: e.target.checked })} />)} label="Left" />
                        <FormControlLabel control={(<Checkbox checked={disk.right} onChange={e => setDisk({ ...disk, right: e.target.checked })} />)} label="Right" />
            </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowAddDialog(false)} color="secondary">
          {t("Close")}
        </Button>
        <Button onClick={addTs} color="primary">
          {t("Create")}
        </Button>
      </DialogActions>
    </Dialog >
    <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} classes={{ paper: cn.paper }}>
      <DialogTitle>Edit TimeScale</DialogTitle>
      <DialogContent>
          <TextField inputProps={{ inputMode: "numeric" }} required autoFocus label="Timescale" value={tsData.timescale} onChange={e => setTsData({ ...tsData, timescale: e.target.value })} fullWidth />
            <FormGroup>
                        <h2>Select Disk</h2>
                        <FormControlLabel control={(<Checkbox checked={disk.left} onChange={e => setDisk({ ...disk, left: e.target.checked })} />)} label="Left" />
                        <FormControlLabel control={(<Checkbox checked={disk.right} onChange={e => setDisk({ ...disk, right: e.target.checked })} />)} label="Right" />
            </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowEditDialog(false)} color="secondary">
          {t("Close")}
        </Button>
        <Button onClick={editTs} color="primary">
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog >
    </div>)
}

export default Track

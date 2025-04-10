import React, { useMemo } from "react"
import { makeStyles } from "@material-ui/core/styles"
import { GridD1, MappingState, GridD2, GridD3, GridD4 } from "../sharedState"
import { Music } from "../../../states"
import { useObserver } from "mobx-react-lite"
import { range, TimeToString, assert } from "../../../../Common/utils"
import { useStyles as useLayerStyle } from "./styles"
import { scope } from "../../../../MappingScope/scope"
import { action } from "mobx"
import { state } from "./state"
import { TimeScale } from "../../../../MappingScope/EditMap"
import { useMirror } from "../../MappingPage/Track/state"

const useStyles = makeStyles(theme => ({
  vertline: { borderLeft: "1.2px solid lightgray", height: "100%", position: "absolute", pointerEvents: "none" },
  beatline1: {
    position: "absolute", textAlign: "right", width: "80%", right: "5%", borderBottom: "1.2px lightgray solid",
  },
  subline: { position: "absolute", width: "70%", left: "15%", },
  beatline2: { borderBottom: "1.2px solid gray" },
  beatline3: { borderBottom: "1.2px solid firebrick" },
  beatline4: { borderBottom: "1.2px solid darkslateblue" },
  time: { position: "absolute", left: 0 },
  bpm: { position: "absolute", right: 0 },
  timepoint: {
    position: "absolute", color: "aquamarine", width: "95%",
    borderBottom: "1.2px aquamarine solid", height: "1.5em"
  },
  ts: {
    position: "absolute", color: "yellow", width: "95%",
    borderBottom: "1.2px yellow solid", height: "1.5em"
  },
  // tsSelected: {
  //   position: "absolute", color: "blue", width: "100%",
  //   borderBottom: "1.5px blue solid", height: "2em"
  // },
}))

const bottomstyle = (time: number) => ({ bottom: (MappingState.timeHeightFactor * time) + "px" })

const vertlines = range(15, 90, 10)

const flushPointerPos2 = action((e: React.TouchEvent<HTMLDivElement>) => {
    const touches = Array.from(e.changedTouches)
    if (touches.length <= 0) return
    state.pointerClientX = touches.reduce((a, b) => a + b.clientX, 0) / touches.length
    state.pointerClientY = touches.reduce((a, b) => a + b.clientY, 0) / touches.length
})

let dragPointer = -1;
let copy = 0
let ct = 0
const downEventHandler = action((tsid: number) => {
    return action(
        (
            e:
                | React.MouseEvent<HTMLDivElement>
                | React.TouchEvent<HTMLDivElement>
        ) => {
            e.stopPropagation();
            e.preventDefault();
            if (MappingState.tool === "delete" || MappingState.tool === "add") {

                    // state.preventClick++;
                    // setTimeout(() => state.preventClick--, 50);
        return
      }
            if (Date.now() - ct > 200) copy = 0
            const ts = assert(scope.map.timescales.get(tsid));
            if (dragPointer < 0) {
                if ("buttons" in e) {
                    if (!(e.buttons & 3)) return;
                    dragPointer = e.button;
                } else {
                    dragPointer = e.changedTouches[0].identifier;
          flushPointerPos2(e)
                }
            }
            state.draggingTimescale = tsid;
            if (!e.ctrlKey && !state.selectedTimescales.has(ts.id))
                state.selectedTimescales.clear();
            // state.slideNote1Beat = undefined;
        }
    );
});

const handleUp = action((e: MouseEvent | TouchEvent) => {
    if ("buttons" in e) {
        if (e.button !== dragPointer) return;
    } else {
        if (e.changedTouches[0].identifier !== dragPointer) return;
    }
    dragPointer = -1;
    if (state.draggingTimescale >= 0) {
        const ts = assert(scope.map.timescales.get(state.draggingTimescale));
        const draggingSelected = state.draggingSelected;
        state.draggingTimescale = -1; // important: after get draggingselected !!!
        if (!state.pointerBeat) return;
        if (state.pointerLane < 0) return;
        const dt = state.pointerBeat.realtime - ts.realtimecache;
        if (!dt) return;

        const before = new Set<number>();
        const isCopy = e.ctrlKey || copy;
        if (isCopy) for (const t of scope.map.timescalelist) before.add(t.id);

        if (draggingSelected) {
            if (isCopy)
                scope.map.copyManyTS(
                    state.getSelectedTimescales(),
                    dt,
                    0,
                    Music.duration,
                    MappingState.division
                );
            else
                scope.map.moveMany(
                    [],
                    state.getSelectedTimescales(),
                    dt,
                    0,
                    Music.duration,
                    0,
                    MappingState.division
                );
        } else {
            if (isCopy)
                scope.map.copyManyTS(
                    [ts],
                    dt,
                    0,
                    Music.duration,
                    MappingState.division
                );
            else
                scope.map.moveMany(
                    [],
                    [ts],
                    dt,
                    0,
                    Music.duration,
                    0,
                    MappingState.division
                );
        }

        setTimeout(
            action(() => {
                if (isCopy && scope.map.timescales.size !== before.size) {
                    state.selectedTimescales.clear();
                    for (const n of scope.map.timescalelist) {
                        if (!before.has(n.id)) {
                            state.selectedTimescales.add(n.id);
                        }
                    }
                }
            })
        );

        state.preventClick++;
        setTimeout(() => state.preventClick--, 50);
    }
});
window.addEventListener("mouseup", handleUp);
window.addEventListener("touchend", handleUp);

const removeTimescale = (ts: TimeScale) => {
    if (state.selectedTimescales.has(ts.id)) {
        scope.map.removeTimescales(state.getSelectedTimescales());
    } else {
        scope.map.removeTimescales([ts]);
    }
};

const clickEventHandler = (tsid: number) => {
    return (e: React.MouseEvent) => {
        if (MappingState.tool !== "add") e.stopPropagation();
        e.preventDefault();
        copy = 1
        ct = Date.now()
        if (state.preventClick) return
        const ts = assert(scope.map.timescales.get(tsid));
        if (e.ctrlKey) {
            if (state.selectedTimescales.has(ts.id))
                state.selectedTimescales.delete(ts.id);
            else state.selectedTimescales.add(ts.id);
        } else {
            switch (MappingState.tool) {
                case "delete":
                    if (state.selectedTimescales.has(ts.id)) {
                        scope.map.removeTimescales(state.getSelectedTimescales());
                    } else {
                        scope.map.removeTimescales([ts])
                    }
                    break;
            }
        }
    };
};

// const doubleClickHandler = (nid: number) => {
//     return (e: React.MouseEvent) => {
//         e.stopPropagation();
//         e.preventDefault();
//         if (state.preventClick) return;
//         const note = assert(scope.map.notes.get(nid));
//         if (note.type === "single") scope.map.toggleTap(note)
//         // if (note.type === "slide") {
//         //     const s = assert(scope.map.slides.get(note.slide));
//         //     if (note.id === s.notes[s.notes.length - 1])
//         //         scope.map.toggleFlickend(s.id);
//         // } else {
//         //     scope.map.toggleFlick(note);
//         // }
//     };
// };

const contextMenuHandler = (tsid: number) => {
    return (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        if (state.preventClick) return;
        const ts = assert(scope.map.timescales.get(tsid));
        removeTimescale(ts);
    };
};

const LaneAndTime = () => {
  const cn = useStyles()

  return useObserver(() => <>
    <>
      {vertlines.map(left =>
        <div key={left} className={cn.vertline} style={{ left: left + "%" }} />)}
    </><>
      {range(0, Music.duration, 2).map(time =>
        <div key={time} className={cn.time} style={bottomstyle(time)}>{TimeToString(time)}</div>)}
    </>
  </>)
}

const DivisorLines = () => {

  const cn = useStyles()

  return useObserver(() => <>
    <>
      {GridD1().map(({ time, name }, index) =>
        <div key={index} className={cn.beatline1} style={bottomstyle(time)}>{name}</div>)}
    </><>
      {MappingState.division % 2 === 0 && GridD2().map((time, index) =>
        <div key={index} className={cn.subline + " " + cn.beatline2} style={bottomstyle(time)} />)}
    </><>
      {MappingState.division % 3 === 0 && GridD3().map((time, index) =>
        <div key={index} className={cn.subline + " " + cn.beatline3} style={bottomstyle(time)} />)}
    </><>
      {MappingState.division % 4 === 0 && GridD4().map((time, index) =>
        <div key={index} className={cn.subline + " " + cn.beatline4} style={bottomstyle(time)} />)}
    </>
  </>)
}

const TimepointStart = () => {

  const cn = useStyles()

  return useObserver(() => <>
    {scope.map.timepointlist.map(tp =>
      <div className={cn.timepoint} key={tp.id} style={bottomstyle(tp.time)}>
        {/* <div className={cn.time}>{TimeToString(tp.time)}</div> */}
        <div className={cn.bpm}>{tp.bpm}</div>
      </div>)}
  </>)
}

const TimescaleStart = () => {

  return useObserver(() => <>
    {scope.map.timescalelist.filter(({ tsgroup }) => /* MappingState.group === -10 ||  */MappingState.group === tsgroup).map(ts =>
      <TimescaleEl key={ts.id} ts={ts} />)}
  </>)
}

const TimescaleEl = ({ ts }: { ts: TimeScale }) => {
  const cn = useStyles()

    const onMouseDown = useMemo(() => downEventHandler(ts.id), [ts.id]);
    const onContextMenu = useMemo(() => contextMenuHandler(ts.id), [ts.id]);
    // const onDoubleClick = useMemo(() => doubleClickHandler(note.id), [note.id]);
    const onClick = useMemo(() => clickEventHandler(ts.id), [ts.id]);
  // const props = {
  //   onMouseDown,
  //   onContextMenu,
  //   onClick
  // }

  return useObserver(() => {
    return <div className={cn.ts} key={ts.id} style={bottomstyle(ts.realtimecache)} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu} onTouchStart={onMouseDown}>
      <div className={cn.time}>{ts.timescale}x</div>
    </div>
  })
}

const GridLayer = () => {
  const cn = useLayerStyle()
  return (<>
    <div className={cn.layer}>
      <LaneAndTime />
      <DivisorLines />
      <TimepointStart />
    </div>
      <TimescaleStart />
  </>)
}

export default GridLayer

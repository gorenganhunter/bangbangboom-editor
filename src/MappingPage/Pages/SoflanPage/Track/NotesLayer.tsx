import React, { useMemo } from "react";
import { NoteType, TimeScale } from "../../../../MappingScope/EditMap";
import { MappingState } from "../sharedState";
import { useStyles, useNoteStyles } from "./styles";
import assets from "../../../assets";
import { assert, neverHappen } from "../../../../Common/utils";
import { scope } from "../../../../MappingScope/scope";
import { Music } from "../../../states";
import { useMirror, state } from "./state";
import { useObserver } from "mobx-react-lite";
import { action } from "mobx";

// let dragPointer = -1;
// const downEventHandler = action((tsid: number) => {
//     return action(
//         (
//             e:
//                 | React.MouseEvent<HTMLImageElement>
//                 | React.TouchEvent<HTMLImageElement>
//         ) => {
//             e.stopPropagation();
//             e.preventDefault();
//             const ts = assert(scope.map.timescales.get(tsid));
//             if (dragPointer < 0) {
//                 if ("buttons" in e) {
//                     if (!(e.buttons & 3)) return;
//                     dragPointer = e.button;
//                 } else {
//                     dragPointer = e.changedTouches[0].identifier;
//                 }
//             }
//             state.draggingTimescale = tsid;
//             if (!e.ctrlKey && !state.selectedTimescales.has(ts.id))
//                 state.selectedTimescales.clear();
//             // state.slideNote1Beat = undefined;
//         }
//     );
// });

// const handleUp = action((e: MouseEvent | TouchEvent) => {
//     if ("buttons" in e) {
//         if (e.button !== dragPointer) return;
//     } else {
//         if (e.changedTouches[0].identifier !== dragPointer) return;
//     }
//     dragPointer = -1;
//     if (state.draggingTimescale >= 0) {
//         const ts = assert(scope.map.timescales.get(state.draggingTimescale));
//         const draggingSelected = state.draggingSelected;
//         state.draggingTimescale = -1; // important: after get draggingselected !!!
//         if (!state.pointerBeat) return;
//         if (state.pointerLane < 0) return;
//         const dt = state.pointerBeat.realtime - ts.realtimecache;
//         if (!dt) return;

//         const before = new Set<number>();
//         const copy = e.ctrlKey;
//         if (copy) for (const t of scope.map.timescalelist) before.add(t.id);

//         if (draggingSelected) {
//             if (copy)
//                 scope.map.copyManyTS(
//                     state.getSelectedTimescales(),
//                     dt,
//                     0,
//                     Music.duration,
//                     MappingState.division
//                 );
//             else
//                 scope.map.moveMany(
//                     [],
//                     state.getSelectedTimescales(),
//                     dt,
//                     0,
//                     Music.duration,
//                     0,
//                     MappingState.division
//                 );
//         } else {
//             if (copy)
//                 scope.map.copyManyTS(
//                     [ts],
//                     dt,
//                     0,
//                     Music.duration,
//                     MappingState.division
//                 );
//             else
//                 scope.map.moveMany(
//                     [],
//                     [ts],
//                     dt,
//                     0,
//                     Music.duration,
//                     0,
//                     MappingState.division
//                 );
//         }

//         setTimeout(
//             action(() => {
//                 if (copy && scope.map.timescales.size !== before.size) {
//                     state.selectedTimescales.clear();
//                     for (const n of scope.map.timescalelist) {
//                         if (!before.has(n.id)) {
//                             state.selectedTimescales.add(n.id);
//                         }
//                     }
//                 }
//             })
//         );

//         state.preventClick++;
//         setTimeout(() => state.preventClick--, 50);
//     }
// });
// window.addEventListener("mouseup", handleUp);
// window.addEventListener("touchend", handleUp);

// const removeNote = (ts: TimeScale) => {
//     if (state.selectedTimescales.has(ts.id)) {
//         scope.map.removeTimescales(state.getSelectedTimescales());
//     } else {
//         scope.map.removeTimescales([ts]);
//     }
// };

const clickEventHandler = (nid: number) => {
    return (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        // if (state.preventClick) return
        const note = assert(scope.map.notes.get(nid));
        if (e.ctrlKey) {
            // if (state.selectedNotes.has(note.id))
            //     state.selectedNotes.delete(note.id);
            // else state.selectedNotes.add(note.id);
        } else {
            switch (MappingState.tool) {
                case "set":
                    scope.map.setNoteTsGroup(note, MappingState.group === -10 ? (note.lane === 0 || note.lane === 6) ? -2 : -1 : MappingState.group)
                    // removeNote(note);
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

// const contextMenuHandler = (nid: number) => {
//     return (e: React.MouseEvent<HTMLImageElement>) => {
//         e.stopPropagation();
//         e.preventDefault();
//         if (state.preventClick) return;
//         const note = assert(scope.map.notes.get(nid));
//         removeNote(note);
//     };
// };

const Note = ({ note }: { note: NoteType }) => {
    const cn = useNoteStyles();

    // const onMouseDown = useMemo(() => downEventHandler(note.id), [note.id]);
    // const onContextMenu = useMemo(() => contextMenuHandler(note.id), [note.id]);
    // const onDoubleClick = useMemo(() => doubleClickHandler(note.id), [note.id]);
    const onClick = useMemo(() => clickEventHandler(note.id), [note.id]);

    return useObserver(() => {
        const left = note.lane * 10 + 15 + "%";
        const bottom =
            MappingState.timeHeightFactor * note.realtimecache + "px";
        const style = { left, bottom }
        let src: string;
        const n = scope.map.notes.get(note.id);
        if (!n) {
            // something strange with mobx action
            return (<img alt="" />);
        }
        switch (note.type) {
            case "single":
                src = note.alt ? assets.d4dj_tap : assets.d4dj_tap_alt;
                break;
            case "flick":
                src =
                    note.lane == 0 || note.lane == 6
                        ? assets.d4dj_flick
                        : assets.d4dj_slide_flick;
                break;
            case "slide":
                const slide = assert(scope.map.slides.get(note.slide));
                if (note.islaser) {
                    if (
                        note.id === slide.notes[slide.notes.length - 1] &&
                        slide.flickend
                    ) {
                        src = assets.d4dj_slide_flick;
                    } else {
                        src = assets.d4dj_slide;
                    }
                } else if (note.lane == 0 || note.lane == 6) {
                    src = assets.d4dj_stop;
                } else {
                    src = assets.d4dj_hold;
                }

                break;
            default:
                neverHappen();
        }
        const imgProps: any = {
            src,
            draggable: false,
            className: cn.note,
            onClick
        };

        if (MappingState.group === -10 || MappingState.group === n.tsgroup) {
            imgProps.style = style
            return (<img alt="" {...imgProps} />)
        }
        
        imgProps.style = { ...style, zIndex: 5 }

        return (<><div className={cn.overlay} style={{ ...style, zIndex: 6 }}></div><img alt="" {...imgProps} /></>)
    });
};

const NotesLayer = () => {
    const cn = useStyles();
    const layer = useMirror();

    return useObserver(() => (
        <div className={cn.layer} ref={layer}>
            {scope.map.notelist.map((n) => (
                <Note key={n.id} note={n} />
            ))}
        </div>
    ));
};

export default NotesLayer;

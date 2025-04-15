import React, { useMemo, useState } from "react";
import { NoteType } from "../../../../MappingScope/EditMap";
import { MappingState } from "../sharedState";
import { useStyles, useNoteStyles } from "./styles";
import assets from "../../../assets";
import { assert, neverHappen } from "../../../../Common/utils";
import { scope } from "../../../../MappingScope/scope";
import { Music } from "../../../states";
import { useMirror, state } from "./state";
import { useObserver } from "mobx-react-lite";
import { action } from "mobx";
import { Dialog, DialogTitle, DialogContent, TextField, FormControlLabel, DialogActions, Button, FormGroup } from "@material-ui/core";
import { useTranslation } from "react-i18next";

let dragPointer = -1;
let copy = 0;
let ct = 0;
const downEventHandler = action((nid: number) => {
    return action(
        (
            e:
                | React.MouseEvent<HTMLImageElement>
                | React.TouchEvent<HTMLImageElement>
        ) => {
            e.stopPropagation();
            e.preventDefault();
            if (MappingState.tool === "delete") {

                    state.preventClick++;
                    setTimeout(() => state.preventClick--, 500);
        return
      }
            if (Date.now() - ct > 200) copy = 0
            const note = assert(scope.map.notes.get(nid));
            if (dragPointer < 0) {
                if ("buttons" in e) {
                    if (!(e.buttons & 3)) return;
                    dragPointer = e.button;
                } else {
                    dragPointer = e.changedTouches[0].identifier;
                }
            }
            state.draggingNote = nid;
            if (!e.ctrlKey && !state.selectedNotes.has(note.id))
                state.selectedNotes.clear();
            state.slideNote1Beat = undefined;
        }
    );
});

const handleUp = action((e: MouseEvent | TouchEvent) => {
    // if (MappingState.tool === "delete") return
    if ("buttons" in e) {
        if (e.button !== dragPointer) return;
    } else {
        if (e.changedTouches[0].identifier !== dragPointer) return;
    }
    dragPointer = -1;
    if (state.draggingNote >= 0) {
        const note = assert(scope.map.notes.get(state.draggingNote));
        const draggingSelected = state.draggingSelected;
        state.draggingNote = -1; // important: after get draggingselected !!!
        if (!state.pointerBeat) return;
        if (state.pointerLane < 0) return;
        const dt = state.pointerBeat.realtime - note.realtimecache;
        const dl = state.pointerLane - note.lane;
        if (!dt && !dl) return;

        const before = new Set<number>();
        const isCopy = e.ctrlKey || copy;
        if (isCopy) for (const n of scope.map.notelist) before.add(n.id);

        if (draggingSelected) {
            if (isCopy)
                scope.map.copyMany(
                    state.getSelectedNotes(),
                    dt,
                    0,
                    Music.duration,
                    dl,
                    MappingState.division
                );
            else
                scope.map.moveMany(
                    state.getSelectedNotes(),
                    [],
                    dt,
                    0,
                    Music.duration,
                    dl,
                    MappingState.division
                );
        } else {
            if (isCopy)
                scope.map.copyMany(
                    [note],
                    dt,
                    0,
                    Music.duration,
                    dl,
                    MappingState.division
                );
            else
                scope.map.moveMany(
                    [note],
                    [],
                    dt,
                    0,
                    Music.duration,
                    dl,
                    MappingState.division
                );
        }

        setTimeout(
            action(() => {
                if (isCopy && scope.map.notes.size !== before.size) {
                    state.selectedNotes.clear();
                    for (const n of scope.map.notelist) {
                        if (!before.has(n.id)) {
                            state.selectedNotes.add(n.id);
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

const removeNote = (note: NoteType) => {
    if (state.selectedNotes.has(note.id)) {
        scope.map.removeNotes(state.getSelectedNotes());
    } else {
        scope.map.removeNotes([note]);
    }
};

const clickEventHandler = (nid: number) => {
    return (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        copy = 1
        ct = Date.now()
        // if (state.preventClick) return
        const note = assert(scope.map.notes.get(nid));
        if (e.ctrlKey) {
            if (state.selectedNotes.has(note.id))
                state.selectedNotes.delete(note.id);
            else state.selectedNotes.add(note.id);
        } else {
            switch (MappingState.tool) {
                case "delete":
                    if (MappingState.group === -10 && (note.lane == 0 || note.lane == 6)) {
                        if (note.type === "flick") {
                            const ts = scope.map.timescalelist.find(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note.timepoint && offset == note.offset && tsgroup == -1 && timescale == -1 && disk == (note.lane == 0 ? 1 : 2)))
                            if (ts) scope.map.removeTimescales([ts])
                            
                            const ts2 = scope.map.timescalelist.find(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note.timepoint && offset == note.offset + 24 && tsgroup == -1 && timescale == 1 && disk == (note.lane == 0 ? 1 : 2)))
                            if (ts2) scope.map.removeTimescales([ts2])
                            
                            const ts3 = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note.timepoint && offset == note.offset && tsgroup == -1 && timescale == -1 && disk == 3))
                            if (ts3 != -1) {
                                const ts = scope.map.timescalelist[ts3]
                                ts.disk = note.lane == 0 ? 2 : 1
                                scope.map.timescalelist[ts3] = ts
                            }
                            
                            const ts4 = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note.timepoint && offset == note.offset + 24 && tsgroup == -1 && timescale == 1 && disk == 3))
                            if (ts4 != -1) {
                                const ts = scope.map.timescalelist[ts4]
                                ts.disk = note.lane == 0 ? 2 : 1
                                scope.map.timescalelist[ts4] = ts
                            }
                        } else if (note.type === "slide") {
                            const slide = scope.map.slides.get(note.slide)
                            const [note1, note2] = slide?.notes.map(id => scope.map.notes.get(id)).sort((a, b) => a!.realtimecache - b!.realtimecache)
                            const ts = scope.map.timescalelist.find(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note1!.timepoint && offset == note1!.offset && tsgroup == -1 && timescale == 0 && disk == (note1!.lane == 0 ? 1 : 2)))
                            if (ts) scope.map.removeTimescales([ts])
                            
                            const ts2 = scope.map.timescalelist.find(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note2!.timepoint && offset == note2!.offset && tsgroup == -1 && timescale == 1 && disk == (note2!.lane == 0 ? 1 : 2)))
                            if (ts2) scope.map.removeTimescales([ts2])
                            
                            const ts3 = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note1!.timepoint && offset == note1!.offset && tsgroup == -1 && timescale == 0 && disk == 3))
                            if (ts3 != -1) {
                                const ts = scope.map.timescalelist[ts3]
                                ts.disk = note.lane == 0 ? 2 : 1
                                scope.map.timescalelist[ts3] = ts
                            }
                            
                            const ts4 = scope.map.timescalelist.findIndex(({ timepoint, offset, tsgroup, timescale, disk }) => (timepoint == note2!.timepoint && offset == note2!.offset && tsgroup == -1 && timescale == 1 && disk == 3))
                            if (ts4 != -1) {
                                const ts = scope.map.timescalelist[ts4]
                                ts.disk = note.lane == 0 ? 2 : 1
                                scope.map.timescalelist[ts4] = ts
                            }
                        }
                    }
                    removeNote(note);
                    break;
            }
        }
    };
};

const doubleClickHandler = (nid: number, setFlickDirDialog: React.Dispatch<React.SetStateAction<boolean>>, setFlickDir: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (state.preventClick) return;
        const note = assert(scope.map.notes.get(nid));
        if (note.type === "single") scope.map.toggleTap(note)
        else {
            const lastNote = assert(scope.map.notelist.filter(n => ((n.type === "slide" && n.islaser) || (n.type === "flick" && n.lane !== 0 && n.lane !== 6))).sort((a, b) => b.realtimecache - a.realtimecache)[0])
            if (note.id !== lastNote.id) return

            setFlickDir((note.direction || 0) + "")
            setFlickDirDialog(true)
            state.preventClick++
            // const s = assert(scope.map.slides.get(note.slide));
            // if (note.id === s.notes[s.notes.length - 1])
            //     scope.map.toggleFlickend(s.id);
        }
    };
};

const contextMenuHandler = (nid: number) => {
    return (e: React.MouseEvent<HTMLImageElement>) => {
        e.stopPropagation();
        e.preventDefault();
        if (state.preventClick) return;
        const note = assert(scope.map.notes.get(nid));
        removeNote(note);
    };
};

const Note = ({ note, setFlickDirDialog, setFlickDir }: { note: NoteType, setFlickDirDialog: React.Dispatch<React.SetStateAction<boolean>>, setFlickDir: React.Dispatch<React.SetStateAction<string>> }) => {
    const cn = useNoteStyles();

    const onMouseDown = useMemo(() => downEventHandler(note.id), [note.id]);
    // const onContextMenu = useMemo(() => contextMenuHandler(note.id), [note.id]);
    const onDoubleClick = useMemo(() => doubleClickHandler(note.id, setFlickDirDialog, setFlickDir), [note.id]);
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
            onMouseDown,
            onTouchStart: onMouseDown,
            // onContextMenu,
            onDoubleClick,
            onClick,
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
    const { t } = useTranslation()
    const [flickDirDialog, setFlickDirDialog] = useState<boolean>(false)
    const [flickDir, setFlickDir] = useState<string>("0")

    const setDir = () => {
        const lastNote = assert(scope.map.notelist.filter(n => ((n.type === "slide" && n.islaser) || (n.type === "flick" && n.lane !== 0 && n.lane !== 6))).sort((a, b) => b.realtimecache - a.realtimecache)[0])
        if (lastNote.type === "slide" || lastNote.type === "flick") scope.map.setFaderDir(lastNote, parseInt(flickDir))
        setFlickDirDialog(false)
        setTimeout(() => state.preventClick--, 50);
    }

    return useObserver(() => (<>
    <Dialog open={flickDirDialog} onClose={() => { setFlickDirDialog(false); setTimeout(() => state.preventClick--, 50); }} classes={{ paper: cn.paper }}>
      <DialogTitle>Edit Direction</DialogTitle>
      <DialogContent>
          <TextField inputProps={{ inputMode: "numeric" }} required autoFocus label="Direction" value={flickDir} onChange={e => setFlickDir(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setFlickDirDialog(false); setTimeout(() => state.preventClick--, 50); }} color="secondary">
          {t("Close")}
        </Button>
        <Button onClick={setDir} color="primary">
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog >
        <div className={cn.layer} ref={layer}>
            {scope.map.notelist.map((n) => (
                <Note key={n.id} note={n} setFlickDir={setFlickDir} setFlickDirDialog={setFlickDirDialog} />
            ))}
        </div>
    </>));
};

export default NotesLayer;

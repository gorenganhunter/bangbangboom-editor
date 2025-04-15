import { EditMap, Timepoint, NoteType } from "../MappingScope/EditMap";
import { entryList, assert } from "../Common/utils";
import { Music } from "../MappingPage/states";
import { NoteBase } from "bangbangboom-game/build/Core/RawMap";

enum D4DJNoteType {
    Tap1 = "Tap1",
    Tap2 = "Tap2",
    ScratchLeft = "ScratchLeft",
    ScratchRight = "ScratchRight",
    StopStart = "StopStart",
    StopEnd = "StopEnd",
    LongStart = "LongStart",
    LongMiddle = "LongMiddle",
    LongEnd = "LongEnd",
    Slide = "Slide",
}

type NoteData = {
    // 0 - 6, note 0 and 6 is not for regular notes
    LaneId: number;
    Type: D4DJNoteType;
    Time: number;
    NextId: number;
    // for slide, it's auto generated for now
    Direction: number;
    // for slide, sound fx type
    EffectType: number;
    // sound fx parameter
    EffectParameter: number;
};

// Guessed type, seems like timing stuff, only effects lane 1-5
type SoflanData = {
    Time: number;
    TimeScale: number;
    // Assume 1 is left and 2 is right
    LeftRight: number;
};

type ChartData = {
    MusicName: string;
    SoflanDataList: SoflanData[];
    BarLineList: number[];
    NoteDataList: NoteData[];
};

export type D4DJExport = {
    chart: string;
    noteCount: string;
}

// thanks maomao
export function toD4DJGameFormat(map: EditMap): D4DJExport {
    const len = Music.duration;

    const chartData: ChartData = {
        MusicName: "music_0000001",
        BarLineList: [],
        SoflanDataList: [],
        NoteDataList: [],
    };

    const tps: Timepoint[] = Array.from(map.timepoints.values());

    tps.forEach((value: Timepoint, index, array) => {
        const tp = value;
        const ntp = index + 1 >= array.length ? null : array[index + 1];

        const et = ntp === null ? len : ntp.time / 1000;
        const tpb = 60 / (tp.bpm / tp.bpb);

        for (let t = tp.time; t < et; t += tpb) {
            chartData.BarLineList.push(Math.round(t * 100000) / 100000);
        }
    });

    const chartNotes = Array.from(map.notes.values()).sort(
        (a: NoteType, b: NoteType) => {
            return a.offset - b.offset;
        }
    );

    chartNotes.forEach((note) => {
        const tp = assert(map.timepoints.get(note.timepoint));
        const tpOffset = 60 / (tp.bpm * 192);

        const time = tp.time + note.offset * tpOffset;
        const d4djNote: NoteData = {
            LaneId: note.lane,
            Time: time,
            Type: D4DJNoteType.Tap2,
            NextId: 0,
            Direction: 0,
            EffectType: 0,
            EffectParameter: 0,
        };

        if (note.type === "flick") {
            switch (note.lane) {
                case 0:
                    chartData.SoflanDataList.push({
                        Time: time,
                        TimeScale: 1.0,
                        LeftRight: 1
                    });

                    chartData.SoflanDataList.push({
                        // 1/8 beat
                        Time: time + tpOffset * 6,
                        TimeScale: 1.0,
                        LeftRight: 1
                    });

                    d4djNote.Type = D4DJNoteType.ScratchLeft;
                    break;
                case 6:
                    chartData.SoflanDataList.push({
                        Time: time,
                        TimeScale: 1.0,
                        LeftRight: 2
                    });

                    chartData.SoflanDataList.push({
                        // 1/8 beat
                        Time: time + tpOffset * 6,
                        TimeScale: 1.0,
                        LeftRight: 2
                    });

                    d4djNote.Type = D4DJNoteType.ScratchRight;
                    break;
                default:
                    d4djNote.Type = D4DJNoteType.Slide;
            }
        } else if (note.type === "single") {
            d4djNote.Type =
                note.offset % 12 === 0 ? D4DJNoteType.Tap1 : D4DJNoteType.Tap2;
        } else if (note.type === "slide") {
            if (note.lane === 0 || note.lane === 6) {
                d4djNote.Type = D4DJNoteType.StopStart;

            }
            else if (note.islaser) {
                d4djNote.Type = D4DJNoteType.Slide;
            } else {
                d4djNote.Type = D4DJNoteType.LongStart;
            }

            const slide = assert(map.slides.get(note.slide));
            const slideNotes = Object.values(slide.notes);

            if (slideNotes.indexOf(note.id) === slideNotes.length - 1) {
                switch (d4djNote.Type) {
                    case D4DJNoteType.LongStart:
                        d4djNote.Type = D4DJNoteType.LongEnd;
                        break;
                    case D4DJNoteType.StopStart:
                        d4djNote.Type = D4DJNoteType.StopEnd;
                        break;
                    default:
                        d4djNote.Type = D4DJNoteType.Slide;
                }
            } else {
                const nextId = slideNotes[slideNotes.indexOf(note.id) + 1];
                const next = chartNotes.findIndex((n) => n.id === nextId);
                d4djNote.NextId = next;
            }

            if (d4djNote.Type == D4DJNoteType.StopStart) {
                chartData.SoflanDataList.push({
                    Time: time,
                    TimeScale: 0,
                    LeftRight: note.lane === 0 ? 1 : 2,
                });
            } else if (d4djNote.Type == D4DJNoteType.StopEnd) {
                chartData.SoflanDataList.push({
                    Time: time,
                    TimeScale: 1.0,
                    LeftRight: note.lane === 0 ? 1 : 2,
                });
            }
        }

        chartData.NoteDataList.push(d4djNote);
    });

    chartData.NoteDataList.forEach((value, index, array) => {
        if (value.Type === D4DJNoteType.Slide) {
            const note = value;
            if (note.NextId === 0) {
                for (let j = index + 1; j < array.length; j++) {
                    if (array[j].Type === D4DJNoteType.Slide) {
                        note.Direction = array[j].LaneId - note.LaneId;
                        break;
                    }
                }
            }
        }
    });

    const str = `"(14, Full)": {
      "ChartId": 14,
      "Section": "Full",
      "Count": ${chartData.NoteDataList.length}
},`;

    return {
        chart: JSON.stringify(chartData),
        noteCount: str
    };
}

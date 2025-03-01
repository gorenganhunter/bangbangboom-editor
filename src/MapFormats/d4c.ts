import { EditMap, Timepoint, NoteType } from "../MappingScope/EditMap";
import { entryList, assert } from "../Common/utils";
import { Music } from "../MappingPage/states";
import { NoteBase } from "bangbangboom-game/build/Core/RawMap";

enum D4CNoteType {
    Tap1 = "Tap1",
    Tap2 = "Tap2",
    Scratch = "Scratch",
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
    Type: D4CNoteType;
    Beat: number;
    NextId: number;
    TimeScaleGroupId: number;
    // for slide, it's auto generated for now
    Direction: number;
    // for slide, sound fx type
    EffectType: number;
    // sound fx parameter
    EffectParameter: number;
};

// Guessed type, seems like timing stuff, only effects lane 1-5
type SoflanData = {
    Beat: number;
    TimeScale: number;
    // Assume 1 is left and 2 is right
    LeftRight: number;
};

type SoflanGroup = {
    id: number;
    SoflanDataList: SoflanData[];
}

type BarLineData = number | {
    Time: number;
    TimeScaleGroupId?: string;
}

type ChartData = {
    Offset: number;
    BpmDataList: BpmData[];
    TimeScaleGroupList: SoflanGroup[];
    BarLine: {
        DefaultTimeScaleGroupId: number;
        List: BarLineData[];
    }
    NoteDataList: NoteData[];
};

export type D4CExport = {
    chart: string
}

type BpmData = {
    Beat: number;
    Bpm: number;
}

// thanks maomao
export function toD4CFormat(map: EditMap): D4CExport {
    const len = Music.duration;

    const chartData: ChartData = {
        Offset: 0,
        BpmDataList: [],
        TimeScaleGroupList: [],
        BarLine: {
            List: [],
            DefaultTimeScaleGroupId: -1
        },
        NoteDataList: [],
    };

    const tps: Timepoint[] = Array.from(map.timepoints.values());

    const ts = tps.sort((a, b) => a.time - b.time).map((tp: Timepoint, i, arr) => {
        let fb = 0
        if (i > 0) {
            for (let j = 0; j < i; j++) {
                const ntp = arr[j + 1];
                fb += Math.round((ntp.time - arr[j].time) / 60 * arr[j].bpm * 1000) / 1000
            }
        }
        return {
            ...tp,
            fb
        }
    })

    chartData.Offset = ts[0].time

    const ben = (len - ts[ts.length - 1].time) / 60 * ts[ts.length - 1].bpm + ts[ts.length - 1].fb

    ts.forEach((tp) => {
        chartData.BpmDataList.push({
            Beat: tp.fb,
            Bpm: tp.bpm
        })
    })

    ts.forEach((value, index, array) => {
        const tp = value;
        const ntp = index + 1 >= array.length ? null : array[index + 1];

        const et = ntp === null ? ben : ntp.fb;

        for (let b = tp.fb; b < et; b += tp.bpb) {
            chartData.BarLine.List.push(b);
        }
    });

    const getTimepoint = (id: number): Timepoint => assert(map.timepoints.get(id))

    const chartNotes = Array.from(map.notes.values()).sort(
        (a: NoteType, b: NoteType) => {
            return getTimepoint(a.timepoint)?.time - getTimepoint(b.timepoint)?.time || a.offset - b.offset 
        }
    )
    
    const lastDirFlickNote = chartNotes.filter(n => ((n.type === "slide" && n.islaser) || (n.type === "flick" && n.lane !== 0 && n.lane !== 6))).sort((a, b) => b.realtimecache - a.realtimecache)[0]

    chartNotes.forEach((note) => {
        // const tp = assert(map.timepoints.get(note.timepoint));
        const tp = assert(ts.find(({ id }) => id === note.timepoint))

        const beat = tp.fb + note.offset / 48;

        const d4cNote: NoteData = {
            LaneId: note.lane,
            Beat: beat,
            Type: D4CNoteType.Tap2,
            TimeScaleGroupId: note.tsgroup,
            NextId: 0,
            Direction: 0,
            EffectType: 0,
            EffectParameter: 0,
        };

        if (note.type === "flick") {
            switch (note.lane) {
                case 0:
                    d4cNote.Type = D4CNoteType.Scratch;
                    break;
                case 6:
                    d4cNote.Type = D4CNoteType.Scratch;
                    break;
                default:
                    d4cNote.Type = D4CNoteType.Slide;
            }
        } else if (note.type === "single") {
            d4cNote.Type =
                note.alt ? D4CNoteType.Tap1 : D4CNoteType.Tap2;
        } else if (note.type === "slide") {
            if (note.lane === 0 || note.lane === 6) {
                d4cNote.Type = D4CNoteType.StopStart;
            }
            else if (note.islaser) {
                d4cNote.Type = D4CNoteType.Slide;
            } else {
                d4cNote.Type = D4CNoteType.LongStart;
            }

            const slide = assert(map.slides.get(note.slide));
            const slideNotes = Object.values(slide.notes);

            if (slideNotes.indexOf(note.id) === slideNotes.length - 1) {
                switch (d4cNote.Type) {
                    case D4CNoteType.LongStart:
                        d4cNote.Type = D4CNoteType.LongEnd;
                        break;
                    case D4CNoteType.StopStart:
                        d4cNote.Type = D4CNoteType.StopEnd;
                        break;
                    default:
                        d4cNote.Type = D4CNoteType.Slide;
                }
            } else {
                const nextId = slideNotes[slideNotes.indexOf(note.id) + 1];
                const next = chartNotes.findIndex((n) => n.id === nextId);
                d4cNote.NextId = next;
            }
        }

        if (lastDirFlickNote && note.id === lastDirFlickNote.id) d4cNote.Direction = note.direction || 0

        chartData.NoteDataList.push(d4cNote);
    });

    chartData.NoteDataList.forEach((value, index, array) => {
        if (value.Type === D4CNoteType.Slide) {
            const note = value;
            if (note.NextId === 0) {
                for (let j = index + 1; j < array.length; j++) {
                    if (array[j].Type === D4CNoteType.Slide) {
                        note.Direction = array[j].LaneId - note.LaneId;
                        break;
                    }
                }
            }
        }
    });

    chartData.TimeScaleGroupList = Array.from(map.tsgroups.values()).map(tsg => ({
        id: tsg.id,
        SoflanDataList: tsg.timescales.map(id => {
            const tsc = map.timescales.get(id)!
        
            const tp = assert(ts.find(({ id }) => id === tsc.timepoint))

            const beat = tp.fb + tsc.offset / 48;
            return {
                Beat: beat,
                TimeScale: tsc.timescale,
                LeftRight: tsc.disk
            }
        })
    }))

    // const centerTsg: SoflanGroup = {
    //     id: 1,
    //     SoflanDataList: []
    // }

    // centerSoflan.forEach(ts => {
    //     const i = centerTsg.SoflanDataList.findIndex(({ Beat, TimeScale }) => (Beat === ts.Beat) && (TimeScale === ts.TimeScale))
    //     if (i === -1) centerTsg.SoflanDataList.push(ts)
    //     else centerTsg.SoflanDataList[i].LeftRight = 3
    // })

    // chartData.TimeScaleGroupList.push(centerTsg)

    return {
        chart: JSON.stringify(chartData),
    };
}

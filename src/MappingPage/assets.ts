
const assets = {
  note_flick: "/assets/mapping/note_flick.png",
  note_long: "/assets/mapping/note_long.png",
  note_normal: "/assets/mapping/note_normal.png",
  note_slide_among: "/assets/mapping/note_slide_among.png",
  timing_tack: "/assets/mapping/timing_tack.wav",
  timing_tick: "/assets/mapping/timing_tick.wav",
  perfect: "/assets/mapping/perfect.mp3",
  flick: "/assets/mapping/flick.mp3",
  long: "/assets/mapping/long.mp3",

  d4dj_tap: "/assets/mapping/d4dj_tap.png",
  d4dj_tap_alt: "/assets/mapping/d4dj_tap_alt.png",
  d4dj_stop: "/assets/mapping/d4dj_stop.png",
  d4dj_slide: "/assets/mapping/d4dj_slide.png",
  d4dj_slide_flick: "/assets/mapping/d4dj_slide_flick.png",
  d4dj_hold: "/assets/mapping/d4dj_hold.png",
  d4dj_hold_tick: "/assets/mapping/d4dj_hold_tick.png",
  d4dj_flick: "/assets/mapping/d4dj_flick.png",

  d4dj_tap_sfx: "/assets/mapping/d4dj_tap.mp3",
  d4dj_tap_alt_sfx: "/assets/mapping/d4dj_tap_alt.mp3",
  d4dj_stop_sfx: "/assets/mapping/d4dj_stop.mp3",
  // d4dj_slide: "/assets/mapping/d4dj_slide.mp3",
  d4dj_slide_flick_sfx: "/assets/mapping/d4dj_slide_flick.mp3",
  d4dj_long_sfx: "/assets/mapping/d4dj_long.mp3",
  d4dj_scratch_sfx: "/assets/mapping/d4dj_scratch.mp3",
}

for (const k in assets) {
  assets[(k as keyof typeof assets)] = process.env.PUBLIC_URL + assets[(k as keyof typeof assets)]
}

export default assets


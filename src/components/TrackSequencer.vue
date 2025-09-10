<template>
  <div class="seq">
    <div class="toolbar">
      <strong>Sequencer</strong>
      <div class="spacer"></div>
      <label class="ctl"
        >Bars <input type="number" min="1" max="16" v-model.number="track.seqBars"
      /></label>
      <label class="ctl"
        >TPB <input type="number" min="1" max="16" v-model.number="track.seqTicksPerBeat"
      /></label>

      <button
        class="small"
        :class="{ active: repeat }"
        @click="repeat = !repeat"
        title="Loop playback"
      >
        Loop
      </button>
      <button
        class="small"
        :class="{ active: isPlaying }"
        @click="togglePlay"
        :title="isPlaying ? 'Pause' : 'Play'"
      >
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <button class="small secondary" @click="stopSeq" title="Stop">■</button>
      <button class="small danger" @click="clearSeq" title="Clear">Clear</button>
    </div>

    <div class="seq-above-ruler">
      <button class="small" @click="addSegmentAtPlayhead" title="Add a new segment at playhead">
        Add Segment
      </button>
      <segment-editor :track="track" :song-key-root="songKeyRoot" :song-key-mode="songKeyMode" />
    </div>

    <div class="ruler-fixed" ref="ruler" @mousedown.stop="onRulerDown">
      <svg :width="svgWTotal" height="28">
        <g>
          <line
            v-for="t in totalBeats + 1"
            :key="'rbl' + t"
            :x1="gutter + t * ticksPerBeat * pxPerTick"
            y1="0"
            :x2="gutter + t * ticksPerBeat * pxPerTick"
            y2="28"
            class="beat"
          />
          <line
            v-for="b in track.seqBars + 1"
            :key="'rbar' + b"
            :x1="gutter + (b - 1) * track.seqBeatsPerBar * ticksPerBeat * pxPerTick"
            y1="0"
            :x2="gutter + (b - 1) * track.seqBeatsPerBar * ticksPerBeat * pxPerTick"
            y2="28"
            class="barline"
          />
          <text
            v-for="b in track.seqBars"
            :key="'rlbl' + b"
            :x="gutter + (b - 1) * track.seqBeatsPerBar * ticksPerBeat * pxPerTick + 4"
            y="12"
            class="bar-label"
          >
            {{ b }}
          </text>
          <!-- Playhead triangle in fixed ruler -->
          <polygon class="head" :points="`${playX - 5},0 ${playX + 5},0 ${playX},10`" />
          <!-- Elements lane moved into fixed ruler (sticky) -->
          <g class="elements">
            <g v-for="el in track.elements" :key="'elfix' + el.id">
              <rect
                :x="gutter + el.start * pxPerTick"
                :y="14"
                :width="Math.max(4, elTicks(el) * pxPerTick)"
                height="12"
                :class="['segment', track.selectedElementId === el.id ? 'selected' : '']"
                @mousedown.stop="onElementDown($event, el)"
              />
              <!-- Visible grips for element edges -->
              <rect
                :x="gutter + el.start * pxPerTick - 1"
                y="14"
                width="2"
                height="12"
                class="seg-edge seg-edge-start"
              />
              <rect
                :x="gutter + (el.start + elTicks(el)) * pxPerTick - 1"
                y="14"
                width="2"
                height="12"
                class="seg-edge seg-edge-end"
              />
              <rect
                :x="gutter + el.start * pxPerTick - 5"
                y="14"
                width="10"
                height="12"
                class="segment-handle"
                pointer-events="all"
                @mousedown.stop.prevent="onElementDown($event, el, 'resize-left')"
              />
              <rect
                :x="gutter + (el.start + elTicks(el)) * pxPerTick - 5"
                y="14"
                width="10"
                height="12"
                class="segment-handle"
                pointer-events="all"
                @mousedown.stop.prevent="onElementDown($event, el, 'resize-right')"
              />
              <text
                :x="gutter + el.start * pxPerTick + 4"
                y="24"
                class="segment-label"
                @mousedown.stop="onElementDown($event, el)"
              >
                {{ rnForDegree(el.degree || 0, el.quality) }}
              </text>
            </g>
          </g>
        </g>
      </svg>
    </div>
    <div
      class="roll"
      ref="roll"
      @scroll="onRollScroll"
      @mousedown="onDown"
      @mousemove="onHover"
      @mouseleave="clearHover"
    >
      <svg :width="svgWTotal" :height="svgH">
        <!-- Element ghost notes (read-only) -->
        <g class="ghosts">
          <template v-for="el in track.elements" :key="'g' + el.id">
            <template v-for="r in ghostRectsForElement(el)" :key="'g' + el.id + '-' + r.k">
              <rect
                :x="gutter + r.start * pxPerTick"
                :y="yForNote(r.note) + 2"
                :width="Math.max(2, r.ticks * pxPerTick)"
                :height="rowH - 6"
                class="ghost-note"
              />
            </template>
          </template>
        </g>
        <!-- Rows -->
        <g>
          <rect
            v-for="(p, i) in rowPitches"
            :key="'r' + i"
            :x="gutter"
            :y="i * rowH"
            :width="svgW"
            :height="rowH"
            :class="['row', isBlack(p) ? 'blk' : 'wht']"
          />
        </g>
        <!-- Grid lines -->
        <g>
          <line
            v-for="t in totalBeats + 1"
            :key="'bl' + t"
            :x1="gutter + t * ticksPerBeat * pxPerTick"
            y1="0"
            :x2="gutter + t * ticksPerBeat * pxPerTick"
            :y2="svgH"
            class="beat"
          />
        </g>

        <!-- Hover cell highlight -->
        <g v-if="hoverTick != null && hoverNote != null">
          <rect
            :x="gutter + hoverTick * pxPerTick"
            :y="yForNote(hoverNote)"
            :width="pxPerTick"
            :height="rowH"
            class="cell-highlight"
          />
        </g>
        <!-- Notes -->
        <g>
          <g v-for="ev in track.sequence" :key="ev.id">
            <rect
              :x="gutter + ev.start * pxPerTick"
              :y="yForNote(ev.note)"
              :width="Math.max(4, ev.len * pxPerTick)"
              :height="rowH - 2"
              class="note"
              @mousedown.stop.prevent="onNoteDown($event, ev, 'move')"
            />
            <!-- Visual edge markers for clarity -->
            <rect
              :x="gutter + ev.start * pxPerTick"
              :y="yForNote(ev.note)"
              width="1"
              :height="rowH - 2"
              class="edge edge-start"
            />
            <rect
              :x="gutter + (ev.start + ev.len) * pxPerTick - 1"
              :y="yForNote(ev.note)"
              width="1"
              :height="rowH - 2"
              class="edge edge-end"
            />
            <rect
              :x="gutter + ev.start * pxPerTick - 4"
              :y="yForNote(ev.note)"
              width="12"
              :height="rowH - 2"
              class="handle"
              pointer-events="all"
              @mousedown.stop.prevent="onNoteDown($event, ev, 'resize-left')"
            />
            <rect
              :x="gutter + (ev.start + ev.len) * pxPerTick - 4"
              :y="yForNote(ev.note)"
              width="12"
              :height="rowH - 2"
              class="handle"
              pointer-events="all"
              @mousedown.stop.prevent="onNoteDown($event, ev, 'resize-right')"
            />
          </g>
        </g>
        <!-- Key-based note labels in gutter -->
        <g>
          <template v-for="(p, i) in rowPitches" :key="'lblpc' + i">
            <text
              v-if="scalePCs.includes(p % 12)"
              :x="gutter - 4"
              :y="i * rowH + rowH / 2 + 3"
              class="pc-label"
              text-anchor="end"
            >
              {{ NOTE_NAMES[p % 12] }} {{ romanForPC(p % 12) }}
            </text>
          </template>
        </g>
        <!-- Middle C marker (on top of notes) -->
        <g>
          <!-- Draw dashed lines at the top and bottom of the C4 row for clarity -->
          <line :x1="0" :x2="svgWTotal" :y1="yForNote(60)" :y2="yForNote(60)" class="midc-line" />
          <line
            :x1="0"
            :x2="svgWTotal"
            :y1="yForNote(60) + rowH"
            :y2="yForNote(60) + rowH"
            class="midc-line"
          />
          <rect
            :x="2"
            :y="yForNote(60) + rowH / 2 - 8"
            width="24"
            height="16"
            rx="3"
            class="midc-badge"
          />
          <text :x="14" :y="yForNote(60) + rowH / 2 + 3" class="midc-label">C4</text>
        </g>
        <!-- Playhead -->
        <g>
          <line :x1="playX" :x2="playX" y1="0" :y2="svgH" class="playhead" />
        </g>
      </svg>
    </div>
  </div>
</template>

<script>
  import {
    NOTE_NAMES,
    CHORD_QUALITIES,
    EXTENSIONS,
    computeChordNotes,
    applyInversion,
    isBlack,
    scaleDegreeSemitones,
    romanForDegree,
    degreeRootForKey,
  } from '../lib/music';
  import SegmentEditor from './SegmentEditor.vue';

  export default {
    name: 'TrackSequencer',
    components: { SegmentEditor },
    emits: ['tick', 'state'],
    props: {
      track: { type: Object, required: true },
      songKeyRoot: { type: Number, default: 0 },
      songKeyMode: { type: String, default: 'major' },
      bpm: { type: Number, default: 120 },
    },
    data() {
      return {
        NOTE_NAMES,
        timers: [],
        pxPerTick: 12,
        rowH: 14,
        low: 36,
        high: 84,
        gutter: 32,
        drag: null, // {mode, id, start0, len0, note0, x0, y0}
        // transport
        playTick: 0,
        isPlaying: false,
        playStartMs: 0,
        playStartTick: 0,
        rafId: null,
        draggingScrub: false,
        syncingScroll: false,
        hoverTick: null,
        hoverNote: null,
        repeat: false,
      };
    },
    computed: {
      ticksPerBeat() {
        return Math.max(1, Number(this.track.seqTicksPerBeat || 4));
      },
      totalBeats() {
        return (
          Math.max(1, Number(this.track.seqBars || 1)) *
          Math.max(1, Number(this.track.seqBeatsPerBar || 4))
        );
      },
      totalTicks() {
        return this.totalBeats * this.ticksPerBeat;
      },
      svgW() {
        return this.totalTicks * this.pxPerTick;
      },
      svgH() {
        return (this.high - this.low + 1) * this.rowH;
      },
      svgWTotal() {
        return this.gutter + this.svgW;
      },
      rowPitches() {
        const arr = [];
        for (let p = this.high; p >= this.low; p--) arr.push(p);
        return arr;
      },
      playX() {
        return this.gutter + this.playTick * this.pxPerTick;
      },
      scalePCs() {
        const semis = scaleDegreeSemitones(this.songKeyMode);
        return semis.map((s) => (this.songKeyRoot + s) % 12);
      },
    },
    methods: {
      isBlack,
      romanForPC(pc) {
        const idx = this.scalePCs.indexOf(pc);
        if (idx === -1) return '';
        return romanForDegree(idx, this.songKeyMode);
      },
      rnForDegree(i, quality) {
        // Wrapper so template can call it; uses current key mode
        return romanForDegree(i, this.songKeyMode, quality);
      },
      chordNotesForElement(el) {
        const degree = Number.isFinite(el.degree) ? el.degree : 0;
        const rootPc = degreeRootForKey(this.songKeyRoot, this.songKeyMode, degree);
        const chordTrackLike = {
          root: rootPc,
          octave: Number.isFinite(el.octave) ? el.octave : this.track.octave || 4,
          quality: el.quality || this.track.quality || 'maj',
          inversion: Number.isFinite(el.inversion) ? el.inversion : 0,
          extensions: Array.isArray(el.extensions) ? el.extensions : [],
        };
        return applyInversion(computeChordNotes(chordTrackLike), chordTrackLike.inversion);
      },
      ghostRectsForElement(el) {
        const notes = this.chordNotesForElement(el);
        const startTick = Math.round(Number(el.start || 0));
        const lenTicks = this.elTicks(el);
        if (!el.arp) {
          return notes.map((n, i) => ({
            k: `${i}-${n}`,
            note: n,
            start: startTick,
            ticks: lenTicks,
          }));
        }
        const stepTicks = Math.max(
          1,
          Math.round(Math.max(0.0625, Number(el.arpLenBeats || 0.25)) * this.ticksPerBeat)
        );
        const count = Math.max(1, Math.ceil(lenTicks / stepTicks));
        const rects = [];
        for (let s = 0; s < count; s++) {
          const note = notes[s % notes.length];
          const st = startTick + s * stepTicks;
          const remaining = lenTicks - s * stepTicks;
          const width = Math.max(1, Math.min(stepTicks, remaining));
          rects.push({ k: `${s}-${note}`, note, start: st, ticks: width });
        }
        return rects;
      },
      // legacy helpers no longer used (ghosts now computed via ghostRectsForElement)
      msPerTick() {
        const bpm = Math.max(30, Math.min(300, Number(this.bpm || 120)));
        const msPerBeat = 60000 / bpm;
        return msPerBeat / this.ticksPerBeat;
      },
      yForNote(midi) {
        const idx = this.high - midi;
        return idx * this.rowH + 1;
      },
      noteForY(y) {
        const idx = Math.floor(y / this.rowH);
        const midi = this.high - idx;
        return Math.max(this.low, Math.min(this.high, midi));
      },
      tickForX(x) {
        const t = Math.round((x - this.gutter) / this.pxPerTick);
        return Math.max(0, Math.min(this.totalTicks - 1, t));
      },
      findEventAt(x, y) {
        const t = this.tickForX(x);
        const n = this.noteForY(y);
        for (const ev of this.track.sequence) {
          if (n === ev.note && t >= ev.start && t <= ev.start + ev.len) return ev;
        }
        return null;
      },
      elTicks(el) {
        const beats = Math.max(0.0625, Number(el.lenBeats || 1));
        return Math.max(1, Math.round(beats * this.ticksPerBeat));
      },
      findElementAtX(x) {
        const t = this.tickForX(x);
        for (const el of this.track.elements) {
          const len = this.elTicks(el);
          if (t >= el.start && t <= el.start + len) return el;
        }
        return null;
      },
      onElementDown(e, el, mode) {
        // select element and prepare drag
        this.$emit('select-element', el.id);
        if (this.track) this.track.selectedElementId = el.id;
        const svg = e.currentTarget?.ownerSVGElement;
        const container = svg?.parentElement || this.$refs.roll;
        const rect = svg?.getBoundingClientRect() || this.$refs.roll.getBoundingClientRect();
        const x = e.clientX - rect.left + (container?.scrollLeft || 0);
        const y = e.clientY - rect.top + (container?.scrollTop || 0); // not used
        this.drag = {
          mode: mode || 'el-move',
          kind: 'element',
          id: el.id,
          start0: el.start,
          len0: this.elTicks(el),
          x0: x,
          y0: y,
        };
        window.addEventListener('mousemove', this.onMove);
        window.addEventListener('mouseup', this.onUp);
      },
      onNoteDown(e, ev, mode) {
        // Direct note interaction with explicit mode (move/resize-left/resize-right)
        const rect = this.$refs.roll.getBoundingClientRect();
        const x = e.clientX - rect.left + this.$refs.roll.scrollLeft;
        const yAll = e.clientY - rect.top + this.$refs.roll.scrollTop;
        const y = yAll; // no top band in roll
        this.drag = {
          kind: 'note',
          mode: mode || 'move',
          id: ev.id,
          start0: ev.start,
          len0: ev.len,
          note0: ev.note,
          x0: x,
          y0: y,
        };
        window.addEventListener('mousemove', this.onMove);
        window.addEventListener('mouseup', this.onUp);
      },
      onDown(e) {
        const rect = this.$refs.roll.getBoundingClientRect();
        const x = e.clientX - rect.left + this.$refs.roll.scrollLeft;
        const yAll = e.clientY - rect.top + this.$refs.roll.scrollTop;
        const y = yAll;
        let ev = this.findEventAt(x, y);
        if (ev) {
          const px = x - this.gutter;
          const leftX = ev.start * this.pxPerTick;
          const rightX = (ev.start + ev.len) * this.pxPerTick;
          const thresh = 8; // tolerance for edge grabs
          let mode = 'move';
          if (px <= leftX + thresh) mode = 'resize-left';
          else if (px >= rightX - thresh) mode = 'resize-right';

          this.drag = {
            mode,
            id: ev.id,
            start0: ev.start,
            len0: ev.len,
            note0: ev.note,
            x0: x,
            y0: y,
          };
        } else {
          // Fallback: if click is near an edge but just outside the note bounds, treat as resize
          const note = this.noteForY(y);
          const px = x - this.gutter;
          const thresh = 8;
          let hit = null;
          for (const cand of this.track.sequence) {
            if (cand.note !== note) continue;
            const leftX = cand.start * this.pxPerTick;
            const rightX = (cand.start + cand.len) * this.pxPerTick;
            if (px <= leftX + thresh && px >= leftX - thresh) {
              hit = { ev: cand, mode: 'resize-left' };
              break;
            }
            if (px >= rightX - thresh && px <= rightX + thresh) {
              hit = { ev: cand, mode: 'resize-right' };
              break;
            }
          }
          if (hit) {
            ev = hit.ev;
            this.drag = {
              mode: hit.mode,
              id: ev.id,
              start0: ev.start,
              len0: ev.len,
              note0: ev.note,
              x0: x,
              y0: y,
            };
          } else {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const note = this.noteForY(y);
            const start = this.tickForX(x);
            const len = Math.max(1, Math.round(this.ticksPerBeat / 2));
            const obj = { id, note, start, len, vel: this.track.velocity };
            this.track.sequence.push(obj);
            this.drag = {
              mode: 'resize-right',
              id,
              start0: start,
              len0: len,
              note0: note,
              x0: x,
              y0: y,
            };
          }
        }
        window.addEventListener('mousemove', this.onMove);
        window.addEventListener('mouseup', this.onUp);
      },
      onMove(e) {
        if (!this.drag) return;
        const rect = this.$refs.roll.getBoundingClientRect();
        const x = e.clientX - rect.left + this.$refs.roll.scrollLeft;
        if (this.drag.kind === 'element') {
          const dxTicks = this.tickForX(x) - this.tickForX(this.drag.x0);
          const el = this.track.elements.find((s) => s.id === this.drag.id);
          if (!el) return;
          if (this.drag.mode === 'el-move') {
            el.start = Math.max(0, Math.min(this.totalTicks - 1, this.drag.start0 + dxTicks));
          } else if (this.drag.mode === 'resize-right') {
            const newLen = Math.max(1, this.drag.len0 + dxTicks);
            el.lenBeats = Math.max(0.0625, newLen / this.ticksPerBeat);
          } else if (this.drag.mode === 'resize-left') {
            const newStart = Math.max(0, Math.min(this.totalTicks - 1, this.drag.start0 + dxTicks));
            const deltaStart = this.drag.start0 - newStart;
            const newLen = Math.max(1, this.drag.len0 + deltaStart);
            el.start = newStart;
            el.lenBeats = Math.max(0.0625, newLen / this.ticksPerBeat);
          }
          return;
        }
        const y = e.clientY - rect.top + this.$refs.roll.scrollTop - 16;
        const dxTicks = this.tickForX(x) - this.tickForX(this.drag.x0);
        const dy = y - this.drag.y0;
        const ev = this.track.sequence.find((s) => s.id === this.drag.id);
        if (!ev) return;
        if (this.drag.mode === 'move') {
          ev.start = Math.max(0, Math.min(this.totalTicks - 1, this.drag.start0 + dxTicks));
          const note = this.noteForY(y);
          ev.note = Math.max(this.low, Math.min(this.high, note));
        } else if (this.drag.mode === 'resize-right') {
          ev.len = Math.max(1, this.drag.len0 + dxTicks);
        } else if (this.drag.mode === 'resize-left') {
          const newStart = Math.max(0, Math.min(this.totalTicks - 1, this.drag.start0 + dxTicks));
          const deltaStart = this.drag.start0 - newStart;
          ev.start = newStart;
          ev.len = Math.max(1, this.drag.len0 + deltaStart);
        }
      },
      onUp() {
        this.drag = null;
        window.removeEventListener('mousemove', this.onMove);
        window.removeEventListener('mouseup', this.onUp);
      },
      scheduleFrom(startTick) {
        const msPerTick = this.msPerTick();
        for (const s of this.track.sequence) {
          if (s.start < startTick) continue;
          const at = (s.start - startTick) * msPerTick;
          const len = Math.max(1, s.len) * msPerTick;
          const vel = Math.max(1, Math.min(127, s.vel || this.track.velocity || 96));
          const on = setTimeout(() => this.track.synthEngine.noteOn(s.note, vel), at);
          const off = setTimeout(() => this.track.synthEngine.noteOff(s.note), at + len);
          this.timers.push(on, off);
        }
        // schedule structured elements
        for (const el of this.track.elements) {
          if (el.start < startTick) continue;
          const atMs = (el.start - startTick) * msPerTick;
          this.scheduleElement(el, atMs, msPerTick);
        }
      },
      scheduleElement(el, atMs, msPerTick) {
        const vel = Math.max(1, Math.min(127, Number(el.velocity || this.track.velocity || 96)));
        const degree = Number.isFinite(el.degree) ? el.degree : 0;
        const rootPc = degreeRootForKey(this.songKeyRoot, this.songKeyMode, degree);
        const chordTrackLike = {
          root: rootPc,
          octave: Number.isFinite(el.octave) ? el.octave : this.track.octave || 4,
          quality: el.quality || this.track.quality || 'maj',
          inversion: Number.isFinite(el.inversion) ? el.inversion : 0,
          extensions: Array.isArray(el.extensions) ? el.extensions : [],
        };
        const chordNotes = applyInversion(
          computeChordNotes(chordTrackLike),
          chordTrackLike.inversion
        );
        const lenBeats = Math.max(0.0625, Number(el.lenBeats || 1));
        const durMs = lenBeats * this.msPerTick() * this.ticksPerBeat;
        if (el.arp) {
          // Use per-note arp length and loop across the segment
          const stepTicks = Math.max(
            1,
            Math.round(Math.max(0.0625, Number(el.arpLenBeats || 0.25)) * this.ticksPerBeat)
          );
          const stepMs = stepTicks * msPerTick;
          const totalTicks = Math.max(1, Math.round(lenBeats * this.ticksPerBeat));
          const steps = Math.max(1, Math.ceil(totalTicks / stepTicks));
          for (let s = 0; s < steps; s++) {
            const n = chordNotes[s % chordNotes.length];
            const start = atMs + s * stepMs;
            const gate = Math.max(10, Math.min(stepMs, durMs - s * stepMs));
            const idOn = setTimeout(() => this.track.synthEngine.noteOn(n, vel), start);
            const idOff = setTimeout(() => this.track.synthEngine.noteOff(n), start + gate);
            this.timers.push(idOn, idOff);
          }
        } else {
          // block chord for full segment
          chordNotes.forEach((n) => {
            const idOn = setTimeout(() => this.track.synthEngine.noteOn(n, vel), atMs);
            const idOff = setTimeout(() => this.track.synthEngine.noteOff(n), atMs + durMs);
            this.timers.push(idOn, idOff);
          });
        }
      },
      togglePlay() {
        if (this.isPlaying) this.stopSeq();
        else this.playSeq();
      },
      playSeq() {
        this.stopSeq();
        this.isPlaying = true;
        this.playStartTick = Math.max(0, Math.min(this.totalTicks - 1, this.playTick));
        this.playStartMs = performance.now();
        this.scheduleFrom(this.playStartTick);
        this.$emit('state', true);
        const step = () => {
          if (!this.isPlaying) return;
          const elapsed = performance.now() - this.playStartMs;
          const ticks = elapsed / this.msPerTick();
          this.playTick = Math.min(this.totalTicks, this.playStartTick + ticks);
          this.$emit('tick', Math.floor(this.playTick));
          if (this.playTick >= this.totalTicks) {
            if (this.repeat) {
              // loop: restart from 0
              this.playStartTick = 0;
              this.playStartMs = performance.now();
              this.playTick = 0;
              // schedule anew
              this.scheduleFrom(0);
              this.$emit('tick', 0);
            } else {
              this.stopSeq();
              return;
            }
          }
          this.rafId = requestAnimationFrame(step);
        };
        this.rafId = requestAnimationFrame(step);
      },
      stopSeq() {
        for (const id of this.timers) clearTimeout(id);
        this.timers = [];
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this.isPlaying = false;
        this.track.synthEngine.allOff?.();
        this.$emit('state', false);
      },
      clearSeq() {
        this.track.sequence.splice(0, this.track.sequence.length);
        if (Array.isArray(this.track.elements))
          this.track.elements.splice(0, this.track.elements.length);
        if ('selectedElementId' in this.track) this.track.selectedElementId = null;
      },
      insertNotes(notes, opts = {}) {
        const endTick = this.track.sequence.reduce((m, e) => Math.max(m, e.start + e.len), 0);
        const start = Math.min(endTick, this.totalTicks - 1);
        const len = Math.max(1, Math.round(opts.len || this.ticksPerBeat));
        const vel = Math.max(1, Math.min(127, opts.vel || this.track.velocity));
        const stagger = Math.max(0, Math.round(opts.staggerTicks || 0));
        const arr = Array.isArray(notes) ? notes.slice() : [];
        arr.forEach((n, i) => {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const s = start + i * stagger;
          this.track.sequence.push({
            id,
            note: n,
            start: Math.min(s, this.totalTicks - 1),
            len,
            vel,
          });
        });
      },
      // Scrubbing via ruler
      onRulerDown(e) {
        const rect = this.$refs.ruler.getBoundingClientRect();
        const x = e.clientX - rect.left + this.$refs.ruler.scrollLeft;
        this.playTick = this.tickForX(x);
        this.draggingScrub = true;
        if (this.isPlaying) {
          // restart from new position
          this.playSeq();
        }
        window.addEventListener('mousemove', this.onRulerMove);
        window.addEventListener('mouseup', this.onRulerUp);
      },
      onRulerMove(e) {
        if (!this.draggingScrub) return;
        const rect = this.$refs.ruler.getBoundingClientRect();
        const x = e.clientX - rect.left + this.$refs.ruler.scrollLeft;
        this.playTick = this.tickForX(x);
      },
      onRulerUp() {
        this.draggingScrub = false;
        window.removeEventListener('mousemove', this.onRulerMove);
        window.removeEventListener('mouseup', this.onRulerUp);
      },
      onRollScroll() {
        if (this.syncingScroll) return;
        this.syncingScroll = true;
        this.$refs.ruler.scrollLeft = this.$refs.roll.scrollLeft;
        this.$nextTick(() => (this.syncingScroll = false));
      },
      onHover(e) {
        const rect = this.$refs.roll.getBoundingClientRect();
        const x = e.clientX - rect.left + this.$refs.roll.scrollLeft;
        const yAll = e.clientY - rect.top + this.$refs.roll.scrollTop;
        const y = yAll;
        this.hoverTick = this.tickForX(x);
        this.hoverNote = this.noteForY(y);
      },
      clearHover() {
        this.hoverTick = null;
        this.hoverNote = null;
      },
      // Insert a segment at the current playhead, then move playhead to its end
      insertSegment(payload = {}) {
        const tpb = Math.max(1, Number(this.track.seqTicksPerBeat || 4));
        const startTick = Math.max(0, Math.min(this.totalTicks - 1, Math.round(this.playTick)));
        const lenBeats = Math.max(0.0625, Number(payload.lenBeats || 1));
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const degree = Number.isFinite(payload.degree)
          ? payload.degree
          : Number.isFinite(this.track.degree)
            ? this.track.degree
            : 0;
        const octave = Number.isFinite(payload.octave) ? payload.octave : this.track.octave || 4;
        const quality = payload.quality || this.track.quality || 'maj';
        const inversion = Number.isFinite(payload.inversion) ? payload.inversion : 0;
        const extensions = Array.isArray(payload.extensions)
          ? payload.extensions.slice(0, 8)
          : Array.isArray(this.track.extensions)
            ? this.track.extensions.slice(0, 8)
            : [];
        const velocity = Math.max(
          1,
          Math.min(127, Number(payload.velocity || this.track.velocity || 96))
        );
        const arp = !!(payload.arp ?? this.track.arp);
        const arpLenBeats = Number.isFinite(payload.arpLenBeats)
          ? Math.max(0.0625, payload.arpLenBeats)
          : Math.max(0.0625, Number(this.track.arpLenBeats || 0.25));
        const hold = !!(payload.hold ?? this.track.hold);
        this.track.elements.push({
          id,
          start: startTick,
          lenBeats,
          degree,
          octave,
          quality,
          inversion,
          extensions,
          velocity,
          arp,
          arpLenBeats,
          hold,
        });
        this.track.selectedElementId = id;
        // Move playhead to end of new segment
        const lenTicks = Math.max(1, Math.round(lenBeats * tpb));
        this.playTick = Math.min(this.totalTicks - 1, startTick + lenTicks);
      },
      addSegmentAtPlayhead() {
        this.insertSegment({ lenBeats: 1 });
      },
    },
    mounted() {
      // Center middle C (MIDI 60) in the viewport vertically
      this.$nextTick(() => {
        const el = this.$refs.roll;
        if (!el) return;
        const target = this.yForNote(60);
        const centerOffset = Math.max(0, target - (el.clientHeight / 2 - this.rowH / 2));
        el.scrollTop = centerOffset;
        // sync initial horizontal scroll
        this.$refs.ruler.scrollLeft = el.scrollLeft;
        // keep ruler and roll in sync when ruler scrolls
        this.$refs.ruler.addEventListener('scroll', () => {
          if (this.syncingScroll) return;
          this.syncingScroll = true;
          this.$refs.roll.scrollLeft = this.$refs.ruler.scrollLeft;
          this.$nextTick(() => (this.syncingScroll = false));
        });
        // no-op
      });
    },
    watch: {},
    beforeUnmount() {
      this.stopSeq();
    },
  };
</script>

<style scoped>
  .seq {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .spacer {
    flex: 1;
  }
  .ctl {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
  }
  .ruler-fixed {
    overflow-x: auto;
    overflow-y: hidden;
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: #0b0f20;
  }
  .roll {
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #0b0f20;
    max-height: 520px;
  }
  .roll {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
  .row.wht {
    fill: rgba(255, 255, 255, 0.03);
  }
  .row.blk {
    fill: rgba(0, 0, 0, 0.15);
  }
  .beat {
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 1;
  }
  .barline {
    stroke: rgba(255, 255, 255, 0.18);
    stroke-width: 2;
  }
  .bar-label {
    fill: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    user-select: none;
  }
  .midc-line {
    stroke: rgba(255, 255, 255, 0.35);
    stroke-dasharray: 4 4;
  }
  .midc-badge {
    fill: rgba(0, 0, 0, 0.65);
    stroke: rgba(255, 255, 255, 0.25);
  }
  .midc-label {
    fill: #fff;
    font-size: 10px;
    text-anchor: middle;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.7);
    stroke-width: 2;
    pointer-events: none;
  }
  .pc-label {
    fill: rgba(255, 255, 255, 0.85);
    font-size: 10px;
    pointer-events: none;
  }
  .note {
    fill: #3b8bff;
    opacity: 0.9;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 0.5;
    shape-rendering: crispEdges;
  }
  .edge {
    pointer-events: none;
  }
  .edge-start {
    fill: rgba(255, 255, 255, 0.7);
  }
  .edge-end {
    fill: rgba(255, 255, 255, 0.7);
  }
  /* Visible grips for elements lane */
  .seg-edge {
    pointer-events: none;
  }
  .seg-edge-start {
    fill: rgba(255, 255, 255, 0.6);
  }
  .seg-edge-end {
    fill: rgba(255, 255, 255, 0.9);
  }
  .handle {
    fill: rgba(255, 255, 255, 0.001);
    cursor: ew-resize;
  }
  .ghost-note {
    fill: rgba(255, 255, 255, 0.25);
    stroke: rgba(0, 0, 0, 0.3);
    stroke-width: 0.5;
    shape-rendering: crispEdges;
    pointer-events: none;
  }
  .playhead {
    stroke: #ff6a6a;
    stroke-width: 2;
  }
  .head {
    fill: #ff6a6a;
  }
  .segment {
    fill: #7bd88f;
    opacity: 0.9;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 0.5;
    shape-rendering: crispEdges;
    cursor: move;
  }
  .segment.selected {
    fill: #5bcf79;
    stroke: #aef2bf;
    stroke-width: 1.5;
    filter: drop-shadow(0 0 2px rgba(174, 242, 191, 0.6));
  }
  .segment-handle {
    fill: rgba(255, 255, 255, 0.001);
    cursor: ew-resize;
  }
  .segment-label {
    fill: rgba(0, 0, 0, 0.85);
    font-size: 10px;
    pointer-events: none;
  }
  .ruler {
    fill: rgba(0, 0, 0, 0.0001);
    cursor: col-resize;
  }
  .cell-highlight {
    fill: rgba(255, 255, 255, 0.08);
    stroke: rgba(255, 255, 255, 0.25);
    stroke-width: 1;
    shape-rendering: crispEdges;
    pointer-events: none;
  }
  button.active {
    background: #1a2a4a;
    border-color: #2a4a7a;
  }
</style>

/* eslint-disable */
var MidiWriter = function() {
  var modules = Object.create(null);

  function require(id) {
    var module = modules[id];
    if (module !== undefined) return module.exports;
    var module = modules[id] = {
      exports: {}
    };
    id(module.exports, module);
    return module.exports;
  }
  require.r = function(exports) {
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: 'Module'
      });
    }
    Object.defineProperty(exports, '__esModule', {
      value: true
    });
  };
  require.d = function(exports, definition) {
    for (var key in definition) {
      if (definition.hasOwnProperty(key) && !exports.hasOwnProperty(key)) {
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: definition[key]
        });
      }
    }
  };
  require.o = function(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
  };
  require.p = '';
  return require(2).default;
}({
  2: function(module, exports, require) {
    require.r(exports);
    var defaultValues = {
      pitch: null,
      duration: '4',
      wait: null,
      sequential: false,
      velocity: 50,
      channel: null
    };

    var Track = function(tickDuration) {
      this.tickDuration = tickDuration || 128;
      this.events = [];
    };

    Track.prototype.addEvent = function(event, sequential) {
      var events;
      if (event instanceof Array) {
        events = event;
      } else if (event.events) {
        events = event.events;
      } else {
        events = [event];
      }

      var self = this;
      var pushEvents = function() {
        if (sequential) {
          var noteOffs;
          noteOffs = sequential(self, events);
          if (noteOffs && noteOffs.sequential) self.setSequential(events);
        }
        self.events = self.events.concat(events);
      };

      if (self.events.length > 0) {
        if (self.events[self.events.length - 1].duration) {
          pushEvents();
        } else {
          pushEvents();
        }
      } else {
        pushEvents();
      }
      return this;
    };

    Track.prototype.setInstrument = function(instrument) {
      return this.addEvent(new ProgramChangeEvent(instrument));
    };

    Track.prototype.addNote = function(args) {
      var self = this;
      if (args instanceof Array) {
        args.forEach(function(arg) {
          self.addEvent(new NoteEvent(arg));
        });
      } else {
        self.addEvent(new NoteEvent(args));
      }
    };

    Track.prototype.addTrackName = function(text) {
      return this.addEvent(new TrackNameEvent({
        text: text
      }));
    };

    Track.prototype.addCopyright = function(text) {
      return this.addEvent(new CopyrightEvent({
        text: text
      }));
    };

    Track.prototype.addText = function(text) {
      return this.addEvent(new TextEvent({
        text: text
      }));
    };

    Track.prototype.addMarker = function(text) {
      return this.addEvent(new MarkerEvent({
        text: text
      }));
    };

    Track.prototype.addCuePoint = function(text) {
      return this.addEvent(new CuePointEvent({
        text: text
      }));
    };

    Track.prototype.addTempo = function(bpm) {
      return this.addEvent(new TempoEvent({
        bpm: bpm
      }));
    };

    Track.prototype.setChannel = function(channel) {
      return this.addEvent(new ChannelEvent({
        channel: channel
      }));
    };

    Track.prototype.setPitchBend = function(msb) {
      return this.addEvent(new PitchBendEvent({
        msb: msb
      }));
    };

    Track.prototype.setModulation = function(msb) {
      return this.addEvent(new ModulationEvent({
        msb: msb
      }));
    };

    Track.prototype.setPan = function(msb) {
      return this.addEvent(new PanEvent({
        msb: msb
      }));
    };

    Track.prototype.setVolume = function(msb) {
      return this.addEvent(new VolumeEvent({
        msb: msb
      }));
    };

    Track.prototype.setTickDuration = function(tickDuration) {
      this.tickDuration = tickDuration;
    };

    Track.prototype.setSequential = function(events) {
      var tick = 0;
      events.forEach(function(event) {
        event.wait = 0;
        if (event.duration) {
          event.wait = tick;
        }
        tick = event.duration;
      });
      return this;
    };

    var Writer = function() {
      this.tracks = [];
      this.type = 0;
      this.ticksPerBeat = 128;
    };

    Writer.prototype.addTrack = function(track) {
      this.tracks.push(track);
      return this;
    };

    Writer.prototype.buildFile = function() {
      var ticksPerBeat = this.ticksPerBeat;
      var tracks = this.tracks;
      var trackArray = [];

      for (var i = 0; i < tracks.length; i++) {
        var track = new TrackWriter(ticksPerBeat, tracks[i].events, i, tracks[i].tickDuration);
        trackArray = trackArray.concat(track.toArray());
      }

      var file = new FileWriter(trackArray, this.type, ticksPerBeat);
      return file.build();
    };


    var NoteEvent = function(args) {
      this.id = function() {
        return 'NoteEvent'
      };
      this.events = this.get = [].concat(args.pitch).map(function(pitch) {
        return new BaseEvent(Object.assign({}, defaultValues, args, {
          pitch: pitch
        }));
      });
    };

    NoteEvent.prototype.set = function(args) {
      this.events.forEach(function(event) {
        event.set(args);
      });
      return this;
    };

    var ChannelEvent = function(args) {
      this.id = function() {
        return 'ChannelEvent'
      };
      this.events = [new ChannelEventWriter(args)];
    };

    ChannelEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var ControlChangeEvent = function(args) {
      this.id = function() {
        return 'ControlChangeEvent'
      };
      this.events = [new ControlChangeEventWriter(args)];
    };

    ControlChangeEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var TempoEvent = function(args) {
      this.id = function() {
        return 'TempoEvent'
      };
      this.events = [new TempoEventWriter(args)];
    };

    TempoEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var TrackNameEvent = function(args) {
      this.id = function() {
        return 'TrackNameEvent'
      };
      this.events = [new TrackNameEventWriter(args)];
    };

    TrackNameEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var CopyrightEvent = function(args) {
      this.id = function() {
        return 'CopyrightEvent'
      };
      this.events = [new CopyrightEventWriter(args)];
    };

    CopyrightEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var TextEvent = function(args) {
      this.id = function() {
        return 'TextEvent'
      };
      this.events = [new TextEventWriter(args)];
    };

    TextEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var ProgramChangeEvent = function(args) {
      this.id = function() {
        return 'ProgramChangeEvent'
      };
      this.events = [new ProgramChangeEventWriter(args)];
    };

    ProgramChangeEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var MarkerEvent = function(args) {
      this.id = function() {
        return 'MarkerEvent'
      };
      this.events = [new MarkerEventWriter(args)];
    };

    MarkerEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var CuePointEvent = function(args) {
      this.id = function() {
        return 'CuePointEvent'
      };
      this.events = [new CuePointEventWriter(args)];
    };

    CuePointEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var ModulationEvent = function(args) {
      this.id = function() {
        return 'ModulationEvent'
      };
      this.events = [new ModulationEventWriter(args)];
    };

    ModulationEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var PitchBendEvent = function(args) {
      this.id = function() {
        return 'PitchBendEvent'
      };
      this.events = [new PitchBendEventWriter(args)];
    };

    PitchBendEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var PanEvent = function(args) {
      this.id = function() {
        return 'PanEvent'
      };
      this.events = [new PanEventWriter(args)];
    };

    PanEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var VolumeEvent = function(args) {
      this.id = function() {
        return 'VolumeEvent'
      };
      this.events = [new VolumeEventWriter(args)];
    };

    VolumeEvent.prototype.set = function(args) {
      this.events[0].set(args);
    };

    var TrackWriter = function(ticksPerBeat, events, channel, tickDuration) {
      this.tickDuration = tickDuration || 128;
      this.ticksPerBeat = ticksPerBeat || 128;
      this.events = events;
      this.channel = channel;
      this.tickMap = {
        'whole': this.ticksPerBeat * 4,
        'half': this.ticksPerBeat * 2,
        'quarter': this.ticksPerBeat,
        '8': this.ticksPerBeat / 2,
        '16': this.ticksPerBeat / 4,
        '32': this.ticksPerBeat / 8,
        '64': this.ticksPerBeat / 16,
        '128': this.ticksPerBeat / 32
      };
    };

    TrackWriter.prototype.toArray = function() {
      var self = this;
      var events = self.events;
      var trackArray = [];
      self.setEventTicks(events);

      var tick = 0;
      events.forEach(function(event) {
        if (event.tick > 0) {
          trackArray = trackArray.concat(self.getDelta(event.tick));
        } else {
          var eventArray = event.getEvent();
        }

        trackArray = trackArray.concat(eventArray);
        tick += event.tick;
      });

      return trackArray.concat([0xFF, 0x2F, 0x00]);
    };

    TrackWriter.prototype.setEventTicks = function(events) {
      var self = this;
      events.forEach(function(event) {
        var wait = event.wait;
        var duration = event.duration;
        if (typeof duration === 'string') {
          event.duration = self.tickMap[duration.replace(/[^\w]/g, '')] || self.tickMap[duration];
        } else {
          event.duration = duration;
        }

        event.tick = event.duration;

        if (event.wait) {
          if (typeof wait === 'string') {
            var waitDuration = self.tickMap[wait.replace(/[^\w]/g, '')] || self.tickMap[wait];
            event.tick = waitDuration;
          } else {
            event.tick = wait;
          }
        }

        var getEvent = event.getEvent;
        event.getEvent = function() {
          var eventArray = getEvent();
          if (event.channel) {
            eventArray[0] = eventArray[0] | event.channel - 1;
          } else {
            eventArray[0];
          }
          return eventArray;
        };
      });
    };

    TrackWriter.prototype.getDelta = function(value) {
      var buffer, output = [];
      value = Math.round(value);
      if (value === 0) return [0];

      do {
        buffer = value & 0x7F;
        value >>= 7;
        if (value > 0) {
          buffer |= 0x80;
        }
        output.push(buffer);
      } while (value > 0);
      return output.reverse();
    };

    var FileWriter = function(tracks, type, ticksPerBeat) {
      this.tracks = tracks;
      this.type = type || 0;
      this.ticksPerBeat = ticksPerBeat || 128;
    };

    FileWriter.prototype.build = function() {
      var output = [
        0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, this.type,
        0x00, this.tracks.length,
        this.ticksPerBeat >> 8, this.ticksPerBeat & 0xFF
      ];

      this.tracks.forEach(function(track) {
        output = output.concat([
          0x4D, 0x54, 0x72, 0x6B,
          track.length >> 24 & 0xFF,
          track.length >> 16 & 0xFF,
          track.length >> 8 & 0xFF,
          track.length & 0xFF
        ]);
        output = output.concat(track);
      });

      return new Uint8Array(output);
    };

    var BaseEvent = function(args) {
      this.set(args);
      this.noteOff;
      this.noteOn;
    };

    BaseEvent.prototype.getEvent = function() {
      if (this.noteOff) {
        return [].concat(this.noteOn.getEvent(), this.noteOff.getEvent());
      } else if (this.noteOn) {
        return this.noteOn.getEvent();
      } else {
        return [];
      }
    };

    BaseEvent.prototype.set = function(args) {
      var self = this;
      Object.keys(args).forEach(function(key) {
        if (key === 'pitch') {
          self[key] = MidiWriter.Utils.toNoteNumber(args[key]);
        } else {
          self[key] = args[key];
        }
      });

      var id = args.id();

      if (id === 'NoteEvent') {
        this.noteOff = new NoteOffEvent({
          pitch: args.pitch,
          duration: args.duration,
          velocity: 0
        });
      }

      if (id === 'NoteEvent') {
        this.noteOn = new NoteOnEvent({
          pitch: args.pitch,
          velocity: args.velocity,
          duration: args.wait
        });
      }
    };

    var NoteOffEvent = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0x80, this.pitch, this.velocity];
      };
    };

    NoteOffEvent.prototype.set = BaseEvent.prototype.set;

    var NoteOnEvent = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0x90, this.pitch, this.velocity];
      };
    };

    NoteOnEvent.prototype.set = BaseEvent.prototype.set;

    var ChannelEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xB0, 0x20, this.msb];
      };
    };

    ChannelEventWriter.prototype.set = BaseEvent.prototype.set;

    var ControlChangeEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xB0, this.controller, this.msb];
      };
    };

    ControlChangeEventWriter.prototype.set = BaseEvent.prototype.set;

    var TempoEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        var microsecondsPerBeat = 60000000 / this.bpm;
        var array = [0xFF, 0x51, 0x03, microsecondsPerBeat >> 16 & 0xFF, microsecondsPerBeat >> 8 & 0xFF, microsecondsPerBeat & 0xFF];
        return array;
      };
    };

    TempoEventWriter.prototype.set = BaseEvent.prototype.set;

    var TrackNameEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xFF, 0x03, this.text.length].concat(this.text.split('').map(function(char) {
          return char.charCodeAt();
        }));
      };
    };

    TrackNameEventWriter.prototype.set = BaseEvent.prototype.set;

    var CopyrightEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xFF, 0x02, this.text.length].concat(this.text.split('').map(function(char) {
          return char.charCodeAt();
        }));
      };
    };

    CopyrightEventWriter.prototype.set = BaseEvent.prototype.set;

    var TextEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xFF, 0x01, this.text.length].concat(this.text.split('').map(function(char) {
          return char.charCodeAt();
        }));
      };
    };

    TextEventWriter.prototype.set = BaseEvent.prototype.set;

    var ProgramChangeEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xC0, this.instrument];
      };
    };

    ProgramChangeEventWriter.prototype.set = BaseEvent.prototype.set;

    var MarkerEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xFF, 0x06, this.text.length].concat(this.text.split('').map(function(char) {
          return char.charCodeAt();
        }));
      };
    };

    MarkerEventWriter.prototype.set = BaseEvent.prototype.set;

    var CuePointEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xFF, 0x07, this.text.length].concat(this.text.split('').map(function(char) {
          return char.charCodeAt();
        }));
      };
    };

    CuePointEventWriter.prototype.set = BaseEvent.prototype.set;

    var ModulationEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xB0, 0x01, this.msb];
      };
    };

    ModulationEventWriter.prototype.set = BaseEvent.prototype.set;

    var PitchBendEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xE0, this.lsb, this.msb];
      };
    };

    PitchBendEventWriter.prototype.set = BaseEvent.prototype.set;

    var PanEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xB0, 0x0A, this.msb];
      };
    };

    PanEventWriter.prototype.set = BaseEvent.prototype.set;

    var VolumeEventWriter = function(args) {
      this.set(args);
      this.getEvent = function() {
        return [0xB0, 0x07, this.msb];
      };
    };

    VolumeEventWriter.prototype.set = BaseEvent.prototype.set;

    var Utils = function() {
      this.transpose = function(value, events) {
        events.forEach(function(event) {
          var pitch = event.pitch;
          event.pitch = MidiWriter.Utils.toNoteNumber(pitch) + value;
        });
      };

      this.toNoteNumber = function(note) {
        if (typeof note === 'string') {
          return MidiWriter.Utils.noteNameToNoteNumber(note);
        }
        return note;
      };

      this.noteNameToNoteNumber = function(noteName) {
        var note = noteName.match(/([a-gA-G])(#|b)?([0-9\-])/);
        if (!note) return null;

        var noteChar = note[1].toUpperCase();
        var accidental = note[2] || '';
        var octave = parseInt(note[3], 10);
        var noteNumber = 0;

        switch (noteChar) {
          case 'C':
            noteNumber = 0;
            break;
          case 'D':
            noteNumber = 2;
            break;
          case 'E':
            noteNumber = 4;
            break;
          case 'F':
            noteNumber = 5;
            break;
          case 'G':
            noteNumber = 7;
            break;
          case 'A':
            noteNumber = 9;
            break;
          case 'B':
            noteNumber = 11;
        }

        switch (accidental) {
          case '#':
            noteNumber += 1;
            break;
          case 'b':
            noteNumber -= 1;
        }

        return (12 * (octave + 1)) + noteNumber;
      };
    };

    Object.assign(BaseEvent.prototype, {
      set: BaseEvent.prototype.set,
      tick: 0,
      channel: 0,
      pitch: 60,
      velocity: 50,
      duration: 128,
      wait: 0
    });
    Object.assign(BaseEvent.prototype, {
      id: function() {
        return 'BaseEvent'
      }
    });
    Object.assign(NoteEvent.prototype, {
      getEvent: BaseEvent.prototype.getEvent,
      set: BaseEvent.prototype.set,
      noteOff: NoteOffEvent.prototype,
      noteOn: NoteOnEvent.prototype
    });
    Object.assign(NoteOffEvent.prototype, {
      getEvent: NoteOffEvent.prototype.getEvent,
      set: NoteOffEvent.prototype.set,
      pitch: 60,
      velocity: 50
    });
    Object.assign(NoteOnEvent.prototype, {
      getEvent: NoteOnEvent.prototype.getEvent,
      set: NoteOffEvent.prototype.set,
      pitch: 60,
      velocity: 50
    });
    Object.assign(ChannelEventWriter.prototype, {
      getEvent: ChannelEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      msb: 0
    });
    Object.assign(ControlChangeEventWriter.prototype, {
      getEvent: ControlChangeEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      controller: 0,
      msb: 0
    });
    Object.assign(TempoEventWriter.prototype, {
      getEvent: TempoEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      bpm: 120
    });
    Object.assign(TrackNameEventWriter.prototype, {
      getEvent: TrackNameEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      text: ''
    });
    Object.assign(CopyrightEventWriter.prototype, {
      getEvent: CopyrightEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      text: ''
    });
    Object.assign(TextEventWriter.prototype, {
      getEvent: TextEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      text: ''
    });
    Object.assign(ProgramChangeEventWriter.prototype, {
      getEvent: ProgramChangeEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      instrument: 0
    });
    Object.assign(MarkerEventWriter.prototype, {
      getEvent: MarkerEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      text: ''
    });
    Object.assign(CuePointEventWriter.prototype, {
      getEvent: CuePointEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      text: ''
    });
    Object.assign(ModulationEventWriter.prototype, {
      getEvent: ModulationEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      msb: 0
    });
    Object.assign(PitchBendEventWriter.prototype, {
      getEvent: PitchBendEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      lsb: 0,
      msb: 64
    });
    Object.assign(PanEventWriter.prototype, {
      getEvent: PanEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      msb: 64
    });
    Object.assign(VolumeEventWriter.prototype, {
      getEvent: VolumeEventWriter.prototype.getEvent,
      set: BaseEvent.prototype.set,
      msb: 100
    });

    var PublicExports = {
      Writer: Writer,
      Track: Track,
      NoteEvent: NoteEvent,
      ProgramChangeEvent: ProgramChangeEvent,
      NoteOnEvent: NoteOnEvent,
      NoteOffEvent: NoteOffEvent,
      ChannelEvent: ChannelEventWriter,
      ControlChangeEvent: ControlChangeEvent,
      TempoEvent: TempoEventWriter,
      TrackNameEvent: TrackNameEventWriter,
      CopyrightEvent: CopyrightEventWriter,
      TextEvent: TextEventWriter,
      MarkerEvent: MarkerEventWriter,
      CuePointEvent: CuePointEventWriter,
      PitchBendEvent: PitchBendEventWriter,
      ModulationEvent: ModulationEventWriter,
      PanEvent: PanEventWriter,
      VolumeEvent: VolumeEventWriter,
      Utils: new Utils()
    };
    module.exports = PublicExports;
  }
});

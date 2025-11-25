// Web Worker内で外部ファイルを読み込む
importScripts('ultrabox-midi-core.js');

// MidiWriterがロードされていることを確認
if (typeof MidiWriter === 'undefined') {
    // ロード失敗をメインスレッドに通知
    postMessage({ status: 'error', message: 'コアライブラリのロードに失敗しました。' });
} else {
    // ロード成功をメインスレッドに通知（Web Workerが起動したことを示す）
    postMessage({ status: 'ready' });
}


// UltraBox JSONデータをMIDIに変換する関数
function generateMidi(data) {
    const writer = new MidiWriter.Writer();
    const { beatsPerMinute: bpm, ticksPerBeat, loopBars, beatsPerBar, channels, patterns } = data;

    if (!bpm || !ticksPerBeat || !loopBars || !beatsPerBar || !channels || !patterns) {
        throw new Error("JSONに必要な基本設定が不足しています。");
    }

    channels.forEach((channel, channelIndex) => {
        if (channel.type !== 'pitch' && channel.type !== 'drum') return;

        const track = new MidiWriter.Track();
        track.setTempo(bpm);

        let midiChannel = channelIndex + 1;
        if (channel.type === 'drum') {
            midiChannel = 10;
        }
        track.setChannel(midiChannel);

        if (channel.name) {
            track.addTrackName(channel.name);
        }

        if (channel.type === 'pitch') {
            const gmInstrument = (channelIndex % 127) + 1; // チャンネルごとに異なるGM音色を割り当てる
            track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: gmInstrument }));
        }

        // ボリュームを設定 (0-100を0-127に変換)
        const volume = channel.instruments[0] ? Math.max(1, Math.min(127, Math.round(channel.instruments[0].volume * 1.27))) : 100;
        track.addEvent(new MidiWriter.ControlChangeEvent({ controller: 7, value: volume }));


        const trackEvents = [];
        let currentBarStartTick = 0;
        const barLengthTicks = beatsPerBar * ticksPerBeat;

        for (let barIndex = 0; barIndex < loopBars; barIndex++) {
            const patternIndex = channel.sequence[barIndex];
            const patternData = patterns[patternIndex];

            if (!patternData || !patternData.notes || patternData.notes.length === 0) {
                currentBarStartTick += barLengthTicks;
                continue;
            }

            patternData.notes.forEach(note => {
                const noteStartTick = currentBarStartTick + note.start;
                const durationTicks = note.duration;
                const velocity = note.volume ? Math.max(1, Math.min(127, Math.round(note.volume * 1.27))) : 100;

                note.pitches.forEach(pitch => {
                    // Note On イベント
                    trackEvents.push({ type: 'on', tick: noteStartTick, pitch: pitch, velocity: velocity });
                    // Note Off イベント (duration分後)
                    trackEvents.push({ type: 'off', tick: noteStartTick + durationTicks, pitch: pitch });
                });
            });

            currentBarStartTick += barLengthTicks;
        }

        // イベントを時間順にソート (最も重い処理の一つ)
        trackEvents.sort((a, b) => a.tick - b.tick);

        let lastTick = 0;
        trackEvents.forEach(event => {
            const deltaTime = event.tick - lastTick;

            // デルタタイムがマイナスになる不正なデータはスキップ
            if (deltaTime < 0) return;

            if (event.type === 'on') {
                track.addEvent(new MidiWriter.NoteOnEvent({
                    pitch: [event.pitch],
                    velocity: event.velocity,
                    duration: 'T' + deltaTime
                }));
            } else if (event.type === 'off') {
                track.addEvent(new MidiWriter.NoteOffEvent({
                    pitch: [event.pitch],
                    duration: 'T' + deltaTime
                }));
            }
            lastTick = event.tick;
        });

        writer.addTrack(track);
    });

    return writer.buildArrayBuffer();
}


// メインスレッドからメッセージを受け取ったときの処理
self.onmessage = function(e) {
    const { command, data, fileName } = e.data;

    if (command === 'convert') {
        try {
            // ここで重い変換処理を実行
            const arrayBuffer = generateMidi(data);

            // 処理結果をメインスレッドに送り返す
            postMessage({ 
                status: 'complete', 
                arrayBuffer: arrayBuffer, 
                fileName: fileName 
            });

        } catch (error) {
            // エラーをメインスレッドに送り返す
            postMessage({ 
                status: 'error', 
                message: error.message 
            });
        }
    }
};

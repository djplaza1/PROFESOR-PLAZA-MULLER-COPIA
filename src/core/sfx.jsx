/** Sonidos UI (Web Audio, sin archivos). localStorage muller_sfx_enabled = '0' desactiva. */
window.__mullerSfxEnabled = function () {
    try { return localStorage.getItem('muller_sfx_enabled') !== '0'; } catch (e) { return true; }
};
window.__mullerConsecutiveCorrect = 0;
window.__mullerPlaySfx = function (kind, arg2) {
    if (!window.__mullerSfxEnabled()) return;
    try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!window.__mullerAudioCtx) window.__mullerAudioCtx = new Ctx();
        var ctx = window.__mullerAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        var t0 = ctx.currentTime;
        function tone(freq, start, len, vol, typ) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = typ || 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(vol, t0 + start);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + start + len);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(t0 + start);
            o.stop(t0 + start + len + 0.02);
        }
        if (kind === 'ok') {
            tone(523, 0, 0.1, 0.35);
            tone(784, 0.09, 0.14, 0.30);
        } else if (kind === 'bad') {
            tone(160, 0, 0.12, 0.30, 'triangle');
            tone(110, 0.08, 0.14, 0.25, 'triangle');
        } else if (kind === 'tick') {
            tone(660, 0, 0.06, 0.22);
        } else if (kind === 'levelup') {
            tone(392, 0, 0.08, 0.28);
            tone(523, 0.07, 0.08, 0.28);
            tone(659, 0.14, 0.11, 0.30);
        } else if (kind === 'complete') {
            [523, 659, 784, 1046].forEach(function (f, i) {
                tone(f, i * 0.08, 0.22, 0.30);
            });
        } else if (kind === 'streak') {
            var n = Math.max(5, Number(arg2) || 5);
            var tier = Math.floor(n / 5);
            var base = 392 * Math.pow(1.035, Math.min(tier, 40));
            var count = 4 + Math.min(6, Math.floor(tier / 4));
            for (var si = 0; si < count; si++) {
                tone(base * Math.pow(1.259921, si), si * 0.055, 0.11, 0.28);
            }
            tone(Math.min(1400, base * Math.pow(1.259921, count)), count * 0.055 + 0.02, 0.2, 0.32);
        }
    } catch (e) {}
};
/** Acierto / fallo en ejercicios: ok/bad + racha global 5,10,15… (sin límite). opts.silent: no audio. */
window.__mullerNotifyExerciseOutcome = function (correct, opts) {
    opts = opts || {};
    if (correct) {
        window.__mullerConsecutiveCorrect = (window.__mullerConsecutiveCorrect || 0) + 1;
        var streakN = window.__mullerConsecutiveCorrect;
        if (!opts.silent && window.__mullerSfxEnabled()) {
            window.__mullerPlaySfx('ok');
            if (streakN > 0 && streakN % 5 === 0) {
                setTimeout(function () { window.__mullerPlaySfx('streak', streakN); }, 130);
            }
        }
    } else {
        window.__mullerConsecutiveCorrect = 0;
        if (!opts.silent && window.__mullerSfxEnabled()) {
            window.__mullerPlaySfx('bad');
        }
    }
};
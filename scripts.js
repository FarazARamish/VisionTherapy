const playArea = document.getElementById('playArea');
const exerciseSelect = document.getElementById('exerciseSelect');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const durationEl = document.getElementById('duration');
const speedEl = document.getElementById('speed');
const soundEl = document.getElementById('soundToggle');
const scoreEl = document.getElementById('score');
const timeLeftEl = document.getElementById('timeLeft');
const speedLabel = document.getElementById('speedLabel');
const exerciseTitle = document.getElementById('exerciseTitle');
const exerciseDesc = document.getElementById('exerciseDesc');
const sessionCount = document.getElementById('sessionCount');

let score = 0;
let timer = null; // countdown timer
let runningIntervals = [];
let runningTimeouts = [];
let sessions = 0;

function clearRunning() {
    runningIntervals.forEach(i => clearInterval(i));
    runningIntervals = [];
    runningTimeouts.forEach(t => clearTimeout(t));
    runningTimeouts = [];
    playArea.innerHTML = '';
}

function playBeep() {
    if (soundEl.value !== 'on') return;
    try {
        const ctx = new(window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.value = 0.03;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.08);
    } catch (e) { /*ignore*/ }
}

function updateHUD(timeLeft) {
    scoreEl.textContent = score;
    timeLeftEl.textContent = '00:' + String(timeLeft).padStart(2, '0');
    speedLabel.textContent = speedEl.options[speedEl.selectedIndex].text;
}

// Speed multiplier from speed control (0.6 slow, 1 medium, 1.6 fast)
function speedMul() { return parseFloat(speedEl.value) || 1; }

// Utility: create element from template id
function createFromTpl(id) { return document.getElementById(id).content.firstElementChild.cloneNode(true); }

// --- Exercises definitions ---
// Each exercise receives options: {duration, speed}

const Exercises = {
    // 1 Moving Dot Tracking
    movingDot(opts) {
        const dot = createFromTpl('dotTpl');
        dot.style.width = '48px';
        dot.style.height = '48px';
        playArea.appendChild(dot);
        // move horizontally then vertically in slow sine path
        let t = 0;
        const sp = 0.8 * speedMul();
        const iv = setInterval(() => {
            t += 0.02 * sp;
            const w = playArea.clientWidth,
                h = playArea.clientHeight;
            const x = (w - 80) / 2 * (1 + Math.sin(t)) + 20;
            const y = (h - 80) / 2 * (1 + Math.cos(t * 0.6)) / 1.2 + 20;
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
        }, 20);
        runningIntervals.push(iv);
        dot.addEventListener('click', () => {
            score += 1;
            updateHUD(opts.duration);
            playBeep();
            dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 200 })
        });
    },

    // 2 Bouncing Ball
    bouncingBall(opts) {
        const ball = createFromTpl('ballTpl');
        playArea.appendChild(ball);
        let vx = 2 * speedMul(),
            vy = 1.5 * speedMul();
        const iv = setInterval(() => {
            const w = playArea.clientWidth - 56,
                h = playArea.clientHeight - 56;
            let x = parseFloat(ball.style.left || 10),
                y = parseFloat(ball.style.top || 10);
            if (isNaN(x)) {
                x = 20;
                y = 20;
            }
            x += vx;
            y += vy;
            if (x < 0 || x > w) {
                vx *= -1;
                x = Math.max(0, Math.min(w, x));
            }
            if (y < 0 || y > h) {
                vy *= -1;
                y = Math.max(0, Math.min(h, y));
            }
            ball.style.left = x + 'px';
            ball.style.top = y + 'px';
        }, 16);
        runningIntervals.push(iv);
        ball.addEventListener('click', () => {
            score += 2;
            playBeep();
            ball.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 250 }).onfinish = () => ball.remove();
        });
    },

    // 3 Peripheral Flash
    peripheralFlash(opts) {
        const spawn = () => {
            const edge = createFromTpl('edgeTpl');
            playArea.appendChild(edge);
            // pick random edge
            const r = Math.random();
            let left, top;
            const pad = 20;
            const w = playArea.clientWidth,
                h = playArea.clientHeight;
            if (r < 0.25) {
                left = Math.random() * (w - 80) + 40;
                top = pad;
            } else if (r < 0.5) {
                left = w - 80;
                top = Math.random() * (h - 80) + 40;
            } else if (r < 0.75) {
                left = Math.random() * (w - 80) + 40;
                top = h - 80;
            } else {
                left = pad;
                top = Math.random() * (h - 80) + 40;
            }
            edge.style.left = left + 'px';
            edge.style.top = top + 'px';
            edge.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 900 * (1 / speedMul()) });
            const t = setTimeout(() => { try { edge.remove(); } catch (e) {} }, 900 * (1 / speedMul()));
            runningTimeouts.push(t);
            edge.addEventListener('click', () => {
                score += 3;
                playBeep();
                edge.remove();
            });
        };
        // spawn slower for kids
        const iv = setInterval(spawn, 1100 / speedMul());
        runningIntervals.push(iv);
        // initial bursts
        for (let i = 0; i < 3; i++) runningTimeouts.push(setTimeout(spawn, i * 300));
    },

    // 4 Letter Zoom
    letterZoom(opts) {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const el = document.createElement('div');
        el.className = 'big-letter';
        el.style.position = 'absolute';
        el.style.left = '50%';
        el.style.top = '50%';
        el.style.transform = 'translate(-50%,-50%)';
        playArea.appendChild(el);
        let idx = 0;
        el.textContent = letters[idx];
        const iv = setInterval(() => {
            idx = (idx + 1) % letters.length;
            el.textContent = letters[idx];
            el.animate([{ transform: 'translate(-50%,-50%) scale(0.6)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 1000 * (1 / speedMul()) });
        }, 1600 * (1 / speedMul()));
        runningIntervals.push(iv);
        el.addEventListener('click', () => {
            score += 2;
            playBeep();
        });
    },

    // 5 Follow the Star (circular slow path)
    followStar(opts) {
        const star = createFromTpl('starTpl');
        playArea.appendChild(star);
        let t = 0;
        const iv = setInterval(() => {
            t += 0.02 * speedMul();
            const cx = playArea.clientWidth / 2,
                cy = playArea.clientHeight / 2;
            const r = Math.min(cx, cy) / 2.2;
            const x = cx + Math.cos(t) * r - 28;
            const y = cy + Math.sin(t) * r - 28;
            star.style.left = x + 'px';
            star.style.top = y + 'px';
        }, 18);
        runningIntervals.push(iv);
        star.addEventListener('click', () => {
            score += 2;
            playBeep();
            star.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }], { duration: 200 })
        });
    },

    // 6 Shape Match (center vs periphery)
    shapeMatch(opts) {
        const shapes = ['🐦', '🦄', '🦋', '⚽', '🦁', '🌸', '🍀', '🟩', '😀', '🔷', '🟣'];

        // create center
        const center = document.createElement('div');
        center.classList.add('shape-match-target');
        playArea.appendChild(center);

        // positions around the play area
        const margin = 60;
        const positions = [
            { left: margin + 'px', top: margin + 'px' },
            { right: margin + 'px', top: margin + 'px' },
            { left: margin + 'px', bottom: margin + 'px' },
            { right: margin + 'px', bottom: margin + 'px' }
        ];

        // keep references to edge elements
        let edgeElems = [];

        function refreshRound() {
            // pick new target
            let current = shapes[Math.floor(Math.random() * shapes.length)];
            center.textContent = current;

            // clear old edges
            edgeElems.forEach(e => e.remove());
            edgeElems = [];

            // guarantee one correct index
            const correctIndex = Math.floor(Math.random() * positions.length);

            positions.forEach((p, i) => {
                const colors = ['#d63384', '#6f42c1', '#0dcaf0', '#198754', '#ffc107', '#343a40', '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D', '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC', '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399', '#E666B3', '#33991A']
                const s = createFromTpl('edgeTpl');
                Object.assign(s.style, p);
                s.classList.add('shape-match-options');
                s.style.color = colors[Math.floor(Math.random() * colors.length)];
                s.textContent = (i === correctIndex) ?
                    current :
                    shapes[Math.floor(Math.random() * shapes.length)];
                playArea.appendChild(s);
                edgeElems.push(s);

                s.addEventListener('click', () => {
                    if (s.textContent === current) {
                        score += 4;
                        playBeep();
                        updateHUD(opts.duration);
                        refreshRound(); // ✅ new center + edges
                    } else {
                        score = Math.max(0, score - 1);
                        updateHUD(opts.duration);
                    }
                });
            });
        }

        // start first round
        refreshRound();
    },


    // 7 Color Catch
    colorCatch(opts) {
        const colors = ['#ff6b6b', '#4aa3ff', '#8ae68a', '#ffd36b'];
        const target = colors[Math.floor(Math.random() * colors.length)];
        const title = document.createElement('div');
        title.style.position = 'absolute';
        title.style.top = '10px';
        title.style.left = '50%';
        title.style.transform = 'translateX(-50%)';
        title.style.fontWeight = '700';
        title.textContent = 'Catch color: ' + (target === colors[0] ? 'Red' : target === colors[1] ? 'Blue' : target === colors[2] ? 'Green' : 'Yellow');
        playArea.appendChild(title);

        function spawn() {
            const c = document.createElement('div');
            c.style.position = 'absolute';
            c.style.width = '60px';
            c.style.height = '60px';
            c.style.borderRadius = '10px';
            c.style.background = colors[Math.floor(Math.random() * colors.length)];
            const x = Math.random() * (playArea.clientWidth - 80) + 20;
            const y = Math.random() * (playArea.clientHeight - 120) + 60;
            c.style.left = x + 'px';
            c.style.top = y + 'px';
            playArea.appendChild(c);
            c.addEventListener('click', () => {
                if (c.style.background === target) {
                    score += 3;
                    playBeep();
                } else { score = Math.max(0, score - 1); } c.remove();
                updateHUD(opts.duration);
            });
            runningTimeouts.push(setTimeout(() => { try { c.remove(); } catch (e) {} }, 1200 * (2 / speedMul())));
        }
        const iv = setInterval(spawn, 900 * (1 / speedMul()));
        runningIntervals.push(iv);
        for (let i = 0; i < 3; i++) runningTimeouts.push(setTimeout(spawn, i * 300));
    },

    // 8 Slow Blink
    // slowBlink(opts) {
    //     const box = document.createElement('div');
    //     box.classList.add('blink-target');
    //     playArea.appendChild(box);
    //     let visible = true;
    //     const iv = setInterval(() => {
    //         visible = !visible;
    //         box.style.opacity = visible ? 1 : 0;
    //         if (visible) box.textContent = ['★', '▲', '●', '■', '♥'][Math.floor(Math.random() * 5)];
    //     }, 1400 * (1 / speedMul()));
    //     runningIntervals.push(iv);
    //     box.addEventListener('click', () => {
    //         score += 1;
    //         playBeep();
    //     });
    // },

    // // 9 Memory Match (simple sequence)
    // memoryMatch(opts) {
    //     const shapes = ['★', '▲', '●', '■', '♥'];
    //     const seqLength = Math.min(5, Math.max(3, Math.round(3 + (1.2 * speedMul()))));
    //     const seq = [];
    //     for (let i = 0; i < seqLength; i++) {
    //         seq.push(shapes[Math.floor(Math.random() * shapes.length)]);
    //     }

    //     const center = document.createElement('div');
    //     center.style.position = 'absolute';
    //     center.style.left = '50%';
    //     center.style.top = '50%';
    //     center.style.transform = 'translate(-50%,-50%)';
    //     center.style.fontSize = '64px';
    //     center.style.fontWeight = '800';
    //     playArea.appendChild(center);

    //     // Show sequence step by step
    //     let showIdx = 0;
    //     const iv = setInterval(() => {
    //         center.textContent = seq[showIdx];
    //         showIdx++;
    //         if (showIdx >= seq.length) {
    //             clearInterval(iv);
    //             setTimeout(() => {
    //                 center.textContent = '?';
    //                 spawnChoices();
    //             }, 600);
    //         }
    //     }, 1000 / speedMul());
    //     runningIntervals.push(iv);

    //     function spawnChoices() {
    //         let expectedIdx = 0;

    //         function placeChoices() {
    //             // remove old ones
    //             document.querySelectorAll('.memory-choice').forEach(el => el.remove());

    //             // always place ALL shapes as clickable options
    //             const positions = [];
    //             const padding = 60;
    //             shapes.forEach(() => {
    //                 const x = Math.random() * (playArea.clientWidth - 120 - padding * 2) + padding;
    //                 const y = Math.random() * (playArea.clientHeight - 120 - padding * 2) + padding;
    //                 positions.push({ left: x + 'px', top: y + 'px' });
    //             });

    //             shapes.forEach((shape, i) => {
    //                 const s = createFromTpl('edgeTpl');
    //                 Object.assign(s.style, positions[i]);
    //                 s.style.position = 'absolute';
    //                 s.style.fontSize = '40px';
    //                 s.textContent = shape;
    //                 s.classList.add('memory-choice');
    //                 playArea.appendChild(s);

    //                 s.addEventListener('click', () => {
    //                     if (shape === seq[expectedIdx]) {
    //                         score += 5;
    //                         playBeep();
    //                         updateHUD(opts.duration);
    //                         expectedIdx++;

    //                         if (expectedIdx >= seq.length) {
    //                             center.textContent = "✔"; // completed
    //                             document.querySelectorAll('.memory-choice').forEach(el => el.remove());
    //                         } else {
    //                             placeChoices(); // reshuffle positions for next pick
    //                         }
    //                     } else {
    //                         score = Math.max(0, score - 2);
    //                         updateHUD(opts.duration);
    //                     }
    //                 });
    //             });
    //         }

    //         placeChoices();
    //     }
    // },

    // 10 Spiral Focus (grow/shrink center spiral)
    spiralFocus(opts) {
        const colors = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502', '#e84393'];

        const centerX = playArea.clientWidth / 2;
        const centerY = playArea.clientHeight / 2;
        const dots = [];
        const dotCount = 40; // number of dots in spiral
        const spiralStep = 10; // distance between loops

        // create spiral dots
        for (let i = 0; i < dotCount; i++) {
            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.width = '14px';
            dot.style.height = '14px';
            dot.style.borderRadius = '50%';
            dot.style.background = colors[i % colors.length];
            playArea.appendChild(dot);
            dots.push(dot);
        }

        let angle = 0;
        const iv = setInterval(() => {
            dots.forEach((dot, i) => {
                const radius = i * spiralStep * 0.2;
                const a = angle + i * 0.35;
                const x = centerX + radius * Math.cos(a);
                const y = centerY + radius * Math.sin(a);

                dot.style.left = x + 'px';
                dot.style.top = y + 'px';
            });

            angle += 0.03 * speedMul(); // spiral rotation
        }, 40);
        runningIntervals.push(iv);

        // center click scoring
        const focusDot = document.createElement('div');
        focusDot.style.position = 'absolute';
        focusDot.style.left = (centerX - 20) + 'px';
        focusDot.style.top = (centerY - 20) + 'px';
        focusDot.style.width = '40px';
        focusDot.style.height = '40px';
        focusDot.style.borderRadius = '50%';
        focusDot.style.background = '#000';
        playArea.appendChild(focusDot);

        focusDot.addEventListener('click', () => {
            score += 3;
            playBeep();
            updateHUD(opts.duration);
        });
    }

};

// Populate exercise select
const exList = [
    { id: 'movingDot', title: 'Moving Dot Tracking', desc: 'Follow a gentle dot with your eyes.' },
    { id: 'bouncingBall', title: 'Bouncing Ball', desc: 'Watch the ball bounce slowly.' },
    { id: 'peripheralFlash', title: 'Peripheral Flash', desc: 'Targets flash at screen edges.' },
    { id: 'letterZoom', title: 'Letter Zoom', desc: 'Big letters zoom in/out.' },
    { id: 'followStar', title: 'Follow the Star', desc: 'Star moves in a circle.' },
    { id: 'shapeMatch', title: 'Shape Match', desc: 'Tap the matching periphery shape.' },
    { id: 'colorCatch', title: 'Color Catch', desc: 'Tap only the target color.' },
    // { id: 'slowBlink', title: 'Slow Blink', desc: 'Shapes blink slowly to build attention.' },
    // { id: 'memoryMatch', title: 'Memory Match', desc: 'Remember and repeat the sequence.' },
    { id: 'spiralFocus', title: 'Spiral Focus', desc: 'Watch the center spiral grow/shrink.' }
];

exList.forEach(ex => {
    const opt = document.createElement('option');
    opt.value = ex.id;
    opt.textContent = ex.title;
    exerciseSelect.appendChild(opt);
});

// Update title/desc on selection
exerciseSelect.addEventListener('change', () => {
    const sel = exList.find(e => e.id === exerciseSelect.value);
    exerciseTitle.textContent = sel.title;
    exerciseDesc.textContent = sel.desc;
});
// init
exerciseSelect.value = exList[0].id;
exerciseSelect.dispatchEvent(new Event('change'));

// Start / Stop
function startSession() {
    clearRunning();
    score = 0;
    updateHUD(parseInt(durationEl.value));
    const duration = parseInt(durationEl.value);
    const speed = speedMul();
    const exId = exerciseSelect.value;
    sessions++;
    sessionCount.textContent = sessions;
    const exFn = Exercises[exId];
    if (!exFn) return;
    exFn({ duration, speed });
    // countdown
    let t = duration;
    updateHUD(t);
    timer = setInterval(() => {
        t--;
        updateHUD(t);
        if (t <= 0) {
            clearInterval(timer);
            clearRunning();
            finalizeSession();
        }
    }, 1000);
}

function stopSession() {
    clearInterval(timer);
    clearRunning();
}

function finalizeSession() { // give simple star rating
    let s = Math.min(3, Math.ceil(score / Math.max(1, Math.floor(parseInt(durationEl.value) / 10))));
    alert('Session complete! Score: ' + score);
}

startBtn.addEventListener('click', startSession);
stopBtn.addEventListener('click', () => {
    clearInterval(timer);
    clearRunning();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    clearInterval(timer);
    clearRunning();
    score = 0;
    sessions = 0;
    updateHUD(parseInt(durationEl.value));
    sessionCount.textContent = '0';
});

// small accessibility: pause when hidden
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInterval(timer); } });
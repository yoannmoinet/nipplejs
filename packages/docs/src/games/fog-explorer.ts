import type { CreateGame, GameInstance, Collection } from './types';

interface Orb {
    x: number;
    y: number;
    radius: number;
    color: string;
    pulse: number;
    pulseSpeed: number;
}

interface Segment {
    x: number;
    y: number;
}

const ORB_COLORS = ['#38bdf8', '#e879f9', '#a78bfa'];
const HEAD_RADIUS = 8;
const SEGMENT_RADIUS = 6;
const SEGMENT_SPACING = 4;
const INITIAL_LENGTH = 0;
const BASE_SNAKE_SPEED = 3.5;
const SPEED_PER_ORB = 0.15;
const ORB_COUNT = 5;
const ORB_RADIUS = 7;
const BG_COLOR = '#0a0a12';

function randomOrb(canvasW: number, canvasH: number): Orb {
    const margin = 40;
    return {
        x: margin + Math.random() * (canvasW - margin * 2),
        y: margin + Math.random() * (canvasH - margin * 2),
        radius: ORB_RADIUS,
        color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.03 + Math.random() * 0.03,
    };
}

export const createGame: CreateGame = (_container) => {
    return {
        config: {
            zones: [
                {
                    options: {
                        mode: 'static',
                        position: { left: '50%', top: '50%' },
                        color: 'rgba(99,102,241,0.5)',
                    },
                    position: { left: '0', top: '0', width: '100%', height: '100%' },
                },
            ],
        },

        create(): GameInstance {
            let canvas: HTMLCanvasElement;
            let ctx: CanvasRenderingContext2D;
            let animId: number | null = null;
            let destroyed = false;

            // Snake state
            let headX = 0;
            let headY = 0;
            let heading = 0; // radians, 0 = right
            let speed = BASE_SNAKE_SPEED;
            let started = false;
            let score = 0;
            let gameOver = false;
            let snakeLength = INITIAL_LENGTH;
            // History of head positions — segments sample from this
            const history: Segment[] = [];

            // Orbs
            let orbs: Orb[] = [];

            function resizeCanvas() {
                const parent = canvas.parentElement;
                if (!parent) {
                    return;
                }
                const rect = parent.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            function initOrbs() {
                orbs = [];
                for (let i = 0; i < ORB_COUNT; i++) {
                    orbs.push(randomOrb(canvas.width, canvas.height));
                }
            }

            function initSnake() {
                history.length = 0;
                // Pre-fill history so segments have positions immediately
                for (let i = 0; i < snakeLength * SEGMENT_SPACING + 1; i++) {
                    history.push({ x: headX, y: headY });
                }
            }

            function getSegments(): Segment[] {
                const segs: Segment[] = [];
                for (let i = 0; i < snakeLength; i++) {
                    // Sample from history at evenly spaced intervals
                    const idx = history.length - 1 - (i + 1) * SEGMENT_SPACING;
                    if (idx >= 0) {
                        segs.unshift(history[idx]);
                    }
                }
                return segs;
            }

            function drawBackground() {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            function drawBorders() {
                const w = canvas.width;
                const h = canvas.height;

                ctx.save();
                // Clip to canvas so shadow only bleeds inward
                ctx.beginPath();
                ctx.rect(0, 0, w, h);
                ctx.clip();

                // Border line
                ctx.shadowBlur = 30;
                ctx.shadowColor = '#ef4444';
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, w - 2, h - 2);

                // Wide diffuse inner glow
                ctx.shadowBlur = 60;
                ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
                ctx.lineWidth = 6;
                ctx.strokeRect(-4, -4, w + 8, h + 8);

                // Extra soft layer
                ctx.shadowBlur = 100;
                ctx.shadowColor = 'rgba(239, 68, 68, 0.2)';
                ctx.strokeStyle = 'transparent';
                ctx.lineWidth = 2;
                ctx.strokeRect(-6, -6, w + 12, h + 12);

                ctx.restore();
            }

            function drawOrbs() {
                for (const orb of orbs) {
                    orb.pulse += orb.pulseSpeed;
                    const scale = 1 + Math.sin(orb.pulse) * 0.3;
                    const r = orb.radius * scale;

                    ctx.save();
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = orb.color;
                    ctx.fillStyle = orb.color;
                    ctx.globalAlpha = 0.7 + Math.sin(orb.pulse) * 0.3;
                    ctx.beginPath();
                    ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawSnake() {
                // Build full path: segments (tail to head) + head position
                const segs = getSegments();
                const points = [...segs, { x: headX, y: headY }];

                if (points.length < 2) {
                    // Just a head, no body yet
                    ctx.save();
                    ctx.shadowBlur = 18;
                    ctx.shadowColor = '#818cf8';
                    ctx.fillStyle = '#818cf8';
                    ctx.beginPath();
                    ctx.arc(headX, headY, HEAD_RADIUS, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#c7d2fe';
                    ctx.beginPath();
                    ctx.arc(headX, headY, HEAD_RADIUS * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    return;
                }

                // Draw body as connected thick line segments that taper from tail to head
                // Use overlapping circles along the path for a smooth, continuous body
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#818cf8';
                for (let i = 0; i < points.length; i++) {
                    const t = points.length > 1 ? i / (points.length - 1) : 1;
                    const p = points[i];
                    // Taper: thin at tail, thick at head
                    const radius = SEGMENT_RADIUS * (0.3 + t * 0.7);
                    // Fade: dim at tail, bright at head
                    const alpha = 0.15 + t * 0.65;

                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = '#818cf8';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();

                // Draw head on top with bright core
                ctx.save();
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#818cf8';
                ctx.fillStyle = '#a5b4fc';
                ctx.beginPath();
                ctx.arc(headX, headY, HEAD_RADIUS, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.fillStyle = '#e0e7ff';
                ctx.beginPath();
                ctx.arc(headX, headY, HEAD_RADIUS * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            function drawHint() {
                // No hint — "Click to start" overlay handles this
            }

            function drawScore() {
                ctx.save();
                ctx.font = '14px JetBrains Mono, monospace';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Score: ${score}`, 16, 28);
                ctx.restore();
            }

            function checkCollisions() {
                if (gameOver) {
                    return;
                }

                // Orb collection
                for (let i = orbs.length - 1; i >= 0; i--) {
                    const orb = orbs[i];
                    const dx = headX - orb.x;
                    const dy = headY - orb.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < HEAD_RADIUS + orb.radius) {
                        score++;
                        speed = BASE_SNAKE_SPEED + score * SPEED_PER_ORB;
                        orbs[i] = randomOrb(canvas.width, canvas.height);
                        snakeLength += 1;
                    }
                }

                // Self-collision: need at least 3 segments to collide with yourself
                const segs = getSegments();
                const skipHead = 3;
                if (segs.length <= skipHead) {
                    return;
                }
                for (let i = 0; i < segs.length - skipHead; i++) {
                    const seg = segs[i];
                    const dx = headX - seg.x;
                    const dy = headY - seg.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < HEAD_RADIUS + SEGMENT_RADIUS * 0.5) {
                        gameOver = true;
                        return;
                    }
                }
            }

            function drawGameOver() {
                if (!gameOver) {
                    return;
                }
                ctx.save();
                ctx.fillStyle = 'rgba(10, 10, 18, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.textAlign = 'center';

                ctx.font = 'bold 28px JetBrains Mono, monospace';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#e879f9';
                ctx.fillStyle = '#e879f9';
                ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

                ctx.shadowBlur = 10;
                ctx.shadowColor = '#38bdf8';
                ctx.fillStyle = '#38bdf8';
                ctx.font = '16px JetBrains Mono, monospace';
                ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

                ctx.shadowBlur = 0;
                ctx.fillStyle = '#64748b';
                ctx.font = '12px JetBrains Mono, monospace';
                ctx.fillText('Tap to restart', canvas.width / 2, canvas.height / 2 + 45);

                ctx.restore();
            }

            function restart() {
                headX = canvas.width / 2;
                headY = canvas.height / 2;
                heading = 0;
                speed = BASE_SNAKE_SPEED;
                snakeLength = INITIAL_LENGTH;
                started = true;
                score = 0;
                gameOver = false;
                initSnake();
                initOrbs();
            }

            function update() {
                if (gameOver || !started) {
                    return;
                }

                // Always move forward in the heading direction
                headX += Math.cos(heading) * speed;
                headY += Math.sin(heading) * speed;

                // Border collision — game over
                if (
                    headX - HEAD_RADIUS < 3 ||
                    headX + HEAD_RADIUS > canvas.width - 3 ||
                    headY - HEAD_RADIUS < 3 ||
                    headY + HEAD_RADIUS > canvas.height - 3
                ) {
                    gameOver = true;
                    return;
                }

                // Record head position in history
                history.push({ x: headX, y: headY });
                // Trim history — keep enough for the longest possible snake
                const maxHistory = snakeLength * SEGMENT_SPACING + SEGMENT_SPACING;
                if (history.length > maxHistory) {
                    history.splice(0, history.length - maxHistory);
                }

                checkCollisions();
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                drawBackground();
                drawBorders();
                drawOrbs();
                drawSnake();
                drawGameOver();
                drawHint();
                drawScore();

                animId = requestAnimationFrame(render);
            }

            return {
                start(cvs: HTMLCanvasElement, joysticks: Collection[]) {
                    canvas = cvs;
                    const context = canvas.getContext('2d');
                    if (!context) {
                        return;
                    }
                    ctx = context;

                    resizeCanvas();

                    headX = canvas.width / 2;
                    headY = canvas.height / 2;
                    initSnake();
                    initOrbs();

                    const ro = new ResizeObserver(() => resizeCanvas());
                    if (canvas.parentElement) {
                        ro.observe(canvas.parentElement);
                    }

                    if (joysticks[0]) {
                        joysticks[0].on('move', (evt) => {
                            // Steer heading using joystick angle
                            // atan2(-vector.y, vector.x) converts from joystick coords to canvas angle
                            heading = Math.atan2(-evt.data.vector.y, evt.data.vector.x);
                        });

                        joysticks[0].on('start', () => {
                            if (gameOver) {
                                restart();
                            } else if (!started) {
                                started = true;
                            }
                        });
                    }

                    render();
                },

                destroy() {
                    destroyed = true;
                    if (animId !== null) {
                        cancelAnimationFrame(animId);
                        animId = null;
                    }
                },
            };
        },
    };
};

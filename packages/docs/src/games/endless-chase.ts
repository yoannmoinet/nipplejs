import type { CreateGame, GameInstance, Collection } from './types';

interface Star {
    x: number;
    y: number;
    size: number;
    brightness: number;
    twinkleSpeed: number;
    twinklePhase: number;
    depth: number; // 0 = far background, 1 = near foreground
    color: string;
}

interface Target {
    worldX: number;
    worldY: number;
    radius: number;
    color: string;
    glowColor: string;
    label: string;
    lockProgress: number; // 0 to 1
    locked: boolean;
    pulse: number;
}

const BG_COLOR = '#050510';
const STAR_COUNT = 200;
const CROSSHAIR_RADIUS = 20;
const CROSSHAIR_COLOR = '#38bdf8';
const PAN_SPEED = 1.2;
const LOCK_TIME = 60; // frames to lock on (~1 second)
const TARGET_COLORS = [
    { color: '#818cf8', glow: 'rgba(129,140,248,0.4)', label: 'Nebula' },
    { color: '#e879f9', glow: 'rgba(232,121,249,0.4)', label: 'Pulsar' },
    { color: '#38bdf8', glow: 'rgba(56,189,248,0.4)', label: 'Star' },
    { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)', label: 'Planet' },
    { color: '#34d399', glow: 'rgba(52,211,153,0.4)', label: 'Quasar' },
];

function randomTarget(spread: number): Target {
    const t = TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];
    return {
        worldX: (Math.random() - 0.5) * spread * 2,
        worldY: (Math.random() - 0.5) * spread * 2,
        radius: 8 + Math.random() * 6,
        color: t.color,
        glowColor: t.glow,
        label: t.label,
        lockProgress: 0,
        locked: false,
        pulse: Math.random() * Math.PI * 2,
    };
}

export const createGame: CreateGame = (_container) => {
    return {
        config: {
            zones: [
                {
                    options: {
                        mode: 'static',
                        position: { left: '50%', bottom: '15%' },
                        follow: true,
                        color: {
                            front: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                            back: 'rgba(56,189,248,0.1)',
                        },
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

            // Camera world position (smoothed)
            let camX = 0;
            let camY = 0;
            let camVelX = 0;
            let camVelY = 0;
            const CAM_FRICTION = 0.88;

            // Crosshair offset from center (smoothed)
            let aimX = 0;
            let aimY = 0;
            let aimTargetX = 0;
            let aimTargetY = 0;
            const AIM_LERP = 0.15;

            // Current joystick input
            let vectorX = 0;
            let vectorY = 0;
            let baseDeltaX = 0;
            let baseDeltaY = 0;

            let score = 0;
            const stars: Star[] = [];
            let targets: Target[] = [];
            const SPREAD = 800;

            function resizeCanvas() {
                const parent = canvas.parentElement;
                if (!parent) {
                    return;
                }
                const rect = parent.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            // Stars at multiple depth layers for parallax 3D effect
            const STAR_COLORS = ['#e2e8f0', '#c7d2fe', '#bae6fd', '#ddd6fe', '#fbcfe8'];
            function initStars() {
                stars.length = 0;
                for (let i = 0; i < STAR_COUNT; i++) {
                    const depth = Math.random(); // 0 = far, 1 = near
                    stars.push({
                        x: Math.random(),
                        y: Math.random(),
                        size: 0.3 + depth * 2.2, // far = tiny, near = bigger
                        brightness: 0.15 + depth * 0.65, // far = dim, near = bright
                        twinkleSpeed: 0.005 + Math.random() * 0.025,
                        twinklePhase: Math.random() * Math.PI * 2,
                        depth,
                        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
                    });
                }
                // Sort by depth so far stars draw first
                stars.sort((a, b) => a.depth - b.depth);
            }

            function initTargets() {
                targets = [];
                for (let i = 0; i < 6; i++) {
                    targets.push(randomTarget(SPREAD));
                }
            }

            function drawBackground() {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            function drawStars() {
                const w = canvas.width;
                const h = canvas.height;

                for (const star of stars) {
                    star.twinklePhase += star.twinkleSpeed;
                    const twinkle = 0.5 + Math.sin(star.twinklePhase) * 0.5;
                    const alpha = star.brightness * (0.3 + twinkle * 0.7);

                    // Parallax: far stars (depth~0) move slowly, near stars (depth~1) move faster
                    const parallax = 0.05 + star.depth * 0.5;
                    const offsetX = (camX * parallax) % w;
                    const offsetY = (camY * parallax) % h;

                    const sx = (((star.x * w - offsetX) % w) + w) % w;
                    const sy = (((star.y * h - offsetY) % h) + h) % h;

                    ctx.save();
                    ctx.globalAlpha = alpha;

                    // Near stars get a subtle glow
                    if (star.depth > 0.7) {
                        ctx.shadowBlur = star.size * 3;
                        ctx.shadowColor = star.color;
                    }

                    ctx.fillStyle = star.color;
                    ctx.beginPath();
                    ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawTargets() {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                for (const target of targets) {
                    target.pulse += 0.03;
                    const screenX = cx + (target.worldX - camX);
                    const screenY = cy + (target.worldY - camY);

                    // Only draw if on screen (with margin)
                    if (
                        screenX < -60 ||
                        screenX > canvas.width + 60 ||
                        screenY < -60 ||
                        screenY > canvas.height + 60
                    ) {
                        continue;
                    }

                    const pulseScale = 1 + Math.sin(target.pulse) * 0.15;
                    const r = target.radius * pulseScale;

                    // Outer glow
                    ctx.save();
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = target.glowColor;
                    ctx.fillStyle = target.color;
                    ctx.globalAlpha = target.locked ? 0.3 : 0.7;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner bright core
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = target.locked ? 0.2 : 0.5;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, r * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // Lock progress ring
                    if (target.lockProgress > 0 && !target.locked) {
                        ctx.save();
                        ctx.strokeStyle = CROSSHAIR_COLOR;
                        ctx.lineWidth = 2;
                        ctx.globalAlpha = 0.8;
                        ctx.beginPath();
                        ctx.arc(
                            screenX,
                            screenY,
                            r + 8,
                            -Math.PI / 2,
                            -Math.PI / 2 + target.lockProgress * Math.PI * 2,
                        );
                        ctx.stroke();
                        ctx.restore();
                    }

                    // Locked indicator
                    if (target.locked) {
                        ctx.save();
                        ctx.strokeStyle = '#34d399';
                        ctx.lineWidth = 2;
                        ctx.globalAlpha = 0.6;
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, r + 8, 0, Math.PI * 2);
                        ctx.stroke();

                        ctx.font = '9px JetBrains Mono, monospace';
                        ctx.fillStyle = '#34d399';
                        ctx.globalAlpha = 0.5;
                        ctx.textAlign = 'center';
                        ctx.fillText('LOCKED', screenX, screenY + r + 20);
                        ctx.restore();
                    }

                    // Label
                    if (!target.locked) {
                        ctx.save();
                        ctx.font = '9px JetBrains Mono, monospace';
                        ctx.fillStyle = target.color;
                        ctx.globalAlpha = 0.4;
                        ctx.textAlign = 'center';
                        ctx.fillText(target.label, screenX, screenY + r + 18);
                        ctx.restore();
                    }
                }
            }

            function drawOffScreenIndicators() {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const margin = 30;

                for (const target of targets) {
                    if (target.locked) {
                        continue;
                    }

                    const screenX = cx + (target.worldX - camX);
                    const screenY = cy + (target.worldY - camY);

                    if (
                        screenX >= -10 &&
                        screenX <= canvas.width + 10 &&
                        screenY >= -10 &&
                        screenY <= canvas.height + 10
                    ) {
                        continue;
                    }

                    const dx = screenX - cx;
                    const dy = screenY - cy;
                    const angle = Math.atan2(dy, dx);

                    const edgeX = Math.max(
                        margin,
                        Math.min(
                            canvas.width - margin,
                            cx + Math.cos(angle) * (canvas.width / 2 - margin),
                        ),
                    );
                    const edgeY = Math.max(
                        margin,
                        Math.min(
                            canvas.height - margin,
                            cy + Math.sin(angle) * (canvas.height / 2 - margin),
                        ),
                    );

                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const distLabel =
                        dist < 1000 ? Math.round(dist).toString() : `${(dist / 1000).toFixed(1)}k`;

                    ctx.save();
                    ctx.translate(edgeX, edgeY);
                    ctx.rotate(angle);

                    ctx.shadowBlur = 6;
                    ctx.shadowColor = target.color;
                    ctx.fillStyle = target.color;
                    ctx.globalAlpha = 0.5;

                    ctx.beginPath();
                    ctx.moveTo(8, 0);
                    ctx.lineTo(-4, -5);
                    ctx.lineTo(-4, 5);
                    ctx.closePath();
                    ctx.fill();

                    ctx.rotate(-angle);

                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 0.35;
                    ctx.fillStyle = target.color;
                    ctx.font = '9px JetBrains Mono, monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(distLabel, 0, 16);

                    ctx.restore();
                }
            }

            function drawCrosshair() {
                const cx = canvas.width / 2 + aimX;
                const cy = canvas.height / 2 + aimY;

                ctx.save();
                ctx.strokeStyle = CROSSHAIR_COLOR;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.6;
                ctx.shadowBlur = 8;
                ctx.shadowColor = CROSSHAIR_COLOR;

                // Outer ring
                ctx.beginPath();
                ctx.arc(cx, cy, CROSSHAIR_RADIUS, 0, Math.PI * 2);
                ctx.stroke();

                // Cross lines
                const gap = 6;
                const len = CROSSHAIR_RADIUS - 4;

                ctx.beginPath();
                ctx.moveTo(cx - len, cy);
                ctx.lineTo(cx - gap, cy);
                ctx.moveTo(cx + gap, cy);
                ctx.lineTo(cx + len, cy);
                ctx.moveTo(cx, cy - len);
                ctx.lineTo(cx, cy - gap);
                ctx.moveTo(cx, cy + gap);
                ctx.lineTo(cx, cy + len);
                ctx.stroke();

                // Center dot
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = CROSSHAIR_COLOR;
                ctx.beginPath();
                ctx.arc(cx, cy, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            function drawScore() {
                ctx.save();
                ctx.font = '14px JetBrains Mono, monospace';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Locked: ${score} / ${targets.length}`, 16, 28);
                ctx.restore();

                // Hint
                if (score === 0 && camX === 0 && camY === 0) {
                    ctx.save();
                    ctx.font = '11px JetBrains Mono, monospace';
                    ctx.fillStyle = '#64748b';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        'Aim within radius \u2022 Pan by pushing beyond',
                        canvas.width / 2,
                        canvas.height - 20,
                    );
                    ctx.restore();
                }
            }

            function checkLockOn() {
                const cx = canvas.width / 2 + aimX;
                const cy = canvas.height / 2 + aimY;
                const screenCx = canvas.width / 2;
                const screenCy = canvas.height / 2;

                for (const target of targets) {
                    if (target.locked) {
                        continue;
                    }

                    const screenX = screenCx + (target.worldX - camX);
                    const screenY = screenCy + (target.worldY - camY);

                    const dx = cx - screenX;
                    const dy = cy - screenY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < CROSSHAIR_RADIUS + target.radius) {
                        target.lockProgress += 1 / LOCK_TIME;
                        if (target.lockProgress >= 1) {
                            target.lockProgress = 1;
                            target.locked = true;
                            score++;

                            // Spawn a replacement if all aren't locked
                            if (score < targets.length) {
                                targets.push(randomTarget(SPREAD));
                            }
                        }
                    } else {
                        // Decay progress when not aiming at it
                        target.lockProgress = Math.max(0, target.lockProgress - 0.5 / LOCK_TIME);
                    }
                }
            }

            function drawVignette() {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const radius = Math.max(cx, cy) * 1.2;

                const gradient = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(1, 'rgba(5, 5, 16, 0.6)');

                ctx.save();
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            function update() {
                // Smooth camera: accumulate velocity from baseDelta, apply friction
                camVelX += baseDeltaX * PAN_SPEED;
                camVelY -= baseDeltaY * PAN_SPEED;
                camVelX *= CAM_FRICTION;
                camVelY *= CAM_FRICTION;
                camX += camVelX;
                camY += camVelY;

                // Smooth crosshair: lerp toward target position
                aimTargetX = vectorX * (canvas.width / 2 - CROSSHAIR_RADIUS);
                aimTargetY = -vectorY * (canvas.height / 2 - CROSSHAIR_RADIUS);
                aimX += (aimTargetX - aimX) * AIM_LERP;
                aimY += (aimTargetY - aimY) * AIM_LERP;

                checkLockOn();
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                drawBackground();
                drawStars();
                drawVignette();
                drawTargets();
                drawOffScreenIndicators();
                drawCrosshair();
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
                    initStars();
                    initTargets();

                    const ro = new ResizeObserver(() => resizeCanvas());
                    if (canvas.parentElement) {
                        ro.observe(canvas.parentElement);
                    }

                    if (joysticks[0]) {
                        joysticks[0].on('move', (evt) => {
                            vectorX = evt.data.vector.x;
                            vectorY = evt.data.vector.y;
                            baseDeltaX = evt.data.baseDelta.x;
                            baseDeltaY = evt.data.baseDelta.y;
                        });

                        joysticks[0].on('end', () => {
                            vectorX = 0;
                            vectorY = 0;
                            baseDeltaX = 0;
                            baseDeltaY = 0;
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

import type { CreateGame, GameInstance, Collection } from './types';

interface Orb {
    x: number;
    y: number;
    radius: number;
    color: string;
    pulse: number;
    pulseSpeed: number;
}

const ORB_COLORS = ['#38bdf8', '#e879f9', '#a78bfa'];
const PLAYER_RADIUS = 8;
const FOG_REVEAL_RADIUS = 80;
const PLAYER_SPEED = 3;
const ORB_COUNT = 15;
const ORB_RADIUS = 5;
const TRAIL_LENGTH = 20;
const BG_COLOR = '#0a0a12';

function randomOrb(canvasW: number, canvasH: number): Orb {
    const margin = 20;
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

            // Player state
            let playerX = 0;
            let playerY = 0;
            let vectorX = 0;
            let vectorY = 0;
            let score = 0;

            // Trail positions
            const trail: { x: number; y: number }[] = [];

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

            function drawBackground() {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            function drawOrbs() {
                for (const orb of orbs) {
                    orb.pulse += orb.pulseSpeed;
                    const scale = 1 + Math.sin(orb.pulse) * 0.3;
                    const r = orb.radius * scale;

                    ctx.save();
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = orb.color;
                    ctx.fillStyle = orb.color;
                    ctx.globalAlpha = 0.7 + Math.sin(orb.pulse) * 0.3;
                    ctx.beginPath();
                    ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawTrail() {
                for (let i = 0; i < trail.length; i++) {
                    const alpha = (i / trail.length) * 0.3;
                    const r = PLAYER_RADIUS * (i / trail.length) * 0.6;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = '#818cf8';
                    ctx.beginPath();
                    ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawPlayer() {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#818cf8';
                ctx.fillStyle = '#818cf8';
                ctx.beginPath();
                ctx.arc(playerX, playerY, PLAYER_RADIUS, 0, Math.PI * 2);
                ctx.fill();

                // Inner bright core
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#c7d2fe';
                ctx.beginPath();
                ctx.arc(playerX, playerY, PLAYER_RADIUS * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            function drawFog() {
                // Dark overlay
                ctx.save();
                ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Cut out reveal circle around player
                ctx.globalCompositeOperation = 'destination-out';
                const gradient = ctx.createRadialGradient(
                    playerX,
                    playerY,
                    0,
                    playerX,
                    playerY,
                    FOG_REVEAL_RADIUS,
                );
                gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
                gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(playerX, playerY, FOG_REVEAL_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            function drawScore() {
                ctx.save();
                ctx.font = '14px JetBrains Mono, monospace';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Score: ${score}`, 16, 28);
                ctx.restore();
            }

            function checkCollisions() {
                for (let i = orbs.length - 1; i >= 0; i--) {
                    const orb = orbs[i];
                    const dx = playerX - orb.x;
                    const dy = playerY - orb.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < PLAYER_RADIUS + orb.radius) {
                        score++;
                        orbs[i] = randomOrb(canvas.width, canvas.height);
                    }
                }
            }

            function update() {
                // Move player
                playerX += vectorX * PLAYER_SPEED;
                playerY += vectorY * PLAYER_SPEED;

                // Clamp to canvas bounds
                playerX = Math.max(PLAYER_RADIUS, Math.min(canvas.width - PLAYER_RADIUS, playerX));
                playerY = Math.max(PLAYER_RADIUS, Math.min(canvas.height - PLAYER_RADIUS, playerY));

                // Update trail
                trail.push({ x: playerX, y: playerY });
                if (trail.length > TRAIL_LENGTH) {
                    trail.shift();
                }

                checkCollisions();
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                drawBackground();
                drawOrbs();
                drawTrail();
                drawPlayer();
                drawFog();
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

                    // Center the player
                    playerX = canvas.width / 2;
                    playerY = canvas.height / 2;

                    initOrbs();

                    // Observe container resize
                    const ro = new ResizeObserver(() => {
                        resizeCanvas();
                    });
                    if (canvas.parentElement) {
                        ro.observe(canvas.parentElement);
                    }

                    // Listen to joystick events
                    if (joysticks[0]) {
                        joysticks[0].on('move', (_evt, data) => {
                            if (data.vector) {
                                vectorX = data.vector.x;
                                vectorY = -data.vector.y; // invert Y: joystick up = negative canvas Y
                            }
                        });

                        joysticks[0].on('end', () => {
                            vectorX = 0;
                            vectorY = 0;
                        });
                    }

                    // Start render loop
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

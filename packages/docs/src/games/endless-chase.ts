import type { CreateGame, GameInstance, Collection } from './types';

interface Star {
    x: number;
    y: number;
    size: number;
    opacity: number;
    depth: number; // parallax layer: higher = further away = slower scroll
}

const BG_COLOR = '#0a0a12';
const PLAYER_RADIUS = 8;
const PLAYER_COLOR = '#38bdf8';
const PURSUER_RADIUS = 12;
const PURSUER_COLOR = '#e879f9';
const PLAYER_SPEED = 3;
const STAR_COUNT = 50;
const BASE_LERP = 0.02;
const LERP_INCREASE_INTERVAL = 300; // ~5 seconds at 60fps — pursuer speeds up
const LERP_INCREMENT = 0.002;

export const createGame: CreateGame = (_container) => {
    return {
        config: {
            zones: [
                {
                    options: {
                        mode: 'static',
                        position: { left: '50%', bottom: '15%' },
                        follow: true,
                        color: 'rgba(56,189,248,0.5)',
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

            // World-space positions (player is always rendered at center of canvas)
            let playerWorldX = 0;
            let playerWorldY = 0;
            let vectorX = 0;
            let vectorY = 0;

            // Pursuer in world space
            let pursuerWorldX = 0;
            let pursuerWorldY = 0;
            let pursuerPulse = 0;

            // Game state
            let frameCount = 0;
            let startTime = 0;
            let elapsedTime = 0;
            let gameOver = false;
            let waitingRestart = false;

            // Background stars (in world space offsets)
            let stars: Star[] = [];

            let ro: ResizeObserver | null = null;

            function resizeCanvas() {
                const parent = canvas.parentElement;
                if (!parent) {
                    return;
                }
                const rect = parent.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            function initStars() {
                stars = [];
                for (let i = 0; i < STAR_COUNT; i++) {
                    stars.push({
                        x: Math.random() * canvas.width * 3 - canvas.width,
                        y: Math.random() * canvas.height * 3 - canvas.height,
                        size: 1 + Math.random() * 2,
                        opacity: 0.15 + Math.random() * 0.5,
                        depth: 0.3 + Math.random() * 0.7,
                    });
                }
            }

            function getCurrentLerp(): number {
                const intervals = Math.floor(frameCount / LERP_INCREASE_INTERVAL);
                return Math.min(0.06, BASE_LERP + intervals * LERP_INCREMENT);
            }

            function resetGame() {
                playerWorldX = 0;
                playerWorldY = 0;
                pursuerWorldX = -150;
                pursuerWorldY = -150;
                pursuerPulse = 0;
                vectorX = 0;
                vectorY = 0;
                frameCount = 0;
                startTime = performance.now();
                elapsedTime = 0;
                gameOver = false;
                waitingRestart = false;
                initStars();
            }

            function drawBackground() {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw stars with parallax scrolling
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                for (const star of stars) {
                    // Stars offset opposite to player movement, scaled by depth for parallax
                    const screenX = star.x - playerWorldX * star.depth + centerX;
                    const screenY = star.y - playerWorldY * star.depth + centerY;

                    // Wrap stars around viewport with margin
                    const margin = 50;
                    const wrapW = canvas.width + margin * 2;
                    const wrapH = canvas.height + margin * 2;
                    const wrappedX = ((((screenX + margin) % wrapW) + wrapW) % wrapW) - margin;
                    const wrappedY = ((((screenY + margin) % wrapH) + wrapH) % wrapH) - margin;

                    ctx.save();
                    ctx.globalAlpha = star.opacity;
                    ctx.fillStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.arc(wrappedX, wrappedY, star.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawDistanceLine() {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                // Pursuer screen position
                const pursuerScreenX = centerX + (pursuerWorldX - playerWorldX);
                const pursuerScreenY = centerY + (pursuerWorldY - playerWorldY);

                const dx = pursuerWorldX - playerWorldX;
                const dy = pursuerWorldY - playerWorldY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Color shifts from green (far) to red (close)
                // max safe distance ~200, danger at ~30
                const t = Math.max(0, Math.min(1, 1 - (dist - 30) / 170));

                // Interpolate color components
                const safeR = 0x34;
                const safeG = 0xd3;
                const safeB = 0x99;
                const dangerR = 0xef;
                const dangerG = 0x44;
                const dangerB = 0x44;
                const r = Math.round(safeR + (dangerR - safeR) * t);
                const g = Math.round(safeG + (dangerG - safeG) * t);
                const b = Math.round(safeB + (dangerB - safeB) * t);

                const lineColor = `rgb(${r}, ${g}, ${b})`;

                ctx.save();
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.4;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(pursuerScreenX, pursuerScreenY);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }

            function drawPlayer() {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = PLAYER_COLOR;
                ctx.fillStyle = PLAYER_COLOR;
                ctx.beginPath();
                ctx.arc(cx, cy, PLAYER_RADIUS, 0, Math.PI * 2);
                ctx.fill();

                // Inner bright core
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#e0f2fe';
                ctx.beginPath();
                ctx.arc(cx, cy, PLAYER_RADIUS * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            function drawPursuer() {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                const screenX = centerX + (pursuerWorldX - playerWorldX);
                const screenY = centerY + (pursuerWorldY - playerWorldY);

                pursuerPulse += 0.06;
                const pulseScale = 1 + Math.sin(pursuerPulse) * 0.15;
                const r = PURSUER_RADIUS * pulseScale;
                const alpha = 0.7 + Math.sin(pursuerPulse) * 0.2;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = 14;
                ctx.shadowColor = PURSUER_COLOR;
                ctx.fillStyle = PURSUER_COLOR;
                ctx.beginPath();
                ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
                ctx.fill();

                // Inner menacing core
                ctx.shadowBlur = 0;
                ctx.globalAlpha = alpha * 0.5;
                ctx.fillStyle = '#fda4af';
                ctx.beginPath();
                ctx.arc(screenX, screenY, r * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            function drawScore() {
                const display = gameOver ? elapsedTime : (performance.now() - startTime) / 1000;
                const timeStr = `${display.toFixed(1)}s`;
                ctx.save();
                ctx.font = '16px JetBrains Mono, monospace';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(timeStr, 16, 28);
                ctx.restore();
            }

            function drawGameOver() {
                ctx.save();
                // Semi-transparent overlay
                ctx.fillStyle = 'rgba(10, 10, 18, 0.8)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                // GAME OVER text
                ctx.shadowBlur = 20;
                ctx.shadowColor = PURSUER_COLOR;
                ctx.font = 'bold 28px JetBrains Mono, monospace';
                ctx.fillStyle = PURSUER_COLOR;
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', centerX, centerY - 20);

                // Score
                ctx.shadowBlur = 0;
                ctx.font = '18px JetBrains Mono, monospace';
                ctx.fillStyle = PLAYER_COLOR;
                ctx.fillText(`${elapsedTime.toFixed(1)}s`, centerX, centerY + 15);

                // Restart hint
                ctx.font = '14px JetBrains Mono, monospace';
                ctx.fillStyle = '#64748b';
                ctx.fillText('Tap to restart', centerX, centerY + 50);

                ctx.restore();
            }

            function checkCollision(): boolean {
                const dx = pursuerWorldX - playerWorldX;
                const dy = pursuerWorldY - playerWorldY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return dist < PLAYER_RADIUS + PURSUER_RADIUS;
            }

            function update() {
                if (gameOver) {
                    return;
                }

                frameCount++;
                elapsedTime = (performance.now() - startTime) / 1000;

                // Move player in world space
                playerWorldX += vectorX * PLAYER_SPEED;
                playerWorldY -= vectorY * PLAYER_SPEED;

                // Pursuer lerps toward player with increasing speed
                const lerp = getCurrentLerp();
                pursuerWorldX += (playerWorldX - pursuerWorldX) * lerp;
                pursuerWorldY += (playerWorldY - pursuerWorldY) * lerp;

                // Check collision
                if (checkCollision()) {
                    gameOver = true;
                    waitingRestart = true;
                }
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                drawBackground();
                drawDistanceLine();
                drawPursuer();
                drawPlayer();
                drawScore();

                if (gameOver) {
                    drawGameOver();
                }

                animId = requestAnimationFrame(render);
            }

            function onStart() {
                if (waitingRestart) {
                    resetGame();
                }
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

                    // Initialize game state
                    playerWorldX = 0;
                    playerWorldY = 0;
                    pursuerWorldX = -150;
                    pursuerWorldY = -150;
                    startTime = performance.now();

                    initStars();

                    // Observe container resize
                    ro = new ResizeObserver(() => {
                        resizeCanvas();
                    });
                    if (canvas.parentElement) {
                        ro.observe(canvas.parentElement);
                    }

                    // Listen to joystick events
                    const joystick = joysticks[0] ?? null;
                    if (joystick) {
                        joystick.on('move', (evt) => {
                            vectorX = evt.data.vector.x;
                            vectorY = evt.data.vector.y;
                        });

                        joystick.on('end', () => {
                            vectorX = 0;
                            vectorY = 0;
                        });

                        joystick.on('start', () => {
                            onStart();
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
                    if (ro) {
                        ro.disconnect();
                        ro = null;
                    }
                },
            };
        },
    };
};

import type { CreateGame, GameInstance, Collection } from './types';

interface Asteroid {
    x: number;
    y: number;
    radius: number;
    rotation: number;
    rotationSpeed: number;
    speed: number;
    color: string;
}

const BG_COLOR = '#0a0a12';
const SHIP_SIZE = 12;
const SHIP_COLOR = '#38bdf8';
const ASTEROID_COLORS = ['#e879f9', '#d946ef', '#c084fc', '#a78bfa'];
const BASE_ASTEROID_SPEED = 2;
const BASE_SPAWN_INTERVAL = 60;
const SPEED_INCREASE_INTERVAL = 150; // ~2.5 seconds at 60fps
const SPEED_INCREMENT = 0.25;
const PLAYER_SPEED = 4;
const BG_LINE_COUNT = 30;

export const createGame: CreateGame = (_container) => {
    return {
        config: {
            zones: [
                {
                    options: {
                        mode: 'static',
                        position: { left: '50%', bottom: '15%' },
                        lockX: true,
                        color: {
                            front: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                            back: 'rgba(56,189,248,0.12)',
                        },
                    },
                    position: { left: '0', top: '0', width: '100%', height: '100%' },
                },
            ],
        },

        create(): GameInstance {
            const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            let canvas: HTMLCanvasElement;
            let ctx: CanvasRenderingContext2D;
            let animId: number | null = null;
            let destroyed = false;

            // Player state
            let shipX = 0;
            let shipBottomOffset = 40;
            let vectorX = 0;

            // Game state
            let asteroids: Asteroid[] = [];
            let frameCount = 0;
            let startTime = 0;
            let elapsedTime = 0;
            let gameOver = false;
            let exploding = false;
            let waitingRestart = false;

            // Particles
            interface Particle {
                x: number;
                y: number;
                vx: number;
                vy: number;
                life: number;
                maxLife: number;
                color: string;
                radius: number;
            }
            let particles: Particle[] = [];
            let shakeTime = 0;
            let flashAlpha = 0;
            let tilt = 0;

            function triggerImpact() {
                shakeTime = 12;
                flashAlpha = 0.4;
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }

            function spawnExplosion(x: number, y: number, color: string, count: number) {
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1.5 + Math.random() * 4;
                    particles.push({
                        x,
                        y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1,
                        maxLife: 25 + Math.random() * 25,
                        color,
                        radius: 1.5 + Math.random() * 2.5,
                    });
                }
            }

            // Background lines (vertical motion lines)
            let bgLines: { x: number; y: number; length: number; speed: number }[] = [];

            let ro: ResizeObserver | null = null;
            let joystickRef: Collection | null = null;

            const REF_DIAGONAL = 800;
            let speedScale = 1;

            function resizeCanvas() {
                const parent = canvas.parentElement;
                if (!parent) {
                    return;
                }
                canvas.width = parent.offsetWidth;
                canvas.height = parent.offsetHeight;
                speedScale = Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / REF_DIAGONAL;
            }

            function initBgLines() {
                bgLines = [];
                for (let i = 0; i < BG_LINE_COUNT; i++) {
                    bgLines.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        length: 10 + Math.random() * 30,
                        speed: 0.5 + Math.random() * 1.5,
                    });
                }
            }

            function getCurrentSpeed(): number {
                const intervals = Math.floor(frameCount / SPEED_INCREASE_INTERVAL);
                return BASE_ASTEROID_SPEED + intervals * SPEED_INCREMENT;
            }

            function getSpawnInterval(): number {
                const intervals = Math.floor(frameCount / SPEED_INCREASE_INTERVAL);
                return Math.max(15, BASE_SPAWN_INTERVAL - intervals * 3);
            }

            function spawnAsteroid() {
                const radius = 8 + Math.random() * 12;
                const margin = radius + 5;
                asteroids.push({
                    x: margin + Math.random() * (canvas.width - margin * 2),
                    y: -radius,
                    radius,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.04,
                    speed: getCurrentSpeed() * (0.5 + Math.random() * 1.0) * speedScale,
                    color: ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)],
                });
            }

            function resetGame() {
                asteroids = [];
                particles = [];
                frameCount = 0;
                startTime = performance.now();
                elapsedTime = 0;
                gameOver = false;
                exploding = false;
                waitingRestart = false;
                vectorX = 0;
                shipX = canvas.width / 2;
                initBgLines();
            }

            function drawBackground() {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw subtle vertical motion lines
                ctx.save();
                for (const line of bgLines) {
                    line.y += line.speed;
                    if (line.y > canvas.height) {
                        line.y = -line.length;
                        line.x = Math.random() * canvas.width;
                    }
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(line.x, line.y);
                    ctx.lineTo(line.x, line.y + line.length);
                    ctx.stroke();
                }
                ctx.restore();
            }

            function drawShip() {
                const sy = canvas.height - shipBottomOffset;
                ctx.save();
                ctx.shadowBlur = isMobile ? 0 : 12;
                ctx.shadowColor = SHIP_COLOR;
                ctx.fillStyle = SHIP_COLOR;
                ctx.beginPath();
                // Triangle pointing up
                ctx.moveTo(shipX, sy - SHIP_SIZE);
                ctx.lineTo(shipX - SHIP_SIZE * 0.7, sy + SHIP_SIZE * 0.5);
                ctx.lineTo(shipX + SHIP_SIZE * 0.7, sy + SHIP_SIZE * 0.5);
                ctx.closePath();
                ctx.fill();

                // Bright core
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#e0f2fe';
                ctx.beginPath();
                ctx.moveTo(shipX, sy - SHIP_SIZE * 0.5);
                ctx.lineTo(shipX - SHIP_SIZE * 0.3, sy + SHIP_SIZE * 0.2);
                ctx.lineTo(shipX + SHIP_SIZE * 0.3, sy + SHIP_SIZE * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            function drawAsteroids() {
                for (const a of asteroids) {
                    a.rotation += a.rotationSpeed;

                    ctx.save();
                    ctx.translate(a.x, a.y);
                    ctx.rotate(a.rotation);
                    ctx.shadowBlur = isMobile ? 0 : 10;
                    ctx.shadowColor = a.color;
                    ctx.fillStyle = a.color;
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.arc(0, 0, a.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner brighter core
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, a.radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
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
                ctx.shadowBlur = isMobile ? 0 : 20;
                ctx.shadowColor = '#e879f9';
                ctx.font = 'bold 28px JetBrains Mono, monospace';
                ctx.fillStyle = '#e879f9';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', centerX, centerY - 20);

                // Score
                ctx.shadowBlur = 0;
                ctx.font = '18px JetBrains Mono, monospace';
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(`${elapsedTime.toFixed(1)}s`, centerX, centerY + 15);

                // Restart hint
                ctx.font = '14px JetBrains Mono, monospace';
                ctx.fillStyle = '#64748b';
                ctx.fillText('Tap to restart', centerX, centerY + 50);

                ctx.restore();
            }

            function checkCollisions(): boolean {
                const sy = canvas.height - shipBottomOffset;
                // Ship collision radius: approximate from triangle
                const shipRadius = SHIP_SIZE * 0.6;

                for (const a of asteroids) {
                    const dx = shipX - a.x;
                    const dy = sy - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < shipRadius + a.radius) {
                        return true;
                    }
                }
                return false;
            }

            function update() {
                if (gameOver) {
                    return;
                }

                // During explosion, only update particles — freeze everything else
                if (exploding) {
                    for (let i = particles.length - 1; i >= 0; i--) {
                        const p = particles[i];
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vx *= 0.95;
                        p.vy *= 0.95;
                        p.life -= 1 / p.maxLife;
                        if (p.life <= 0) {
                            particles.splice(i, 1);
                        }
                    }
                    if (particles.length === 0) {
                        exploding = false;
                        gameOver = true;
                        waitingRestart = true;
                    }
                    return;
                }

                frameCount++;
                elapsedTime = (performance.now() - startTime) / 1000;

                // Move ship horizontally
                shipX += vectorX * PLAYER_SPEED * speedScale;
                shipX = Math.max(SHIP_SIZE, Math.min(canvas.width - SHIP_SIZE, shipX));

                // Spawn asteroids
                const interval = getSpawnInterval();
                if (frameCount % interval === 0) {
                    spawnAsteroid();
                }

                // Move asteroids
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    asteroids[i].y += asteroids[i].speed;
                    // Remove off-screen asteroids
                    if (asteroids[i].y > canvas.height + asteroids[i].radius + 10) {
                        asteroids.splice(i, 1);
                    }
                }

                // Update particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= 0.95;
                    p.vy *= 0.95;
                    p.life -= 1 / p.maxLife;
                    if (p.life <= 0) {
                        particles.splice(i, 1);
                    }
                }

                // Check collisions
                if (checkCollisions()) {
                    const sy = canvas.height - shipBottomOffset;
                    spawnExplosion(shipX, sy, SHIP_COLOR, 20);
                    triggerImpact();
                    exploding = true;
                }
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                // Smooth tilt toward target
                const tiltTarget = vectorX * 0.03;
                tilt += (tiltTarget - tilt) * 0.1;

                ctx.save();
                if (shakeTime > 0) {
                    const intensity = shakeTime / 12;
                    ctx.translate(
                        (Math.random() - 0.5) * 8 * intensity,
                        (Math.random() - 0.5) * 8 * intensity,
                    );
                    shakeTime--;
                }

                // Apply subtle canvas tilt based on horizontal movement
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(tilt);
                ctx.translate(-canvas.width / 2, -canvas.height / 2);

                drawBackground();
                drawAsteroids();
                if (!exploding && !gameOver) {
                    drawShip();
                }
                for (const p of particles) {
                    ctx.save();
                    ctx.globalAlpha = p.life;
                    ctx.shadowBlur = isMobile ? 0 : 8;
                    ctx.shadowColor = p.color;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                drawScore();

                if (flashAlpha > 0) {
                    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    flashAlpha *= 0.85;
                    if (flashAlpha < 0.01) {
                        flashAlpha = 0;
                    }
                }

                ctx.restore();

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

                    shipX = canvas.width / 2;
                    shipBottomOffset = 40;
                    startTime = performance.now();

                    initBgLines();

                    // Observe container resize
                    ro = new ResizeObserver(() => {
                        resizeCanvas();
                    });
                    if (canvas.parentElement) {
                        ro.observe(canvas.parentElement);
                    }

                    // Listen to joystick events
                    joystickRef = joysticks[0] ?? null;
                    if (joystickRef) {
                        joystickRef.on('move', (evt) => {
                            vectorX = evt.data.vector.x;
                        });

                        joystickRef.on('end', () => {
                            vectorX = 0;
                        });

                        joystickRef.on('start', () => {
                            onStart();
                        });
                    }

                    // Start render loop
                    render();
                },

                destroy() {
                    destroyed = true;
                    if (ro) {
                        ro.disconnect();
                        ro = null;
                    }
                    if (animId !== null) {
                        cancelAnimationFrame(animId);
                        animId = null;
                    }
                    asteroids.length = 0;
                    particles.length = 0;
                    bgLines.length = 0;
                },
            };
        },
    };
};

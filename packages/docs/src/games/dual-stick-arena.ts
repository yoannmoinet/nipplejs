import type { CreateGame, GameInstance, Collection } from './types';

interface Enemy {
    x: number;
    y: number;
    radius: number;
    pulse: number;
    pulseSpeed: number;
    speed: number;
}

interface Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    trail: { x: number; y: number }[];
}

const BG_COLOR = '#0a0a12';
const PLAYER_RADIUS = 12;
const PLAYER_COLOR = '#818cf8';
const ENEMY_RADIUS = 8;
const ENEMY_COLOR = '#ec4899';
const PROJECTILE_RADIUS = 3;
const PROJECTILE_COLOR = '#22d3ee';
const PROJECTILE_SPEED = 5;
const PROJECTILE_TRAIL_LENGTH = 6;
const PLAYER_SPEED = 3;
const AIM_LINE_LENGTH = 60;
const BASE_SPAWN_INTERVAL = 90;
const BASE_ENEMY_SPEED = 1;
const FIRE_INTERVAL = 15;
const DIFFICULTY_INTERVAL = 600; // Ramp up every ~10 seconds

export const createGame: CreateGame = (_container) => {
    return {
        config: {
            zones: [
                {
                    options: {
                        mode: 'static',
                        position: { left: '100px', bottom: '100px' },
                        color: {
                            front: 'linear-gradient(135deg, #818cf8, #38bdf8)',
                            back: 'rgba(99,102,241,0.12)',
                        },
                    },
                    position: { left: '0', top: '0', width: '50%', height: '100%' },
                },
                {
                    options: {
                        mode: 'static',
                        position: { right: '100px', bottom: '100px' },
                        color: {
                            front: 'linear-gradient(135deg, #e879f9, #ec4899)',
                            back: 'rgba(236,72,153,0.12)',
                        },
                    },
                    position: { left: '50%', top: '0', width: '50%', height: '100%' },
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
            let moveVX = 0;
            let moveVY = 0;

            // Aim state
            let aimAngle = 0;
            let isAiming = false;
            let fireCooldown = 0;

            // Game entities
            let enemies: Enemy[] = [];
            let projectiles: Projectile[] = [];

            // Game state
            let score = 0;
            let frameCount = 0;
            let gameOver = false;
            let waitingRestart = false;

            let ro: ResizeObserver | null = null;

            function resizeCanvas() {
                const parent = canvas.parentElement;
                if (!parent) {
                    return;
                }
                canvas.width = parent.offsetWidth;
                canvas.height = parent.offsetHeight;
            }

            function getDifficulty(): number {
                return Math.floor(frameCount / DIFFICULTY_INTERVAL);
            }

            function getSpawnInterval(): number {
                return Math.max(20, BASE_SPAWN_INTERVAL - getDifficulty() * 8);
            }

            function getEnemySpeed(): number {
                return BASE_ENEMY_SPEED + getDifficulty() * 0.15;
            }

            function spawnEnemy() {
                // Spawn from a random edge
                const edge = Math.floor(Math.random() * 4);
                let x: number;
                let y: number;

                switch (edge) {
                    case 0: // top
                        x = Math.random() * canvas.width;
                        y = -ENEMY_RADIUS;
                        break;
                    case 1: // right
                        x = canvas.width + ENEMY_RADIUS;
                        y = Math.random() * canvas.height;
                        break;
                    case 2: // bottom
                        x = Math.random() * canvas.width;
                        y = canvas.height + ENEMY_RADIUS;
                        break;
                    default: // left
                        x = -ENEMY_RADIUS;
                        y = Math.random() * canvas.height;
                        break;
                }

                enemies.push({
                    x,
                    y,
                    radius: ENEMY_RADIUS,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.05 + Math.random() * 0.03,
                    speed: getEnemySpeed() + (Math.random() - 0.5) * 0.4,
                });
            }

            function fireProjectile() {
                projectiles.push({
                    x: playerX,
                    y: playerY,
                    vx: Math.cos(aimAngle) * PROJECTILE_SPEED,
                    vy: -Math.sin(aimAngle) * PROJECTILE_SPEED,
                    trail: [],
                });
            }

            function resetGame() {
                enemies = [];
                projectiles = [];
                score = 0;
                frameCount = 0;
                gameOver = false;
                waitingRestart = false;
                moveVX = 0;
                moveVY = 0;
                isAiming = false;
                fireCooldown = 0;
                playerX = canvas.width / 2;
                playerY = canvas.height / 2;
            }

            function drawBackground() {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            function drawPlayer() {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = PLAYER_COLOR;
                ctx.fillStyle = PLAYER_COLOR;
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

            function drawAimLine() {
                if (!isAiming) {
                    return;
                }

                const endX = playerX + Math.cos(aimAngle) * AIM_LINE_LENGTH;
                const endY = playerY - Math.sin(aimAngle) * AIM_LINE_LENGTH;

                ctx.save();
                const gradient = ctx.createLinearGradient(playerX, playerY, endX, endY);
                gradient.addColorStop(0, 'rgba(236, 72, 153, 0.6)');
                gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(playerX, playerY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                ctx.restore();
            }

            function drawEnemies() {
                for (const enemy of enemies) {
                    enemy.pulse += enemy.pulseSpeed;
                    const alpha = 0.6 + Math.sin(enemy.pulse) * 0.3;

                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = ENEMY_COLOR;
                    ctx.fillStyle = ENEMY_COLOR;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner core
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.fillStyle = '#fda4af';
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, enemy.radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawProjectiles() {
                for (const proj of projectiles) {
                    // Draw trail
                    for (let i = 0; i < proj.trail.length; i++) {
                        const alpha = (i / proj.trail.length) * 0.4;
                        const r = PROJECTILE_RADIUS * (i / proj.trail.length) * 0.8;
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = PROJECTILE_COLOR;
                        ctx.beginPath();
                        ctx.arc(proj.trail[i].x, proj.trail[i].y, r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }

                    // Draw projectile
                    ctx.save();
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = PROJECTILE_COLOR;
                    ctx.fillStyle = PROJECTILE_COLOR;
                    ctx.beginPath();
                    ctx.arc(proj.x, proj.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawScore() {
                ctx.save();
                ctx.font = '14px JetBrains Mono, monospace';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Kills: ${score}`, 16, 28);
                ctx.restore();
            }

            function drawGameOver() {
                ctx.save();
                ctx.fillStyle = 'rgba(10, 10, 18, 0.8)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                ctx.shadowBlur = 20;
                ctx.shadowColor = ENEMY_COLOR;
                ctx.font = 'bold 28px JetBrains Mono, monospace';
                ctx.fillStyle = ENEMY_COLOR;
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', centerX, centerY - 20);

                ctx.shadowBlur = 0;
                ctx.font = '18px JetBrains Mono, monospace';
                ctx.fillStyle = PLAYER_COLOR;
                ctx.fillText(`Kills: ${score}`, centerX, centerY + 15);

                ctx.font = '14px JetBrains Mono, monospace';
                ctx.fillStyle = '#64748b';
                ctx.fillText('Tap to restart', centerX, centerY + 50);

                ctx.restore();
            }

            function checkCollisions() {
                // Projectile vs enemy
                for (let pi = projectiles.length - 1; pi >= 0; pi--) {
                    const proj = projectiles[pi];
                    for (let ei = enemies.length - 1; ei >= 0; ei--) {
                        const enemy = enemies[ei];
                        const dx = proj.x - enemy.x;
                        const dy = proj.y - enemy.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < PROJECTILE_RADIUS + enemy.radius) {
                            // Destroy both
                            enemies.splice(ei, 1);
                            projectiles.splice(pi, 1);
                            score++;
                            break; // This projectile is gone, move to next
                        }
                    }
                }

                // Enemy vs player
                for (const enemy of enemies) {
                    const dx = playerX - enemy.x;
                    const dy = playerY - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < PLAYER_RADIUS + enemy.radius) {
                        gameOver = true;
                        waitingRestart = true;
                        return;
                    }
                }
            }

            function update() {
                if (gameOver) {
                    return;
                }

                frameCount++;

                // Move player
                playerX += moveVX * PLAYER_SPEED;
                playerY -= moveVY * PLAYER_SPEED;

                // Clamp to canvas bounds
                playerX = Math.max(PLAYER_RADIUS, Math.min(canvas.width - PLAYER_RADIUS, playerX));
                playerY = Math.max(PLAYER_RADIUS, Math.min(canvas.height - PLAYER_RADIUS, playerY));

                // Auto-fire while aiming
                if (isAiming) {
                    fireCooldown--;
                    if (fireCooldown <= 0) {
                        fireProjectile();
                        fireCooldown = FIRE_INTERVAL;
                    }
                }

                // Update projectiles
                for (let i = projectiles.length - 1; i >= 0; i--) {
                    const proj = projectiles[i];
                    proj.trail.push({ x: proj.x, y: proj.y });
                    if (proj.trail.length > PROJECTILE_TRAIL_LENGTH) {
                        proj.trail.shift();
                    }
                    proj.x += proj.vx;
                    proj.y += proj.vy;

                    // Remove off-screen projectiles
                    if (
                        proj.x < -20 ||
                        proj.x > canvas.width + 20 ||
                        proj.y < -20 ||
                        proj.y > canvas.height + 20
                    ) {
                        projectiles.splice(i, 1);
                    }
                }

                // Spawn enemies
                const interval = getSpawnInterval();
                if (frameCount % interval === 0) {
                    spawnEnemy();
                }

                // Move enemies toward player
                for (const enemy of enemies) {
                    const dx = playerX - enemy.x;
                    const dy = playerY - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        enemy.x += (dx / dist) * enemy.speed;
                        enemy.y += (dy / dist) * enemy.speed;
                    }
                }

                checkCollisions();
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                drawBackground();
                drawProjectiles();
                drawEnemies();
                drawPlayer();
                drawAimLine();
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

                    playerX = canvas.width / 2;
                    playerY = canvas.height / 2;

                    // Observe container resize
                    ro = new ResizeObserver(() => {
                        resizeCanvas();
                    });
                    if (canvas.parentElement) {
                        ro.observe(canvas.parentElement);
                    }

                    // Left stick: movement
                    const moveStick = joysticks[0] ?? null;
                    if (moveStick) {
                        moveStick.on('move', (evt) => {
                            moveVX = evt.data.vector.x;
                            moveVY = evt.data.vector.y;
                        });

                        moveStick.on('end', () => {
                            moveVX = 0;
                            moveVY = 0;
                        });

                        moveStick.on('start', () => {
                            onStart();
                        });
                    }

                    // Right stick: aim and shoot
                    const aimStick = joysticks[1] ?? null;
                    if (aimStick) {
                        aimStick.on('move', (evt) => {
                            aimAngle = evt.data.angle.radian;
                            isAiming = true;
                        });

                        aimStick.on('end', () => {
                            isAiming = false;
                            fireCooldown = 0;
                        });

                        aimStick.on('start', () => {
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

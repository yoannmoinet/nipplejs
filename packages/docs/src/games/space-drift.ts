import type { CreateGame, GameInstance, Collection } from './types';

interface Star {
    x: number;
    y: number;
    size: number;
    opacity: number;
    depth: number; // parallax layer: higher = further away = slower scroll
}

interface Waypoint {
    x: number;
    y: number;
    radius: number;
    color: string;
    pulse: number;
    pulseSpeed: number;
}

const BG_COLOR = '#0a0a12';
const SHIP_SIZE = 12;
const SHIP_COLOR = '#a78bfa';
const WAYPOINT_COLORS = ['#22d3ee', '#ec4899', '#818cf8'];
const BASE_SPEED = 2.5;
const SPEED_PER_ORB = 0.15;
const STAR_COUNT = 60;
const WAYPOINT_COUNT = 8;
const WAYPOINT_RADIUS = 10;
const COLLECT_DISTANCE = 22;
const DIRECTION_LINE_LENGTH = 40;

function randomWaypoint(worldW: number, worldH: number): Waypoint {
    return {
        x: (Math.random() - 0.5) * worldW,
        y: (Math.random() - 0.5) * worldH,
        radius: WAYPOINT_RADIUS,
        color: WAYPOINT_COLORS[Math.floor(Math.random() * WAYPOINT_COLORS.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.04 + Math.random() * 0.03,
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
                        restJoystick: false,
                        color: {
                            front: 'linear-gradient(135deg, #a78bfa, #e879f9)',
                            back: 'rgba(167,139,250,0.12)',
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
            const particles: Particle[] = [];
            let shakeTime = 0;
            let flashAlpha = 0;

            let vibrateOk = false;
            function vibrate(ms: number) {
                if (!vibrateOk) {
                    return;
                }
                try {
                    navigator.vibrate?.(ms);
                } catch (_) {
                    /* unsupported */
                }
            }
            function enableVibrate() {
                vibrateOk = !!navigator.vibrate;
                if (vibrateOk) {
                    navigator.vibrate(1);
                }
            }

            function triggerImpact() {
                shakeTime = 8;
                flashAlpha = 0.15;
                vibrate(50);
            }

            function spawnConsume(worldX: number, worldY: number, color: string) {
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 0.5 + Math.random() * 2;
                    particles.push({
                        x: worldX,
                        y: worldY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1,
                        maxLife: 15 + Math.random() * 15,
                        color,
                        radius: 1 + Math.random() * 2,
                    });
                }
            }

            // World-space position (ship is always rendered at center of canvas)
            let shipWorldX = 0;
            let shipWorldY = 0;

            // Velocity persists when joystick is released
            let velocityX = 0;
            let velocityY = 0;
            let currentSpeed = BASE_SPEED;

            // Heading angle for the direction indicator (in radians)
            let heading = 0;
            let hasHeading = false;

            // Game state
            let score = 0;

            // Background stars (world space)
            let stars: Star[] = [];

            // Waypoints (world space)
            let waypoints: Waypoint[] = [];

            let ro: ResizeObserver | null = null;

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

            function initWaypoints() {
                waypoints = [];
                const spread = Math.max(canvas.width, canvas.height) * 2;
                for (let i = 0; i < WAYPOINT_COUNT; i++) {
                    waypoints.push(randomWaypoint(spread, spread));
                }
            }

            function drawBackground() {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw stars with parallax scrolling
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                for (const star of stars) {
                    // Stars offset opposite to ship movement, scaled by depth for parallax
                    const screenX = star.x - shipWorldX * star.depth + centerX;
                    const screenY = star.y - shipWorldY * star.depth + centerY;

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

            function drawWaypoints() {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                for (const wp of waypoints) {
                    wp.pulse += wp.pulseSpeed;
                    const scale = 1 + Math.sin(wp.pulse) * 0.3;
                    const r = wp.radius * scale;

                    const screenX = centerX + (wp.x - shipWorldX);
                    const screenY = centerY + (wp.y - shipWorldY);

                    // Only draw if reasonably close to viewport
                    if (
                        screenX < -50 ||
                        screenX > canvas.width + 50 ||
                        screenY < -50 ||
                        screenY > canvas.height + 50
                    ) {
                        continue;
                    }

                    ctx.save();
                    ctx.shadowBlur = isMobile ? 0 : 14;
                    ctx.shadowColor = wp.color;
                    ctx.fillStyle = wp.color;
                    ctx.globalAlpha = 0.6 + Math.sin(wp.pulse) * 0.3;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner bright core
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 0.3 + Math.sin(wp.pulse) * 0.2;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, r * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawWaypointIndicators() {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const margin = 30; // distance from screen edge

                for (const wp of waypoints) {
                    const screenX = cx + (wp.x - shipWorldX);
                    const screenY = cy + (wp.y - shipWorldY);

                    // Only show indicator for off-screen waypoints
                    if (
                        screenX >= -10 &&
                        screenX <= canvas.width + 10 &&
                        screenY >= -10 &&
                        screenY <= canvas.height + 10
                    ) {
                        continue;
                    }

                    // Direction from center of screen to waypoint
                    const dx = screenX - cx;
                    const dy = screenY - cy;
                    const angle = Math.atan2(dy, dx);

                    // Clamp indicator position to screen edge with margin
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

                    // Distance in world units
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const distLabel =
                        dist < 1000 ? Math.round(dist).toString() : `${(dist / 1000).toFixed(1)}k`;

                    // Draw arrow
                    ctx.save();
                    ctx.translate(edgeX, edgeY);
                    ctx.rotate(angle);

                    ctx.shadowBlur = isMobile ? 0 : 6;
                    ctx.shadowColor = wp.color;
                    ctx.fillStyle = wp.color;
                    ctx.globalAlpha = 0.6;

                    // Arrow triangle
                    ctx.beginPath();
                    ctx.moveTo(8, 0);
                    ctx.lineTo(-4, -5);
                    ctx.lineTo(-4, 5);
                    ctx.closePath();
                    ctx.fill();

                    ctx.rotate(-angle); // unrotate for text

                    // Distance text
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 0.4;
                    ctx.fillStyle = wp.color;
                    ctx.font = '9px JetBrains Mono, monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(distLabel, 0, 16);

                    ctx.restore();
                }
            }

            function drawShip() {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(heading);

                // Triangle pointing in heading direction (right = 0 radians)
                ctx.shadowBlur = isMobile ? 0 : 12;
                ctx.shadowColor = SHIP_COLOR;
                ctx.fillStyle = SHIP_COLOR;
                ctx.beginPath();
                ctx.moveTo(SHIP_SIZE, 0); // nose
                ctx.lineTo(-SHIP_SIZE * 0.6, -SHIP_SIZE * 0.6); // top-left wing
                ctx.lineTo(-SHIP_SIZE * 0.6, SHIP_SIZE * 0.6); // bottom-left wing
                ctx.closePath();
                ctx.fill();

                // Bright core
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ddd6fe';
                ctx.beginPath();
                ctx.moveTo(SHIP_SIZE * 0.5, 0);
                ctx.lineTo(-SHIP_SIZE * 0.2, -SHIP_SIZE * 0.25);
                ctx.lineTo(-SHIP_SIZE * 0.2, SHIP_SIZE * 0.25);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            function drawDirectionIndicator() {
                if (!hasHeading) {
                    return;
                }

                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                const endX = cx + Math.cos(heading) * DIRECTION_LINE_LENGTH;
                const endY = cy + Math.sin(heading) * DIRECTION_LINE_LENGTH;

                ctx.save();
                const gradient = ctx.createLinearGradient(cx, cy, endX, endY);
                gradient.addColorStop(0, 'rgba(167, 139, 250, 0.4)');
                gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(endX, endY);
                ctx.stroke();
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
                const spread = Math.max(canvas.width, canvas.height) * 2;
                for (let i = 0; i < waypoints.length; i++) {
                    const wp = waypoints[i];
                    const dx = shipWorldX - wp.x;
                    const dy = shipWorldY - wp.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < COLLECT_DISTANCE) {
                        spawnConsume(wp.x, wp.y, wp.color);
                        triggerImpact();
                        score++;
                        currentSpeed = BASE_SPEED + score * SPEED_PER_ORB;
                        waypoints[i] = randomWaypoint(spread, spread);
                        // Offset new waypoint away from ship so it doesn't spawn on top
                        const angle = Math.random() * Math.PI * 2;
                        const minDist = 150 + Math.random() * 200;
                        waypoints[i].x = shipWorldX + Math.cos(angle) * minDist;
                        waypoints[i].y = shipWorldY + Math.sin(angle) * minDist;
                    }
                }
            }

            function update() {
                // Move ship in world space — velocity persists even after joystick release
                shipWorldX += velocityX * speedScale;
                shipWorldY += velocityY * speedScale;

                checkCollisions();

                // Update particles (world space)
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= 0.94;
                    p.vy *= 0.94;
                    p.life -= 1 / p.maxLife;
                    if (p.life <= 0) {
                        particles.splice(i, 1);
                    }
                }
            }

            function drawParticles() {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                for (const p of particles) {
                    const sx = centerX + (p.x - shipWorldX);
                    const sy = centerY + (p.y - shipWorldY);
                    ctx.save();
                    ctx.globalAlpha = p.life * 0.8;
                    ctx.shadowBlur = isMobile ? 0 : 10;
                    ctx.shadowColor = p.color;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(sx, sy, p.radius * p.life, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                ctx.save();
                if (shakeTime > 0) {
                    const si = shakeTime / 8;
                    ctx.translate((Math.random() - 0.5) * 6 * si, (Math.random() - 0.5) * 6 * si);
                    shakeTime--;
                }

                drawBackground();
                drawWaypoints();
                drawParticles();
                drawWaypointIndicators();
                drawDirectionIndicator();
                drawShip();
                drawScore();

                if (flashAlpha > 0) {
                    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    flashAlpha *= 0.8;
                    if (flashAlpha < 0.01) {
                        flashAlpha = 0;
                    }
                }

                ctx.restore();

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

                    // Initialize game state
                    shipWorldX = 0;
                    shipWorldY = 0;

                    initStars();
                    initWaypoints();

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
                        joystick.on('start', () => {
                            enableVibrate();
                        });
                        joystick.on('move', (evt) => {
                            velocityX = evt.data.vector.x * currentSpeed;
                            velocityY = -evt.data.vector.y * currentSpeed;

                            heading = Math.atan2(velocityY, velocityX);
                            hasHeading = true;
                        });

                        // Do NOT zero velocity on end — that's the whole point of restJoystick: false
                        // The joystick stays in place, so velocity persists.
                        joystick.on('end', () => {
                            // Velocity persists — ship keeps drifting
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
                    particles.length = 0;
                    stars.length = 0;
                    waypoints.length = 0;
                },
            };
        },
    };
};

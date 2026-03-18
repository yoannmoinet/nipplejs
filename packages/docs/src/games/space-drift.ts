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
const SPEED_FACTOR = 2.5;
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
                        color: 'rgba(167,139,250,0.5)',
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

            // World-space position (ship is always rendered at center of canvas)
            let shipWorldX = 0;
            let shipWorldY = 0;

            // Velocity persists when joystick is released
            let velocityX = 0;
            let velocityY = 0;

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
                    ctx.shadowBlur = 14;
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

            function drawShip() {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(heading);

                // Triangle pointing in heading direction (right = 0 radians)
                ctx.shadowBlur = 12;
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
                        score++;
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
                shipWorldX += velocityX;
                shipWorldY += velocityY;

                checkCollisions();
            }

            function render() {
                if (destroyed) {
                    return;
                }

                update();

                drawBackground();
                drawWaypoints();
                drawDirectionIndicator();
                drawShip();
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
                        joystick.on('move', (_evt, data) => {
                            if (data.vector) {
                                const vx = data.vector.x;
                                const vy = -data.vector.y; // invert Y: joystick up = negative canvas Y
                                const force = data.force ?? 1;

                                velocityX = vx * force * SPEED_FACTOR;
                                velocityY = vy * force * SPEED_FACTOR;

                                // Update heading from movement direction
                                heading = Math.atan2(velocityY, velocityX);
                                hasHeading = true;
                            }
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

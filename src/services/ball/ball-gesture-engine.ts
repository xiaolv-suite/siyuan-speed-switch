import {
    normalizeFloatingBallPosition,
    clampFloatingBallPosition,
    snapFloatingBallPosition,
} from "../../floating-ball-model";
import type { FloatingBallPosition } from "./types";

export function clampPosition(position: Partial<FloatingBallPosition>): FloatingBallPosition {
    return clampFloatingBallPosition(position as any) as FloatingBallPosition;
}

export function computeSnapEdge(x: number, viewportWidth: number): "left" | "right" {
    return x < viewportWidth / 2 ? "left" : "right";
}

export function computeYRatio(y: number, viewportHeight: number, ballHeight: number = 44): number {
    const usableHeight = Math.max(1, viewportHeight - ballHeight);
    const clampedY = Math.max(0, Math.min(y, usableHeight));
    return Math.round((clampedY / usableHeight) * 1000) / 1000;
}

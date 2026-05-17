/**
 * Minimal ambient types for `clipper-lib` (ships no types of its own).
 * We only use ClipperOffset for outward polygon offsetting.
 */
declare module "clipper-lib" {
  export interface IntPoint {
    X: number;
    Y: number;
  }
  export type Path = IntPoint[];
  export type Paths = Path[];

  export const JoinType: {
    jtSquare: number;
    jtRound: number;
    jtMiter: number;
  };
  export const EndType: {
    etClosedPolygon: number;
    etClosedLine: number;
    etOpenButt: number;
    etOpenSquare: number;
    etOpenRound: number;
  };

  export class ClipperOffset {
    constructor(miterLimit?: number, roundPrecision?: number);
    AddPath(path: Path, joinType: number, endType: number): void;
    AddPaths(paths: Paths, joinType: number, endType: number): void;
    Execute(solution: Paths, delta: number): void;
    Clear(): void;
  }

  const ClipperLib: {
    IntPoint: new (x: number, y: number) => IntPoint;
    Path: new () => Path;
    Paths: new () => Paths;
    JoinType: typeof JoinType;
    EndType: typeof EndType;
    ClipperOffset: typeof ClipperOffset;
  };
  export default ClipperLib;
}

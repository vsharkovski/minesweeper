import { Cell } from './cell';

export enum Status {
    NotStarted = 0,
    Playing,
    Victory,
    Loss,
}

export interface State {
    status: Status;
    rows: number;
    columns: number;
    bombs: number;
    flags: number;
    cellsRevealed: number;
    elapsedTime: number;
    board: Cell[][];
}

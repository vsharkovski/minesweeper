import { Cell } from './cell';

export interface State {
    boardRows: number;
    boardColumns: number;
    bombsTotal: number;
    bombsRemaining: number;
    elapsedTime: number;
    board: Cell[][];
}

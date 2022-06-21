import { Position } from 'src/position';

export interface Cell {
    position: Position;
    revealed: boolean;
    bomb: boolean;
    flag: boolean;
    adjacentBombs: number;
}

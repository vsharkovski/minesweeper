import { getSafePropertyAccessString } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { Cell } from '../cell';
import { GameService } from '../game.service';
import { State } from '../state';

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
    state!: State;
    cells: Cell[] = [];

    constructor(private gameService: GameService) {}

    ngOnInit(): void {
        this.getState();
    }

    getState(): void {
        this.processState(this.gameService.getPlaceholderState());
        this.gameService.getState().subscribe({
            next: (newState) => this.processState(newState),
        });
    }

    processState(state: State): void {
        console.log('GameComponent processing state', state);
        this.state = state; // {...state}
        this.cells = state.board.flat();
    }

    start(): void {
        this.gameService.start();
    }

    getCellSymbol(cell: Cell): string {
        if (cell.revealed) {
            if (cell.bomb) {
                return 'X';
            } else if (cell.adjacentBombs == 0) {
                return '.';
            } else {
                return cell.adjacentBombs.toString();
            }
        } else {
            if (cell.flag) {
                return 'F';
            } else {
                return '-';
            }
        }
    }

    onClick(row: number, column: number, isLeft: boolean): void {
        this.gameService.click(row, column, isLeft);
    }
}

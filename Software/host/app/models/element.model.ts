﻿import { KeyModel } from './index';

export class AddToFavoritesModel {
    add: boolean;
    ids: number[];
}


/**
 * Модель. Элемент схемы
 */
export class ElementModel extends KeyModel {
    
    selected: boolean = false;

    image: File;
    name: string;

    height?: number;
    width?: number;

    constructor() {
        super();
        
        this.name = undefined;
        this.height = 1;
        this.width = 1;
    }
}
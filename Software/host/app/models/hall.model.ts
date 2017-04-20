﻿import { KeyModel } from './index';
import { JsonProperty } from '../common/map-utils';

/**
 * Модель. Схема холла
 */
export class SchemeModel extends KeyModel {
    name: string;

    constructor() {
        super();

        this.name = undefined;
    }
}

/**
 * Модель. Конференц-холл
 */
export class HallModel extends KeyModel {
   
    name: string;
    description?: string;
    height?: number;
    width?: number;

    @JsonProperty({ clazz: SchemeModel })
    schemes?: SchemeModel[];

    constructor() {

        super();
        
        this.name = undefined;
        this.description = undefined;
        this.height = undefined;
        this.width = undefined;
        this.schemes = undefined;
    }

    public area = (): string => `(Размеры: ${this.width}м x ${this.height}м)`;
}
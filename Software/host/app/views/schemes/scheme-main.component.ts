﻿import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectItem } from 'primeng/primeng';
import { Logger } from "../../common/logger";
import { Mediator } from "../../common/mediator";
import { borderClass, frameClass, lineClass, markClass, shapeClass, Point } from "../../common/ui/svg-utils";
import { ElementModel, SchemeModel } from "../../models";
import { SchemeService } from "./scheme.service";

const zoomStep = 0.1;

@Component({
    host: {'(window:keydown)': "onKeyDown($event)",
           '(window:resize)' : "onResize($event)" },
    selector: 'scheme-main',
    styleUrls: ["scheme-main.component.css"],
    templateUrl: 'scheme-main.component.html'
})
export class SchemeMainComponent implements AfterViewInit, OnDestroy, OnInit {
    
    canvas: any;
    canvasBox: any;

    clickPoint: Point;                              // захват точки canvas'a (для перемещения)
    svgOrigin: Point;                               // начало координат canvas/element (для перемещения)

    gridInterval: number;
    initialHeight: number;
    initialWidth: number;

    zoomCoef: number;                               // коэф. масштабирования [0..1]

    // event listeners with [this] scope
    canvasMouseDownBind: Function = this.canvasMouseDown.bind(this);
    canvasMouseMoveBind: Function = this.canvasMouseMove.bind(this);
    canvasMouseUpBind: Function = this.canvasMouseUp.bind(this);

    // ReSharper disable InconsistentNaming
    private _schemeId: number;

    get schemeId(): number {
        return this._schemeId;
    }

    @Input()
    set schemeId(value: number) {
        this._schemeId = value;
        value ? this.loadScheme() : this.clearCanvas();
    }

// ReSharper disable once InconsistentNaming
    private _svgElement: any = null;                // selected svgElement

    get svgElement() {
        return this._svgElement;
    }
    set svgElement(value: any) {
        
        // снять все ранее выделенные объекты
        let frames = this.canvas.querySelectorAll(`.${frameClass}`);
        [].forEach.call(frames,
            frame => frame.removeAttributeNS(null, "stroke"));

        if (!!value) {

            this.router
                .navigate(['shape'], { relativeTo: this.route })
                .then(_ => this.mediator.broadcast("schemeMain_shapeSelected", value));

            // выделить
            let frame = value.querySelector(`.${frameClass}`);
            if (frame != null)
                frame.setAttributeNS(null, "stroke", "blue");
        }
        else 
            this.router
                .navigate(["groups"], { relativeTo: this.route })
                .then(_ => this.mediator.broadcast("schemeMain_shapeSelected", value));
        

        this._svgElement = value;
    }

    schemeForm: FormGroup;
    schemeFormVisible: boolean;
    intervals: SelectItem[];

    @Input()
    readOnly: boolean = true;             

    @Output()
    schemeLoaded: EventEmitter<any> = new EventEmitter<any>();

    @ViewChild('canvasBox')
    canvasBoxElRef: ElementRef;

    @ViewChild('wrapper')
    wrapperElRef: ElementRef;

    constructor(
        private fb: FormBuilder,
        private logger: Logger,
        private mediator: Mediator,
        private route: ActivatedRoute,
        private router: Router,
        private schemeService: SchemeService) {

        this.intervals = [
            { label: "Нет", value: 0 },
            { label: "1", value: 1 },
            { label: "0.5", value: 0.5 },
            { label: "0.25", value: 0.25 },
            { label: "0.1", value: 0.1 }
        ];
    }
  
    get removeButtonDisabled(): boolean {
        return (this.svgElement == null);
    }

    ngAfterViewInit() {
        this.onResize();
    }

    ngOnInit() {
        
        this.schemeForm = this.fb.group({
            id: [null],
            name: [null, Validators.required]
        });

        this.canvasBox = this.canvasBoxElRef.nativeElement;
    }

    ngOnDestroy() {

        if (this.canvas) {
            
            this.canvas.removeEventListener("mousedown", this.canvasMouseDownBind);
            this.canvas.removeEventListener("mousemove", this.canvasMouseMoveBind);
            this.canvas.removeEventListener("mouseup", this.canvasMouseUpBind);
        }
    }

    onKeyDown(e) {
        
        if (e.target.nodeName.toLowerCase() === "input")
            return;

        // delete key
        e.keyCode === 46 && this.svgElement != null && this.shapeRemove();
    }

    onResize() {
        let offsetTop = this.readOnly ? 0 : this.canvasBox.offsetTop;
        this.canvasBox.style.height = `${this.wrapperElRef.nativeElement.offsetHeight - offsetTop}px`;
    }

    /**
     * Добавить метку
     */
    addMark() {

        let g = document.createElementNS(this.canvas.namespaceURI, "g"),
            r = 15;

        g.setAttribute("class", markClass);
        g.setAttributeNS(null, "transform", "translate(100, 100)");

        // размеры в см
        let circle = document.createElementNS(this.canvas.namespaceURI, "ellipse");
        
        circle.setAttributeNS(null, "rx", `${r}`);
        circle.setAttributeNS(null, "ry", `${r}`);
        
        g.appendChild(circle);

        let text = document.createElementNS(this.canvas.namespaceURI, "text"),
            code = this.canvas.querySelectorAll(`g.${markClass}`).length + 1;
        
        text.textContent = code;

        // font-size = 1.2 * радиуса
        text.setAttribute("font-size", `${r * 1.2}`);
        text.setAttributeNS(null, "dy", `${r * 0.36}`);

        g.appendChild(text);
        g.setAttribute("data-code", code);

        this.canvas.appendChild(g);
        this.svgElement = g;
    }

    getMarkCodes() {
        
        let codes: string[] = [],
            marks = this.canvas.querySelectorAll(`g.${markClass}`);

        if (marks) {
            [].forEach.call(marks, m => {

                let code = m.getAttribute("data-code"),
                    ix = codes.indexOf(code);

                (ix === -1) && codes.push(code);
            });    
        }

        return codes.sort();
    }

    toggleMark(code, force?: boolean) {
        
        if (this.canvas != null) {

            let marks = this.canvas.querySelectorAll(`g.${markClass}[data-code="${code}"`);
            
            if (marks) {
                [].forEach.call(marks, m => m.classList.toggle("on", force));
            }
        }

    }

    canvasMouseDown(e) {
        
        e.stopPropagation();

        if (e.buttons === 1) {

            this.clickPoint = new Point(e.clientX, e.clientY);
            
            // выбор shape
            if (e.target.parentNode.nodeName === "g") {
                this.svgElement = e.target.parentNode;

                // на передний план --> вставка перед метками
                let firstMark = this.canvas.querySelector(`g.${markClass}`);
                this.canvas.insertBefore(this.svgElement, firstMark);
                
                let x = 0, y = 0,
                    baseVal: SVGTransformList = this.svgElement.transform.baseVal;

                for (let ix  = 0; ix < baseVal.numberOfItems; ix++) {

                    let t = baseVal.getItem(ix);
                    if (t.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {

                        x = t.matrix.e;
                        y = t.matrix.f;
                        break;
                    }
                }

                this.svgOrigin = new Point(x, y);
            }
            // выбор canvas
            else {
                this.svgElement = null;
                this.svgOrigin = new Point(this.canvas.viewBox.baseVal.x, this.canvas.viewBox.baseVal.y);
            }
        }
    }

    canvasMouseMove(e) {

        e.preventDefault();
        
        if (e.buttons === 1) {
            
            let clickPt = this.canvas.createSVGPoint(),
                pt: SVGPoint = this.canvas.createSVGPoint();

            clickPt.x = this.clickPoint.x;
            clickPt.y = this.clickPoint.y;

            // трансформация здесь --> т.к. уже изменился viewbox
            clickPt = clickPt.matrixTransform(this.canvas.getScreenCTM().inverse());

            pt.x = e.clientX;
            pt.y = e.clientY;

            pt = pt.matrixTransform(this.canvas.getScreenCTM().inverse());

            // перемещение shape
            if (this.svgElement !== null) {
                
                let attr = [],
                    baseVal: SVGTransformList = this.svgElement.transform.baseVal;

                for (let ix = 0; ix < baseVal.numberOfItems; ix++) {

                    let t = baseVal.getItem(ix);

                    switch (t.type) {
                        
                        case SVGTransform.SVG_TRANSFORM_TRANSLATE:
                            attr.push(`translate(${this.svgOrigin.x + pt.x - clickPt.x} ${this.svgOrigin.y + pt.y - clickPt.y})`);
                            break;
                            
                        case SVGTransform.SVG_TRANSFORM_ROTATE:

                            let box = this.svgElement.getBBox();

                            this.svgElement.classList.contains(shapeClass)
                                ? attr.push(`rotate(${t.angle} ${box.width / 2} ${box.height / 2})`)
                                : attr.push(`rotate(${t.angle})`);

                            break;
                        
                    }
                }

                this.svgElement.setAttributeNS(null, "transform", attr.join(" "));
            }
            // перемещение canvas'a
            else {
                let vbox = this.canvas.viewBox.baseVal;
                this.canvas.setAttribute("viewBox", `${this.svgOrigin.x - pt.x + clickPt.x} ${this.svgOrigin.y - pt.y + clickPt.y} ${vbox.width} ${vbox.height}`);
            }
        }
    }

    canvasMouseUp(e) {
        
        e.preventDefault();
        
        if (e.which === 1) {

            if (this.svgElement !== null && this.svgElement.classList.contains(shapeClass)) {

                let attr = [],
                    baseVal: SVGTransformList = this.svgElement.transform.baseVal;

                for (let ix = 0; ix < baseVal.numberOfItems; ix++) {

                    let t = baseVal.getItem(ix),
                        m: SVGMatrix = t.matrix;

                    switch (t.type) {
                            
                        case SVGTransform.SVG_TRANSFORM_TRANSLATE:

                            let tx = m.e,
                                ty = m.f;

                            // позиционирование по сетке
                            if (this.gridInterval > 0) {
                                let int = this.gridInterval * 100;              // размеры в см

                                tx = Math.round(tx / int) * int;
                                ty = Math.round(ty / int) * int;
                            }
                            attr.push(`translate(${tx} ${ty})`);

                            break;
                            
                        case SVGTransform.SVG_TRANSFORM_ROTATE:

                            let box = this.svgElement.getBBox();

                            this.svgElement.classList.contains(shapeClass)
                                ? attr.push(`rotate(${t.angle} ${box.width / 2} ${box.height / 2})`)
                                : attr.push(`rotate(${t.angle})`);

                            break;
                    }
                }
                    
                this.svgElement.setAttributeNS(null, "transform", attr.join(" "));
            }
        }
    }

    /**
     * Установить схему по центру 
     */
    centerView = () => {
        this.canvas.setAttribute("viewBox", `0 0 ${this.initialWidth} ${this.initialHeight}`);
        this.zoomCoef = 1;
    };

    clearCanvas() {

        if (this.canvasBox) {
            while (this.canvasBox.firstChild)
                this.canvasBox.removeChild(this.canvasBox.firstChild);
        }
    }

    private createPattern(id, h:number, w:number) {
        
        let pattern = this.canvas.querySelector(`#_${id}`);

        if (pattern == null) {
            pattern = document.createElementNS(this.canvas.namespaceURI, "pattern");
            pattern.setAttribute("id", `_${id}`);
            
            pattern.setAttributeNS(null, "height", "1");
            pattern.setAttributeNS(null, "width", "1");
            pattern.setAttributeNS(null, "viewBox", `0 0 ${w} ${h}`);

            const image = document.createElementNS(this.canvas.namespaceURI, "image");
            // размеры в см
            image.setAttributeNS(null, "height", `${h}`);
            image.setAttributeNS(null, "width", `${w}`);
            image.setAttributeNS("http://www.w3.org/1999/xlink", "href", `/api/shape/${id}/false`);

            pattern.appendChild(image);

            this.canvas.insertBefore(pattern, this.canvas.firstChild);
        }
    }

    /**
     * Рисовать границы viewBox'a
     */
    drawBorder() {
        const rect = document.createElementNS(this.canvas.namespaceURI, "rect");

        rect.setAttribute("class", borderClass);

        rect.setAttributeNS(null, "x", "0");
        rect.setAttributeNS(null, "y", "0");
        rect.setAttributeNS(null, "width", `${this.initialWidth}`);
        rect.setAttributeNS(null, "height", `${this.initialHeight}`);

        rect.setAttributeNS(null, "fill", "none");
        rect.setAttributeNS(null, "stroke", "black");
        rect.setAttributeNS(null, "stroke-width", "1");
        
        this.canvas.insertBefore(rect, this.canvas.firstChild);
    }

    /**
     * Рисовать сетку с шагом {interval}
     * @param interval
     */
    drawGrid() {

        if (this.gridInterval > 0) {

            let i,
                line: HTMLElement,
                int = this.gridInterval * 100; // размеры в см

            const style = {
                "stroke": "rgb(0, 0, 0)",
                "stroke-width": "0.25"
            };

            // горизонтальные линии
            for (i = 0; i <= this.initialHeight; i += int) {
                line = document.createElementNS(this.canvas.namespaceURI, "line");
                line.setAttribute("class", lineClass);

                line.setAttributeNS(null, "x1", "0");
                line.setAttributeNS(null, "y1", i);
                line.setAttributeNS(null, "x2", `${this.initialWidth}`);
                line.setAttributeNS(null, "y2", i);

                for (let key in style) {
                    if (style.hasOwnProperty(key)) {
                        line.setAttributeNS(null, key, style[key]);
                    }
                }

                this.canvas.insertBefore(line, this.canvas.firstChild);
            }

            // вертикальные линии
            for (i = 0; i <= this.initialWidth; i += int) {
                line = document.createElementNS(this.canvas.namespaceURI, "line");
                line.setAttribute("class", lineClass);

                line.setAttributeNS(null, "x1", i);
                line.setAttributeNS(null, "y1", "0");
                line.setAttributeNS(null, "x2", i);
                line.setAttributeNS(null, "y2", `${this.initialHeight}`);

                for (let key in style) {
                    if (style.hasOwnProperty(key)) {
                        line.setAttributeNS(null, key, style[key]);
                    }
                }
                
                this.canvas.insertBefore(line, this.canvas.firstChild);
            }
        }
    }

    drop(e) {
        // ie supports only text data format
        let data = JSON.parse(e.dataTransfer.getData("text")),
            element: ElementModel = data.element,
            offset: Point = data.offset,
            id = element.id,
            // размеры в см
            h = element.height * 100,
            w = element.width * 100;

        this.createPattern(id, h, w);

        let g = document.createElementNS(this.canvas.namespaceURI, "g");

        g.setAttribute("class", shapeClass);
        g.setAttribute("data-id", `${id}`);         // id шаблона
        g.setAttribute("data-name", element.name);

        let pt = this.canvas.createSVGPoint();
        pt.x = e.clientX - offset.x;
        pt.y = e.clientY - offset.y;

        pt = pt.matrixTransform(this.canvas.getScreenCTM().inverse());

        if (this.gridInterval > 0) {
            let int = this.gridInterval * 100; // размеры в см

            pt.x = Math.round(pt.x / int) * int;
            pt.y = Math.round(pt.y / int) * int;
        }

        g.setAttributeNS(null, "transform", `translate(${pt.x}, ${pt.y})`);

        let rect = document.createElementNS(this.canvas.namespaceURI, "rect");
        rect.setAttribute("class", frameClass);

        rect.setAttributeNS(null, "height", `${h}`);
        rect.setAttributeNS(null, "width", `${w}`);
        rect.setAttributeNS(null, "fill", `url(#_${id})`);

        g.appendChild(rect);

        // вставка перед метками
        let firstMark = this.canvas.querySelector(`g.${markClass}`);
        this.canvas.insertBefore(g, firstMark);
    }

    intervalChange = _ => {
        // удалить старую сетку
        let lines = this.canvas.querySelectorAll(`line.${lineClass}`);
        [].forEach.call(lines, (line) => this.canvas.removeChild(line));

        this.drawGrid();
    };

    loadScheme() {

        this.schemeService
            .get(this.schemeId)
            .subscribe((scheme: SchemeModel) => {

                this.clearCanvas();

                this.canvasBox.insertAdjacentHTML("beforeend", scheme.plan);
                this.gridInterval = scheme.gridInterval || 0;
                // размеры в см
                this.initialHeight = scheme.height * 100;
                this.initialWidth = scheme.width * 100;

                this.canvas = this.canvasBox.querySelector("svg");

                if (this.canvas != null) {
                    this.canvas.style.height = this.canvas.style.width = "100%";

                    this.centerView();

                    if (!this.readOnly) {
                        this.drawBorder();
                        this.drawGrid();
                        
                        this.canvas
                            .addEventListener("mousedown", this.canvasMouseDownBind);

                        this.canvas
                            .addEventListener("mousemove", this.canvasMouseMoveBind);

                        this.canvas
                            .addEventListener("mouseup", this.canvasMouseUpBind);
                    }
                }
                    
                this.schemeForm.patchValue(scheme);
                this.schemeLoaded.emit(this.canvas);
            },
            error => this.logger.error2(error));
    }

    save(scheme) {
       
        let svg = this.canvas.cloneNode(true);
        
        // сохраняется начальный план (без трансформации)
        while (svg.attributes.length > 0)
            svg.removeAttribute(svg.attributes[0].name);

        svg.setAttribute("viewbox", `0 0 ${this.initialWidth} ${this.initialHeight}`);

        // сетку и границу не нужно сохранять
        let lines = svg.querySelectorAll(`line.${lineClass}`);
        [].forEach.call(lines, (line) => svg.removeChild(line));
        
        let box = svg.querySelector(`rect.${borderClass}`);
        svg.removeChild(box);

        // снять все ранее выделенные объекты
        let frames = svg.querySelectorAll(`.${frameClass}`);
        [].forEach.call(frames,
            frame => frame.removeAttributeNS(null, "stroke"));
        
        scheme.plan = svg.outerHTML || new XMLSerializer().serializeToString(svg);

        this.schemeService
            .update(scheme)
            .subscribe(
                _ => this.logger.info("Ok"),
                error => this.logger.error2(error));
    }

    /**
     * Клонировать элемент схемы
     */
    shapeClone() {
        
        let clone = this.svgElement.cloneNode(true);
      
        let attr = [],
            baseVal: SVGTransformList = this.svgElement.transform.baseVal;

        for (let ix = 0; ix < baseVal.numberOfItems; ix++) {

            let t = baseVal.getItem(ix);
            switch (t.type) {
                            
                case SVGTransform.SVG_TRANSFORM_TRANSLATE:

                    let vbox = this.canvas.viewBox.baseVal,
                        x = vbox.x, y = vbox.y;

                    // для меток (ellipse) центр смещается на r
                    if (this.svgElement.classList.contains(markClass))
                    {
                        let box = this.svgElement.getBBox();

                        x += box.width / 2;
                        y += box.height / 2;
                    }
                         
                    attr.push(`translate(${x} ${y})`);

                    break;
                            
                case SVGTransform.SVG_TRANSFORM_ROTATE:

                    let box = this.svgElement.getBBox();
                    attr.push(`rotate(${t.angle} ${box.width / 2} ${box.height / 2})`);

                    break;
            }
        }

        clone.setAttributeNS(null, "transform", attr);

        // вставка перед метками
        let firstMark = this.canvas.querySelector(`g.${markClass}`);
        this.canvas.insertBefore(clone, firstMark);

        this.svgElement = clone;
    }
    
    shapeRemove() {
        
        let id = this.svgElement.getAttribute("data-id");
        if (id) {
            let groups = this.canvas.querySelectorAll(`g[data-id="${id}"]`);

            // больше никто не использует шаблон --> можно удалить
            if (groups.length === 1) {
                let pattern = this.canvas.querySelector(`pattern[id="_${id}"]`);
                this.canvas.removeChild(pattern);
            }
        }

        this.canvas.removeChild(this.svgElement);
        this.svgElement = null;
    }

    shapeRotate(angle) {

        let alpha = 0,
            attr = [],
            baseVal: SVGTransformList = this.svgElement.transform.baseVal;
        
        for (let ix = 0; ix < baseVal.numberOfItems; ix++) {

            let t = baseVal.getItem(ix);

            switch (t.type) {

                case SVGTransform.SVG_TRANSFORM_TRANSLATE:
                    attr.push(`translate(${t.matrix.e} ${t.matrix.f})`);
                    break;

                case SVGTransform.SVG_TRANSFORM_ROTATE:

                    alpha = t.angle;
                    break;

            }
        }

        alpha += angle;
        
        if (alpha !== 0.0) {
            let box = this.svgElement.getBBox();

            this.svgElement.classList.contains(shapeClass)
                ? attr.push(`rotate(${alpha} ${box.width / 2} ${box.height / 2})`)
                : attr.push(`rotate(${alpha})`);
        }

        this.svgElement.setAttributeNS(null, "transform", attr.join(" "));
        this.mediator.broadcast("schemeMain_shapeSelected", this.svgElement);
    }


    /**
     * Масштабирование
     * @param enlarge - увеличение/уменьшение
     */
    zoom(enlarge:boolean = true) {

        let x = this.canvas.viewBox.baseVal.x,
            y = this.canvas.viewBox.baseVal.y;

        if (enlarge) {
            
            if (this.zoomCoef > 0.1) {
                x += this.initialWidth * zoomStep / 2;
                y += this.initialHeight * zoomStep / 2;
            }

            this.zoomCoef = Math.max(0.1, this.zoomCoef - zoomStep);        // max увеличение в 10 раз!
        }
        else {
            
            if (this.zoomCoef < 1) {
                x -= this.initialWidth * zoomStep / 2;
                y -= this.initialHeight * zoomStep / 2;
            }

            this.zoomCoef = Math.min(1, this.zoomCoef + zoomStep);    
        }

        this.canvas.setAttribute("viewBox", `${x} ${y} ${Math.round(this.initialWidth * this.zoomCoef)} ${Math.round(this.initialHeight * this.zoomCoef)}`);
    }
}
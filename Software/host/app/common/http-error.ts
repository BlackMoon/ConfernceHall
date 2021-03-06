﻿import { isDevMode } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Message } from 'primeng/primeng';

/**
 * Функция получения ошибки из http.Response
 * @param error
 */
export function handleResponseError(error: Response | any): ErrorObservable {
   
    let errMsg: Message = { };
    if (error instanceof Response) {

        let body;

        try {
            body = error.json() || "";
        } catch (e) {
            body = error.text();
        }

        if (body instanceof Object) {

            if (body.hasOwnProperty("message")) {
                errMsg.summary = body.message;
                errMsg.detail = body.detail;
            } else {
                const err = body.error || JSON.stringify(body);
                errMsg.summary = error.status.toString();
                errMsg.detail = `${error.statusText || ""} ${err}`;
            }
        } else
            errMsg.summary = body;
    }
    else
        errMsg.detail = error.message ? error.message : error.toString();

    isDevMode() && console.error(errMsg);
    return Observable.throw(errMsg);
}
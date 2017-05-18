﻿import { Injectable, isDevMode } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs';
import { handleResponseError } from '../../common/http-error';
import { HttpDataService } from '../../common/data-service';
import { SchemeModel } from '../../models';


@Injectable()
export class SchemeService extends HttpDataService<SchemeModel> {
    
    url = isDevMode() ? "http://localhost:64346/api/schemes" : "/api/schemes";

    constructor(http: Http) { super(http); }

    /**
     * Добавить/убрать из избранного
     */
    copy(key): Observable<any> {

        return this.http
            .post(`/api/schemes/copy`, key)
            .catch(handleResponseError);
    }
}
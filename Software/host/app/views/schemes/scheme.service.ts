﻿import { Injectable, isDevMode } from '@angular/core';
import { Http, Response, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs';
import { handleResponseError } from '../../common/http-error';
import { HttpDataService } from '../../common/http-data.service';
import { SchemeModel } from '../../models';
import MapUtils from '../../common/map-utils';

@Injectable()
export class SchemeService extends HttpDataService<SchemeModel> {
    
    url = isDevMode() ? "http://localhost:64346/api/schemes" : "/api/schemes";

    constructor(http: Http) { super(http); }

    /**
     * Копировать схему
     */
    copy(key): Observable<any> {

        return this.http
            .post(`${this.url}/copy`, key)
            .map((r: Response) => r.json())
            .catch(handleResponseError);
    }

    getAll(hallId: number): Observable<any> {

        let params: URLSearchParams = new URLSearchParams();
        params.append("hallId", hallId.toString());

        return this.http
            .get(this.url, { params: params })
            .map((r: Response) => r
                .json()
                .map(el => MapUtils.deserialize(SchemeModel, el))
            )
            .catch(handleResponseError);
    }

    /**
     * Удаляет схемы
     * @param ids
     */
    delete(ids: number[]): Observable<any> {

        let c = { ids: ids };

        return this.http
            .post(`${this.url}/delete`, c)
            .catch(handleResponseError);
    }
}
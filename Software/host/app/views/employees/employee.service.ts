﻿import { Injectable, isDevMode } from '@angular/core';
import { Http, Headers, RequestOptions, Response, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs';
import { handleResponseError } from '../../common/http-error';
import { HttpDataService } from '../../common/http-data.service';
import { EmployeeModel } from '../../models';

import MapUtils from '../../common/map-utils';

@Injectable()
export class EmployeeService extends HttpDataService<EmployeeModel> {

    url: string = isDevMode() ? "http://localhost:64346/api/employees" : "api/employees";

    constructor(http: Http) { super(http); }

    get(key): Observable<any> {
        
        return this.http
            .get(`${this.url}/${key}`)
            .map((r: Response) => MapUtils.deserialize(EmployeeModel, r.json()))
            .catch(handleResponseError);
    }

    /**
     * Найти сотрудников (всех / только по конференции)
     * @param confId 
     */
    getAll(confId?:number): Observable<any>
    {
        let params: URLSearchParams = new URLSearchParams();

        confId && params.append("confId", confId.toString());

        return this.http
            .get(this.url, { params: params })
            .map((r: Response) => r.json())
            .catch(handleResponseError);
    }
}
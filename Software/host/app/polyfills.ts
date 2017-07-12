﻿import 'classlist-polyfill';
import 'core-js/es6';
import 'core-js/es7/reflect';
import 'intl';
import 'intl/locale-data/jsonp/en.js'
import 'reflect-metadata';
import 'zone.js/dist/zone';

if (process.env.ENV === 'production') {
    // Production
} else {
    // Development
    Error['stackTraceLimit'] = Infinity;
    require('zone.js/dist/long-stack-trace-zone');
}
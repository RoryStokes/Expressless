const ConcatStream = require('concat-stream');
const _ = require('lodash/fp');
const binaryCase = require('binary-case');
const cookie = require('cookie');
const mime = require('mime-types');

class Response extends ConcatStream {
    constructor() {
        const onEnd = (body) => {
            this.finished = true;
            this.headersSent = !_.isEmpty(this.headers);
            this.resolve({
                statusCode: this.statusCode,
                body,
                headers: this.getAwsHeaders()
            });
        };

        super(onEnd);

        this.awaitBody = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });

        this.finished = false;
        this.headersSent = false;
        this.headers = {};
        this.statusCode = 200;
        this.locals = {};
    }

    getAwsHeaders() {
        console.log(this.headers)
        return _.flow(
            _.flatMap.convert({ 'cap': false })((values, key) => {
                console.log(values, key)
                if(_.isArray(values)) {
                    console.log(key);
                    const max = binaryCase.maxNumber(key);
                    if(values.length > max) {
                        throw Error(`Too many headers provided for [${key}]. Due to lambda limitations, only ${max} values can be provided for a header of this length.`)
                    }
                    return _.map.convert({ 'cap': false })((value, i) => [binaryCase(key, i), value])(values)
                }
                else {
                    return [[key, values]];
                }
            }),
            _.fromPairs
        )(this.headers);
    }

    writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        if(_.isObject(headers)) {
            Object.assign(this.headers, headers);
        }
        return this;
    }

    append(name, values) {
        this.setHeader(name, values);
        return this;
    }

    set(name, values) {
        return this.setHeader(name, values);
    }

    setHeader(name, values) {
        const key = name.toLowerCase();
        this.headers[key] = values;
        return this;
    }

    append(name, values) {
        const key = name.toLowerCase();
        const existing = this.headers[key] || [];
        if (!existing.length) {
            this.headers[key] = values;
            return;
        }
        const existingArray = _.isArray(existing) ? existing : [existing];
        const valuesArray = _.isArray(values) ? values : [values];
        this.headers[key] = [...existingArray, ...valuesArray];
        return this;
    }

    get(name) {
        return this.getHeader(name);
    }

    getHeader(name) {
        return this.headers[name.toLowerCase()];
    }

    removeHeader(name) {
        delete this.headers[name.toLowerCase()];
        return this;
    }

    hasHeader(name) {
        return this.headers.hasOwnProperty(name.toLowerCase());
    }

    getHeaderNames() {
        return _.keys(this.headers);
    }

    getHeaders() {
        return this.headers;
    }

    send(...args) {
        return this.end(...args)
    }

    cookie(name, value, options) {
        this.setHeader('Set-Cookie', cookie.serialize(name, value, options))
        return this;
    }

    clearCookie(name, value, options) {
        var opts = Object.assign({ expires: new Date(1), path: '/' }, options);

        return this.cookie(name, '', opts);
    }

    status(code) {
        this.statusCode = code;
        return this;
    };

    links(links) {
        var link = this.get('Link') || '';
        if (link) link += ', ';
        return this.set('Link', link + Object.keys(links).map(function (rel) {
            return '<' + links[rel] + '>; rel="' + rel + '"';
        }).join(', '));
    };

    json(obj) {
        const body = stringify(obj)

        // content-type
        if (!this.get('Content-Type')) {
            this.set('Content-Type', 'application/json');
        }

        return this.send(body);
    };

    contentType(type) {
        var ct = type.indexOf('/') === -1
            ? mime.lookup(type)
            : type;

        return this.set('Content-Type', ct);
    };

    type(type) {
        return this.contentType();
    }

}

module.exports = Response
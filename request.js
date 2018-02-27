const ReadableStream = require('stream').Readable;
const _ = require('lodash/fp');
const accepts = require('accepts');
const typeis = require('type-is');
const fresh = require('fresh');
const parseRange = require('range-parser');
const queryString = require('query-string');

class Request extends ReadableStream {
    constructor(event, res) {
        super()
        this.headers = _.mapKeys(key => key.toLowerCase())(event.headers)
        this.rawHeaders = _.flow(
            _.toPairs,
            _.flatten
        )(event.headers)
        this.hostname = this.headers.host
        this.event = event;
        this.method = event.httpMethod;
        this.res = res;

        this.params = event.pathParameters;
        this.query = event.queryParameters;
        this.url = event.path
        if(event.queryParameters) {
            event.path += "?" + queryString.stringify(event.queryParameters);
        }
        this.accept = accepts(this);

        this.protocol = this.get('X-Forwarded-Proto')
        this.secure = this.protocol === 'https';
        this.ips = (this.get('X-Forwarded-For') || '').split(', ');
        this.ip = this.ips[0];
        
        this.subdomains = this.hostname.split('.').reverse().slice(2)
        this.path = event.path;

        this.host = this.get('X-Forwarded-Host') || this.hostname;
        this.fresh = this.fresh();
        this.stale = !this.fresh;
        this.xhr = (this.get('X-Requested-With') || '').toLowerCase() === 'xmlhttprequest';


        this.push(event.body)
        this.push(null)
    }

    accepts() {
        return this.accept.types.apply(accept, arguments);
    }

    acceptsEncodings() {
        return this.accept.encodings.apply(accept, arguments);
    }

    acceptsCharsets() {
        return this.accept.charsets.apply(accept, arguments);
    }

    acceptsLanguages() {
        return this.accept.languages.apply(accept, arguments);
    }

    range(size, options) {
        var range = this.get('Range');
        if (!range) return;
        return parseRange(size, range, options);
    };

    get(name) {
        return this.header(name);
    }
    
    header(name) {
        if (!name) {
            throw new TypeError('name argument is required to req.get');
        }

        if (typeof name !== 'string') {
            throw new TypeError('name must be a string to req.get');
        }

        var lc = name.toLowerCase();

        switch (lc) {
            case 'referer':
            case 'referrer':
                return this.headers.referrer
                    || this.headers.referer;
            default:
                return this.headers[lc];
        }
    };

    is(types) {
        var arr = types;

        // support flattened arguments
        if (!Array.isArray(types)) {
            arr = new Array(arguments.length);
            for (var i = 0; i < arr.length; i++) {
                arr[i] = arguments[i];
            }
        }

        return typeis(this, arr);
    };

   fresh() {
        var method = this.method;
        var res = this.res;
        var status = res.statusCode;

        // GET or HEAD for weak freshness validation only
        if ('GET' !== method && 'HEAD' !== method) return false;

        // 2xx or 304 as per rfc2616 14.26
        if ((status >= 200 && status < 300) || 304 === status) {
            return fresh(this.headers, {
                'etag': res.get('ETag'),
                'last-modified': res.get('Last-Modified')
            })
        }

        return false;
    };
}

module.exports = Request
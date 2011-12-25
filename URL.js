(function(undefined) {

if (!RegExp.escape) {
    // still can't believe this isn't a regular function(!)
    RegExp.escape = function(string) {
        return string.replace( /(\^|\$|\\|\||\/|\*|\+|\?|\{|\}|\(|\)|\[|\]|\.)/g, "\\" + "$1" );
    };
}

function isArray(obj) {
    return String(Object.prototype.toString.call(obj)) === "[object Array]";
}

function filterArrayValues(data, value) {
    var lookup = {}, 
        i, length;
        
    if (isArray(value)) {
        for (i = 0, length = value.length; i < length; i++) {
            lookup[value[i]] = true;
        }
    } else {
        lookup[value] = true;
    }
    
    for (i = 0, length = data.length; i < length; i++) {
        if (lookup[data[i]] !== undefined) {
            data.splice(i, 1);
            length--;
            i--;
        }
    }
    
    return data;
}

// constructor
var hURL = function(url) {
        // Allow instantiation without the 'new' keyword
        if (!(this instanceof hURL)) {
            return new hURL(url);
        }
        
        if (url === undefined) {
            url = location.href + "";
        }

        this.href(url);
        return this;
    },
    p = hURL.prototype;

// convinience
hURL.encode = encodeURIComponent;
hURL.decode = decodeURIComponent;
p.encode = hURL.encode;
p.decode = hURL.decode;

// static properties
hURL.idn_expression = /[^a-z0-9\.-]/i;
hURL.punycode_expression = /(^xn--)/i;
// well, 333.444.555.666 matches, but it sure ain't no IPv4 - do we care?
hURL.ip4_expression = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
// credits to Rich Brown
// source: http://forums.intermapper.com/viewtopic.php?p=1096#1096
// specification: http://www.ietf.org/rfc/rfc4291.txt
hURL.ip6_expression = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/ ;
// http://www.iana.org/assignments/uri-schemes.html
// http://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Well-known_ports
hURL.defaultPorts = {
    http: "80", 
    https: "443", 
    ftp: "21"
};

hURL.parse = function(string) {
    var pos, t, parts = {};
    // [protocol"://"[username[":"password]"@"]hostname[":"port]]["/"path["?"querystring]["#"fragment]]
    // TODO: check http://blog.stevenlevithan.com/archives/parseuri
    
    // extract fragment
    pos = string.indexOf('#');
    if (pos > -1) {
        // escaping?
        parts.fragment = string.substr(pos + 1) || null;
        string = string.substr(0, pos);
    }
    
    // extract query
    pos = string.indexOf('?');
    if (pos > -1) {
        // escaping?
        parts.query = string.substr(pos + 1) || null;
        string = string.substr(0, pos);
    }
    
    // extract protocol
    pos = string.indexOf('://');
    if (pos > -1) {
        parts.protocol = string.substr(0, pos);
        string = string.substr(pos + 3);
        
        // extract "user:pass@host:port"
        string = hURL.parseAuthority(string, parts);
    }
    
    // what's left must be the path
    parts.path = string;
    
    // and we're done
    return parts;
};
hURL.parseHost = function(string, parts) {
    // extract host:port
    var pos = string.indexOf('/');
    if (pos === -1) {
        pos = string.length;
    }
    
    if (string[0] === "[") {
        // IPv6 host - http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04#section-6
        // I claim most client software breaks on IPv6 anyways. To simplify things, hURL only accepts
        // IPv6+port in the format [2001:db8::1]:80 (for the time being)
        var bracketPos = string.indexOf(']');
        parts.host = string.substring(1, bracketPos) || null;
        parts.port = string.substring(bracketPos+2, pos) || null;
    } else if (string.indexOf(':') !== string.lastIndexOf(':')) {
        // IPv6 host contains multiple colons - but no port
        parts.host = string.substr(0, pos) || null;
        parts.port = null;
    } else {
        t = string.substr(0, pos).split(':');
        parts.host = t[0] || null;
        parts.port = t[1] || null;
    }
    
    return string.substr(pos) || '/';
};
hURL.parseAuthority = function(string, parts) {
    // extract username:password
    var pos = string.indexOf('@');
    if (pos > -1) {
        t = string.substr(0, pos).split(':');
        parts.username = t[0] || null;
        parts.password = t[1] || null;
        string = string.substr(pos + 1);
    } else {
        parts.username = null;
        parts.password = null;
    }

    return hURL.parseHost(string, parts);
};
hURL.parseQuery = function(string) {
    // throw out the funky business - "?"[name"="value"&"]+
    string = string.replace(/&+/g, '&').replace(/^\?*&*|&+$/g, '');

    var items = {},
        splits = string.split('&'),
        length = splits.length;


    for (var i = 0; i < length; i++) {
        var v = splits[i].split('='),
            name = hURL.decode(v.shift()),
            value = hURL.decode(v.join('='));
        
        if (items[name]) {
            if (typeof items[name] === "string") {
                items[name] = [items[name]];
            }
            
            items[name].push(value);
        } else {
            items[name] = value;
        }
    }

    return items;
};

hURL.build = function(parts) {
    var t = '';
    
    if (typeof parts.protocol === "string" && parts.protocol.length) {
        t += parts.protocol + "://";
    }

    t += (hURL.buildAuthority(parts) || '');
    
    if (typeof parts.path === "string") {
        if (parts.path[0] !== '/' && typeof parts.host === "string") {
            t += '/';
        }
        
        t += parts.path;
    }
    
    if (typeof parts.query == "string") {
        t += '?' + parts.query;
    }
    
    if (typeof parts.fragment === "string") {
        t += '#' + parts.fragment;
    }
    return t;
};
hURL.buildHost = function(parts) {
    var t = '';
    
    if (!parts.host) {
        return '';
    } else if (hURL.ip6_expression.test(parts.host)) {
        if (parts.port) {
            t += "[" + parts.host + "]:" + parts.port;
        } else {
            // don't know if we should always wrap IPv6 in []
            // the RFC explicitly says SHOULD, not MUST.
            t += parts.host;
        }
    } else {
        t += parts.host;
        if (parts.port) {
            t += ':' + parts.port;
        }
    }
    
    return t;
};
hURL.buildAuthority = function(parts) {
    var t = '';
    
    if (parts.username) {
        t += parts.username;

        if (parts.password) {
            t += ':' + parts.password;            
        }

        t += "@";
    }
    
    t += hURL.buildHost(parts);
    
    return t;
};
hURL.buildQuery = function(data) {
    var t = "";
    for (var key in data) {
        if (Object.hasOwnProperty.call(data, key)) {
            var name = hURL.encode(key + "");
            if (isArray(data[key])) {
                var unique = {};
                for (var i = 0, length = data[key].length; i < length; i++) {
                    if (data[key][i] !== undefined && unique[data[key][i] + ""] === undefined) {
                        t += "&" + name + "=" + hURL.encode(data[key][i] + "");
                        unique[data[key][i] + ""] = true;
                    }
                }
            } else if (data[key] !== undefined) {
                t += "&" + name + "=" + hURL.encode(data[key] + "");
            }
        }
    }
    
    return t.substr(1);
};

hURL.addQuery = function(data, name, value) {
    if (typeof name === "object") {
        for (var key in name) {
            if (Object.prototype.hasOwnProperty.call(name, key)) {
                hURL.addQuery(data, key, name[key]);
            }
        }
    } else if (typeof name === "string") {
        if (data[name] === undefined) {
            data[name] = value;
            return;
        } else if (typeof data[name] === "string") {
            data[name] = [data[name]];
        }

        if (!isArray(value)) {
            value = [value];
        }

        data[name] = data[name].concat(value);
    } else {
        throw new TypeError("hURL.addQuery() accepts an object, string as the name parameter");
    }
};
hURL.removeQuery = function(data, name, value) {
    if (isArray(name)) {
        for (var i = 0, length = name.length; i < length; i++) {
            data[name[i]] = undefined;
        }
    } else if (typeof name === "object") {
        for (var key in name) {
            if (Object.prototype.hasOwnProperty.call(name, key)) {
                hURL.removeQuery(data, key, name[key]);
            }
        }
    } else if (typeof name === "string") {
        if (value !== undefined) {
            if (data[name] === value) {
                data[name] = undefined;
            } else if (isArray(data[name])) {
                data[name] = filterArrayValues(data[name], value);
            }
        } else {
            data[name] = undefined;
        }
    } else {
        throw new TypeError("hURL.addQuery() accepts an object, string as the first parameter");
    }
};

hURL.commonPath = function(one, two) {
    var length = Math.min(one.length, two.length),
        pos;

    // find first non-matching character
    for (pos = 0; pos < length; pos++) {
        if (one[pos] !== two[pos]) {
            pos--;
            break;
        }
    }
    
    if (pos < 1) {
        return one[0] === two[0] && one[0] === '/' ? '/' : '';
    }
    
    // revert to last /
    if (one[pos] !== '/') {
        pos = one.substr(0, pos).lastIndexOf('/');
    }
    
    return one.substr(0, pos + 1);
};

p.build = function() {
    this._string = hURL.build(this._parts);
    return this;
};

p.toString = function() {
    // return this.build()._string;
    return this._string;
};
p.valueOf = function() {
    return this.toString();
};

// generate simple accessors
var _parts = {protocol: 'protocol', username: 'username', password: 'password', hostname: 'host',  port: 'port'},
    _part;

for (_part in _parts) {
    p[_part] = (function(_part){
        return function(v, build) {
            if (v === undefined) {
                return this._parts[_part] || "";
            } else {
                this._parts[_part] = v;
                build !== false && this.build();
                return this;
            }
        };
    })(_parts[_part]);
}

// generate accessors with optionally prefixed input
_parts = {query: '?', fragment: '#'};
for (_part in _parts) {
    p[_part] = (function(_part, _key){
        return function(v, build) {
            if (v === undefined) {
                return this._parts[_part] || "";
            } else {
                if (v !== null) {
                    v = v + "";
                    if (v[0] === _key) {
                        v = v.substr(1);
                    }
                }

                this._parts[_part] = v;
                build !== false && this.build();
                return this;
            }
        };
    })(_part, _parts[_part]);
}

// generate accessors with prefixed output
_parts = {search: ['?', 'query'], hash: ['#', 'fragment']};
for (_part in _parts) {
    p[_part] = (function(_part, _key){
        return function(v, build) {
            var t = this[_part](v, build);
            return typeof t === "string" && t.length ? (_key + t) : t;
        };
    })(_parts[_part][1], _parts[_part][0]);
}

p.pathname = function(v, build) {
    if (v === undefined) {
        return this._parts.path || "/";
    } else {
        this._parts.path = v || "/";
        build !== false && this.build();
        return this;
    }
};
p.path = p.pathname;
p.href = function(href, build) {
    if (href === undefined) {
        return this.toString();
    } else {
        this._string = "";
        this._parts = {
            protocol: null, 
            username: null, 
            password: null, 
            host: null, 
            port: null, 
            path: null, 
            query: null, 
            fragment: null
        };
        
        var _hURL = href instanceof hURL,
            _object = typeof href === "object" && (href.host || href.path),
            key;
    
        if (typeof href === "string") {
            this._parts = hURL.parse(href);
        } else if (_hURL || _object) {
            var src = _hURL ? href._parts : href;
            for (key in src) {
                if (Object.hasOwnProperty.call(this._parts, key)) {
                    this._parts[key] = src[key];
                }
            }
        } else {
            throw new TypeError("invalid input");
        }
    
        build !== false && this.build();
        return this;
    }
};

// identification accessors
p.is = function(what) {
    var ip = false, 
        ip4 = false, 
        ip6 = false, 
        name = false,
        idn = false,
        punycode = false,
        relative = true;
    
    if (this._parts.host) {
        relative = false;
        ip4 = hURL.ip4_expression.test(this._parts.host);
        ip6 = hURL.ip6_expression.test(this._parts.host);
        ip = ip4 || ip6;
        name = !ip;
        idn = name && hURL.idn_expression.test(this._parts.host);
        punycode = name && hURL.punycode_expression.test(this._parts.host);
        
    }
    
    switch (what.toLowerCase()) {
        case 'relative':
            return relative;
            
        // hostname identification
        case 'domain':
        case 'name':
            return name;
            
        case 'ip':
            return ip;
                
        case 'ip4':
        case 'ipv4':
        case 'inet4':
            return ip4;
                
        case 'ip6':
        case 'ipv6':
        case 'inet6':
            return ip6;
            
        case 'idn':
            return idn;
        
        case 'punycode':
            return punycode;
    }
    
    return null;
};

// combination accessors
p.host = function(v, build) {
    if (v === undefined) {
        return this._parts.host ? hURL.buildHost(this._parts) : "";
    } else {
        hURL.parseHost(v, this._parts);
        build !== false && this.build();
        return this;
    }
};
p.authority = function(v, build) {
    if (v === undefined) {
        return this._parts.host ? hURL.buildAuthority(this._parts) : "";
    } else {
        hURL.parseAuthority(v, this._parts);
        build !== false && this.build();
        return this;
    }
};

// fraction accessors
p.domain = function(v, build) {
    // convinience, return "example.org" from "www.example.org"
    if (v === undefined) {
        if (!this._parts.host || this.is('IP')) {
            return "";
        }

        // "localhost" is a domain, too
        return this._parts.host.match(/\.?([^\.]+.[^\.]+)$/)[1] || this._parts.host;
    } else {
        if (!v) {
            throw new TypeError("cannot set domain empty");
        } else if (!this._parts.host || this.is('IP')) {
            this._parts.host = v;
        } else {
            var replace = new RegExp(RegExp.escape(this.domain()) + "$");
            this._parts.host = this._parts.host.replace(replace, v);
        }
        
        build !== false && this.build();
        return this;
    }
};
p.tld = function(v, build) {
    // return "org" from "www.example.org"
    if (v === undefined) {
        if (!this._parts.host || this.is('IP')) {
            return "";
        }

        var pos = this._parts.host.lastIndexOf('.');
        return this._parts.host.substr(pos + 1);
    } else {
        if (!v) {
            throw new TypeError("cannot set TLD empty");
        } else if (!this._parts.host || this.is('IP')) {
            throw new ReferenceError("cannot set TLD on non-domain host");
        } else {
            var replace = new RegExp(RegExp.escape(this.tld()) + "$");
            this._parts.host = this._parts.host.replace(replace, v);
        }
        
        build !== false && this.build();
        return this;
    }
};
p.directory = function(v, build) {
    if (v === undefined) {
        if (!this._parts.path || this._parts.path === '/') {
            return '/';
        }

        var end = this._parts.path.length - this.filename().length - 1;
        return this._parts.path.substring(0, end);
    } else {
        var e = this._parts.path.length - this.filename().length,
            directory = this._parts.path.substring(0, e),
            replace = new RegExp('^' + RegExp.escape(directory));

        // fully qualifier directories begin with a slash
        if (!this.is('relative')) {
            if (!v) {
                v = '/';
            }
            
            if (v[0] !== '/') {
                v = "/" + v;
            }
        }
        
        // directories always end with a slash
        if (v && v[v.length - 1] !== '/') {
            v += '/';
        }

        this._parts.path = this._parts.path.replace(replace, v);
        build !== false && this.build();
        return this;
    }
};
p.filename = function(v, build) {
    if (v === undefined) {
        if (!this._parts.path || this._parts.path === '/') {
            return "";
        }
        
        var pos = this._parts.path.lastIndexOf('/');
        return this._parts.path.substr(pos+1);
    } else {

        if (v[0] === '/') {
            v = v.substr(1);
        }
        
        var replace = new RegExp(RegExp.escape(this.filename()) + "$");
        this._parts.path = this._parts.path.replace(replace, v);
        build !== false && this.build();
        return this;
    }
};
p.suffix = function(v, build) {
    if (v === undefined) {
        if (!this._parts.path || this._parts.path === '/') {
            return "";
        }
    
        var filename = this.filename(),
            pos = filename.lastIndexOf('.'),
            s;
        
        if (pos === -1) {
            return "";
        }
        
        // suffix may only contain alnum characters (yup, I made this up.)
        s = filename.substr(pos+1);
        return (/^[a-z0-9]+$/i).test(s) ? s : "";
    } else {
        if (v[0] === '.') {
            v = v.substr(1);
        }
        
        var suffix = this.suffix(),
            replace;

        if (!suffix) {
            if (!v) {
                return this;
            }

            this._parts.path += '.' + v;
        } else if (!v) {
            replace = new RegExp(RegExp.escape("." + suffix) + "$");
        } else {
            replace = new RegExp(RegExp.escape(suffix) + "$");
        }
        
        if (replace) {
            this._parts.path = this._parts.path.replace(replace, v);
        }
        
        build !== false && this.build();
        return this;
    }
};

// mutating query string
var q = p.query;
p.query = function(v, build) {
    if (v === true) {
        return hURL.parseQuery(this._parts.query);
    } else if (v !== undefined && typeof v !== "string") {
        this._parts.query = hURL.buildQuery(v);
        build !== false && this.build();
        return this;
    } else {
        return q.call(this, v, build);
    }
};
p.addQuery = function(name, value, build) {
    var data = hURL.parseQuery(this._parts.query);
    hURL.addQuery(data, name, value);
    this._parts.query = hURL.buildQuery(data);
    if (typeof name !== "string") {
        build = value;
    }
    
    build !== false && this.build();
    return this;
};
p.removeQuery = function(name, value, build) {
    var data = hURL.parseQuery(this._parts.query);
    hURL.removeQuery(data, name, value);
    this._parts.query = hURL.buildQuery(data);
    if (typeof name !== "string") {
        build = value;
    }
    
    build !== false && this.build();
    return this;
};

// sanitizing URLs
p.normalize = function() {
    return this
        .normalizeHost(false)
        .normalizePort(false)
        .normalizePath(false)
        .normalizeQuery(false)
        .normalizeFragment(false)
        .build();
};
p.normalizeHost = function(build) {
    if (this.is('IDN') && window.punycode) {
        this._parts.host = punycode.toASCII(this._parts.host);
    } else if (this.is('IPv6') && window.IPv6) {
        this._parts.host = IPv6.best(this._parts.host);
    }
    
    build !== false && this.build();
    return this;
};
p.normalizePort = function(build) {
    // remove port of it's the protocol's default
    if (typeof this._parts.protocol === "string" && this._parts.port === hURL.defaultPorts[this._parts.protocol]) {
        this._parts.port = null;
    }

    build !== false && this.build();
    return this;
};
p.normalizePath = function(build) {
    if (!this._parts.path || this._parts.path === '/') {
        return this;
    }
    
    var _was_relative,
        _was_relative_prefix,
        _path = this._parts.path,
        _parent, _pos;

    // handle relative paths
    if (_path[0] !== '/') {
        if (_path[0] === '.') {
            _was_relative_prefix = _path.substr(0, _path.indexOf('/'));
        }
        _was_relative = true;
        _path = '/' + _path;
    }
    // resolve simples
    _path = _path.replace(/(\/(\.\/)+)|\/{2,}/g, '/');
    // resolve parents
    while (true) {
        _parent = _path.indexOf('/../');
        if (_parent === -1) {
            // no more ../ to resolve
            break;
        } else if (_parent === 0) {
            // top level cannot be relative...
            _path = _path.substr(3);
            break;
        }

        _pos = _path.substr(0, _parent).lastIndexOf('/');
        if (_pos === -1) {
            _pos = _parent;
        }
        _path = _path.substr(0, _pos) + _path.substr(_parent + 3);
    }
    // revert to relative
    if (_was_relative && this.is('relative')) {
        if (_was_relative_prefix){
            _path = _was_relative_prefix + _path;
        } else {
            _path = _path.substr(1);
        }
    }

    this._parts.path = _path;
    build !== false && this.build();
    return this;
};
p.normalizeQuery = function(build) {
    if (typeof this._parts.query === "string") {
        if (!this._parts.query.length) {
            this._parts.query = null;
        } else {
            this.query(hURL.parseQuery(this._parts.query));
        }
    }
    
    build !== false && this.build();
    return this;
};
p.normalizeFragment = function(build) {
    if (!this._parts.fragment) {
        this._parts.fragment = null;
    }
    
    build !== false && this.build();
    return this;
};
p.normalizeSearch = p.normalizeQuery;
p.normalizeHash = p.normalizeFragment;

// resolving relative and absolute URLs
p.absoluteTo = function(base) {
    if (!this.is('relative')) {
        throw new Error('Cannot resolve non-relative URL');
    }
    
    if (!(base instanceof hURL)) {
        base = new hURL(base);
    }

    var resolved = new hURL(this),
        properties = ['protocol', 'username', 'password', 'host', 'port']; 

    for (var i = 0, p; p = properties[i]; i++) {
        resolved._parts[p] = base._parts[p];
    }
    
    if (resolved.path()[0] !== '/') {
        resolved._parts.path = base.directory() + '/' + resolved._parts.path;
        resolved.normalizePath();
    }

    resolved.build();
    return resolved;
};
p.relativeTo = function(base) {
    if (!(base instanceof hURL)) {
        base = new hURL(base);
    }
    
    if (this.path()[0] !== '/' || base.path()[0] !== '/') {
        throw new Error('Cannot calculate common path from non-relative URLs');
    }
    
    var relative = new hURL(this),
        properties = ['protocol', 'username', 'password', 'host', 'port'],
        common = hURL.commonPath(relative.path(), base.path()),
        _base = base.directory();

    for (var i = 0, p; p = properties[i]; i++) {
        relative._parts[p] = null;
    }
    
    if (!common || common === '/') {
        return relative;
    }
    
    if (_base + '/' === common) {
        relative._parts.path = './' + relative.filename();
    } else {
        var parents = '../',
            _common = new RegExp('^' + RegExp.escape(common)),
            _parents = _base.replace(_common, '/').match(/\//g).length -1;

        while (_parents--) {
            parents += '../';
        }
        
        relative._parts.path = relative._parts.path.replace(_common, parents);
    }
    
    relative.build();
    return relative;
};

window.hURL = hURL;

})();
// 工具代码（来自网络） 
// 检测编码 post get请求

var iconv = require("iconv-lite"),
    http = require("http"),
    BufferHelper = require("bufferhelper"),
    querystring = require("querystring"),
    url = require("url");

var charsetMetaReg = /<meta.*charset=['"]?([^'">\s]+)['"].*>/;

module.exports = {
    decodeGBKString : function(buffers){
        var string = "";
        if(buffers.toString().indexOf("�") != -1){
            string = iconv.decode(buffers,"GBK").toString(); 
        }else{
            string = buffers.toString("utf-8");
        }
        return string;
    },
    getPageContent: function (buffers, defaultCharset) {
        var pageContent = buffers.toString(),
            charset = "utf-8";

        //获取页面声明的编码信息
        if(defaultCharset){
            /* 如果指定了编码，则使用指定的 */
            charset = defaultCharset;
        }
        else if (charsetMetaReg.test(pageContent)) {
            charset = RegExp.$1;
        } else if (!this.isUtf8(pageContent)) {
            charset = "gbk";
        }

        //如果选择的是gbk编码，则进行转码操作
        //if((charset && charset == "2") || !this.isUtf8(buffers)){
        if (charset !== "utf-8") {
            pageContent = iconv.decode(buffers, "gbk");
        } else {
            pageContent = buffers.toString();
        }
        return pageContent;
    },
    isUtf8: function (bytes) {
        var i = 0;
        while (i < bytes.length) {
            if ((// ASCII
                bytes[i] == 0x09 ||
                    bytes[i] == 0x0A ||
                    bytes[i] == 0x0D ||
                    (0x20 <= bytes[i] && bytes[i] <= 0x7E)
                )) {
                i += 1;
                continue;
            }

            if ((// non-overlong 2-byte
                (0xC2 <= bytes[i] && bytes[i] <= 0xDF) &&
                    (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF)
                )) {
                i += 2;
                continue;
            }

            if (
                (// excluding overlongs
                    bytes[i] == 0xE0 &&
                        (0xA0 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                        (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
                    ) || (// straight 3-byte
                    ((0xE1 <= bytes[i] && bytes[i] <= 0xEC) ||
                        bytes[i] == 0xEE ||
                        bytes[i] == 0xEF) &&
                        (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                        (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
                    ) || (// excluding surrogates
                    bytes[i] == 0xED &&
                        (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x9F) &&
                        (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
                    )
                ) {
                i += 3;
                continue;
            }

            if (
                (// planes 1-3
                    bytes[i] == 0xF0 &&
                        (0x90 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                        (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                        (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
                    ) || (// planes 4-15
                    (0xF1 <= bytes[i] && bytes[i] <= 0xF3) &&
                        (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                        (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                        (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
                    ) || (// plane 16
                    bytes[i] == 0xF4 &&
                        (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x8F) &&
                        (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                        (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
                    )
                ) {
                i += 4;
                continue;
            }
            return false;
        }
        return true;
    },
    httpPost: function (pageurl, data, callback, charset) {
        var postdata = querystring.stringify(data || {}),
            urlinfo = url.parse(pageurl),
            options = {
                host: urlinfo.hostname,
                port: urlinfo.port,
                path: urlinfo.path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postdata.length
                }
            };


        var that = this;

        var req = http.request(options, function (response) {
            //response.setEncoding('utf8');

            var bufferHelper = new BufferHelper();

            response.on("data", function (buffer) {
                bufferHelper.concat(buffer);
            });

            response.on("end", function () {
                var buffers = bufferHelper.toBuffer(),
                    content = that.getPageContent(buffers, charset);

                callback && callback(response, content);
            });
        });

        req.write(postdata);
        req.end();
    },

    httpGet: function (pageurl, callback, charset) {
        var that = this;

        http.get(pageurl, function (response) {
            var bufferHelper = new BufferHelper(),
                content = "";

            response.on("data", function (buffer) {
                bufferHelper.concat(buffer);
            });

            response.on("end", function () {
                var buffers = bufferHelper.toBuffer(),
                    content = that.getPageContent(buffers, charset);

                callback && callback(response, content);
            });
        });
    }
};






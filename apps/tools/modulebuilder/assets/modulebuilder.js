﻿/**
 * @fileOverview 模块打包工具。
 */

//#region BuildFile

function BuildFile() {
	this.includes = [];
	this.excludes = [];

	this.compress = false;
	this.addAssert = false;

	this.path = '';
	this.js = '';
	this.css = '';
	this.images = '';
	this.src = '';
	this.dependencySyntax = 'boot';
	this.uniqueBuildFiles = '';
	this.parseMacro = false;
	this.defines = '';
	this.prependComments = '/*********************************************************\r\n' +
                           ' * This file is created by a tool at {time}\r\n' +
                           ' ********************************************************/\r\n\r\n' +
                           '{modules}';
	this.prependModuleComments = '/*********************************************************\r\n' +
                                 ' * {module}\r\n' +
                                 ' ********************************************************/';

	this.lineBreak = "\r\n";
	this.basePath = "";

	this.relativeImages = "";
}

BuildFile.prototype.load = function () {

};

BuildFile.prototype.save = function () {

};

//#endregion

//#region Stream

function Stream() {

}

Stream.prototype.write = function () {

};

//#endregion

//#region StringStream

function StringStream() {
	this._values = [];
}

StringStream.prototype = new Stream();

StringStream.prototype.write = function (value) {
	this._values.push(value);
};

StringStream.prototype.end = function () {
	this._value = this._values.join('');
};

StringStream.prototype.valueOf = StringStream.prototype.toString = function () {
	return this._value;
};

//#endregion

//#region ModuleBuilder

var Path = Path || require('path');

function ModuleBuilder(buildFile) {

	this.file = buildFile;

	this.parsedModules = {};

	this.js = [];
	this.css = [];
	this.assets = {};

}

ModuleBuilder.prototype = {

	file: null,

	start: function () {
		console.info("正在打包...");
	},

	log: function (message) {
		console.log(message);
	},

	info: function (message) {
		console.info(message);
	},

	error: function (message) {
		console.info(message);
	},

	complete: function () {
		console.info("打包成功!");
	},

	loadContent: function (fullPath, callback) {
		Ajax.send({
			url: fullPath,
			error: function (message, xhrObject) {
				callback(new Error(message));
			},
			success: function (content) {
				callback(null, content);
			}
		});
	},

	getFullPath: function (modulePath, preModulePath) {

		modulePath = modulePath.replace(/\\|\/\//g, "/");

		// If modulePath is relative path. Concat modulePath with basePath.
		if (modulePath.charAt(0) === '.') {
			modulePath = preModulePath + "/" + modulePath;
		} else if (!/:\/\//.test(modulePath)) {
			modulePath = this.file.basePath + "/" + modulePath;
		}

		// Remove "/./" in path
		modulePath = modulePath.replace(/\/(\.\/)+/g, "/");

		// Remove "/../" in path
		while (/\/[^\/]+\/\.\.\//.test(modulePath)) {
			modulePath = modulePath.replace(/\/[^\/]+\/\.\.\//, "/");
		}

		return modulePath;
	},

	concatPath: function (pathA, pathB) {
		return pathB.charAt(0) === '/' ? (/\/$/.test(pathA) ? pathA + pathB.substr(1) : (pathA + pathB)) : (/\/$/.test(pathA) ? pathA + pathB : (pathA + "/" + pathB));
	},

	getModuleType: function (modulePath) {
		return Path.extname(modulePath);
	},

	replaceAssert: function (args) {

		// args = exp @fun(args): message

		var at = args.indexOf('@'),
            expr = at < 0 ? args : args.substr(0, at),
            defaultMessage = expr,
            message = at > 0 ? args.substr(at + 1) : "Assertion fails";

		// value:type check
		if ((at = /^(.+):\s*(\w+)(\??)\s*$/.exec(expr)) && at[2] in typeAsserts) {
			expr = (at[3] ? at[1] + ' == null || ' : at[1] + ' != null && ') + typeAsserts[at[2]].replace(/\$/g, at[1]);
			defaultMessage = at[1] + ' should be a(an) ' + at[2] + (at[3] ? ' or undefined.' : '.');
		}

		if (message.indexOf(':') < 0) {
			message += ': ' + defaultMessage;
		}

		return 'if(!(' + (expr || 1) + ') && window.console && console.error) console.error("' + message.replace(/\"/g, "\\\"") + '");';
	},

	/**
	 * 解析一个 DPL 所依赖的 DPL 项。
     * @param {String} dplPath 当前的 DPL 路径。
     * @param {Boolean} isStyle 当前的 DPL 为样式或脚本。
     * @return {Object} 返回格式如： {js: [path1, path2], css: [path1, path2]}
	 */
	resolveJsRequires: function (content, modulePath, fullPath) {

		var me = this;
		var modules = [];

		switch (this.file.dependencySyntax) {
			case "boot":
				modules.content = content.replace(/^(\s*)\/[\/\*]\s*#(\w+)\s+(.*)$/gm, function (all, indent, macro, args) {
					switch (macro) {
						case 'include':
						case 'import':
						case 'imports':
							modules.push(args);
							break;

						case 'exclude':
						case 'included':
							me.parseModule(args, modulePath, null, true);
							break;
						case 'assert':
							if (me.file.addAssert)
								return indent + me.replaceAssert(args);
							break;
						case 'deprected':
							if (me.file.addAssert)
								return indent + 'if(window.console && console.warn) console.warn("' + (args.replace(/\"/g, "\\\"") || "This function is deprected.") + '")';
							break;
					}

					return all;
				});
				break;
				//case "amd":
				//    content.replace(/define\s*\(\s*(['"])(\w+)\1\s*\)$/g, function (all, indent, macro, args) {
				//        modules.push(args);

				//        return all;
				//    });

			case "cmd":
				content.replace(/require\s*\(\s*(['"])(\w+)\1\s*\)$/g, function (all, indent, macro, args) {
					modules.push(args);

					return all;
				});
				break;

			case "yui":
				content.replace(/YUI().use\s*\(\s*(['"])(\w+)\1\s*\)$/g, function (all, indent, macro, args) {
					modules.push(args);

					return all;
				});
				break;

			case "kissy":
				content.replace(/KISSY.use\s*\(\s*(['"])(\w+)\1\s*\)$/g, function (all, indent, macro, args) {
					modules.push(args);

					return all;
				});
				break;


		}


		return modules;


	},

	resolveCssRequires: function (content, modulePath, fullPath) {

		var me = this;
		var modules = [];

		content = content.replace(/@import\s+url\s*\(\s*(['"]?)(.+)\1\s*\)/g, function (all, indent, importPath, args) {
			var path = Path.resolve(Path.dirname(fullPath), importPath);
			modules.push(path);
		});

		var moduleFolder = Path.dirname(modulePath);
		var cssFolder = Path.dirname(fullPath);

		modules.content = content.replace(/url\s*\((['""]?)(.*)\1\)/ig, function (all, c1, imgUrl, c3) {

			// 不处理绝对位置。
			if (imgUrl.indexOf(':') >= 0)
				return all;

			// 源图片的原始物理路径。
			var fromPath = me.concatPath(cssFolder, imgUrl);

			// 源图片的文件名。
			var name = me.concatPath(moduleFolder, Path.basename(imgUrl))

			var toPath = me.file.images;

			var asset = me.assets[fromPath];

			// 如果这个路径没有拷贝过。
			if (!asset) {
				me.assets[fromPath] = asset = {
					pres: [],
					from: fromPath,
					relative: me.concatPath(me.file.relativeImages.replace(/\\/g, "/"), name),
					to: me.concatPath(me.file.images, name)
				};
			}

			asset.pres.push(modulePath);

			return "url(" + asset.relative + ")";
		});

		return modules;

	},

	// 解析宏。
	resolveMacro: function (content, define) {

		var m = /^\/\/\/\s*#(\w+)(.*?)$/m;

		var r = [];

		while (content) {
			var value = m.exec(content);

			if (!value) {
				r.push([content, 0, 0]);
				break;
			}

			// 保留匹配部分的左边字符串。
			r.push([content.substring(0, value.index), 0, 0]);

			r.push(value);

			// 截取匹配部分的右边字符串。
			content = content.substring(value.index + value[0].length);
		}


		//console.log(r);

		var codes = ['var $out="",$t;'];

		r.forEach(function (value, index) {

			if (!value[1]) {
				codes.push('$out+=$r[' + index + '][0];');
				return;
			}

			var v = value[2].trim();

			switch (value[1]) {

				case 'if':
					codes.push('if(' + v.replace(/\b([a-z_$]+)\b/ig, "$d.$1") + '){');
					break;

				case 'else':
					codes.push('}else{');
					break;

				case 'elsif':
					codes.push('}else if(' + v.replace(/\b([a-z_$]+)\b/g, "$d.$1") + '){');
					break;

				case 'endif':
				case 'endregion':
					codes.push('}');
					break;

				case 'define':
					var space = v.search(/\s/);
					if (space === -1) {
						codes.push('if(!(' + v + ' in $d))$d.' + v + "=true;");
					} else {
						codes.push('$d.' + v.substr(0, space) + "=" + v.substr(space) + ";");
					}
					break;

				case 'undef':
					codes.push('delete $d.' + v + ";");
					break;

				case 'ifdef':
					codes.push('if(' + v + ' in $d){');
					break;

				case 'ifndef':
					codes.push('if(!(' + v + ' in $d)){');
					break;

				case 'region':
					codes.push('if($d.' + v + ' !== false){');
					break;

				case 'rem':
					break;

				default:
					codes.push('$out+=$r[' + index + '][0];');
					break;
			}

		});

		codes.push('return $out;');

		//	console.log(codes.join(''));

		var fn = new Function("$r", "$d", codes.join(''));

		return fn(r, define);
	},

	getNow: function () {
		var d = new Date();
		d = [d.getFullYear(), '/', d.getMonth() + 1, '/', d.getDate(), ' ', d.getHours(), ':', d.getMinutes()];

		if (d[d.length - 1] < 10) {
			d[d.length - 1] = '0' + d[d.length - 1];
		}

		if (d[d.length - 3] < 10) {
			d[d.length - 3] = '0' + d[d.length - 3];
		}

		return d.join('');
	},

	/**
     * 初始化整个对象。
     */
	init: function (buildFile) {

		//this.dplList = ModuleManager.getModuleList('src');

		//this.cacheJsFileName = {};

		//this.cacheCssFileName = {};

		//this.cacheJsRefs = {};

		//this.cacheCssRefs = {};

		//this.cacheJsContent = {};

		//this.cacheCssContent = {};

		//this.cacheRequires = {};

	},

	parseModule: function (modulePath, preModulePath, callback, exclude) {

		var me = this, moduleType = this.getModuleType(modulePath);

		if (!moduleType) {
			this.parseModule(modulePath + ".css", preModulePath, function () {
				me.parseModule(modulePath + ".js", preModulePath, callback, exclude);
			}, exclude);
			return;
		}

		var fullPath = this.getFullPath(modulePath, preModulePath);

		if (this.parsedModules[fullPath]) {

			if (callback) {
				callback();
			}

			return;
		}

		if (!exclude) {
			this.log("正在分析 " + modulePath + " ...");
		}

		this.parsedModules[fullPath] = moduleType;

		if (exclude) {

			// 删除已经添加的不需要的模块。
			delete this.js[fullPath];
			delete this.css[fullPath];
			delete this.assets[fullPath];

			if (callback) {
				callback();
			}

			return;
		}

		var me = this;

		switch (moduleType) {

			case ".js":

				this.loadContent(fullPath, function (error, content) {
					if (error) {
						if (callback) {
							callback();
						}
						return;
					}

					if (me.file.parseMacro) {
						var defines = {};
						(me.file.defines || "").split(';').forEach(function (value) {
							defines[value] = true;
						});

						try {
							content = me.resolveMacro(content, defines);
						} catch (e) {
							me.error("解析宏错误: " + e.message);
						}
					}

					var modules = me.resolveJsRequires(content, modulePath, fullPath);

					me.parseModules(modules, modulePath, function () {
						me.js[fullPath] = {
							pre: preModulePath,
							path: modulePath,
							fullPath: fullPath,
							content: modules.content || content
						};

						if (callback) {
							callback();
						}
					});

				});

				break;

			case ".css":

				this.loadContent(fullPath, function (error, content) {
					if (error) {
						if (callback) {
							callback();
						}
						return;
					}

					var modules = me.resolveCssRequires(content, modulePath, fullPath);

					me.parseModules(modules, modulePath, function () {
						me.css[fullPath] = {
							pre: preModulePath,
							path: modulePath,
							fullPath: fullPath,
							content: modules.content || content
						};

						if (callback) {
							callback();
						}
					});

				});

				break;

			default:

				if (callback) {
					callback();
				}

		}

	},

	parseModules: function (modules, preModulePath, callback, exclude) {

		var i = 0, me = this;

		function step() {

			if (i < modules.length) {
				me.parseModule(modules[i++], preModulePath, step, exclude);
			} else if (callback) {
				callback();
			}

		}


		step();

	},

	/**
     * 开始打包操作。
     */
	build: function () {

		var me = this;

		this.start();
		this.parseModules(this.file.excludes, this.file.path, null, true);
		this.parseModules(this.file.includes, this.file.path, function () {

			// 排除重复模块。
			if (me.uniqueBuildFiles) {
				me.uniqueBuildFiles.split(';').forEach(function (buildFile) {

				});
			}

			setTimeout(function () {
				me.complete();
			}, 0);
		});

	},

	compressCss: function (code) {
		code = code.replace(/\n/ig, '');
		code = code.replace(/(\s){2,}/ig, '$1');
		code = code.replace(/\t/ig, '');
		code = code.replace(/\n\}/ig, '\}');
		code = code.replace(/\n\{\s*/ig, '\{');
		code = code.replace(/(\S)\s*\}/ig, '$1\}');
		code = code.replace(/(\S)\s*\{/ig, '$1\{');
		code = code.replace(/\{\s*(\S)/ig, '\{$1');
		return code;
	},

	compressJs: function (value) {
		var ast = parse(value);
		ast.figure_out_scope();
		// https://github.com/mishoo/UglifyJS2#compressor-options
		ast.transform(Compressor());
		ast.figure_out_scope();
		ast.compute_char_frequency();
		ast.mangle_names();
		return ast.print_to_string();
	},

	writeJs: function (writer) {

		for (var hasModule in this.js) {

			this.log("正在生成 js 代码...");

			var comment = this.file.prependComments;

			if (comment) {

				if (comment.indexOf("{time}") >= 0) {
					comment = comment.replace("{time}", this.getNow());
				}

				if (comment.indexOf("{source}") >= 0) {
					comment = comment.replace("{source}", this.file.path || "");
				}

				if (comment.indexOf("{modules}") >= 0) {
					var list = [];
					for (var i = 0; i < this.js.length; i++) {
						list.push("//#included " + this.js[i].path);
					}
					for (var i = 0; i < this.css.length; i++) {
						list.push("//#included " + this.css[i].path);
					}

					list.sort();
					comment = comment.replace("{modules}", list.join(this.file.lineBreak));
				}

				writer.write(comment);
				writer.write(this.file.lineBreak);

			}

			for (var i in this.js) {
				if (this.file.prependModuleComments) {
					writer.write(this.file.lineBreak);
					writer.write(this.file.prependModuleComments.replace("{module}", this.js[i].path));
					writer.write(this.file.lineBreak);
				}

				var content = this.js[i].content;

				if (this.file.compress) {
					content = this.compressJs(content);
				}

				writer.write(content);
			}

			break;
		}

	},

	writeCss: function (writer) {

		for (var hasModule in this.css) {

			this.log("正在生成 css 代码...");

			var comment = this.file.prependComments;

			if (comment) {

				if (comment.indexOf("{time}") >= 0) {
					comment = comment.replace("{time}", this.getNow());
				}

				if (comment.indexOf("{source}") >= 0) {
					comment = comment.replace("{source}", this.file.path || "");
				}

				comment = comment.replace("{modules}", "");

				writer.write(comment);

			}

			for (var i in this.css) {
				if (this.file.prependModuleComments) {
					writer.write(this.file.prependModuleComments.replace("{module}", this.css[i].path));
				}

				var content = this.css[i].content;

				if (this.file.compress) {
					content = this.compressCss(content);
				}

				writer.write(content);
			}

			break;
		}


	}

};

//#endregion

if (typeof exports === "object") {
	exports.ModuleBuilder = ModuleBuilder;
	exports.BuildFile = BuildFile;

	ModuleBuilder.prototype.loadContent = function (url, callback) {
		require("fs").readFile(url, "utf-8", callback);
	};
}

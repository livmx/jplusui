/** * @author  */// 重写 JPlus.loadStyle 支持 less 文件。JPlus.loadStyle = function (url) {	var urlLowerCase = url.toLowerCase();	var lessUrl = urlLowerCase.replace(/\.css$/i, ".less");	if(!Object.each(document.getElementsByTagName('link'), function(dom){		var href = ((navigator.isQuirks ? dom.getAttribute('href', 4) : dom.href) || '').toLowerCase();		return !href || (href.indexOf(urlLowerCase) === -1 && href.indexOf(lessUrl) === -1);	}))		return;    // 在顶部插入一个css，但这样肯能导致css没加载就执行 js 。所以，要保证样式加载后才能继续执行计算。    document.getElementsByTagName("HEAD")[0].appendChild(Object.extend(document.createElement('link'), {        href: lessUrl,        rel: 'stylesheet/less',        type: 'text/css'    }));};imports("Controls.Core.Base");using("System.Dom.Element");
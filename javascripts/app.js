var elDemo = document.getElementsByTagName('h2')[1].nextElementSibling;
elDemo.innerHTML = 'See the Pen <a href="//codepen.io/YoannM/pen/gapmMG/">nippleJS</a>' +
	'by Yoann Moinet (<a href="//codepen.io/YoannM">@YoannM</a>) on' +
	'<a href="//codepen.io">CodePen</a>.';
elDemo.className = 'codepen';
elDemo.setAttribute('data-user', 'YoannM');
elDemo.setAttribute('data-default-tab', 'result');
elDemo.setAttribute('data-slug-hash', 'gapmMG');
elDemo.setAttribute('data-theme-id', '1775');
elDemo.setAttribute('data-height', '950');

var codepenScript = document.createElement('script');
codepenScript.src = '//assets.codepen.io/assets/embed/ei.js';
codepenScript.async = true;
document.body.appendChild(codepenScript);

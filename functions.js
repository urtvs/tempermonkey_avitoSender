let seconds = 0;
setInterval(async () => {
    seconds++;
    if(seconds == 40){
        console.error('Не было совершенно действий в течение 40 секунд. Обновление страницы');
        await timeout(2000);
        openLink(window.location.href);
    }
}, 1000);

const version = 2;
const backendApi = `https://a.unirenter.ru/b24/api/avito.php?do=avitoSendMsg&isDev=1&ah=`;
const backendApiMsg = 'https://a.unirenter.ru/b24/api/avito.php?do=avitoSendAnswer&isDev=1&ah=';

let clickFromScript = false;

let updates = {
    '05.03.2022': [
        '- Разработка началась',
    ]
};

console.log(`VERSION: ${version}`);
for(let i in updates){
    console.info(`Обновление от ${i}\n`, updates[i].join("\n"));
    // console.log(updates[i].join("\n"));
}

let elementCreatedInerations = 0;
let elementCreatedStatus = true;

let isAuth = false;

//пусть тайм-аут работает на промисе, чтобы не плодить километровую вложенность
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function elementCreated(element) {
    elementCreatedStatus = false;
    if(!$(element).length){
        let ret = addElementCreatedInerations(element);
        if(ret == 'error'){
            return;
        }
        await timeout(1000);
        elementCreated(element);
    }
    elementCreatedStatus = true;
    return $(element);
}

async function ajax(url, data = {}){
	const settings = {
		method: 'POST',
		body: JSON.stringify(data)
	};

	try {
		let fetchResponse = await fetch(url + hash + '&version=' + version, settings);
        if(fetchResponse.status !== 200){
            throw new Error(`Статус ответа: ${fetchResponse.status}`);
        }

		let data = await fetchResponse.json();

	    return data;
	} catch (e) {
        alert(e);
        console.error('Произошла ошибка в GET запросе. Возможно включен CORS');
        console.error(e);
	}
}

//Оборачиваем fetch в свою функцию, чтобы сделать исключения
async function get(url){
    try {
        let response = await fetch(url + hash + '&version=' + version);
        if(response.status !== 200){
            throw new Error(`Статус ответа: ${response.status}`);
        }
        let data = await response.json();

        return data;
    } catch (e) {
        alert(e);
        console.error('Произошла ошибка в GET запросе. Возможно включен CORS');
        console.error(e);
    }
}

async function error(error, avitoId = false){
    if(!avitoId){
        let r = JSON.parse(localStorage.getItem('avitoMessengerData'));
        avitoId = r.avitoID;
    }

    let res = await ajax(backendApi, {avitoId: avitoId, statusCode: error});
    getItem(res);
}

//Для получения частей урл /
function getUrl(part, url = false) {
    let path;
    if(url){
        path = url;
    }else{
        path = window.location.pathname;
    }
     
    let parts = path.split('/');

    if (!parts[part]) {
        return false;
    }

    return parts[part];
}

//для получения get параметров
function getQuery(name, url = window.location.href) {
    if(url.indexOf('?') == -1 && url.indexOf('&') != -1){
        url = url.replace('&', '?');
        window.location.href = url;
    }
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function addElementCreatedInerations(element){
    elementCreatedInerations++;
    if(elementCreatedInerations == 10){
        elementCreatedStatus = false;
        console.error(`Элемент ${element} не был загружен за 10 секунд`);
        return 'error';
    }
}

// Обновляется ли URL
window.addEventListener('locationchange', function () {
    readMessages();
});
(() => {
    let oldPushState = history.pushState;
    history.pushState = function pushState() {
        let ret = oldPushState.apply(this, arguments);
        window.dispatchEvent(new Event('pushstate'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
    };

    let oldReplaceState = history.replaceState;
    history.replaceState = function replaceState() {
        let ret = oldReplaceState.apply(this, arguments);
        window.dispatchEvent(new Event('replacestate'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
    };

    window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('locationchange'));
    });
})();